# Business Simulation Platform (BSP)

AI 기반 HRD 경영 시뮬레이션 — 관리자(GM) 세션 운영 + 학습자(CEO) 7단계 의사결정 + 회계 엔진 + 실시간 이벤트.

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Custom server (`server.ts`) + WebSocket
- BSP domain engine (`src/bsp/`)
- Prisma (PostgreSQL) or in-memory (dev)
- Vitest · Playwright (installed)

## Quick Start

```bash
npm install
cp .env.example .env.local
# Dev: BSP_USE_MEMORY=1 in .env.local
npm run dev
```

- Admin: http://localhost:3000/admin/login
- Learner: http://localhost:3000/join

See [Local Development](docs/setup/local-development.md) and [Environment Variables](docs/setup/environment-variables.md).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server + WebSocket |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm test` | Vitest (448+ tests) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run bsp:migrate` | DB migrations |

## Production Requirements

```env
BSP_DATABASE_URL=postgresql://...
BSP_AUTH_SECRET=<32+ chars>
BSP_ADMIN_PASSWORD=<strong password>
BSP_DEMO_MODE=false
BSP_ALLOW_FIXTURE=false
```

Run with `npm start` (uses `tsx server.ts` for WebSocket).

## Key Routes

| Path | Role |
|------|------|
| `/admin` | Admin dashboard |
| `/admin/sessions/new` | Session wizard |
| `/admin/control` | GM control |
| `/admin/integrations` | OpenAI / News / FX health |
| `/admin/accounting-audit` | Accounting validation |
| `/join` | Learner join |
| `/play` | CEO play |
| `/event-studio` | Event scenario studio |

## Release Documentation

- [Final Release Audit](docs/release/final-release-audit.md)
- [Accounting Validation](docs/release/accounting-validation-report.md)
- [E2E Report](docs/release/e2e-validation-report.md)
- [Security Checklist](docs/release/security-checklist.md)
- [Known Issues](docs/release/known-issues.md)
- [Admin Runbook](docs/operations/admin-runbook.md)

## External APIs

- [OpenAI Setup](docs/integrations/openai-setup.md)
- [News Provider Setup](docs/integrations/news-provider-setup.md)

## Legacy Note

`components/simulation/` and root README MVP sections describe an older client-only prototype; the active product is the BSP engine under `src/bsp/` and `/play`.
