package middleware

import (
	"fmt"
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nereo-ar/backend/pkg/httputil"
)

func TenantMiddleware(db *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantIDVal, exists := c.Get(ContextTenantID)
		if !exists {
			httputil.Unauthorized(c, "missing tenant context")
			c.Abort()
			return
		}

		tenantID, ok := tenantIDVal.(uuid.UUID)
		if !ok {
			httputil.Unauthorized(c, "invalid tenant id")
			c.Abort()
			return
		}

		// SET LOCAL doesn't support parameterized queries in PostgreSQL.
		// tenant_id is a validated UUID so it's safe from injection.
		query := fmt.Sprintf("SET LOCAL app.current_tenant = '%s'", tenantID.String())
		_, err := db.Exec(c.Request.Context(), query)
		if err != nil {
			slog.Error("failed to set tenant context", "error", err, "tenant_id", tenantID)
			httputil.InternalError(c)
			c.Abort()
			return
		}

		c.Next()
	}
}
