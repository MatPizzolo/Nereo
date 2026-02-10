package database

import (
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigrations(databaseURL, migrationsPath string) error {
	// Retry up to 10 times (Railway services start in parallel)
	var m *migrate.Migrate
	var err error
	for i := range 10 {
		m, err = migrate.New(
			fmt.Sprintf("file://%s", migrationsPath),
			databaseURL,
		)
		if err == nil {
			break
		}
		slog.Warn("migration connect failed, retrying...", "attempt", i+1, "error", err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		return fmt.Errorf("create migrator after 10 attempts: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			slog.Info("migrations: no changes")
			return nil
		}
		return fmt.Errorf("run migrations: %w", err)
	}

	slog.Info("migrations: applied successfully")
	return nil
}

func RollbackMigrations(databaseURL, migrationsPath string) error {
	m, err := migrate.New(
		fmt.Sprintf("file://%s", migrationsPath),
		databaseURL,
	)
	if err != nil {
		return fmt.Errorf("create migrator: %w", err)
	}
	defer m.Close()

	if err := m.Steps(-1); err != nil {
		return fmt.Errorf("rollback migration: %w", err)
	}

	slog.Info("migrations: rolled back one step")
	return nil
}
