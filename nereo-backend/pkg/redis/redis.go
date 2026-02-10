package redis

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

func NewClient(ctx context.Context, redisURL string) (*redis.Client, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	client := redis.NewClient(opts)

	// Retry connection up to 10 times (Railway services start in parallel)
	for i := range 10 {
		if err = client.Ping(ctx).Err(); err != nil {
			slog.Warn("redis ping failed, retrying...", "attempt", i+1, "error", err)
			time.Sleep(2 * time.Second)
			continue
		}
		return client, nil
	}

	return nil, fmt.Errorf("failed to connect to redis after 10 attempts: %w", err)
}
