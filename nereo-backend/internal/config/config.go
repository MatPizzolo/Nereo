package config

import (
	"log/slog"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server      ServerConfig
	Database    DatabaseConfig
	Redis       RedisConfig
	JWT         JWTConfig
	MercadoPago MercadoPagoConfig
}

type ServerConfig struct {
	Port string
	Mode string // debug | release | test
}

type DatabaseConfig struct {
	URL string
}

type RedisConfig struct {
	URL string
}

type JWTConfig struct {
	Secret     string
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

type MercadoPagoConfig struct {
	AccessToken    string
	WebhookSecret  string
	BaseURL        string // https://api.mercadopago.com
	BackURLSuccess string
	BackURLFailure string
	BackURLPending string
}

func Load() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	// Defaults
	viper.SetDefault("GIN_MODE", "debug")
	viper.SetDefault("JWT_ACCESS_TTL", "15m")
	viper.SetDefault("JWT_REFRESH_TTL", "168h")

	if err := viper.ReadInConfig(); err != nil {
		// .env file is optional; env vars take precedence
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
	}

	accessTTL, err := time.ParseDuration(viper.GetString("JWT_ACCESS_TTL"))
	if err != nil {
		accessTTL = 15 * time.Minute
	}

	refreshTTL, err := time.ParseDuration(viper.GetString("JWT_REFRESH_TTL"))
	if err != nil {
		refreshTTL = 7 * 24 * time.Hour
	}

	mpBaseURL := viper.GetString("MP_BASE_URL")
	if mpBaseURL == "" {
		mpBaseURL = "https://api.mercadopago.com"
	}

	// Railway injects PORT; prefer it over SERVER_PORT
	port := viper.GetString("PORT")
	if port == "" {
		port = viper.GetString("SERVER_PORT")
	}
	if port == "" {
		port = "8080"
	}

	cfg := &Config{
		Server: ServerConfig{
			Port: port,
			Mode: viper.GetString("GIN_MODE"),
		},
		Database: DatabaseConfig{
			URL: viper.GetString("DATABASE_URL"),
		},
		Redis: RedisConfig{
			URL: viper.GetString("REDIS_URL"),
		},
		JWT: JWTConfig{
			Secret:     viper.GetString("JWT_SECRET"),
			AccessTTL:  accessTTL,
			RefreshTTL: refreshTTL,
		},
		MercadoPago: MercadoPagoConfig{
			AccessToken:    viper.GetString("MP_ACCESS_TOKEN"),
			WebhookSecret:  viper.GetString("MP_WEBHOOK_SECRET"),
			BaseURL:        mpBaseURL,
			BackURLSuccess: viper.GetString("MP_BACK_URL_SUCCESS"),
			BackURLFailure: viper.GetString("MP_BACK_URL_FAILURE"),
			BackURLPending: viper.GetString("MP_BACK_URL_PENDING"),
		},
	}

	return cfg, nil
}
