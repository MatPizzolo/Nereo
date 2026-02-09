package membership

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/nereo-ar/backend/internal/middleware"
	"github.com/nereo-ar/backend/pkg/httputil"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// ============================================================
// Plans
// ============================================================

func (h *Handler) CreatePlan(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)

	var req CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	plan, err := h.service.CreatePlan(c.Request.Context(), tenantID, req)
	if err != nil {
		httputil.InternalError(c)
		return
	}

	httputil.Created(c, plan)
}

func (h *Handler) GetPlan(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)
	planID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.BadRequest(c, "INVALID_ID", "invalid plan id")
		return
	}

	plan, err := h.service.GetPlan(c.Request.Context(), tenantID, planID)
	if err != nil {
		if errors.Is(err, ErrPlanNotFound) {
			httputil.NotFound(c, "plan not found")
			return
		}
		httputil.InternalError(c)
		return
	}

	httputil.OK(c, plan)
}

func (h *Handler) ListPlans(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)

	plans, err := h.service.ListPlans(c.Request.Context(), tenantID)
	if err != nil {
		httputil.InternalError(c)
		return
	}

	if plans == nil {
		plans = []Plan{}
	}

	httputil.OK(c, plans)
}

func (h *Handler) UpdatePlan(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)
	planID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.BadRequest(c, "INVALID_ID", "invalid plan id")
		return
	}

	var req UpdatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	plan, err := h.service.UpdatePlan(c.Request.Context(), tenantID, planID, req)
	if err != nil {
		if errors.Is(err, ErrPlanNotFound) {
			httputil.NotFound(c, "plan not found")
			return
		}
		httputil.InternalError(c)
		return
	}

	httputil.OK(c, plan)
}

func (h *Handler) DeactivatePlan(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)
	planID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.BadRequest(c, "INVALID_ID", "invalid plan id")
		return
	}

	if err := h.service.DeactivatePlan(c.Request.Context(), tenantID, planID); err != nil {
		if errors.Is(err, ErrPlanNotFound) {
			httputil.NotFound(c, "plan not found")
			return
		}
		httputil.InternalError(c)
		return
	}

	httputil.NoContent(c)
}

// ============================================================
// Subscriptions
// ============================================================

func (h *Handler) CreateSubscription(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)

	var req CreateSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	sub, err := h.service.CreateSubscription(c.Request.Context(), tenantID, req)
	if err != nil {
		if errors.Is(err, ErrPlanNotFound) {
			httputil.NotFound(c, "plan not found")
			return
		}
		httputil.InternalError(c)
		return
	}

	httputil.Created(c, sub)
}

func (h *Handler) ListSubscriptions(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)

	var customerID *uuid.UUID
	if cidStr := c.Query("customer_id"); cidStr != "" {
		cid, err := uuid.Parse(cidStr)
		if err != nil {
			httputil.BadRequest(c, "INVALID_ID", "invalid customer_id")
			return
		}
		customerID = &cid
	}

	subs, err := h.service.ListSubscriptions(c.Request.Context(), tenantID, customerID)
	if err != nil {
		httputil.InternalError(c)
		return
	}

	if subs == nil {
		subs = []Subscription{}
	}

	httputil.OK(c, subs)
}

func (h *Handler) CancelSubscription(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.BadRequest(c, "INVALID_ID", "invalid subscription id")
		return
	}

	if err := h.service.CancelSubscription(c.Request.Context(), tenantID, subID); err != nil {
		if errors.Is(err, ErrSubscriptionNotFound) {
			httputil.NotFound(c, "subscription not found")
			return
		}
		httputil.InternalError(c)
		return
	}

	httputil.OK(c, gin.H{"status": "cancelled"})
}

func (h *Handler) ValidateSubscription(c *gin.Context) {
	tenantID := c.MustGet(middleware.ContextTenantID).(uuid.UUID)
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		httputil.BadRequest(c, "INVALID_ID", "invalid subscription id")
		return
	}

	result, err := h.service.ValidateSubscription(c.Request.Context(), tenantID, subID)
	if err != nil {
		if errors.Is(err, ErrSubscriptionNotFound) {
			httputil.NotFound(c, "subscription not found")
			return
		}
		httputil.InternalError(c)
		return
	}

	httputil.OK(c, result)
}
