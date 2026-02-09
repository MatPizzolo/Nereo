# ── Nereo AR — Makefile ────────────────────────────────
.PHONY: help up down build restart logs ps \
        db-up cache-up api-up ml-up front-up \
        api-logs ml-logs front-logs db-logs \
        api-shell ml-shell front-shell db-shell \
        migrate-up migrate-down \
        clean nuke

# ── Defaults ──────────────────────────────────────────
COMPOSE = docker compose
ENV_FILE = .env

# ── Help ──────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── Lifecycle ─────────────────────────────────────────
up: ## Start all services
	$(COMPOSE) up -d

down: ## Stop all services
	$(COMPOSE) down

build: ## Build (or rebuild) all images
	$(COMPOSE) build

restart: ## Restart all services
	$(COMPOSE) restart

logs: ## Tail logs from all services
	$(COMPOSE) logs -f --tail=100

ps: ## Show running containers
	$(COMPOSE) ps

# ── Individual Services ───────────────────────────────
db-up: ## Start only Postgres
	$(COMPOSE) up -d nereo-db

cache-up: ## Start only Redis
	$(COMPOSE) up -d nereo-cache

api-up: ## Start backend API (+ deps)
	$(COMPOSE) up -d nereo-api

ml-up: ## Start ML service (+ deps)
	$(COMPOSE) up -d nereo-ml

front-up: ## Start frontend (+ deps)
	$(COMPOSE) up -d nereo-front

# ── Logs ──────────────────────────────────────────────
api-logs: ## Tail API logs
	$(COMPOSE) logs -f --tail=100 nereo-api

ml-logs: ## Tail ML service logs
	$(COMPOSE) logs -f --tail=100 nereo-ml

front-logs: ## Tail frontend logs
	$(COMPOSE) logs -f --tail=100 nereo-front

db-logs: ## Tail database logs
	$(COMPOSE) logs -f --tail=100 nereo-db

# ── Shell Access ──────────────────────────────────────
api-shell: ## Open shell in API container
	$(COMPOSE) exec nereo-api sh

ml-shell: ## Open shell in ML container
	$(COMPOSE) exec nereo-ml bash

front-shell: ## Open shell in frontend container
	$(COMPOSE) exec nereo-front sh

db-shell: ## Open psql in database container
	$(COMPOSE) exec nereo-db psql -U nereo -d nereo

# ── Migrations ────────────────────────────────────────
migrate-up: ## Run database migrations
	$(COMPOSE) exec nereo-api /api -migrate-up

migrate-down: ## Rollback last migration
	$(COMPOSE) exec nereo-api /api -migrate-down

# ── Cleanup ───────────────────────────────────────────
clean: ## Stop containers and remove orphans
	$(COMPOSE) down --remove-orphans

nuke: ## ⚠️  Stop everything, remove volumes and images
	$(COMPOSE) down --volumes --rmi local --remove-orphans
