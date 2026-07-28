# Release Candidate Checklist

> BSP Final Release Hardening · 2026-07-28

## Audit & Code

- [x] Full feature audit documented (`final-release-audit.md`)
- [x] Runtime mode guards (`lib/bsp/runtime-config.ts`)
- [x] Demo APIs gated (`BSP_DEMO_MODE`)
- [x] Fixture AI gated in production (`BSP_ALLOW_FIXTURE`)
- [x] Session wizard → API wiring (memory path)

## Functional

- [x] Steps 1–7 automated tests
- [x] 6-period game end (`p9-rc-pilot.test.ts`)
- [x] Accounting equation tests
- [x] Excel 20-scenario regression
- [x] WebSocket realtime tests
- [x] Auth / role tests

## Quality

- [x] `npm test` — 448 passed, 3 skipped (live-only)
- [x] `npm run build` — pass
- [x] `npm run lint` — warnings only (unused vars)
- [ ] `npm run typecheck` — test file TS errors pre-existing (non-blocking build)

## Documentation

- [x] `final-release-audit.md`
- [x] `accounting-validation-report.md`
- [x] `e2e-validation-report.md`
- [x] `security-checklist.md`
- [x] `known-issues.md`
- [x] `environment-variables.md`
- [x] `local-development.md`
- [x] `admin-runbook.md`
- [x] README updated

## Manual / Staging

- [ ] Browser E2E with 5 learner sessions
- [ ] Live OpenAI verification with billing
- [ ] Live GNews verification
- [ ] PostgreSQL migration on staging DB
- [ ] Git secret scan on developer machine

## Git

- [ ] Review diff (no `.env.local`, no keys)
- [ ] Commit (user action)

**RC status:** Ready for user review and commit after staging manual checks.
