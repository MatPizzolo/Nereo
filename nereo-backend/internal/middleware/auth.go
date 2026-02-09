package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/nereo-ar/backend/internal/auth"
	"github.com/nereo-ar/backend/pkg/httputil"
)

const (
	ContextUserID   = "user_id"
	ContextTenantID = "tenant_id"
	ContextRole     = "role"
)

func AuthMiddleware(jwtManager *auth.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			httputil.Unauthorized(c, "missing authorization header")
			c.Abort()
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			httputil.Unauthorized(c, "invalid authorization format")
			c.Abort()
			return
		}

		claims, err := jwtManager.ValidateToken(parts[1])
		if err != nil {
			httputil.Unauthorized(c, "invalid or expired token")
			c.Abort()
			return
		}

		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextTenantID, claims.TenantID)
		c.Set(ContextRole, claims.Role)

		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	roleSet := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		roleSet[r] = struct{}{}
	}

	return func(c *gin.Context) {
		role, exists := c.Get(ContextRole)
		if !exists {
			httputil.Unauthorized(c, "missing role in context")
			c.Abort()
			return
		}

		if _, ok := roleSet[role.(string)]; !ok {
			httputil.Forbidden(c, "insufficient permissions")
			c.Abort()
			return
		}

		c.Next()
	}
}
