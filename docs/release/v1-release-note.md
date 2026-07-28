# BSP V1.0.0 — Release Notes

> **Release**: V1 GA (Conditional)  
> **Date**: 2026-07-27  
> **Codename**: Manufacturing Simulation · BSP Web Platform

---

## Overview

BSP V1 replaces the Excel `(게임용)회계기초과정 원장` manufacturing accounting simulation with a **web-only** classroom experience. Instructors operate from a **single GM Desk**; students join via code and play as CEO through 7 steps across **3 years · 6 half-years**.

**GA status**: **Conditional Release** — approved for production pilot and classroom use with documented mitigations (see `p9-rc-validation.md`).

---

## Highlights

### For Instructors (GM)

- Session creation with secure 128-bit join codes
- GM Desk: step advance, pause/resume, force/zero submit
- Economy control: presets, manual patches, apply timing
- Event engine: 18 MVP events with economy integration
- Real-time ops summary, audit log, recommended actions
- Admin panel: session archive, audit search, economy history
- Instructor runbook + disaster recovery guide

### For Students (CEO)

- Join flow with team naming
- Command Dashboard — “what to do now”
- Step education panels (Rule Book aligned, no AI hints)
- Step 1–6 decision forms with validation preview
- Financial statements, journals, environment/ranking views
- WebSocket sync on step advance and economy changes

### For Operations

- Production: **PostgreSQL only** (`BSP_DATABASE_URL` required)
- Demo/dev: memory mode (`BSP_USE_MEMORY=1`, not for production)
- Append-only audit log (Prisma)
- Backup/restore scripts (`npm run bsp:backup` / `bsp:restore`)
- Custom Next.js server with WebSocket hub

---

## Verification (P9)

| Area | Result |
|------|--------|
| Automated tests | **208 pass**, 1 skipped |
| Build | ✅ `npm run build` |
| Excel single-half | **20/20** zero tolerance |
| 6-period E2E pilot | ✅ 3 teams, event + economy, game end |
| Security Critical | **0** |
| Performance (100 teams) | ✅ within NFR |

---

## Known Limitations

- Debrief is **instructor-led** (no dedicated Debrief screen)
- Full **20×6** Excel matrix not automated — single-half + carry-forward E2E
- **3Y6H in one 8h day** is tight; 1Y2H pilot recommended first
- CSRF tokens and rate limiting deferred (classroom LAN risk accepted)
- Multi-instance WebSocket requires Redis (single-instance OK for V1)

See `known-issues.md` for full list.

---

## Upgrade / Deploy

```bash
# Production
cp .env.example .env
# Set BSP_DATABASE_URL, BSP_AUTH_SECRET, BSP_ADMIN_PASSWORD

npm run bsp:generate
npx prisma migrate deploy --schema=prisma/bsp.schema.prisma
npm run build
NODE_ENV=production npm run start
```

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| `p9-rc-validation.md` | GA decision report |
| `final-ga-checklist.md` | Gate checklist G1–G9 |
| `instructor-runbook.md` | Classroom operations |
| `p7-production-readiness.md` | DR, backup, audit architecture |
| `excel-parity-6period.md` | Excel evidence |
| `security-review.md` | P9 security re-review |
| `performance-report.md` | Load benchmarks |
| `user-acceptance-test.md` | UAT scenarios |

---

## Sprint 3 Delivery Timeline

| Phase | Deliverable |
|-------|-------------|
| P1–P2 | Game engine, auth, Excel regression |
| P3–P6 | GM ops, events, economy UI, realtime |
| P7 | Production readiness, PostgreSQL audit |
| P8 / P8.1 | UX validation, runbook, screenshots |
| **P9** | **RC validation, GA decision** |

---

*Thank you to all sprint contributors. Report issues with session ID + audit log export.*
