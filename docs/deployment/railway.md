# Railway Deployment Guide

> BSP production deploy on [Railway](https://railway.app). **Do not use plain `next start`** — WebSocket requires the custom server (`tsx server.ts`).

## Prerequisites

- Railway account + GitHub repo connected (or CLI deploy)
- PostgreSQL plugin (or external Postgres)
- Secrets configured in Railway Variables (see [environment.md](./environment.md))

## Service Configuration

| Setting | Value |
|---------|-------|
| **Build Command** | `npm ci && npm run bsp:generate && npm run build` |
| **Start Command** | `npm start` (runs `tsx server.ts`) |
| **Health Check Path** | `/api/health` |
| **Port** | Railway injects `PORT` — do not hardcode |

These are also defined in [`railway.toml`](../../railway.toml) at repo root.

## Step-by-Step Deploy

### 1. Create project

1. Railway → **New Project** → **Deploy from GitHub repo**
2. Select the BSP repository and branch (e.g. `main`)

### 2. Add PostgreSQL

1. **+ New** → **Database** → **PostgreSQL**
2. Copy the connection URL from the Postgres service variables
3. In the **app service** Variables, set:
   - `BSP_DATABASE_URL` = Postgres `DATABASE_URL` value (same connection string)
   - `NODE_ENV` = `production`

> BSP runtime reads **`BSP_DATABASE_URL`**, not `DATABASE_URL`. Railway's Postgres plugin exposes `DATABASE_URL` — copy it into `BSP_DATABASE_URL`.

### 3. Set required secrets

| Variable | Notes |
|----------|-------|
| `BSP_AUTH_SECRET` | ≥32 random chars (JWT signing) |
| `BSP_ADMIN_PASSWORD` | ≥8 chars, not `bsp-admin-dev` |
| `BSP_DEMO_MODE` | `false` |
| `BSP_ALLOW_FIXTURE` | `false` |
| `OPENAI_API_KEY` | Optional but recommended for live AI |
| `OPENAI_MODEL` | e.g. `gpt-4.1-mini` |

Full list: [environment.md](./environment.md)

### 4. Run database migrations

After first deploy (or via Railway one-off shell):

```bash
npx prisma migrate deploy --schema=prisma/bsp.schema.prisma
```

Migrations live in `prisma/migrations/` (with `migration_lock.toml`). Do not use a nested `migrations/bsp/` path.

Optional seed (non-production pilots only):

```bash
npm run bsp:seed
```

### 5. Deploy

Railway builds automatically on push. Monitor **Deployments** tab for build logs.

Verify build steps complete:

1. `npm ci`
2. `npm run bsp:generate`
3. `npm run build`

### 6. Health check

Railway uses `/api/health` (configured in `railway.toml`).

```bash
curl -s https://<your-app>.up.railway.app/api/health | jq
```

Expected production response (minimal):

```json
{
  "status": "READY",
  "database": { "status": "READY" },
  "websocket": { "status": "READY" },
  "openai": { "status": "NOT_CONFIGURED" }
}
```

- HTTP **200** — READY or DEGRADED
- HTTP **503** — FAILED (e.g. database unreachable)

Optional live integration probe (costs may apply):

```bash
curl -s "https://<host>/api/health?live=1"
```

## Docker Alternative

A [`Dockerfile`](../../Dockerfile) is provided for container-based deploys:

```bash
docker build -t bsp-app .
docker run -p 3000:3000 --env-file .env.production bsp-app
```

Railway can detect the Dockerfile automatically if Nixpacks is disabled.

## WebSocket

- Path: `/api/v1/ws?token=<JWT>`
- Requires custom server — `initRealtimeHub(server)` in `server.ts`
- Server binds **`0.0.0.0`** in production (Railway requirement)

## Networking Notes

- Railway terminates TLS at the edge; app receives HTTP on `PORT`
- WebSocket upgrades work through Railway's proxy when using the custom server
- Set public domain in Railway **Settings → Networking → Generate Domain**

## Rollback

1. Railway → **Deployments** → select previous successful deploy → **Redeploy**
2. If migration caused issues, restore DB from backup (`npm run bsp:backup` / `bsp:restore`) before rollback

## Related Docs

- [Environment variables](./environment.md)
- [Post-deploy checklist](./post-deploy-checklist.md)
- [Admin runbook](../operations/admin-runbook.md)
- [Troubleshooting](../operations/troubleshooting.md)
