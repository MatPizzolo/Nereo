package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nereo-ar/backend/internal/auth"
	"github.com/nereo-ar/backend/internal/config"
	"github.com/nereo-ar/backend/internal/membership"
	mw "github.com/nereo-ar/backend/internal/middleware"
	"github.com/nereo-ar/backend/internal/payment"
	"github.com/nereo-ar/backend/internal/tenant"
	"github.com/nereo-ar/backend/pkg/database"
	redisPkg "github.com/nereo-ar/backend/pkg/redis"
	goredis "github.com/redis/go-redis/v9"
)

func main() {
	migrateUp := flag.Bool("migrate-up", false, "Run database migrations up")
	migrateDown := flag.Bool("migrate-down", false, "Rollback last database migration")
	flag.Parse()

	// Structured JSON logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// Load config
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Handle migration commands
	if *migrateUp {
		if err := database.RunMigrations(cfg.Database.URL, "migrations"); err != nil {
			slog.Error("migration up failed", "error", err)
			os.Exit(1)
		}
		return
	}
	if *migrateDown {
		if err := database.RollbackMigrations(cfg.Database.URL, "migrations"); err != nil {
			slog.Error("migration down failed", "error", err)
			os.Exit(1)
		}
		return
	}

	ctx := context.Background()

	// Run migrations automatically on startup
	slog.Info("running database migrations")
	if err := database.RunMigrations(cfg.Database.URL, "migrations"); err != nil {
		slog.Error("auto migration failed", "error", err)
		os.Exit(1)
	}

	// Connect to PostgreSQL
	db, err := database.NewPool(ctx, cfg.Database.URL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	slog.Info("connected to PostgreSQL")

	// Connect to Redis
	redisClient, err := redisPkg.NewClient(ctx, cfg.Redis.URL)
	if err != nil {
		slog.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	defer redisClient.Close()
	slog.Info("connected to Redis")

	// Setup router
	gin.SetMode(cfg.Server.Mode)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(mw.LoggingMiddleware())
	router.Use(mw.CORSMiddleware(cfg.Server.CORSOrigins))

	// Initialize services
	jwtManager := auth.NewJWTManager(cfg.JWT.Secret, cfg.JWT.AccessTTL, cfg.JWT.RefreshTTL)
	authHandler := auth.NewHandler(db, jwtManager, redisClient)
	tenantService := tenant.NewService(db)
	tenantHandler := tenant.NewHandler(tenantService)
	membershipService := membership.NewService(db)
	membershipHandler := membership.NewHandler(membershipService)

	// Mercado Pago
	mpClient := payment.NewMercadoPagoClient(cfg.MercadoPago)
	paymentRepo := payment.NewRepository(db)
	paymentHandler := payment.NewHandler(mpClient, paymentRepo, cfg.MercadoPago.WebhookSecret)

	// Start background cron for past_due subscriptions
	payment.StartPastDueCron(paymentRepo)

	// Register routes
	registerRoutes(router, db, jwtManager, redisClient, authHandler, tenantHandler, membershipHandler, paymentHandler)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("server starting", "addr", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("shutting down server")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}

	slog.Info("server stopped")
}

func registerRoutes(
	router *gin.Engine,
	db *pgxpool.Pool,
	jwtManager *auth.JWTManager,
	redisClient *goredis.Client,
	authHandler *auth.Handler,
	tenantHandler *tenant.Handler,
	membershipHandler *membership.Handler,
	paymentHandler *payment.Handler,
) {
	// Health checks
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.GET("/readyz", func(c *gin.Context) {
		if err := db.Ping(c.Request.Context()); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready", "db": "down"})
			return
		}
		if err := redisClient.Ping(c.Request.Context()).Err(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready", "redis": "down"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	api := router.Group("/api/v1")

	// Public routes
	api.POST("/tenants", tenantHandler.Register)
	api.POST("/auth/login", authHandler.Login)
	api.POST("/auth/refresh", authHandler.Refresh)

	// Webhook (public, verified by HMAC signature)
	api.POST("/webhooks/mercadopago", paymentHandler.HandleWebhook)

	// Authenticated routes
	authenticated := api.Group("")
	authenticated.Use(mw.AuthMiddleware(jwtManager))
	authenticated.Use(mw.TenantMiddleware(db))

	// Auth
	authenticated.POST("/auth/logout", authHandler.Logout)

	// Tenant settings (owner only)
	authenticated.PUT("/tenants/settings",
		mw.RequireRole("owner"),
		tenantHandler.UpdateSettings,
	)

	// Plans
	authenticated.GET("/plans",
		mw.RequireRole("owner", "manager", "employee"),
		membershipHandler.ListPlans,
	)
	authenticated.GET("/plans/:id",
		mw.RequireRole("owner", "manager", "employee"),
		membershipHandler.GetPlan,
	)
	authenticated.POST("/plans",
		mw.RequireRole("owner", "manager"),
		membershipHandler.CreatePlan,
	)
	authenticated.PUT("/plans/:id",
		mw.RequireRole("owner", "manager"),
		membershipHandler.UpdatePlan,
	)
	authenticated.DELETE("/plans/:id",
		mw.RequireRole("owner"),
		membershipHandler.DeactivatePlan,
	)

	// Subscriptions
	authenticated.POST("/subscriptions",
		mw.RequireRole("owner", "manager"),
		membershipHandler.CreateSubscription,
	)
	authenticated.GET("/subscriptions",
		mw.RequireRole("owner", "manager"),
		membershipHandler.ListSubscriptions,
	)
	authenticated.POST("/subscriptions/:id/cancel",
		mw.RequireRole("owner", "manager"),
		membershipHandler.CancelSubscription,
	)
	authenticated.GET("/subscriptions/:id/validate",
		mw.RequireRole("owner", "manager", "employee"),
		membershipHandler.ValidateSubscription,
	)

	// Payments - Mercado Pago
	authenticated.POST("/payments/preference",
		mw.RequireRole("owner", "manager"),
		paymentHandler.CreatePreference,
	)
	authenticated.POST("/payments/subscription",
		mw.RequireRole("owner", "manager"),
		paymentHandler.CreateSubscriptionMP,
	)

	// Payments - Manual
	authenticated.POST("/payments/manual",
		mw.RequireRole("owner", "manager"),
		paymentHandler.RegisterManualPayment,
	)
	authenticated.POST("/subscriptions/:id/renew-manual",
		mw.RequireRole("owner", "manager"),
		paymentHandler.RenewManual,
	)
}
