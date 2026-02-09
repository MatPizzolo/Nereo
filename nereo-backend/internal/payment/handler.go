package payment

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/nereo-ar/backend/internal/middleware"
	"github.com/nereo-ar/backend/pkg/httputil"
)

type Handler struct {
	mpClient      *MercadoPagoClient
	repo          *Repository
	webhookSecret string
}

func NewHandler(mpClient *MercadoPagoClient, repo *Repository, webhookSecret string) *Handler {
	return &Handler{
		mpClient:      mpClient,
		repo:          repo,
		webhookSecret: webhookSecret,
	}
}

// CreatePreference creates a Checkout Pro preference for a one-time payment
func (h *Handler) CreatePreference(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)

	var req CreatePreferenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	plan, err := h.repo.GetPlanWithTenant(c.Request.Context(), tenantID, req.PlanID)
	if err != nil {
		httputil.NotFound(c, "plan not found or inactive")
		return
	}

	// Create a subscription record first to use as external_reference
	subID := uuid.New()
	notifURL := req.NotificationURL

	// Fetch customer info for payer fields (improves MP approval rate)
	customerEmail, _ := h.repo.GetCustomerEmail(c.Request.Context(), req.CustomerID)
	customerName, customerPhone := h.repo.GetCustomerInfo(c.Request.Context(), req.CustomerID)

	mpReq := &PreferenceRequest{
		Items: []PreferenceItem{
			{
				Title:      fmt.Sprintf("%s - %s", plan.PlanName, plan.TenantName),
				Quantity:   1,
				UnitPrice:  float64(plan.PriceCents) / 100.0,
				CurrencyID: "ARS",
				CategoryID: "services",
			},
		},
		Payer: &PreferencePayer{
			Email:   customerEmail,
			Name:    customerName,
			Phone:   &PreferencePhone{Number: customerPhone},
		},
		StatementDescriptor: plan.TenantName,
		NotificationURL:     notifURL,
		ExternalReference:   subID.String(),
		Metadata: map[string]string{
			"tenant_id":   tenantID.String(),
			"customer_id": req.CustomerID.String(),
			"plan_id":     req.PlanID.String(),
		},
	}

	mpResp, err := h.mpClient.CreatePreference(c.Request.Context(), mpReq)
	if err != nil {
		slog.Error("failed to create MP preference", "error", err, "tenant_id", tenantID)
		httputil.InternalError(c)
		return
	}

	httputil.Created(c, CreatePreferenceResponse{
		PreferenceID:     mpResp.ID,
		InitPoint:        mpResp.InitPoint,
		SandboxInitPoint: mpResp.SandboxInitPoint,
	})
}

// CreateSubscriptionMP creates a recurring subscription via MP Preapproval
func (h *Handler) CreateSubscriptionMP(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)

	var req CreateSubscriptionMPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	plan, err := h.repo.GetPlanWithTenant(c.Request.Context(), tenantID, req.PlanID)
	if err != nil {
		httputil.NotFound(c, "plan not found or inactive")
		return
	}

	// Create subscription record
	subID := uuid.New()

	frequencyType := "months"
	if plan.Interval == "weekly" {
		frequencyType = "days"
	}
	frequency := 1
	if plan.Interval == "weekly" {
		frequency = 7
	}

	mpReq := &PreapprovalRequest{
		Reason: fmt.Sprintf("Suscripción %s - %s", plan.PlanName, plan.TenantName),
		AutoRecurring: AutoRecurring{
			Frequency:         frequency,
			FrequencyType:     frequencyType,
			TransactionAmount: float64(plan.PriceCents) / 100.0,
			CurrencyID:        "ARS",
		},
		PayerEmail:        req.PayerEmail,
		ExternalReference: subID.String(),
	}

	mpResp, err := h.mpClient.CreatePreapproval(c.Request.Context(), mpReq)
	if err != nil {
		slog.Error("failed to create MP preapproval", "error", err, "tenant_id", tenantID)
		httputil.InternalError(c)
		return
	}

	httputil.Created(c, CreateSubscriptionMPResponse{
		PreapprovalID:    mpResp.ID,
		InitPoint:        mpResp.InitPoint,
		SandboxInitPoint: mpResp.SandboxInitPoint,
		Status:           mpResp.Status,
	})
}

// HandleWebhook processes incoming Mercado Pago webhook notifications
func (h *Handler) HandleWebhook(c *gin.Context) {
	// Verify signature
	xSignature := c.GetHeader("x-signature")
	xRequestID := c.GetHeader("x-request-id")
	dataID := c.Query("data.id")

	if err := VerifyWebhookSignature(xSignature, xRequestID, dataID, h.webhookSecret); err != nil {
		slog.Warn("webhook signature verification failed", "error", err)
		c.Status(http.StatusUnauthorized)
		return
	}

	var body WebhookBody
	if err := c.ShouldBindJSON(&body); err != nil {
		// MP sometimes sends form-encoded or query params
		body.Type = c.Query("type")
		body.Data.ID = c.Query("data.id")
	}

	// Return 200 immediately, process async
	c.Status(http.StatusOK)

	// Process in background
	go h.processWebhook(body)
}

func (h *Handler) processWebhook(body WebhookBody) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	switch body.Type {
	case "payment":
		h.processPaymentWebhook(ctx, body.Data.ID)
	case "subscription_preapproval":
		h.processPreapprovalWebhook(ctx, body.Data.ID)
	default:
		slog.Info("ignoring webhook type", "type", body.Type)
	}
}

func (h *Handler) processPaymentWebhook(ctx context.Context, paymentID string) {
	logger := slog.Default().With("mp_payment_id", paymentID)

	// Check idempotency
	existing, _ := h.repo.GetPaymentEventByMPID(ctx, paymentID)
	if existing != nil {
		logger.Info("payment already processed, skipping")
		return
	}

	// Fetch payment details from MP
	payment, err := h.mpClient.GetPayment(ctx, paymentID)
	if err != nil {
		logger.Error("failed to get payment from MP", "error", err)
		return
	}

	// Parse external_reference as subscription ID
	subID, err := uuid.Parse(payment.ExternalReference)
	if err != nil {
		logger.Error("invalid external_reference", "ref", payment.ExternalReference)
		return
	}

	// Get tenant from subscription
	tenantID, err := h.repo.GetSubscriptionTenantID(ctx, subID)
	if err != nil {
		logger.Error("failed to get subscription tenant", "error", err)
		return
	}

	// Record payment event
	rawPayload, _ := json.Marshal(payment)
	mpID := fmt.Sprintf("%d", payment.ID)
	event := &PaymentEvent{
		TenantID:       tenantID,
		SubscriptionID: &subID,
		Source:         "mercadopago",
		MpPaymentID:    &mpID,
		Status:         payment.Status,
		AmountCents:    int(payment.TransactionAmount * 100),
		RawPayload:     rawPayload,
	}

	if err := h.repo.CreatePaymentEvent(ctx, event); err != nil {
		if errors.Is(err, ErrPaymentAlreadyProcessed) {
			logger.Info("payment already processed (race condition)")
			return
		}
		logger.Error("failed to record payment event", "error", err)
		return
	}

	// Update subscription status based on payment status
	switch payment.Status {
	case "approved":
		if err := h.repo.UpdateSubscriptionStatus(ctx, subID, "active"); err != nil {
			logger.Error("failed to activate subscription", "error", err)
		}
		logger.Info("subscription activated via payment")
	case "rejected":
		if err := h.repo.UpdateSubscriptionStatus(ctx, subID, "past_due"); err != nil {
			logger.Error("failed to mark subscription past_due", "error", err)
		}
		logger.Warn("payment rejected, subscription marked past_due")
	case "pending", "in_process":
		logger.Info("payment pending", "status", payment.Status)
	}
}

func (h *Handler) processPreapprovalWebhook(ctx context.Context, preapprovalID string) {
	logger := slog.Default().With("mp_preapproval_id", preapprovalID)

	info, err := h.mpClient.GetPreapproval(ctx, preapprovalID)
	if err != nil {
		logger.Error("failed to get preapproval from MP", "error", err)
		return
	}

	logger.Info("preapproval status update", "status", info.Status)
}

// RegisterManualPayment records a cash/transfer payment and activates the subscription
func (h *Handler) RegisterManualPayment(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)
	userID := c.MustGet(middleware.ContextUserID).(uuid.UUID)

	var req ManualPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	// Verify subscription belongs to this tenant
	sub, err := h.repo.GetSubscriptionWithPlan(c.Request.Context(), req.SubscriptionID)
	if err != nil {
		httputil.NotFound(c, "subscription not found")
		return
	}
	if sub.TenantID != tenantID {
		httputil.Forbidden(c, "subscription does not belong to this tenant")
		return
	}

	// Record payment event
	notes := req.Notes
	event := &PaymentEvent{
		TenantID:       tenantID,
		SubscriptionID: &req.SubscriptionID,
		Source:         "manual",
		Status:         "approved",
		AmountCents:    req.AmountCents,
		Notes:          &notes,
		RecordedBy:     &userID,
		RawPayload:     []byte("{}"),
	}

	if err := h.repo.CreatePaymentEvent(c.Request.Context(), event); err != nil {
		slog.Error("failed to record manual payment", "error", err, "tenant_id", tenantID)
		httputil.InternalError(c)
		return
	}

	// Activate/renew subscription
	now := time.Now()
	var periodEnd time.Time
	switch sub.Interval {
	case "weekly":
		periodEnd = now.AddDate(0, 0, 7)
	default:
		periodEnd = now.AddDate(0, 1, 0)
	}

	if err := h.repo.RenewSubscription(c.Request.Context(), req.SubscriptionID, now, periodEnd); err != nil {
		slog.Error("failed to renew subscription", "error", err)
		httputil.InternalError(c)
		return
	}

	httputil.Created(c, event)
}

// RenewManual renews a specific subscription manually
func (h *Handler) RenewManual(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)
	userID := c.MustGet(middleware.ContextUserID).(uuid.UUID)

	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.BadRequest(c, "INVALID_ID", "invalid subscription id")
		return
	}

	var req RenewManualRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// notes is optional, allow empty body
		req = RenewManualRequest{}
	}

	sub, err := h.repo.GetSubscriptionWithPlan(c.Request.Context(), subID)
	if err != nil {
		httputil.NotFound(c, "subscription not found")
		return
	}
	if sub.TenantID != tenantID {
		httputil.Forbidden(c, "subscription does not belong to this tenant")
		return
	}

	// Record payment event
	notes := req.Notes
	if notes == "" {
		notes = "Renovación manual"
	}
	event := &PaymentEvent{
		TenantID:       tenantID,
		SubscriptionID: &subID,
		Source:         "manual",
		Status:         "approved",
		AmountCents:    sub.PriceCents,
		Notes:          &notes,
		RecordedBy:     &userID,
		RawPayload:     []byte("{}"),
	}

	if err := h.repo.CreatePaymentEvent(c.Request.Context(), event); err != nil {
		slog.Error("failed to record renewal payment", "error", err, "tenant_id", tenantID)
		httputil.InternalError(c)
		return
	}

	now := time.Now()
	var periodEnd time.Time
	switch sub.Interval {
	case "weekly":
		periodEnd = now.AddDate(0, 0, 7)
	default:
		periodEnd = now.AddDate(0, 1, 0)
	}

	if err := h.repo.RenewSubscription(c.Request.Context(), subID, now, periodEnd); err != nil {
		slog.Error("failed to renew subscription", "error", err)
		httputil.InternalError(c)
		return
	}

	httputil.OK(c, gin.H{"status": "renewed", "new_period_end": periodEnd.Format(time.RFC3339)})
}
