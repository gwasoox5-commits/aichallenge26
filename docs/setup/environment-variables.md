# Environment Variables

See `.env.example` for copy-paste template. **Never commit real values.**

## Required (Production)

| Variable | Sensitive | If missing |
|----------|-----------|------------|
| `BSP_DATABASE_URL` | Yes | Startup throws |
| `BSP_AUTH_SECRET` (≥32) | Yes | Startup throws |
| `BSP_ADMIN_PASSWORD` (≥8, not dev default) | Yes | Startup throws |

## Runtime Mode

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | — | `production` enables strict guards |
| `BSP_DEMO_MODE` | `false` | Enables demo session APIs |
| `BSP_ALLOW_FIXTURE` | `false` | Allows fixture AI/news when APIs unavailable |
| `BSP_PILOT_BOOTSTRAP` | `false` | Dev: auto demo on pilot health |
| `BSP_PILOT_MODE` / `NEXT_PUBLIC_PILOT_MODE` | off | UI pilot branding |
| `BSP_USE_MEMORY` | off | In-memory store (dev only; **forbidden** in prod) |

## OpenAI

| Variable | Default | Notes |
|----------|---------|-------|
| `OPENAI_API_KEY` | empty | Server-only |
| `OPENAI_MODEL` | `gpt-4.1-mini` | |
| `OPENAI_ENABLED` | `true` | Needs key for live |
| `OPENAI_TIMEOUT_MS` | 60000 | |

## News

| Variable | Default | Notes |
|----------|---------|-------|
| `BSP_NEWS_PROVIDER` | `fixture` | Set `gnews` for live |
| `BSP_GNEWS_API_KEY` | empty | Required for GNews |

## External Data

| Variable | Default |
|----------|---------|
| `BSP_FX_ENABLED` | `true` |
| `BSP_FX_PROVIDER` | `frankfurter` |

## Testing

| Variable | Default |
|----------|---------|
| `RUN_LIVE_API_TESTS` | `false` | Enables billable live integration tests |

## Server

| Variable | Default |
|----------|---------|
| `HOSTNAME` | `localhost` |
| `PORT` | `3000` |

Implementation: `lib/bsp/runtime-config.ts`, `lib/integrations/config.ts`, `src/bsp/application/di/container.ts`.
