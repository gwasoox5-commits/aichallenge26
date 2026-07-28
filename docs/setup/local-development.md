# Local Development

## Prerequisites

- Node.js 18.18+ (LTS)
- Optional: PostgreSQL for persistent storage

## Setup

```bash
cd project
npm install
cp .env.example .env.local
# Edit .env.local — minimum for dev:
# BSP_USE_MEMORY=1  (or set BSP_DATABASE_URL)
```

## Database (optional)

```bash
npm run bsp:generate
npm run bsp:migrate
npm run bsp:seed
```

## Run dev server (WebSocket included)

```bash
npm run dev
```

Open http://localhost:3000

- **Admin:** `/admin/login` — password from `BSP_ADMIN_PASSWORD` (default dev: `bsp-admin-dev`)
- **Learner:** `/join` — use join code from session wizard

## Demo mode (development only)

```env
BSP_DEMO_MODE=true
BSP_PILOT_BOOTSTRAP=true
```

Enables pilot demo session button and `/api/v1/demo/setup`.

## Tests

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Live API tests:

```bash
RUN_LIVE_API_TESTS=true npm test -- tests/bsp/integrations.test.ts
```

## Key paths

| Path | Purpose |
|------|---------|
| `/admin` | Admin console |
| `/admin/sessions/new` | Session wizard |
| `/admin/control` | GM control |
| `/admin/integrations` | External API health |
| `/admin/pilot-check` | Pilot health dashboard |
| `/join` | Learner join |
| `/play` | CEO play |
| `/event-studio` | Event scenario studio |

Server entry: `server.ts` (custom HTTP + WebSocket).
