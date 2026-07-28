# Production & Staging Environment Variables

> Reference for operators configuring Railway, Docker, or manual hosting.  
> Template: [`.env.example`](../../.env.example) · Implementation: `lib/bsp/runtime-config.ts`, `lib/integrations/config.ts`, `src/bsp/application/di/container.ts`

**Never commit real values.** Run `npm run secret-scan` before git commit.

---

## Required (Production)

| Variable | Sensitive | Description | If missing / invalid |
|----------|-----------|-------------|----------------------|
| `NODE_ENV` | No | Must be `production` for strict guards | Dev defaults apply |
| `BSP_DATABASE_URL` | **Yes** | PostgreSQL connection for BSP Prisma schema | Startup throws |
| `BSP_AUTH_SECRET` | **Yes** | JWT signing secret (≥32 chars) | Startup throws |
| `BSP_ADMIN_PASSWORD` | **Yes** | Admin console password (≥8, not dev default) | Startup throws |

### DATABASE_URL vs BSP_DATABASE_URL

| Variable | Used by |
|----------|---------|
| `BSP_DATABASE_URL` | **BSP runtime** — `prisma/bsp.schema.prisma`, all game/session data |
| `DATABASE_URL` | Legacy root `prisma/schema.prisma` only — **not** used by BSP app |

Railway Postgres exposes `DATABASE_URL`. **Copy its value into `BSP_DATABASE_URL`** on the app service.

Pool params (`connection_limit`, `pool_timeout`) are appended automatically from `BSP_DB_POOL_SIZE` / `BSP_DB_POOL_TIMEOUT` if not in the URL.

---

## Production Safety Flags

| Variable | Production value | Description |
|----------|------------------|-------------|
| `BSP_DEMO_MODE` | `false` | Enables demo session APIs and pilot demo button |
| `BSP_ALLOW_FIXTURE` | `false` | Allows fixture AI/news when APIs unavailable |
| `BSP_PILOT_BOOTSTRAP` | `false` | Auto demo on pilot health (ignored in production) |
| `BSP_USE_MEMORY` | **unset** | In-memory store — **forbidden** in production |

---

## OpenAI

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | empty | Primary API key (server-only) |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Model for intelligence/studio features |
| `OPENAI_ENABLED` | `true` | Master switch; needs key for live |
| `OPENAI_TIMEOUT_MS` | `60000` | Request timeout |
| `OPENAI_MAX_RETRIES` | `2` | Retry count |
| `BSP_OPENAI_API_KEY` | — | Legacy alias for `OPENAI_API_KEY` |
| `BSP_OPENAI_MODEL` | — | Legacy alias for `OPENAI_MODEL` |
| `OPENAI_MODEL_PRICING_JSON` | built-in | Optional cost estimate overrides |
| `BSP_INTELLIGENCE_MAX_TOKENS` | `2000` | Token cap for intelligence |
| `BSP_STUDIO_MAX_TOKENS` | `2500` | Token cap for event studio |

Without `OPENAI_API_KEY`, OpenAI health shows `NOT_CONFIGURED` (acceptable if AI features not needed).

---

## News

| Variable | Default | Description |
|----------|---------|-------------|
| `BSP_NEWS_PROVIDER` | `fixture` | `fixture` (dev) or `gnews` (live) |
| `BSP_GNEWS_API_KEY` | empty | Required when provider is `gnews` |
| `GNEWS_API_KEY` | — | Legacy alias |
| `NEWS_TIMEOUT_MS` | `8000` | Request timeout |
| `NEWS_MAX_RETRIES` | `2` | Retry count |

Live news: `BSP_NEWS_PROVIDER=gnews` + valid `BSP_GNEWS_API_KEY`.

---

## External Data (FX)

| Variable | Default | Description |
|----------|---------|-------------|
| `BSP_FX_ENABLED` | `true` | Enable Frankfurter FX reference |
| `BSP_FX_PROVIDER` | `frankfurter` | FX data provider |
| `EXTERNAL_DATA_TIMEOUT_MS` | `8000` | Request timeout |

---

## Server / Hosting

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port (Railway injects automatically) |
| `HOSTNAME` | `localhost` | Display hostname in logs |
| | | Production server binds `0.0.0.0` regardless |

---

## Pilot / UI Branding

| Variable | Default | Description |
|----------|---------|-------------|
| `BSP_PILOT_MODE` | off | Server-side pilot flag |
| `NEXT_PUBLIC_PILOT_MODE` | off | Client-side pilot UI branding |

---

## Testing & CI

| Variable | Default | Description |
|----------|---------|-------------|
| `RUN_LIVE_API_TESTS` | `false` | Enables billable live OpenAI/news tests |

Keep `false` in CI and production.

---

## Staging vs Production

| Concern | Staging | Production |
|---------|---------|------------|
| `BSP_DATABASE_URL` | Separate DB | Dedicated prod DB |
| `BSP_DEMO_MODE` | `false` (recommended) | `false` |
| `BSP_ALLOW_FIXTURE` | `true` optional for offline tests | `false` |
| Secrets | Staging-specific | Unique, rotated |
| Backups | Optional | Required (`npm run bsp:backup`) |

---

## Validation Checklist

```bash
# Health (no live API calls)
curl -s http://localhost:3000/api/health | jq .status

# Integration health (admin auth required)
curl -s -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/integrations/health
```

See [post-deploy-checklist.md](./post-deploy-checklist.md) for full verification flow.
