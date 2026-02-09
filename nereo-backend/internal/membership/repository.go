package membership

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrPlanNotFound         = errors.New("plan not found")
	ErrSubscriptionNotFound = errors.New("subscription not found")
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// ============================================================
// Plans
// ============================================================

func (r *Repository) CreatePlan(ctx context.Context, p *Plan) error {
	includesJSON, _ := json.Marshal(p.Includes)

	query := `
		INSERT INTO membership_plans (id, tenant_id, name, description, price_cents, currency, interval, wash_limit, includes, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING created_at, updated_at`

	return r.db.QueryRow(ctx, query,
		p.ID, p.TenantID, p.Name, p.Description, p.PriceCents, p.Currency, p.Interval, p.WashLimit, includesJSON, p.Active,
	).Scan(&p.CreatedAt, &p.UpdatedAt)
}

func (r *Repository) GetPlanByID(ctx context.Context, tenantID, planID uuid.UUID) (*Plan, error) {
	query := `
		SELECT id, tenant_id, name, description, price_cents, currency, interval, wash_limit, includes, active, created_at, updated_at
		FROM membership_plans
		WHERE id = $1 AND tenant_id = $2`

	p := &Plan{}
	var includesJSON []byte
	err := r.db.QueryRow(ctx, query, planID, tenantID).Scan(
		&p.ID, &p.TenantID, &p.Name, &p.Description, &p.PriceCents, &p.Currency,
		&p.Interval, &p.WashLimit, &includesJSON, &p.Active, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPlanNotFound
		}
		return nil, fmt.Errorf("get plan: %w", err)
	}

	if err := json.Unmarshal(includesJSON, &p.Includes); err != nil {
		p.Includes = []string{}
	}

	return p, nil
}

func (r *Repository) ListPlans(ctx context.Context, tenantID uuid.UUID, activeOnly bool) ([]Plan, error) {
	query := `
		SELECT id, tenant_id, name, description, price_cents, currency, interval, wash_limit, includes, active, created_at, updated_at
		FROM membership_plans
		WHERE tenant_id = $1`

	if activeOnly {
		query += " AND active = true"
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("list plans: %w", err)
	}
	defer rows.Close()

	var plans []Plan
	for rows.Next() {
		var p Plan
		var includesJSON []byte
		if err := rows.Scan(
			&p.ID, &p.TenantID, &p.Name, &p.Description, &p.PriceCents, &p.Currency,
			&p.Interval, &p.WashLimit, &includesJSON, &p.Active, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan plan: %w", err)
		}
		if err := json.Unmarshal(includesJSON, &p.Includes); err != nil {
			p.Includes = []string{}
		}
		plans = append(plans, p)
	}

	return plans, nil
}

func (r *Repository) UpdatePlan(ctx context.Context, p *Plan) error {
	includesJSON, _ := json.Marshal(p.Includes)

	query := `
		UPDATE membership_plans
		SET name = $1, description = $2, price_cents = $3, interval = $4, wash_limit = $5, includes = $6, updated_at = NOW()
		WHERE id = $7 AND tenant_id = $8
		RETURNING updated_at`

	err := r.db.QueryRow(ctx, query,
		p.Name, p.Description, p.PriceCents, p.Interval, p.WashLimit, includesJSON, p.ID, p.TenantID,
	).Scan(&p.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPlanNotFound
		}
		return fmt.Errorf("update plan: %w", err)
	}

	return nil
}

func (r *Repository) DeactivatePlan(ctx context.Context, tenantID, planID uuid.UUID) error {
	query := `UPDATE membership_plans SET active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`
	tag, err := r.db.Exec(ctx, query, planID, tenantID)
	if err != nil {
		return fmt.Errorf("deactivate plan: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPlanNotFound
	}
	return nil
}

// ============================================================
// Subscriptions
// ============================================================

func (r *Repository) CreateSubscription(ctx context.Context, s *Subscription) error {
	query := `
		INSERT INTO subscriptions (id, tenant_id, customer_id, plan_id, payment_method, mp_subscription_id, status, current_period_start, current_period_end, washes_used)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING created_at, updated_at`

	return r.db.QueryRow(ctx, query,
		s.ID, s.TenantID, s.CustomerID, s.PlanID, s.PaymentMethod, s.MpSubscriptionID,
		s.Status, s.CurrentPeriodStart, s.CurrentPeriodEnd, s.WashesUsed,
	).Scan(&s.CreatedAt, &s.UpdatedAt)
}

func (r *Repository) GetSubscriptionByID(ctx context.Context, tenantID, subID uuid.UUID) (*Subscription, error) {
	query := `
		SELECT id, tenant_id, customer_id, plan_id, payment_method, mp_subscription_id, status,
		       current_period_start, current_period_end, washes_used, created_at, updated_at
		FROM subscriptions
		WHERE id = $1 AND tenant_id = $2`

	s := &Subscription{}
	err := r.db.QueryRow(ctx, query, subID, tenantID).Scan(
		&s.ID, &s.TenantID, &s.CustomerID, &s.PlanID, &s.PaymentMethod, &s.MpSubscriptionID,
		&s.Status, &s.CurrentPeriodStart, &s.CurrentPeriodEnd, &s.WashesUsed, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSubscriptionNotFound
		}
		return nil, fmt.Errorf("get subscription: %w", err)
	}

	return s, nil
}

func (r *Repository) ListSubscriptions(ctx context.Context, tenantID uuid.UUID, customerID *uuid.UUID) ([]Subscription, error) {
	query := `
		SELECT id, tenant_id, customer_id, plan_id, payment_method, mp_subscription_id, status,
		       current_period_start, current_period_end, washes_used, created_at, updated_at
		FROM subscriptions
		WHERE tenant_id = $1`

	args := []interface{}{tenantID}
	if customerID != nil {
		query += " AND customer_id = $2"
		args = append(args, *customerID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list subscriptions: %w", err)
	}
	defer rows.Close()

	var subs []Subscription
	for rows.Next() {
		var s Subscription
		if err := rows.Scan(
			&s.ID, &s.TenantID, &s.CustomerID, &s.PlanID, &s.PaymentMethod, &s.MpSubscriptionID,
			&s.Status, &s.CurrentPeriodStart, &s.CurrentPeriodEnd, &s.WashesUsed, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan subscription: %w", err)
		}
		subs = append(subs, s)
	}

	return subs, nil
}

func (r *Repository) UpdateSubscriptionStatus(ctx context.Context, tenantID, subID uuid.UUID, status string) error {
	query := `UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`
	tag, err := r.db.Exec(ctx, query, status, subID, tenantID)
	if err != nil {
		return fmt.Errorf("update subscription status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrSubscriptionNotFound
	}
	return nil
}

func (r *Repository) RenewSubscription(ctx context.Context, tenantID, subID uuid.UUID, periodStart, periodEnd interface{}) error {
	query := `
		UPDATE subscriptions
		SET status = 'active', current_period_start = $1, current_period_end = $2, washes_used = 0, updated_at = NOW()
		WHERE id = $3 AND tenant_id = $4`

	tag, err := r.db.Exec(ctx, query, periodStart, periodEnd, subID, tenantID)
	if err != nil {
		return fmt.Errorf("renew subscription: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrSubscriptionNotFound
	}
	return nil
}
