package payment

import (
	"context"
	"log/slog"
	"time"
)

// StartPastDueCron runs a background goroutine that cancels subscriptions
// that have been in past_due status for more than 7 days.
// Runs every 6 hours as specified in the roadmap.
func StartPastDueCron(repo *Repository) {
	ticker := time.NewTicker(6 * time.Hour)

	go func() {
		// Run once on startup after a short delay
		time.Sleep(30 * time.Second)
		cancelPastDueSubscriptions(repo)

		for range ticker.C {
			cancelPastDueSubscriptions(repo)
		}
	}()

	slog.Info("past_due cron started", "interval", "6h", "threshold", "7d")
}

func cancelPastDueSubscriptions(repo *Repository) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	ids, err := repo.GetPastDueSubscriptions(ctx, 7*24*time.Hour)
	if err != nil {
		slog.Error("cron: failed to get past_due subscriptions", "error", err)
		return
	}

	if len(ids) == 0 {
		return
	}

	slog.Info("cron: cancelling past_due subscriptions", "count", len(ids))

	for _, id := range ids {
		if err := repo.UpdateSubscriptionStatus(ctx, id, "cancelled"); err != nil {
			slog.Error("cron: failed to cancel subscription", "error", err, "subscription_id", id)
			continue
		}
		slog.Info("cron: subscription cancelled", "subscription_id", id)
	}
}
