-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE tenants (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(255) NOT NULL,
    slug                 VARCHAR(100) UNIQUE NOT NULL,
    owner_email          VARCHAR(255) NOT NULL,
    plan                 VARCHAR(50) NOT NULL DEFAULT 'free',
    timezone             VARCHAR(50) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    settings             JSONB NOT NULL DEFAULT '{}',
    buffer_between_slots INTEGER NOT NULL DEFAULT 10,
    active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS (with RBAC)
-- ============================================================
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'employee');

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email         VARCHAR(255) NOT NULL,
    phone         VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          user_role NOT NULL DEFAULT 'employee',
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================
-- CUSTOMERS (end clients of the car wash)
-- ============================================================
CREATE TABLE customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name     VARCHAR(255) NOT NULL,
    phone         VARCHAR(30) NOT NULL,
    email         VARCHAR(255),
    vehicle_plate VARCHAR(20),
    vehicle_model VARCHAR(100),
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, phone)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================
-- MEMBERSHIP PLANS
-- ============================================================
CREATE TABLE membership_plans (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    price_cents   INTEGER NOT NULL,
    currency      VARCHAR(3) NOT NULL DEFAULT 'ARS',
    interval      VARCHAR(20) NOT NULL DEFAULT 'monthly',
    wash_limit    INTEGER,
    includes      JSONB NOT NULL DEFAULT '[]',
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON membership_plans
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'past_due');
CREATE TYPE payment_method_type AS ENUM ('mercadopago', 'manual');

CREATE TABLE subscriptions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id          UUID NOT NULL REFERENCES customers(id),
    plan_id              UUID NOT NULL REFERENCES membership_plans(id),
    payment_method       payment_method_type NOT NULL DEFAULT 'mercadopago',
    mp_subscription_id   VARCHAR(255),
    status               subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,
    washes_used          INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON subscriptions
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE INDEX idx_subscriptions_customer ON subscriptions(tenant_id, customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(tenant_id, status);

-- ============================================================
-- PAYMENT EVENTS
-- ============================================================
CREATE TYPE payment_source AS ENUM ('mercadopago', 'manual');

CREATE TABLE payment_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    subscription_id UUID REFERENCES subscriptions(id),
    source          payment_source NOT NULL DEFAULT 'mercadopago',
    mp_payment_id   VARCHAR(255),
    status          VARCHAR(50) NOT NULL,
    amount_cents    INTEGER NOT NULL,
    notes           TEXT,
    recorded_by     UUID REFERENCES users(id),
    raw_payload     JSONB NOT NULL DEFAULT '{}',
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (mp_payment_id)
);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payment_events
    USING (tenant_id = current_setting('app.current_tenant')::UUID);
