# ── Build ──────────────────────────────────────────────
FROM golang:1.24-alpine AS builder
RUN apk --no-cache add git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /api ./cmd/api

# ── Run ────────────────────────────────────────────────
FROM alpine:3.20
LABEL org.opencontainers.image.source="https://github.com/nereo-ar/backend"
RUN apk --no-cache add ca-certificates tzdata
RUN adduser -D -u 1000 nereo
WORKDIR /app
COPY --from=builder /api /app/api
COPY migrations /app/migrations
USER nereo
EXPOSE 8080
ENV PORT=8080
CMD ["/app/api"]
