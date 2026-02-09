package membership

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	repo *Repository
	db   *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{
		repo: NewRepository(db),
		db:   db,
	}
}

// ============================================================
// Plans
// ============================================================

func (s *Service) CreatePlan(ctx context.Context, tenantID uuid.UUID, req CreatePlanRequest) (*Plan, error) {
	currency := req.Currency
	if currency == "" {
		currency = "ARS"
	}
	interval := req.Interval
	if interval == "" {
		interval = "monthly"
	}
	includes := req.Includes
	if includes == nil {
		includes = []string{}
	}

	plan := &Plan{
		ID:          uuid.New(),
		TenantID:    tenantID,
		Name:        req.Name,
		Description: req.Description,
		PriceCents:  req.PriceCents,
		Currency:    currency,
		Interval:    interval,
		WashLimit:   req.WashLimit,
		Includes:    includes,
		Active:      true,
	}

	if err := s.repo.CreatePlan(ctx, plan); err != nil {
		return nil, fmt.Errorf("create plan: %w", err)
	}

	return plan, nil
}

func (s *Service) GetPlan(ctx context.Context, tenantID, planID uuid.UUID) (*Plan, error) {
	return s.repo.GetPlanByID(ctx, tenantID, planID)
}

func (s *Service) ListPlans(ctx context.Context, tenantID uuid.UUID) ([]Plan, error) {
	return s.repo.ListPlans(ctx, tenantID, true)
}

func (s *Service) UpdatePlan(ctx context.Context, tenantID, planID uuid.UUID, req UpdatePlanRequest) (*Plan, error) {
	plan, err := s.repo.GetPlanByID(ctx, tenantID, planID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		plan.Name = *req.Name
	}
	if req.Description != nil {
		plan.Description = req.Description
	}
	if req.PriceCents != nil {
		plan.PriceCents = *req.PriceCents
	}
	if req.Interval != nil {
		plan.Interval = *req.Interval
	}
	if req.WashLimit != nil {
		plan.WashLimit = req.WashLimit
	}
	if req.Includes != nil {
		plan.Includes = req.Includes
	}

	if err := s.repo.UpdatePlan(ctx, plan); err != nil {
		return nil, err
	}

	return plan, nil
}

func (s *Service) DeactivatePlan(ctx context.Context, tenantID, planID uuid.UUID) error {
	return s.repo.DeactivatePlan(ctx, tenantID, planID)
}

// ============================================================
// Subscriptions
// ============================================================

func (s *Service) CreateSubscription(ctx context.Context, tenantID uuid.UUID, req CreateSubscriptionRequest) (*Subscription, error) {
	// Verify plan exists and is active
	plan, err := s.repo.GetPlanByID(ctx, tenantID, req.PlanID)
	if err != nil {
		return nil, err
	}
	if !plan.Active {
		return nil, fmt.Errorf("plan is not active")
	}

	now := time.Now()
	periodEnd := calculatePeriodEnd(now, plan.Interval)

	sub := &Subscription{
		ID:                 uuid.New(),
		TenantID:           tenantID,
		CustomerID:         req.CustomerID,
		PlanID:             req.PlanID,
		PaymentMethod:      req.PaymentMethod,
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   periodEnd,
		WashesUsed:         0,
	}

	if req.PaymentMethod == "manual" {
		// Manual payment: activate immediately
		sub.Status = "active"
	} else {
		// Mercado Pago: set as pending until webhook confirms payment
		sub.Status = "active" // For now, will be refined in Phase 2 with MP integration
	}

	if err := s.repo.CreateSubscription(ctx, sub); err != nil {
		return nil, fmt.Errorf("create subscription: %w", err)
	}

	// If manual, record a payment event
	if req.PaymentMethod == "manual" {
		eventQuery := `
			INSERT INTO payment_events (tenant_id, subscription_id, source, status, amount_cents, notes, raw_payload)
			VALUES ($1, $2, 'manual', 'approved', $3, 'Activación manual', '{}')`

		_, err = s.db.Exec(ctx, eventQuery, tenantID, sub.ID, plan.PriceCents)
		if err != nil {
			return nil, fmt.Errorf("record manual payment event: %w", err)
		}
	}

	return sub, nil
}

func (s *Service) GetSubscription(ctx context.Context, tenantID, subID uuid.UUID) (*Subscription, error) {
	return s.repo.GetSubscriptionByID(ctx, tenantID, subID)
}

func (s *Service) ListSubscriptions(ctx context.Context, tenantID uuid.UUID, customerID *uuid.UUID) ([]Subscription, error) {
	return s.repo.ListSubscriptions(ctx, tenantID, customerID)
}

func (s *Service) CancelSubscription(ctx context.Context, tenantID, subID uuid.UUID) error {
	return s.repo.UpdateSubscriptionStatus(ctx, tenantID, subID, "cancelled")
}

func (s *Service) ValidateSubscription(ctx context.Context, tenantID, subID uuid.UUID) (*ValidationResult, error) {
	sub, err := s.repo.GetSubscriptionByID(ctx, tenantID, subID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	valid := sub.Status == "active" && sub.CurrentPeriodEnd.After(now)

	result := &ValidationResult{
		Valid:         valid,
		ExpiresAt:     sub.CurrentPeriodEnd.Format(time.RFC3339),
		PaymentMethod: sub.PaymentMethod,
	}

	// Calculate washes remaining if plan has a limit
	plan, err := s.repo.GetPlanByID(ctx, tenantID, sub.PlanID)
	if err == nil && plan.WashLimit != nil {
		remaining := *plan.WashLimit - sub.WashesUsed
		if remaining < 0 {
			remaining = 0
		}
		result.WashesRemaining = &remaining

		if remaining == 0 {
			result.Valid = false
		}
	}

	return result, nil
}

func calculatePeriodEnd(start time.Time, interval string) time.Time {
	switch interval {
	case "weekly":
		return start.AddDate(0, 0, 7)
	case "monthly":
		return start.AddDate(0, 1, 0)
	default:
		return start.AddDate(0, 1, 0)
	}
}
