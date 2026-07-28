# E2E Validation Report

> 2026-07-28 · Automated engine/API E2E + manual browser checklist

## Automated E2E (Vitest)

| ID | Flow | Test File | Status |
|----|------|-----------|--------|
| E2E-1 | Admin session create | `pilot-ui.test.ts`, `p3-gm-ops.test.ts` | ✅ |
| E2E-2 | Learner join | `auth.test.ts`, `p9-rc-pilot.test.ts` | ✅ |
| E2E-3 | Step submit | `step-handlers.test.ts`, `sprint2a/2b.test.ts` | ✅ |
| E2E-4 | GM step advance | `p3-gm-ops.test.ts`, `p6-realtime.test.ts` | ✅ |
| E2E-5 | Event create/publish | `v2-scenario-studio.test.ts`, `p4-event-engine.test.ts` | ✅ |
| E2E-6 | Breaking news WS | `p6-realtime.test.ts`, play page integration | ✅ |
| E2E-7 | Settlement | `sprint2b.test.ts`, `accounting-validation.test.ts` | ✅ |
| E2E-8 | Financial statements UI | API tests + `pilot-ui.test.ts` | ✅ |
| E2E-9 | Next half | `multi-period.test.ts` | ✅ |
| E2E-10 | 6-period game end | `p9-rc-pilot.test.ts` | ✅ |
| E2E-11 | Refresh persistence | Memory/Prisma repo tests | ⚠️ Memory only without DB |
| E2E-12 | Role blocking | `auth.test.ts`, `admin-gm-token-flow.test.ts` | ✅ |

**Full 6-period pilot path:** `p9-rc-pilot.test.ts` — join 3 teams → 6 periods → game end → audit trail.

## Playwright Browser E2E

**Status: PASS** (2026-07-28) — `npm run test:e2e` — **6/6 passed** (~40s)

| ID | Flow | Result |
|----|------|--------|
| E2E-1 | Admin login → Wizard → GM dashboard → WS connected | PASS |
| E2E-2 | Learner join → Step 1 submit → waiting | PASS |
| E2E-3 | GM advance-step → learner Step 2 via WebSocket | PASS |
| E2E-4 | GM catalog event → learner breaking news | PASS |
| E2E-5 | Play dashboard → B/S 균형 OK | PASS |
| E2E-6 | Browser refresh → session restored | PASS |

Report HTML: `docs/release/screenshots/playwright-report/`

## Live API E2E

Gated by `RUN_LIVE_API_TESTS=true` in `integrations.test.ts` (2 tests skipped in default CI).

## Verdict

**Engine/API E2E: PASS** · **Browser Playwright: PASS (6/6)**
