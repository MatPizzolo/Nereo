package middleware

import (
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const ContextLogger = "logger"

func LoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		traceID := c.GetHeader("X-Trace-ID")
		if traceID == "" {
			traceID = uuid.NewString()
		}

		tenantID, _ := c.Get(ContextTenantID)
		tenantStr := ""
		if tid, ok := tenantID.(uuid.UUID); ok {
			tenantStr = tid.String()
		}

		logger := slog.Default().With(
			slog.String("trace_id", traceID),
			slog.String("tenant_id", tenantStr),
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
		)
		c.Set(ContextLogger, logger)
		c.Header("X-Trace-ID", traceID)

		start := time.Now()
		c.Next()

		logger.Info("request completed",
			slog.Int("status", c.Writer.Status()),
			slog.Duration("latency", time.Since(start)),
		)
	}
}
