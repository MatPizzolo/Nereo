# Roadmap Backend — nereo AR (SaaS)

> **Contexto:** nereo AR es un SaaS para la gestión de lavaderos de autos y centros de detailing en Argentina. El objetivo es convertir lavaderos tradicionales en modelos de suscripción recurrente.
>
> **Stack principal:** Go 1.22+ (Gin o Fiber), PostgreSQL 16, Redis 7, Docker. Microservicio auxiliar en FastAPI (Python 3.12) para ML/Weather.
>
> **Arquitectura:** Monolito modular en Go (separación por paquetes `internal/`) con un microservicio Python desacoplado vía HTTP/gRPC. Multi-tenant con aislamiento por `tenant_id` a nivel de fila (Row-Level Security).

---

## 0. Decisiones de Arquitectura

### 0.1 Estrategia Multi-tenant: Row-Level Security (RLS)

Se adopta **tenant_id por fila** en lugar de esquemas separados por las siguientes razones:

| Criterio | tenant_id por fila (RLS) | Esquema por tenant |
|---|---|---|
| Complejidad de migraciones | Baja (una sola migración) | Alta (N migraciones) |
| Costo operativo | Bajo | Alto (conexiones por esquema) |
| Aislamiento de datos | Fuerte con RLS de Postgres | Nativo |
| Escalabilidad a +500 tenants | Excelente | Problemática |

**Implementación concreta:**

```sql
-- Cada tabla incluye tenant_id NOT NULL
-- Se habilita RLS y se crea una policy por tabla:
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

En Go, un **middleware** setea `app.current_tenant` en cada request:

```go
func TenantMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        tenantID := extractTenantFromJWT(c)
        db.Exec("SET LOCAL app.current_tenant = $1", tenantID)
        c.Next()
    }
}
```

### 0.2 Estructura de Proyecto (Go)

```
nereo-backend/
├── cmd/
│   └── api/main.go              # Entrypoint
├── internal/
│   ├── config/                   # Env vars, Viper
│   ├── middleware/                # Auth, Tenant, CORS, RateLimit
│   ├── tenant/                   # Tenant CRUD, onboarding
│   ├── auth/                     # JWT, RBAC
│   ├── membership/               # Planes, suscripciones
│   ├── payment/                  # Mercado Pago adapter
│   ├── booking/                  # Motor de turnos
│   ├── notification/             # WhatsApp, push, Redis pub/sub
│   ├── fiscal/                   # AFIP adapter
│   └── analytics/                # Queries de reporting
├── pkg/
│   ├── database/                 # Pool PGX, migraciones
│   ├── redis/                    # Cliente Redis
│   └── httputil/                 # Helpers de response/error
├── migrations/                   # SQL (golang-migrate)
├── docker-compose.yml
├── Dockerfile
├── Makefile
└── .env.example
```

---

## Fase 1: Core & Multi-tenancy (Go + Gin/Fiber)

### 1.1 Configuración de Proyecto
- [x] Inicializar módulo Go (`go mod init github.com/nereo-ar/backend`).
- [x] Crear `docker-compose.yml` con servicios:
    - `postgres:16-alpine` (puerto 5432, volumen persistente).
    - `redis:7-alpine` (puerto 6379).
    - `api` (build desde Dockerfile multi-stage).
- [x] Configurar variables de entorno con Viper (`internal/config`):
    - `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `MP_ACCESS_TOKEN`, etc.
- [x] Integrar `golang-migrate` para migraciones versionadas en `migrations/`.
- [x] Configurar linter (`golangci-lint`) y Makefile con targets: `build`, `run`, `migrate-up`, `migrate-down`, `test`, `lint`.

### 1.2 Diseño de Base de Datos (PostgreSQL 16)

#### Tabla `tenants`
```sql
CREATE TABLE tenants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(255) NOT NULL,           -- "Lavadero Don Carlos"
    slug          VARCHAR(100) UNIQUE NOT NULL,     -- "don-carlos" (subdominio)
    owner_email   VARCHAR(255) NOT NULL,
    plan          VARCHAR(50) NOT NULL DEFAULT 'free', -- free | pro | enterprise
    timezone      VARCHAR(50) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    settings      JSONB NOT NULL DEFAULT '{}',      -- config específica (boxes, horarios)
    buffer_between_slots INTEGER NOT NULL DEFAULT 10, -- minutos de buffer entre turnos (5-15 min)
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Tabla `users` (con RBAC)
```sql
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'employee');

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    phone       VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    role        user_role NOT NULL DEFAULT 'employee',
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

#### Tabla `customers` (clientes finales del lavadero)
```sql
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(30) NOT NULL,          -- clave para WhatsApp
    email           VARCHAR(255),
    vehicle_plate   VARCHAR(20),
    vehicle_model   VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, phone)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

#### Tabla `membership_plans`
```sql
CREATE TABLE membership_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,          -- "Plan Básico", "Plan Premium"
    description     TEXT,
    price_cents     INTEGER NOT NULL,               -- en centavos ARS
    currency        VARCHAR(3) NOT NULL DEFAULT 'ARS',
    interval        VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly | weekly
    wash_limit      INTEGER,                        -- NULL = ilimitado
    includes        JSONB NOT NULL DEFAULT '[]',    -- ["lavado_exterior","aspirado"]
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON membership_plans
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

#### Tabla `subscriptions`
```sql
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'past_due');

CREATE TYPE payment_method_type AS ENUM ('mercadopago', 'manual');

CREATE TABLE subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id         UUID NOT NULL REFERENCES customers(id),
    plan_id             UUID NOT NULL REFERENCES membership_plans(id),
    payment_method      payment_method_type NOT NULL DEFAULT 'mercadopago',
    mp_subscription_id  VARCHAR(255),               -- ID de Mercado Pago (NULL para manuales)
    status              subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,
    washes_used         INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON subscriptions
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE INDEX idx_subscriptions_customer ON subscriptions(tenant_id, customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(tenant_id, status);
```

### 1.3 Auth System (JWT + RBAC)
- [x] **Registro de Tenant (Onboarding):**
    - Endpoint `POST /api/v1/tenants` → crea tenant + user owner en una transacción.
    - Envía email de verificación (opcional Fase 1, puede ser manual).
- [x] **Login:** `POST /api/v1/auth/login` → valida credenciales, retorna access_token (15 min) + refresh_token (7 días).
    - JWT payload:
      ```json
      {
        "sub": "<user_id>",
        "tid": "<tenant_id>",
        "role": "owner",
        "exp": 1700000000
      }
      ```
- [x] **Middleware Auth:** Extrae y valida JWT, inyecta `tenant_id` y `user_id` en el contexto de Gin.
- [x] **Middleware RBAC:** Decorador por endpoint que verifica `role` mínimo requerido.
    ```go
    router.POST("/plans", auth.RequireRole("owner", "manager"), planHandler.Create)
    router.GET("/plans", auth.RequireRole("owner", "manager", "employee"), planHandler.List)
    ```
- [x] **Refresh Token:** `POST /api/v1/auth/refresh` → rota refresh token (stored en Redis con TTL).

### 1.4 API de Membresías (Core)
- [x] **CRUD de Planes:**
    - `POST   /api/v1/plans` → Crear plan (owner/manager).
    - `GET    /api/v1/plans` → Listar planes activos.
    - `GET    /api/v1/plans/:id` → Detalle de plan.
    - `PUT    /api/v1/plans/:id` → Actualizar plan.
    - `DELETE /api/v1/plans/:id` → Soft-delete (active=false).
- [x] **Suscripción de Cliente:**
    - `POST /api/v1/subscriptions` → Asociar customer a plan. Acepta campo `payment_method`:
      - `"mercadopago"` → Inicia cobro vía MP (flujo estándar).
      - `"manual"` → Activa la suscripción inmediatamente sin pasar por MP (pago en efectivo/transferencia).
    - `GET  /api/v1/subscriptions?customer_id=X` → Listar suscripciones.
    - `POST /api/v1/subscriptions/:id/cancel` → Cancelar en MP (si aplica) + marcar cancelled.
- [x] **Activación Manual (Cash Payment):**
    - Cuando `payment_method = "manual"`, el endpoint:
      1. Crea la suscripción con `status = 'active'` y `mp_subscription_id = NULL`.
      2. Registra un `payment_event` con `source = 'manual'` y `status = 'approved'`.
      3. Setea `current_period_start = NOW()` y `current_period_end = NOW() + plan.interval`.
    - Solo roles `owner` y `manager` pueden crear suscripciones manuales.
    - El dashboard muestra un badge "Manual" vs "MP" para distinguir el origen del pago.
- [x] **Validación de Membresía Activa:**
    - `GET /api/v1/subscriptions/:id/validate` → Retorna `{ valid: bool, washes_remaining: int|null, expires_at: string, payment_method: string }`.
    - Usado por el frontend y por el motor de turnos antes de confirmar un lavado.
    - La validación es agnóstica al método de pago: solo verifica `status = 'active'` y `current_period_end > NOW()`.

---

## Fase 2: Integraciones Financieras — Mercado Pago (Go)

### 2.1 Configuración de Mercado Pago
- [x] Registrar aplicación en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers).
- [x] Obtener `ACCESS_TOKEN` (producción) y `TEST_ACCESS_TOKEN` (sandbox).
- [x] Almacenar tokens en variables de entorno, **nunca en código**.
- [x] Crear adapter `internal/payment/mercadopago.go` con cliente HTTP dedicado (timeouts, retries con backoff exponencial).

### 2.2 Checkout Pro para Membresías
- [x] Endpoint `POST /api/v1/payments/preference`:
    - Recibe `plan_id` y `customer_id`.
    - Llama a `POST https://api.mercadopago.com/checkout/preferences` con:
      ```json
      {
        "items": [{ "title": "Plan Premium - Lavadero X", "quantity": 1, "unit_price": 15000.00, "currency_id": "ARS" }],
        "back_urls": { "success": "...", "failure": "...", "pending": "..." },
        "notification_url": "https://api.nereo.ar/api/v1/webhooks/mercadopago",
        "external_reference": "<subscription_id>",
        "metadata": { "tenant_id": "...", "customer_id": "..." }
      }
      ```
    - Retorna `init_point` (URL de pago) al frontend.

### 2.3 Suscripciones Recurrentes (Preapproval)
- [x] Endpoint `POST /api/v1/payments/subscription`:
    - Llama a `POST https://api.mercadopago.com/preapproval` con:
      ```json
      {
        "reason": "Suscripción Plan Premium - Lavadero Don Carlos",
        "auto_recurring": {
          "frequency": 1,
          "frequency_type": "months",
          "transaction_amount": 15000.00,
          "currency_id": "ARS"
        },
        "back_url": "https://app.nereo.ar/subscription/confirmed",
        "payer_email": "cliente@email.com",
        "external_reference": "<subscription_id>"
      }
      ```
    - Almacenar `mp_subscription_id` en tabla `subscriptions`.

### 2.4 Webhooks de Mercado Pago
- [x] Endpoint `POST /api/v1/webhooks/mercadopago`:
    - **Verificar firma HMAC** del header `x-signature` con el `webhook_secret`.
    - Parsear `topic` y `id` del body.
    - Según `topic`:
        - `payment` → Consultar `GET /v1/payments/:id`, actualizar estado de suscripción.
        - `subscription_preapproval` → Actualizar estado de preapproval.
    - **Idempotencia:** Guardar `payment_id` procesado en tabla `payment_events` para evitar duplicados.
    - Retornar `200 OK` inmediatamente; procesar en background (goroutine o Redis queue).

### 2.5 Registro de Pago Manual (Cash / Transferencia)
- [x] Endpoint `POST /api/v1/payments/manual`:
    - Solo `owner` y `manager`.
    - Recibe `{ subscription_id, amount_cents, notes }`.
    - Crea `payment_event` con `source = 'manual'`, `status = 'approved'`, `recorded_by = user_id` del JWT.
    - Activa o renueva la suscripción: setea `status = 'active'`, recalcula `current_period_end`.
    - Ejemplo de uso: el dueño cobra en efectivo en el mostrador y registra el pago desde el panel.
- [x] Endpoint `POST /api/v1/subscriptions/:id/renew-manual`:
    - Para renovar manualmente una suscripción vencida o `past_due`.
    - Misma lógica que arriba pero específico para renovaciones.

### 2.6 Manejo de Cobros Fallidos y Reintentos
- [x] Crear tabla `payment_events`:
    ```sql
    CREATE TYPE payment_source AS ENUM ('mercadopago', 'manual');

    CREATE TABLE payment_events (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL REFERENCES tenants(id),
        subscription_id UUID REFERENCES subscriptions(id),
        source          payment_source NOT NULL DEFAULT 'mercadopago',
        mp_payment_id   VARCHAR(255),               -- NULL para pagos manuales
        status          VARCHAR(50) NOT NULL,        -- approved, rejected, pending, refunded
        amount_cents    INTEGER NOT NULL,
        notes           TEXT,                        -- "Pago en efectivo", "Transferencia CBU xxx"
        recorded_by     UUID REFERENCES users(id),   -- user que registró el pago manual (NULL si webhook)
        raw_payload     JSONB NOT NULL DEFAULT '{}', -- {} para manuales, payload completo para MP
        processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (mp_payment_id)                       -- permite NULLs (unique ignora NULLs en Postgres)
    );
    ```
    > **Nota:** `mp_payment_id` ya no es `NOT NULL` para soportar pagos manuales. La constraint `UNIQUE` en PostgreSQL ignora valores `NULL`, por lo que múltiples pagos manuales pueden coexistir sin conflicto.
- [x] **Lógica de retry ante `rejected`:**
    1. Webhook recibe `payment.rejected`.
    2. Marcar suscripción como `past_due`.
    3. Programar notificación al cliente vía WhatsApp: "Tu pago fue rechazado, actualizá tu medio de pago."
    4. MP reintenta automáticamente (configurable en el dashboard de MP, típicamente 3 reintentos en 7 días).
    5. Si tras N días sigue `past_due` → marcar `cancelled`, notificar al owner.
- [x] **Cron job** (goroutine con ticker o worker Redis):
    - Cada 6 horas: revisar suscripciones `past_due` con más de 7 días → cancelar automáticamente.

---

## Fase 3: Operaciones — Motor de Turnos & WhatsApp (Go)

### 3.1 Modelo de Datos de Turnos

#### Tabla `services` (catálogo de servicios por tenant)
```sql
CREATE TABLE services (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,             -- "Lavado Exterior", "Detailing Completo"
    description         TEXT,
    duration_minutes    INTEGER NOT NULL,                   -- 30, 60, 90, etc.
    base_price_cents    INTEGER NOT NULL,                   -- precio base en centavos ARS
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON services
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

#### Tabla `wash_boxes`
```sql
CREATE TABLE wash_boxes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,             -- "Box 1", "Box VIP"
    active      BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE wash_boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON wash_boxes
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

#### Tabla de relación `wash_box_services` (qué servicios ofrece cada box)
```sql
CREATE TABLE wash_box_services (
    box_id      UUID NOT NULL REFERENCES wash_boxes(id) ON DELETE CASCADE,
    service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (box_id, service_id)
);
```

#### Tabla `bookings` (con `service_id` y `ends_at` auto-calculado)
```sql
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    box_id          UUID NOT NULL REFERENCES wash_boxes(id),
    service_id      UUID NOT NULL REFERENCES services(id),
    subscription_id UUID REFERENCES subscriptions(id),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,              -- auto-calculado: starts_at + service.duration_minutes + tenant.buffer_between_slots
    status          VARCHAR(20) NOT NULL DEFAULT 'confirmed', -- confirmed, in_progress, completed, cancelled, no_show
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Constraint anti-overbooking a nivel de DB (el rango ya incluye el buffer)
    EXCLUDE USING gist (
        box_id WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    )
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bookings
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE INDEX idx_bookings_box_time ON bookings(tenant_id, box_id, starts_at, ends_at);
```

**Cálculo automático de `ends_at` (capa de aplicación):**

```go
func (s *BookingService) calculateEndsAt(ctx context.Context, tenantID, serviceID uuid.UUID, startsAt time.Time) (time.Time, error) {
    service, err := s.serviceRepo.GetByID(ctx, serviceID)
    if err != nil { return time.Time{}, err }

    tenant, err := s.tenantRepo.GetByID(ctx, tenantID)
    if err != nil { return time.Time{}, err }

    totalMinutes := service.DurationMinutes + tenant.BufferBetweenSlots
    return startsAt.Add(time.Duration(totalMinutes) * time.Minute), nil
}
```

> **Nota:** `ends_at` se persiste con el buffer incluido. Esto garantiza que el `EXCLUDE USING gist` constraint impida solapamientos incluyendo el tiempo de maniobra entre autos. El frontend muestra al cliente solo la duración del servicio (sin buffer).

### 3.2 Lógica Anti-Overbooking (Doble Barrera)

**Barrera 1 — Exclusion Constraint en PostgreSQL (arriba):** Usa la extensión `btree_gist` para impedir rangos de tiempo superpuestos en el mismo box a nivel de base de datos. Esto es la garantía definitiva.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

**Barrera 2 — Lock optimista con Redis (capa de aplicación):**

```go
func (s *BookingService) CreateBooking(ctx context.Context, req CreateBookingRequest) (*Booking, error) {
    // 1. Calcular ends_at incluyendo buffer del tenant
    endsAt, err := s.calculateEndsAt(ctx, req.TenantID, req.ServiceID, req.StartsAt)
    if err != nil { return nil, err }

    lockKey := fmt.Sprintf("lock:booking:%s:%s:%d", req.TenantID, req.BoxID, req.StartsAt.Unix())

    // 2. Intentar adquirir lock en Redis (TTL 10s)
    acquired, err := s.redis.SetNX(ctx, lockKey, "1", 10*time.Second).Result()
    if err != nil || !acquired {
        return nil, ErrSlotTemporarilyLocked
    }
    defer s.redis.Del(ctx, lockKey)

    // 3. Verificar disponibilidad (query SELECT con FOR UPDATE)
    //    El rango [starts_at, ends_at) ya incluye el buffer, por lo que
    //    la query detecta colisiones con el tiempo de maniobra incluido.
    available, err := s.repo.IsSlotAvailable(ctx, req.TenantID, req.BoxID, req.StartsAt, endsAt)
    if err != nil { return nil, err }
    if !available { return nil, ErrSlotNotAvailable }

    // 4. Validar que el box ofrece el servicio solicitado
    offers, err := s.repo.BoxOffersService(ctx, req.BoxID, req.ServiceID)
    if err != nil { return nil, err }
    if !offers { return nil, ErrServiceNotAvailableInBox }

    // 5. Insertar booking (el EXCLUDE constraint es la última línea de defensa)
    booking, err := s.repo.InsertBooking(ctx, CreateBookingParams{
        TenantID:       req.TenantID,
        CustomerID:     req.CustomerID,
        BoxID:          req.BoxID,
        ServiceID:      req.ServiceID,
        SubscriptionID: req.SubscriptionID,
        StartsAt:       req.StartsAt,
        EndsAt:         endsAt,
    })
    if err != nil { return nil, err }

    return booking, nil
}
```

**Barrera 3 — Buffer Time entre turnos:**

El `buffer_between_slots` (configurable por tenant, default 10 min) se suma a la duración del servicio al calcular `ends_at`. Esto significa que:
- Un servicio de 45 min con buffer de 10 min ocupa un rango de 55 min en el constraint `EXCLUDE`.
- El siguiente turno en ese box solo puede empezar después de que termine el rango completo (servicio + buffer).
- El owner puede ajustar el buffer desde `PUT /api/v1/tenants/settings` (mínimo 0, máximo 30 min).

**Flujo completo:**
1. `calculateEndsAt()` → suma `service.duration_minutes` + `tenant.buffer_between_slots` a `starts_at`.
2. Redis `SETNX` → evita race conditions entre requests concurrentes al mismo slot.
3. `SELECT ... FOR UPDATE` → bloqueo pesimista en la fila para verificar disponibilidad (con buffer incluido).
4. Validación de que el box ofrece el servicio solicitado.
5. `INSERT` con `EXCLUDE USING gist` → constraint final que rechaza el insert si hay overlap.

### 3.3 Endpoints de Servicios
- [ ] `POST   /api/v1/services` → Crear servicio (owner/manager).
- [ ] `GET    /api/v1/services` → Listar servicios activos del tenant.
- [ ] `GET    /api/v1/services/:id` → Detalle de servicio.
- [ ] `PUT    /api/v1/services/:id` → Actualizar servicio (nombre, duración, precio).
- [ ] `DELETE /api/v1/services/:id` → Soft-delete (active=false).

### 3.4 Endpoints de Turnos
- [ ] `GET  /api/v1/bookings/availability?box_id=X&service_id=Y&date=2025-03-15` → Retorna slots disponibles (calcula huecos considerando `duration_minutes` + `buffer_between_slots`).
- [ ] `POST /api/v1/bookings` → Crear turno. Recibe `{ box_id, service_id, customer_id, starts_at }`. El backend calcula `ends_at` automáticamente. Valida membresía activa si aplica.
- [ ] `GET  /api/v1/bookings?date=2025-03-15` → Listar turnos del día (vista de empleado).
- [ ] `PATCH /api/v1/bookings/:id/status` → Cambiar estado (in_progress, completed, no_show).
- [ ] `DELETE /api/v1/bookings/:id` → Cancelar turno (solo si faltan > 2 horas).

### 3.5 WhatsApp Bridge
- [ ] **Opción A — ManyChat / Chatbot externo:**
    - Configurar webhook en ManyChat que llame a `POST /api/v1/whatsapp/incoming`.
    - Parsear intent del mensaje (ej: "quiero turno para mañana 10am").
    - Responder con slots disponibles o confirmación.
- [ ] **Opción B — WhatsApp Business API (Cloud API de Meta):**
    - Registrar número de negocio en Meta Business Suite.
    - Webhook `POST /api/v1/whatsapp/webhook` para recibir mensajes.
    - Enviar mensajes con templates aprobados (confirmación de turno, recordatorio, etc.).
- [ ] **Identificación de tenant:** El número de WhatsApp del lavadero se mapea a un `tenant_id` en tabla `whatsapp_numbers`.
- [ ] **Phone Normalizer (E.164):**
    - Implementar función `NormalizePhoneAR(raw string) (string, error)` en `pkg/phone/normalize.go`.
    - Todos los números en `customers.phone` y `whatsapp_numbers` deben almacenarse en formato **E.164**.
    - Reglas específicas para Argentina:
      ```
      Entrada              → Salida E.164
      "1155667788"         → "+5491155667788"   (celular AMBA, agrega +549)
      "01155667788"        → "+5491155667788"   (con prefijo 0, normaliza)
      "1544332211"         → "+5491544332211"   (celular interior)
      "+541155667788"      → "+5491155667788"   (falta el 9 de celular, se inserta)
      "+5491155667788"     → "+5491155667788"   (ya normalizado)
      "261 555 1234"       → "+5492615551234"   (Mendoza, celular)
      ```
    - Aplicar normalización en:
      1. `POST /api/v1/customers` (al crear).
      2. `PUT /api/v1/customers/:id` (al actualizar).
      3. Webhook de WhatsApp incoming (antes de buscar al customer).
    - **Migración de datos existentes:** Script SQL o Go que recorra `customers` y normalice todos los `phone` existentes.
    - Validar con regex que el resultado final matchee `^\+[1-9]\d{10,14}$`.

### 3.6 Notificaciones (Redis Pub/Sub + Workers)
- [ ] **Eventos publicados en Redis:**
    - `wash:completed:{tenant_id}` → Payload: `{ customer_id, booking_id }`.
    - `subscription:past_due:{tenant_id}` → Payload: `{ customer_id, subscription_id }`.
    - `booking:reminder:{tenant_id}` → Payload: `{ customer_id, booking_id, starts_at }`.
- [ ] **Worker de notificaciones** (goroutine dedicada):
    - Suscribe a canales Redis.
    - Envía mensaje de WhatsApp al customer: "Tu auto ya está listo 🚗✨".
    - Fallback a SMS si WhatsApp falla (Twilio como backup).
- [ ] **Scheduler de recordatorios:**
    - Cron cada 30 min: buscar bookings que empiezan en < 2 horas → publicar `booking:reminder`.

---

## Fase 4: Inteligencia — Microservicio ML (FastAPI + Python)

### 4.1 Estructura del Microservicio

```
nereo-ml/
├── app/
│   ├── main.py                   # FastAPI app
│   ├── routers/
│   │   ├── weather.py
│   │   └── predictions.py
│   ├── services/
│   │   ├── weather_service.py    # OpenWeather client
│   │   └── demand_predictor.py   # ML model
│   ├── models/
│   │   └── schemas.py            # Pydantic models
│   └── config.py
├── ml/
│   ├── train.py                  # Script de entrenamiento
│   └── model.joblib              # Modelo serializado
├── requirements.txt
├── Dockerfile
└── tests/
```

### 4.2 Weather Service
- [ ] Integrar OpenWeather API (`/data/2.5/forecast`).
- [ ] Endpoint `GET /api/v1/weather/forecast?lat=-34.6&lon=-58.4&days=3`.
- [ ] Cache de respuestas en Redis (TTL 1 hora) para evitar rate limits.
- [ ] Retornar datos normalizados: `{ date, temp_c, humidity, rain_probability, condition }`.

### 4.3 ML Demand Predictor
- [ ] **Features del modelo:**
    - Día de la semana (one-hot).
    - Hora del día.
    - Temperatura, humedad, probabilidad de lluvia.
    - Historial de bookings (media móvil 4 semanas).
    - Feriados argentinos (flag binario).
- [ ] **Modelo:** Gradient Boosting (scikit-learn o LightGBM). Empezar simple, iterar.
- [ ] **Entrenamiento:** Script offline `ml/train.py` que lee datos de PostgreSQL (vía conexión directa o dump CSV).
- [ ] **Endpoint:** `POST /api/v1/predictions/demand`:
    ```json
    // Request
    { "tenant_id": "...", "date": "2025-03-20", "hour_range": [8, 20] }
    // Response
    {
      "predictions": [
        { "hour": 8, "expected_bookings": 2, "confidence": 0.85 },
        { "hour": 9, "expected_bookings": 5, "confidence": 0.90 }
      ],
      "suggested_discount": { "apply": true, "percent": 15, "reason": "Lluvia pronosticada, demanda baja esperada" }
    }
    ```
- [ ] **Comunicación Go ↔ FastAPI:** HTTP interno (Docker network). El backend Go llama al microservicio Python. No exponer FastAPI al público.

---

## Fase 5: Fiscal & Reporting

### 5.1 Módulo AFIP (Factura Electrónica)
- [ ] Integrar con AFIP vía Web Service WSFE (SOAP) o usar SDK como `afip.js` adaptado / librería Go.
- [ ] **Flujo:**
    1. Al completarse un pago → generar factura tipo B o C.
    2. Llamar a WSFE `FECAESolicitar` para obtener CAE.
    3. Almacenar CAE y número de comprobante en tabla `invoices`.
    4. Generar PDF de factura (template HTML → PDF con `wkhtmltopdf` o librería Go).
- [ ] Tabla `invoices`:
    ```sql
    CREATE TABLE invoices (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id       UUID NOT NULL REFERENCES tenants(id),
        subscription_id UUID REFERENCES subscriptions(id),
        customer_id     UUID NOT NULL REFERENCES customers(id),
        cae             VARCHAR(20),
        cae_expiry      DATE,
        invoice_number  BIGINT NOT NULL,
        invoice_type    VARCHAR(5) NOT NULL,         -- "B", "C"
        total_cents     INTEGER NOT NULL,
        issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        pdf_url         VARCHAR(500)
    );
    ```
- [ ] **Nota:** AFIP es complejo. Evaluar usar un servicio intermediario (ej: Facturante, TusFacturas) en Fase 1 y migrar a integración directa después.

### 5.2 Dashboard Analytics (Aggregations)
- [ ] **Endpoints de reporting:**
    - `GET /api/v1/analytics/revenue?period=daily&from=2025-03-01&to=2025-03-31`
    - `GET /api/v1/analytics/bookings?period=weekly`
    - `GET /api/v1/analytics/churn` → Tasa de cancelación de suscripciones.
    - `GET /api/v1/analytics/top-customers?limit=10`
- [ ] **Implementación:** Queries SQL con `GROUP BY` + funciones de ventana. Para volúmenes altos, considerar materialized views refrescadas cada hora.
    ```sql
    CREATE MATERIALIZED VIEW mv_daily_revenue AS
    SELECT
        tenant_id,
        DATE(processed_at) AS day,
        SUM(amount_cents) AS total_cents,
        COUNT(*) AS payment_count
    FROM payment_events
    WHERE status = 'approved'
    GROUP BY tenant_id, DATE(processed_at);
    ```

---

## Fase 6: Infraestructura & Deployment

### 6.1 Docker
- [ ] **Dockerfile multi-stage** para el backend Go:
    ```dockerfile
    # Build
    FROM golang:1.22-alpine AS builder
    WORKDIR /app
    COPY go.mod go.sum ./
    RUN go mod download
    COPY . .
    RUN CGO_ENABLED=0 GOOS=linux go build -o /api ./cmd/api

    # Run
    FROM alpine:3.19
    RUN apk --no-cache add ca-certificates tzdata
    COPY --from=builder /api /api
    EXPOSE 8080
    CMD ["/api"]
    ```
- [ ] **docker-compose.yml** completo:
    ```yaml
    version: "3.9"
    services:
      postgres:
        image: postgres:16-alpine
        environment:
          POSTGRES_DB: nereo
          POSTGRES_USER: nereo
          POSTGRES_PASSWORD: ${DB_PASSWORD}
        volumes:
          - pgdata:/var/lib/postgresql/data
        ports: ["5432:5432"]

      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

      api:
        build: .
        env_file: .env
        ports: ["8080:8080"]
        depends_on: [postgres, redis]

      ml-service:
        build: ./nereo-ml
        env_file: .env
        ports: ["8081:8081"]
        depends_on: [redis]

    volumes:
      pgdata:
    ```

### 6.2 CI/CD (GitHub Actions)
- [ ] **Pipeline `.github/workflows/ci.yml`:**
    1. `lint` → `golangci-lint run`.
    2. `test` → `go test ./... -race -coverprofile=coverage.out`.
    3. `build` → Build Docker image, push a registry (GitHub Container Registry o Docker Hub).
    4. `deploy` → SSH/Docker Compose pull en VPS, o deploy a Cloud Run / Fly.io.
- [ ] **Estrategia de deploy inicial (VPS económico):**
    - DigitalOcean Droplet $12/mes o Hetzner €4/mes.
    - Docker Compose en producción con Traefik como reverse proxy + auto-SSL (Let's Encrypt).
    - Cuando el tráfico lo justifique → migrar a Kubernetes (GKE/EKS) o servicios serverless.

### 6.3 Observabilidad
- [ ] **Logging estructurado:** `slog` (stdlib Go 1.21+) con output JSON.
    - **Campos obligatorios en cada log:** Todo log emitido dentro de un request HTTP debe incluir `tenant_id` y `trace_id` para facilitar el debugging en entornos multi-tenant.
    - Implementar un **middleware de logging** que inyecte estos campos en el logger del contexto:
      ```go
      func LoggingMiddleware() gin.HandlerFunc {
          return func(c *gin.Context) {
              traceID := c.GetHeader("X-Trace-ID")
              if traceID == "" {
                  traceID = uuid.NewString()
              }
              tenantID := c.GetString("tenant_id") // seteado por TenantMiddleware

              logger := slog.Default().With(
                  slog.String("trace_id", traceID),
                  slog.String("tenant_id", tenantID),
                  slog.String("method", c.Request.Method),
                  slog.String("path", c.Request.URL.Path),
              )
              c.Set("logger", logger)
              c.Header("X-Trace-ID", traceID) // devolver al cliente para correlación

              start := time.Now()
              c.Next()

              logger.Info("request completed",
                  slog.Int("status", c.Writer.Status()),
                  slog.Duration("latency", time.Since(start)),
              )
          }
      }
      ```
    - **Uso en handlers y services:** Extraer el logger del contexto en lugar de usar `slog.Default()`:
      ```go
      func (h *BookingHandler) Create(c *gin.Context) {
          logger := c.MustGet("logger").(*slog.Logger)
          logger.Info("creating booking", slog.String("customer_id", req.CustomerID))
          // ...
      }
      ```
    - **Ejemplo de output JSON:**
      ```json
      {
        "time": "2025-03-15T14:30:00Z",
        "level": "INFO",
        "msg": "creating booking",
        "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "tenant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "method": "POST",
        "path": "/api/v1/bookings",
        "customer_id": "c9876543-21ab-cdef-0123-456789abcdef"
      }
      ```
    - Esto permite filtrar logs por tenant (`jq 'select(.tenant_id == "...")'`) y trazar un request completo por `trace_id` a través de todos los servicios.
- [ ] **Métricas:** Prometheus endpoint `/metrics` (middleware Gin). Labels por `tenant_id` para métricas de latencia y error rate por tenant.
- [ ] **Tracing:** OpenTelemetry con export a Jaeger (opcional, Fase 2). Propagar `trace_id` al microservicio FastAPI vía header `X-Trace-ID`.
- [ ] **Health checks:**
    - `GET /health` → 200 si el server responde.
    - `GET /readyz` → 200 si DB y Redis están conectados.

### 6.4 Seguridad
- [ ] Rate limiting por IP y por tenant (Redis sliding window).
- [ ] CORS configurado para dominios permitidos.
- [ ] Helmet-like headers (X-Content-Type-Options, X-Frame-Options, etc.).
- [ ] Input validation con tags de struct en Go (`binding:"required,email"`).
- [ ] SQL injection prevention: siempre usar prepared statements (PGX lo hace por defecto).
- [ ] Secrets management: `.env` en desarrollo, secrets de CI/CD en producción. Nunca commitear `.env`.

---

## Resumen de Endpoints (API v1)

| Método | Ruta | Descripción | Roles |
|--------|------|-------------|-------|
| POST | `/api/v1/tenants` | Registrar lavadero | publico |
| PUT | `/api/v1/tenants/settings` | Actualizar config (buffer, horarios) | owner |
| POST | `/api/v1/auth/login` | Login | publico |
| POST | `/api/v1/auth/refresh` | Refresh token | autenticado |
| GET | `/api/v1/plans` | Listar planes | owner, manager, employee |
| POST | `/api/v1/plans` | Crear plan | owner, manager |
| PUT | `/api/v1/plans/:id` | Editar plan | owner, manager |
| DELETE | `/api/v1/plans/:id` | Desactivar plan | owner |
| POST | `/api/v1/subscriptions` | Suscribir cliente (MP o manual) | owner, manager |
| GET | `/api/v1/subscriptions` | Listar suscripciones | owner, manager |
| POST | `/api/v1/subscriptions/:id/cancel` | Cancelar suscripcion | owner, manager |
| POST | `/api/v1/subscriptions/:id/renew-manual` | Renovar manualmente | owner, manager |
| GET | `/api/v1/subscriptions/:id/validate` | Validar membresia | owner, manager, employee |
| POST | `/api/v1/payments/preference` | Crear preferencia MP | owner, manager |
| POST | `/api/v1/payments/subscription` | Crear suscripcion MP | owner, manager |
| POST | `/api/v1/payments/manual` | Registrar pago manual (cash) | owner, manager |
| POST | `/api/v1/webhooks/mercadopago` | Webhook MP | publico (verificado) |
| POST | `/api/v1/services` | Crear servicio | owner, manager |
| GET | `/api/v1/services` | Listar servicios | owner, manager, employee |
| GET | `/api/v1/services/:id` | Detalle de servicio | owner, manager, employee |
| PUT | `/api/v1/services/:id` | Actualizar servicio | owner, manager |
| DELETE | `/api/v1/services/:id` | Desactivar servicio | owner, manager |
| GET | `/api/v1/bookings/availability` | Consultar disponibilidad | autenticado |
| POST | `/api/v1/bookings` | Crear turno (ends_at auto) | owner, manager, employee |
| GET | `/api/v1/bookings` | Listar turnos | owner, manager, employee |
| PATCH | `/api/v1/bookings/:id/status` | Cambiar estado turno | owner, manager, employee |
| DELETE | `/api/v1/bookings/:id` | Cancelar turno | owner, manager |
| POST | `/api/v1/whatsapp/webhook` | Webhook WhatsApp | publico (verificado) |
| GET | `/api/v1/analytics/revenue` | Ingresos | owner |
| GET | `/api/v1/analytics/bookings` | Estadisticas turnos | owner, manager |
| GET | `/api/v1/analytics/churn` | Tasa de cancelacion | owner |
| GET | `/api/v1/weather/forecast` | Pronostico (proxy ML) | owner, manager |
| POST | `/api/v1/predictions/demand` | Prediccion demanda (proxy ML) | owner, manager |
| GET | `/health` | Health check | publico |
| GET | `/readyz` | Readiness check | publico |