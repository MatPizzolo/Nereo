package tenant

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("tenant not found")
var ErrSlugTaken = errors.New("slug already taken")

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, t *Tenant) error {
	settingsJSON, err := json.Marshal(t.Settings)
	if err != nil {
		return fmt.Errorf("marshal settings: %w", err)
	}

	query := `
		INSERT INTO tenants (id, name, slug, owner_email, plan, timezone, settings, buffer_between_slots, active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at`

	err = r.db.QueryRow(ctx, query,
		t.ID, t.Name, t.Slug, t.OwnerEmail, t.Plan, t.Timezone, settingsJSON, t.BufferBetweenSlots, t.Active,
	).Scan(&t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		if isDuplicateKeyError(err) {
			return ErrSlugTaken
		}
		return fmt.Errorf("insert tenant: %w", err)
	}

	return nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	query := `
		SELECT id, name, slug, owner_email, plan, timezone, settings, buffer_between_slots, active, created_at, updated_at
		FROM tenants WHERE id = $1`

	t := &Tenant{}
	var settingsJSON []byte
	err := r.db.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.Name, &t.Slug, &t.OwnerEmail, &t.Plan, &t.Timezone,
		&settingsJSON, &t.BufferBetweenSlots, &t.Active, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get tenant: %w", err)
	}

	if err := json.Unmarshal(settingsJSON, &t.Settings); err != nil {
		return nil, fmt.Errorf("unmarshal settings: %w", err)
	}

	return t, nil
}

func (r *Repository) GetBySlug(ctx context.Context, slug string) (*Tenant, error) {
	query := `
		SELECT id, name, slug, owner_email, plan, timezone, settings, buffer_between_slots, active, created_at, updated_at
		FROM tenants WHERE slug = $1`

	t := &Tenant{}
	var settingsJSON []byte
	err := r.db.QueryRow(ctx, query, slug).Scan(
		&t.ID, &t.Name, &t.Slug, &t.OwnerEmail, &t.Plan, &t.Timezone,
		&settingsJSON, &t.BufferBetweenSlots, &t.Active, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get tenant by slug: %w", err)
	}

	if err := json.Unmarshal(settingsJSON, &t.Settings); err != nil {
		return nil, fmt.Errorf("unmarshal settings: %w", err)
	}

	return t, nil
}

func (r *Repository) UpdateSettings(ctx context.Context, id uuid.UUID, req UpdateSettingsRequest) (*Tenant, error) {
	t, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if req.BufferBetweenSlots != nil {
		t.BufferBetweenSlots = *req.BufferBetweenSlots
	}
	if req.Settings != nil {
		t.Settings = *req.Settings
	}

	settingsJSON, err := json.Marshal(t.Settings)
	if err != nil {
		return nil, fmt.Errorf("marshal settings: %w", err)
	}

	query := `
		UPDATE tenants SET settings = $1, buffer_between_slots = $2, updated_at = NOW()
		WHERE id = $3
		RETURNING updated_at`

	err = r.db.QueryRow(ctx, query, settingsJSON, t.BufferBetweenSlots, id).Scan(&t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update tenant settings: %w", err)
	}

	return t, nil
}

func isDuplicateKeyError(err error) bool {
	return err != nil && (fmt.Sprintf("%v", err) == "ERROR: duplicate key value violates unique constraint" ||
		len(fmt.Sprintf("%v", err)) > 0 && contains(fmt.Sprintf("%v", err), "duplicate key"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchString(s, substr)
}

func searchString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
