package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	// Retry connection up to 10 times (Railway services start in parallel)
	var pool *pgxpool.Pool
	for i := range 10 {
		pool, err = pgxpool.NewWithConfig(ctx, config)
		if err != nil {
			slog.Warn("database connection attempt failed, retrying...", "attempt", i+1, "error", err)
			time.Sleep(2 * time.Second)
			continue
		}

		if err = pool.Ping(ctx); err != nil {
			pool.Close()
			slog.Warn("database ping failed, retrying...", "attempt", i+1, "error", err)
			time.Sleep(2 * time.Second)
			continue
		}

		return pool, nil
	}

	return nil, fmt.Errorf("failed to connect to database after 10 attempts: %w", err)
}
