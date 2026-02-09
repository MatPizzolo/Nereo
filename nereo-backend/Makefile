.PHONY: build run test lint migrate-up migrate-down migrate-create docker-up docker-down

APP_NAME=nereo-api
BUILD_DIR=./bin

build:
	go build -o $(BUILD_DIR)/$(APP_NAME) ./cmd/api

run:
	go run ./cmd/api

test:
	go test ./... -race -coverprofile=coverage.out

lint:
	golangci-lint run ./...

migrate-up:
	go run ./cmd/api -migrate-up

migrate-down:
	go run ./cmd/api -migrate-down

migrate-create:
	@read -p "Migration name: " name; \
	migrate create -ext sql -dir migrations -seq $$name

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-build:
	docker compose up -d --build
