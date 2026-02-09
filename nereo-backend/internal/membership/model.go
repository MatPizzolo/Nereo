package membership

import (
	"time"

	"github.com/google/uuid"
)

// ============================================================
// Plans
// ============================================================

type Plan struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenant_id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	PriceCents  int       `json:"price_cents"`
	Currency    string    `json:"currency"`
	Interval    string    `json:"interval"`
	WashLimit   *int      `json:"wash_limit,omitempty"`
	Includes    []string  `json:"includes"`
	Active      bool      `json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreatePlanRequest struct {
	Name        string   `json:"name" binding:"required,min=2,max=255"`
	Description *string  `json:"description"`
	PriceCents  int      `json:"price_cents" binding:"required,gt=0"`
	Currency    string   `json:"currency" binding:"omitempty,len=3"`
	Interval    string   `json:"interval" binding:"omitempty,oneof=monthly weekly"`
	WashLimit   *int     `json:"wash_limit" binding:"omitempty,gt=0"`
	Includes    []string `json:"includes"`
}

type UpdatePlanRequest struct {
	Name        *string  `json:"name" binding:"omitempty,min=2,max=255"`
	Description *string  `json:"description"`
	PriceCents  *int     `json:"price_cents" binding:"omitempty,gt=0"`
	Interval    *string  `json:"interval" binding:"omitempty,oneof=monthly weekly"`
	WashLimit   *int     `json:"wash_limit" binding:"omitempty,gt=0"`
	Includes    []string `json:"includes"`
}

// ============================================================
// Subscriptions
// ============================================================

type Subscription struct {
	ID                 uuid.UUID  `json:"id"`
	TenantID           uuid.UUID  `json:"tenant_id"`
	CustomerID         uuid.UUID  `json:"customer_id"`
	PlanID             uuid.UUID  `json:"plan_id"`
	PaymentMethod      string     `json:"payment_method"`
	MpSubscriptionID   *string    `json:"mp_subscription_id,omitempty"`
	Status             string     `json:"status"`
	CurrentPeriodStart time.Time  `json:"current_period_start"`
	CurrentPeriodEnd   time.Time  `json:"current_period_end"`
	WashesUsed         int        `json:"washes_used"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type CreateSubscriptionRequest struct {
	CustomerID    uuid.UUID `json:"customer_id" binding:"required"`
	PlanID        uuid.UUID `json:"plan_id" binding:"required"`
	PaymentMethod string    `json:"payment_method" binding:"required,oneof=mercadopago manual"`
}

type ValidationResult struct {
	Valid           bool    `json:"valid"`
	WashesRemaining *int   `json:"washes_remaining"`
	ExpiresAt       string `json:"expires_at"`
	PaymentMethod   string `json:"payment_method"`
}
