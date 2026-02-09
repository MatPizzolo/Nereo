package payment

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrPaymentAlreadyProcessed = errors.New("payment already processed")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreatePaymentEvent(ctx context.Context, e *PaymentEvent) error {
	query := `
		INSERT INTO payment_events (id, tenant_id, subscription_id, source, mp_payment_id, status, amount_cents, notes, recorded_by, raw_payload)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (mp_payment_id) DO NOTHING
		RETURNING processed_at`

	id := uuid.New()
	e.ID = id

	err := r.db.QueryRow(ctx, query,
		e.ID, e.TenantID, e.SubscriptionID, e.Source, e.MpPaymentID,
		e.Status, e.AmountCents, e.Notes, e.RecordedBy, e.RawPayload,
	).Scan(&e.ProcessedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPaymentAlreadyProcessed
		}
		return fmt.Errorf("insert payment event: %w", err)
	}

	return nil
}

func (r *Repository) GetPaymentEventByMPID(ctx context.Context, mpPaymentID string) (*PaymentEvent, error) {
	query := `
		SELECT id, tenant_id, subscription_id, source, mp_payment_id, status, amount_cents, notes, recorded_by, processed_at
		FROM payment_events WHERE mp_payment_id = $1`

	e := &PaymentEvent{}
	err := r.db.QueryRow(ctx, query, mpPaymentID).Scan(
		&e.ID, &e.TenantID, &e.SubscriptionID, &e.Source, &e.MpPaymentID,
		&e.Status, &e.AmountCents, &e.Notes, &e.RecordedBy, &e.ProcessedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get payment event: %w", err)
	}
	return e, nil
}

func (r *Repository) ListPaymentEvents(ctx context.Context, tenantID uuid.UUID, subscriptionID *uuid.UUID) ([]PaymentEvent, error) {
	query := `
		SELECT id, tenant_id, subscription_id, source, mp_payment_id, status, amount_cents, notes, recorded_by, processed_at
		FROM payment_events WHERE tenant_id = $1`

	args := []interface{}{tenantID}
	if subscriptionID != nil {
		query += " AND subscription_id = $2"
		args = append(args, *subscriptionID)
	}
	query += " ORDER BY processed_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list payment events: %w", err)
	}
	defer rows.Close()

	var events []PaymentEvent
	for rows.Next() {
		var e PaymentEvent
		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.SubscriptionID, &e.Source, &e.MpPaymentID,
			&e.Status, &e.AmountCents, &e.Notes, &e.RecordedBy, &e.ProcessedAt,
		); err != nil {
			return nil, fmt.Errorf("scan payment event: %w", err)
		}
		events = append(events, e)
	}

	return events, nil
}

// GetSubscriptionTenantID retrieves the tenant_id for a subscription (needed for webhook processing)
func (r *Repository) GetSubscriptionTenantID(ctx context.Context, subscriptionID uuid.UUID) (uuid.UUID, error) {
	var tenantID uuid.UUID
	err := r.db.QueryRow(ctx,
		"SELECT tenant_id FROM subscriptions WHERE id = $1", subscriptionID,
	).Scan(&tenantID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("get subscription tenant: %w", err)
	}
	return tenantID, nil
}

// UpdateSubscriptionStatus updates a subscription's status
func (r *Repository) UpdateSubscriptionStatus(ctx context.Context, subscriptionID uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx,
		"UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2",
		status, subscriptionID,
	)
	return err
}

// UpdateSubscriptionMPID stores the Mercado Pago subscription ID
func (r *Repository) UpdateSubscriptionMPID(ctx context.Context, subscriptionID uuid.UUID, mpSubID string) error {
	_, err := r.db.Exec(ctx,
		"UPDATE subscriptions SET mp_subscription_id = $1, updated_at = NOW() WHERE id = $2",
		mpSubID, subscriptionID,
	)
	return err
}

// RenewSubscription resets the subscription period
func (r *Repository) RenewSubscription(ctx context.Context, subscriptionID uuid.UUID, periodStart, periodEnd interface{}) error {
	_, err := r.db.Exec(ctx,
		`UPDATE subscriptions SET status = 'active', current_period_start = $1, current_period_end = $2, washes_used = 0, updated_at = NOW() WHERE id = $3`,
		periodStart, periodEnd, subscriptionID,
	)
	return err
}

// GetSubscriptionWithPlan returns subscription + plan price for payment processing
type SubscriptionWithPlan struct {
	SubscriptionID uuid.UUID
	TenantID       uuid.UUID
	CustomerID     uuid.UUID
	PlanID         uuid.UUID
	PlanName       string
	PriceCents     int
	Interval       string
	Status         string
	PaymentMethod  string
}

func (r *Repository) GetSubscriptionWithPlan(ctx context.Context, subscriptionID uuid.UUID) (*SubscriptionWithPlan, error) {
	query := `
		SELECT s.id, s.tenant_id, s.customer_id, s.plan_id, p.name, p.price_cents, p.interval, s.status, s.payment_method
		FROM subscriptions s
		JOIN membership_plans p ON p.id = s.plan_id
		WHERE s.id = $1`

	sp := &SubscriptionWithPlan{}
	err := r.db.QueryRow(ctx, query, subscriptionID).Scan(
		&sp.SubscriptionID, &sp.TenantID, &sp.CustomerID, &sp.PlanID,
		&sp.PlanName, &sp.PriceCents, &sp.Interval, &sp.Status, &sp.PaymentMethod,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("subscription not found")
		}
		return nil, fmt.Errorf("get subscription with plan: %w", err)
	}
	return sp, nil
}

// GetPlanWithTenant returns plan info + tenant name for building MP preference titles
type PlanWithTenant struct {
	PlanID     uuid.UUID
	TenantID   uuid.UUID
	TenantName string
	PlanName   string
	PriceCents int
	Interval   string
}

func (r *Repository) GetPlanWithTenant(ctx context.Context, tenantID, planID uuid.UUID) (*PlanWithTenant, error) {
	query := `
		SELECT p.id, p.tenant_id, t.name, p.name, p.price_cents, p.interval
		FROM membership_plans p
		JOIN tenants t ON t.id = p.tenant_id
		WHERE p.id = $1 AND p.tenant_id = $2 AND p.active = true`

	pt := &PlanWithTenant{}
	err := r.db.QueryRow(ctx, query, planID, tenantID).Scan(
		&pt.PlanID, &pt.TenantID, &pt.TenantName, &pt.PlanName, &pt.PriceCents, &pt.Interval,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("plan not found or inactive")
		}
		return nil, fmt.Errorf("get plan with tenant: %w", err)
	}
	return pt, nil
}

// GetCustomerEmail returns the customer email for MP preapproval
func (r *Repository) GetCustomerEmail(ctx context.Context, customerID uuid.UUID) (string, error) {
	var email *string
	err := r.db.QueryRow(ctx, "SELECT email FROM customers WHERE id = $1", customerID).Scan(&email)
	if err != nil {
		return "", fmt.Errorf("get customer email: %w", err)
	}
	if email == nil {
		return "", fmt.Errorf("customer has no email")
	}
	return *email, nil
}

// GetCustomerInfo returns the customer name and phone for MP payer fields
func (r *Repository) GetCustomerInfo(ctx context.Context, customerID uuid.UUID) (string, string) {
	var name, phone string
	_ = r.db.QueryRow(ctx, "SELECT full_name, phone FROM customers WHERE id = $1", customerID).Scan(&name, &phone)
	return name, phone
}

// GetPastDueSubscriptions returns subscriptions that have been past_due for more than the given duration
func (r *Repository) GetPastDueSubscriptions(ctx context.Context, olderThan time.Duration) ([]uuid.UUID, error) {
	query := `
		SELECT id FROM subscriptions
		WHERE status = 'past_due' AND updated_at < NOW() - $1::interval`

	rows, err := r.db.Query(ctx, query, olderThan.String())
	if err != nil {
		return nil, fmt.Errorf("get past due subscriptions: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}
