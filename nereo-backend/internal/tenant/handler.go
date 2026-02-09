package tenant

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

func (h *Handler) Register(c *gin.Context) {
	var req CreateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	resp, err := h.service.CreateTenantWithOwner(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, ErrSlugTaken) {
			httputil.Conflict(c, "SLUG_TAKEN", "this slug is already in use")
			return
		}
		httputil.InternalError(c)
		return
	}

	httputil.Created(c, resp)
}

func (h *Handler) UpdateSettings(c *gin.Context) {
	tenantIDVal, _ := c.Get(middleware.ContextTenantID)
	tenantID := tenantIDVal.(uuid.UUID)

	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.BadRequest(c, "VALIDATION_ERROR", err.Error())
		return
	}

	tenant, err := h.service.UpdateSettings(c.Request.Context(), tenantID, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			httputil.NotFound(c, "tenant not found")
			return
		}
		httputil.InternalError(c)
		return
	}

	httputil.OK(c, tenant)
}
