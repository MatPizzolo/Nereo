package payment

import (
	"time"

	"github.com/google/uuid"
)

type PaymentEvent struct {
	ID             uuid.UUID  `json:"id"`
	TenantID       uuid.UUID  `json:"tenant_id"`
	SubscriptionID *uuid.UUID `json:"subscription_id,omitempty"`
	Source         string     `json:"source"`
	MpPaymentID    *string    `json:"mp_payment_id,omitempty"`
	Status         string     `json:"status"`
	AmountCents    int        `json:"amount_cents"`
	Notes          *string    `json:"notes,omitempty"`
	RecordedBy     *uuid.UUID `json:"recorded_by,omitempty"`
	RawPayload     []byte     `json:"-"`
	ProcessedAt    time.Time  `json:"processed_at"`
}

// Request types

type CreatePreferenceRequest struct {
	PlanID     uuid.UUID `json:"plan_id" binding:"required"`
	CustomerID uuid.UUID `json:"customer_id" binding:"required"`
	NotificationURL string `json:"notification_url,omitempty"`
}

type CreatePreferenceResponse struct {
	PreferenceID     string `json:"preference_id"`
	InitPoint        string `json:"init_point"`
	SandboxInitPoint string `json:"sandbox_init_point"`
}

type CreateSubscriptionMPRequest struct {
	PlanID     uuid.UUID `json:"plan_id" binding:"required"`
	CustomerID uuid.UUID `json:"customer_id" binding:"required"`
	PayerEmail string    `json:"payer_email" binding:"required,email"`
}

type CreateSubscriptionMPResponse struct {
	PreapprovalID    string `json:"preapproval_id"`
	InitPoint        string `json:"init_point"`
	SandboxInitPoint string `json:"sandbox_init_point"`
	Status           string `json:"status"`
}

type ManualPaymentRequest struct {
	SubscriptionID uuid.UUID `json:"subscription_id" binding:"required"`
	AmountCents    int       `json:"amount_cents" binding:"required,gt=0"`
	Notes          string    `json:"notes"`
}

type RenewManualRequest struct {
	Notes string `json:"notes"`
}

type WebhookBody struct {
	Action string      `json:"action"`
	Type   string      `json:"type"`
	Data   WebhookData `json:"data"`
}

type WebhookData struct {
	ID string `json:"id"`
}
