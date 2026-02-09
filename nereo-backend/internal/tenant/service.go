package tenant

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nereo-ar/backend/internal/auth"
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

func (s *Service) CreateTenantWithOwner(ctx context.Context, req CreateTenantRequest) (*CreateTenantResponse, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	tenantID := uuid.New()
	t := &Tenant{
		ID:                 tenantID,
		Name:               req.Name,
		Slug:               req.Slug,
		OwnerEmail:         req.OwnerEmail,
		Plan:               "free",
		Timezone:           "America/Argentina/Buenos_Aires",
		Settings:           Settings{OpenTime: "08:00", CloseTime: "20:00"},
		BufferBetweenSlots: 10,
		Active:             true,
	}

	// Insert tenant
	err = s.repo.Create(ctx, t)
	if err != nil {
		return nil, err
	}

	// Hash password and create owner user
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	userID := uuid.New()
	userQuery := `
		INSERT INTO users (id, tenant_id, email, full_name, password_hash, role, active)
		VALUES ($1, $2, $3, $4, $5, 'owner', true)`

	_, err = tx.Exec(ctx, userQuery, userID, tenantID, req.OwnerEmail, req.OwnerName, hash)
	if err != nil {
		return nil, fmt.Errorf("insert owner user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &CreateTenantResponse{Tenant: *t, UserID: userID}, nil
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*Tenant, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) UpdateSettings(ctx context.Context, id uuid.UUID, req UpdateSettingsRequest) (*Tenant, error) {
	return s.repo.UpdateSettings(ctx, id, req)
}
