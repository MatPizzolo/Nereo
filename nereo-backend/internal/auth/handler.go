package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nereo-ar/backend/pkg/httputil"
	"github.com/redis/go-redis/v9"
)

type Handler struct {
	db         *pgxpool.Pool
	jwtManager *JWTManager
	redis      *redis.Client
}

func NewHandler(db *pgxpool.Pool, jwtManager *JWTManager, redisClient *redis.Client) *Handler {
	return &Handler{
		db:         db,
		jwtManager: jwtManager,
		redis:      redisClient,
	}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type userRow struct {
	ID           uuid.UUID
	TenantID     uuid.UUID
	PasswordHash string
	Role         string
	Active       bool
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	query := `
		SELECT u.id, u.tenant_id, u.password_hash, u.role, u.active
		FROM users u
		JOIN tenants t ON t.id = u.tenant_id
		WHERE u.email = $1 AND t.active = true
		LIMIT 1`

	var user userRow
	err := h.db.QueryRow(c.Request.Context(), query, req.Email).Scan(
		&user.ID, &user.TenantID, &user.PasswordHash, &user.Role, &user.Active,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httputil.Unauthorized(c, "invalid credentials")
			return
		}
		httputil.InternalError(c)
		return
	}

	if !user.Active {
		httputil.Unauthorized(c, "account is disabled")
		return
	}

	if !CheckPassword(req.Password, user.PasswordHash) {
		httputil.Unauthorized(c, "invalid credentials")
		return
	}

	pair, err := h.jwtManager.GenerateTokenPair(user.ID, user.TenantID, user.Role)
	if err != nil {
		httputil.InternalError(c)
		return
	}

	// Store refresh token in Redis
	refreshKey := fmt.Sprintf("refresh:%s", user.ID.String())
	h.redis.Set(c.Request.Context(), refreshKey, pair.RefreshToken, h.jwtManager.refreshTTL)

	httputil.OK(c, pair)
}

func (h *Handler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	claims, err := h.jwtManager.ValidateToken(req.RefreshToken)
	if err != nil {
		httputil.Unauthorized(c, "invalid refresh token")
		return
	}

	// Verify refresh token matches what's stored in Redis
	refreshKey := fmt.Sprintf("refresh:%s", claims.UserID.String())
	stored, err := h.redis.Get(c.Request.Context(), refreshKey).Result()
	if err != nil || stored != req.RefreshToken {
		httputil.Unauthorized(c, "refresh token revoked or expired")
		return
	}

	// Verify user still exists and is active
	var active bool
	err = h.db.QueryRow(c.Request.Context(),
		"SELECT active FROM users WHERE id = $1", claims.UserID,
	).Scan(&active)
	if err != nil || !active {
		httputil.Unauthorized(c, "account not found or disabled")
		return
	}

	pair, err := h.jwtManager.GenerateTokenPair(claims.UserID, claims.TenantID, claims.Role)
	if err != nil {
		httputil.InternalError(c)
		return
	}

	// Rotate refresh token
	h.redis.Set(c.Request.Context(), refreshKey, pair.RefreshToken, h.jwtManager.refreshTTL)

	httputil.OK(c, pair)
}

func (h *Handler) Logout(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uuid.UUID)

	refreshKey := fmt.Sprintf("refresh:%s", userID.String())
	h.redis.Del(context.Background(), refreshKey)

	httputil.NoContent(c)
}

// GetJWTManager exposes the JWT manager for use by middleware
func (h *Handler) GetJWTManager() *JWTManager {
	return h.jwtManager
}

// StoreRefreshToken stores a refresh token in Redis (used during tenant onboarding)
func (h *Handler) StoreRefreshToken(ctx context.Context, userID uuid.UUID, token string, ttl time.Duration) {
	refreshKey := fmt.Sprintf("refresh:%s", userID.String())
	h.redis.Set(ctx, refreshKey, token, ttl)
}
