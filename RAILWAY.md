# Deploying Nereo to Railway

## Architecture

Railway deploys this monorepo as **5 separate services** inside one project:

| Service | Source Dir | Builder | Port |
|---------|-----------|---------|------|
| **nereo-api** | `nereo-backend/` | Dockerfile | `PORT` (auto) |
| **nereo-front** | `nereo-frontend/` | Dockerfile | `PORT` (auto) |
| **nereo-ml** | `nereo-ml/` | Dockerfile | `PORT` (auto) |
| **Postgres** | — | Railway plugin | 5432 |
| **Redis** | — | Railway plugin | 6379 |

Railway injects a `PORT` env var into each service. All three app services are already configured to read it.

---

## Step-by-step Setup

### 1. Create a Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo** → pick your `nereo` monorepo
3. Railway will detect the repo — **don't deploy yet**, cancel the initial auto-deploy

### 2. Add Database & Cache Plugins

Inside the project:

1. Click **+ New** → **Database** → **PostgreSQL** (use Postgres 16)
2. Click **+ New** → **Database** → **Redis**

Railway will provision both and expose connection variables automatically.

### 3. Create the Backend Service

1. Click **+ New** → **GitHub Repo** → select your repo
2. Go to **Settings** tab:
   - **Root Directory**: `nereo-backend`
   - **Builder**: Dockerfile
3. Go to **Variables** tab and add:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
GIN_MODE=release
JWT_SECRET=<generate-a-64-char-random-string>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=168h
MP_ACCESS_TOKEN=<your-mercadopago-access-token>
MP_WEBHOOK_SECRET=<your-mercadopago-webhook-secret>
```

> **Note**: `${{Postgres.DATABASE_URL}}` and `${{Redis.REDIS_URL}}` are Railway reference variables that auto-resolve to the plugin connection strings.

4. Go to **Settings** → **Networking** → **Generate Domain** (e.g. `nereo-api-production.up.railway.app`)

### 4. Create the Frontend Service

1. Click **+ New** → **GitHub Repo** → select your repo
2. Go to **Settings** tab:
   - **Root Directory**: `nereo-frontend`
   - **Builder**: Dockerfile
3. Go to **Variables** tab and add:

```
NEXT_PUBLIC_API_URL=https://<your-backend-domain>.up.railway.app
NEXT_PUBLIC_MP_PUBLIC_KEY=<your-mercadopago-public-key>
NEXT_PUBLIC_GOOGLE_MAPS_KEY=<your-google-maps-key>
NEXT_PUBLIC_WA_PHONE=<your-whatsapp-phone>
```

> **Important**: `NEXT_PUBLIC_*` vars are baked at **build time**. If you change them, you must redeploy (rebuild) the frontend.

4. Go to **Settings** → **Networking** → **Generate Domain**

### 5. Create the ML Service

1. Click **+ New** → **GitHub Repo** → select your repo
2. Go to **Settings** tab:
   - **Root Directory**: `nereo-ml`
   - **Builder**: Dockerfile
3. Go to **Variables** tab and add:

```
REDIS_URL=${{Redis.REDIS_URL}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

4. For **internal-only** access (backend → ML), use Railway's **Private Networking**:
   - Go to **Settings** → **Networking** → enable **Private Network**
   - The internal URL will be something like `nereo-ml.railway.internal:PORT`
   - Set `ML_SERVICE_URL` on the backend service to this internal URL

### 6. Wire Internal Service Communication

On the **nereo-api** service, add:

```
ML_SERVICE_URL=http://nereo-ml.railway.internal:<PORT>
```

Railway's private networking allows services to communicate without going through the public internet.

---

## Custom Domains

For production, add custom domains in each service's **Settings** → **Networking** → **Custom Domain**:

- `api.nereo.com` → nereo-api service
- `app.nereo.com` → nereo-front service

Add the CNAME records Railway provides to your DNS.

---

## Environment Variable Reference

### Backend (nereo-api)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `GIN_MODE` | ✅ | Set to `release` for production |
| `JWT_SECRET` | ✅ | 64-char random string |
| `JWT_ACCESS_TTL` | | Default: `15m` |
| `JWT_REFRESH_TTL` | | Default: `168h` |
| `MP_ACCESS_TOKEN` | ✅ | Mercado Pago access token |
| `MP_WEBHOOK_SECRET` | ✅ | Mercado Pago webhook secret |
| `ML_SERVICE_URL` | | URL to ML service (private network) |

### Frontend (nereo-front)
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Public URL of the backend API |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | | Mercado Pago public key |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | | Google Maps API key |
| `NEXT_PUBLIC_WA_PHONE` | | WhatsApp phone number |

### ML Service (nereo-ml)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | | PostgreSQL connection string |
| `REDIS_URL` | | Redis connection string |

---

## Useful Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Deploy manually (from a service directory)
cd nereo-backend && railway up

# View logs
railway logs

# Open dashboard
railway open
```

---

## Troubleshooting

- **Build fails**: Check that the root directory is set correctly for each service
- **Port issues**: Railway injects `PORT` — all services are configured to read it
- **DB connection fails**: Ensure you're using `${{Postgres.DATABASE_URL}}` reference variable
- **Frontend env vars not updating**: `NEXT_PUBLIC_*` vars require a rebuild — redeploy the service
- **Migrations fail**: The backend runs migrations automatically on startup. Check the DATABASE_URL has `?sslmode=disable` removed (Railway Postgres uses SSL)
