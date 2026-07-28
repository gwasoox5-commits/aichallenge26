# BSP Final Release Audit

> Generated: 2026-07-28 · Scope: codebase audit (excluding `.next`, `node_modules`)  
> Evidence: `tests/bsp/*` (26 files, 448 passed / 3 skipped live-only)

## Executive Summary

| Layer | Verdict |
|-------|---------|
| **V1 Core** (auth, join, GM, CEO play, Steps 1–7, settlement, 6-period, WS, accounting) | **PRODUCTION READY** |
| **V2 Event / Intelligence** | **PARTIALLY CONNECTED** — live with API keys; fixture when `BSP_ALLOW_FIXTURE=true` (dev) |
| **V3 World Sim** | **PILOT ONLY** — optional rule-engine hook |
| **Session Wizard** | **PARTIALLY CONNECTED** — API wired; Prisma path uses defaults for duration/maxPeriod |
| **Production blockers (config)** | `BSP_AUTH_SECRET`, `BSP_ADMIN_PASSWORD`, `BSP_DATABASE_URL` required in production |

---

## Feature Audit

| Feature | Status | Key Files | Works? | Remaining Issues | Fixed This RC? | Test Evidence |
|---------|--------|-----------|--------|------------------|----------------|---------------|
| Admin auth | PRODUCTION READY + REQUIRES ENV + SECURITY RISK | `auth-service.ts`, `app/admin/login`, `token-service.ts` | Yes | Default dev password blocked in prod | Yes — `runtime-config.ts` | `auth.test.ts`, `admin-gm-token-flow.test.ts` |
| Learner join | PRODUCTION READY | `JoinForm.tsx`, `join/[code]/route.ts` | Yes | `playerName` not persisted | No (non-blocker) | `pilot-ui.test.ts`, `sprint2b.test.ts` |
| Session creation | PRODUCTION READY | `gm/sessions/route.ts`, `game-engine.ts` | Yes | — | Yes — extended options | `pilot-ui.test.ts`, `p3-gm-ops.test.ts` |
| Wizard | PARTIALLY CONNECTED | `SessionWizard.tsx`, `session-create-options.ts` | Yes (memory) | Prisma: stepDuration/maxPeriod/wizardMeta not in DB schema | Partial | API payload wired |
| GM control | PRODUCTION READY | `GmCommandCenter.tsx`, GM API routes | Yes | `/gm` duplicates admin | No | `p3-gm-ops.test.ts` |
| CEO play | PRODUCTION READY | `app/play/page.tsx`, play APIs | Yes | Client `mockState` for previews only | N/A (UI preview) | `pilot-ui.test.ts`, `step-handlers.test.ts` |
| Steps 1–7 | PRODUCTION READY | `src/bsp/domain/steps/*` | Yes | Step 7 CEO submit blocked (GM settlement) | By design | `step-handlers.test.ts`, `sprint2a/2b.test.ts` |
| Settlement | PRODUCTION READY | `settlement-pipeline.ts`, `closePeriod` | Yes | — | — | `accounting-validation.test.ts` |
| Next half | PRODUCTION READY | `startNextHalf`, `carry-forward.ts` | Yes | — | — | `multi-period.test.ts` |
| 6-period loop | PRODUCTION READY | `period-calendar.ts`, `isSessionFinalPeriod` | Yes | Configurable max via `maxPeriodIndex` | Yes | `p9-rc-pilot.test.ts` |
| Game end | PRODUCTION READY | `gameEnd`, game-end route | Yes | — | — | `p9-rc-pilot.test.ts` |
| WebSocket | PRODUCTION READY | `server.ts`, `realtime-hub.ts` | Yes | Requires `tsx server.ts` | — | `p6-realtime.test.ts` |
| Breaking news | PRODUCTION READY | `CeoNewsPanel.tsx`, scenario-studio | Yes | — | — | `p4-event-engine.test.ts` |
| Event studio | PARTIALLY CONNECTED | `EventStudioWorkflow.tsx` | Yes | OpenAI fixture without key + allow flag | Yes — prod guard | `v2-scenario-studio.test.ts` |
| Scenario gen | FIXTURE FALLBACK / LIVE | `openai-generator.ts` | Yes | Throws in prod without key unless `BSP_ALLOW_FIXTURE` | Yes | `v2-scenario-studio.test.ts` |
| Event publish | PRODUCTION READY | `scenario-studio-service`, event engine | Yes | — | — | `v2-scenario-studio.test.ts` |
| Economy patch | PRODUCTION READY | `event-engine-service.ts` | Yes | — | — | `p4-event-engine.test.ts` |
| News intelligence | PARTIALLY CONNECTED | `IntelligenceWorkflow.tsx` | Preview OK | Demo/fixture defaults in UI | Documented | `v2-intelligence.test.ts` |
| World sim | PILOT ONLY | `lib/v3/world/*`, `app/world` | Optional | Rule-engine, JSON store | — | `v3-world-simulation.test.ts` |
| AI consultant | FIXTURE FALLBACK | `consultant-generator.ts` | Yes | Needs OpenAI for live | — | `v2-intelligence.test.ts` |
| Debrief | PRODUCTION READY + FIXTURE AI | `AdminDebriefPanel.tsx` | Ranking OK | AI debrief uses fixtures | — | `pilot-ui.test.ts` |
| Replay | PRODUCTION READY (intel) | `publish-service.ts` | Yes | World replay stub | — | `v2-intelligence-publish.test.ts` |
| Audit log | PRODUCTION READY | `gm-audit-service.ts`, audit page | Yes | — | — | `p7-production.test.ts` |
| Accounting engine | PRODUCTION READY | `accounting-engine.ts` | Yes | — | — | `accounting-engine.test.ts` |
| Journal | PRODUCTION READY | `journal-builders.ts` | Yes | Locked post-settlement | — | `sprint2b.test.ts` |
| Trial balance | PRODUCTION READY | `trial-balance.ts`, validation | Yes | — | — | `accounting-validation.test.ts` |
| P/L, B/S | PRODUCTION READY | `financial-statements.ts` | Yes | Assets = L+E enforced | — | `excel-regression-20.test.ts` |
| KPI (legacy sim) | DEAD CODE | `components/simulation/kpi-grid.tsx` | No | Not in `/play` path | — | None |
| OpenAI | REQUIRES ENV + FIXTURE | `lib/integrations/*` | Live w/ key | — | Prod guard added | `integrations.test.ts` |
| News provider | FIXTURE default / GNews live | `news-adapter.ts` | Yes | Default `fixture` | Documented | `integrations.test.ts` |
| FX | PRODUCTION READY | `frankfurter-provider.ts` | Yes | Reference only | — | `integrations.test.ts` |
| Pilot check | PILOT ONLY | `PilotCheckPanel.tsx` | Yes | WS manual indicator | — | `pilot-ui.test.ts` |
| Integrations health | PRODUCTION READY | `IntegrationsPanel.tsx` | Yes | Build fix onClick | Yes | `integrations.test.ts` |
| CSV export | PARTIALLY CONNECTED | `AdminDebriefPanel.tsx` | Debrief only | No journal CSV | — | None |
| Error handling | PRODUCTION READY | `BspError`, route guards | Yes | V2 routes vary | — | Multiple test files |
| Env vars | REQUIRES CONFIG | `.env.example`, `runtime-config.ts` | Documented | — | Yes | `p7-production.test.ts` |

---

## Pilot / Demo / Mock Inventory

| Location | Type | RC Action |
|----------|------|-----------|
| `app/api/v1/demo/setup` | DEMO | Gated by `BSP_DEMO_MODE` / `BSP_PILOT_BOOTSTRAP` |
| `app/api/v1/pilot/demo-session` | DEMO | Gated |
| `app/api/v1/pilot/health` | PILOT | No auto demo unless bootstrap |
| `EventStudioPrototype.tsx` | DEAD CODE | Not routed; keep for dev reference |
| `components/simulation/*` | DEAD CODE | Legacy MVP; not in BSP play flow |
| `tests/fixtures/v2/*` | FIXTURE | Used when `BSP_ALLOW_FIXTURE` or dev default |
| `lib/v2/intelligence/client-fixtures.ts` | DEMO UI | Labeled in Intelligence workflow |

---

## Environment Modes

| Variable | Default | Production behavior |
|----------|---------|---------------------|
| `BSP_DEMO_MODE` | `false` | Demo APIs return 403 unless `true` |
| `BSP_ALLOW_FIXTURE` | `false` | OpenAI fixture throws without key |
| `BSP_PILOT_BOOTSTRAP` | `false` | Health check won't seed demo session |
| `BSP_AUTH_SECRET` | dev fallback | **Required** ≥32 chars |
| `BSP_ADMIN_PASSWORD` | dev default | **Required**; dev default rejected |
| `BSP_DATABASE_URL` | memory in dev | **Required** in production |

See `docs/setup/environment-variables.md`.

---

## Release Blocker Check (§32)

| Blocker | Status |
|---------|--------|
| 6-period E2E | ✅ `p9-rc-pilot.test.ts` |
| Steps 1–7 | ✅ `step-handlers.test.ts`, sprint tests |
| Join | ✅ `auth.test.ts` |
| Event → learner news | ✅ `p4-event-engine.test.ts` |
| Accounting A=L+E | ✅ `accounting-validation.test.ts` |
| Excel parity | ✅ 20 scenarios zero tolerance |
| Production build | ✅ `npm run build` |
| Core tests skipped | ⚠️ 3 live API tests skipped (gated) |
| Prisma wizard persistence | ⚠️ Known issue — see `known-issues.md` |

**Audit verdict:** Core V1 ready for RC commit; external AI/news live verification is operator-dependent.
