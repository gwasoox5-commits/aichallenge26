# Security Review — P9 Production Re-Review

> **Date**: 2026-07-27  
> **Scope**: V1 GA Release Candidate (post-P8.1 hotfix)  
> **Target**: **Critical findings = 0**

---

## Executive Summary

| Severity | Count | Change from P7 |
|----------|-------|----------------|
| **Critical** | **0** | — |
| High | 0 | — |
| Medium | 0 | — |
| Low / Deferred | 4 | unchanged |

**Verdict**: ✅ **PASS** — no Critical blockers for Conditional GA.

---

## Automated Coverage

| Suite | Tests | Pass | Notes |
|-------|-------|------|-------|
| `auth.test.ts` | 9 | 9 | NFR-S01/S02/S07 |
| `p7-production.test.ts` | 10 | 9 (+1 skip PG) | Production guards, audit |
| `sprint2b.test.ts` | G02/G05/G07 | pass | Step gate, duplicate, settlement |
| `p6-realtime.test.ts` | WS auth | pass | Token required |
| **Full suite** | **209** | **208 pass**, 1 skipped | 2026-07-27 |

---

## Control Matrix

| Control | Implementation | Test / Review | Critical |
|---------|----------------|---------------|----------|
| Authentication | HMAC JWT (`BSP_AUTH_SECRET`) | auth.test.ts | 0 |
| Authorization | Role + session/company scope | GM/CEO route guards | 0 |
| Join code entropy | 128-bit hex (`randomBytes(16)`) | auth + p7 tests | 0 |
| SQL injection | Prisma parameterized | Code review | 0 |
| XSS | React escape + JSON API | Code review | 0 |
| Session hijacking | Scoped JWT + httpOnly cookie | auth.test.ts | 0 |
| Audit tampering | Append-only repository | P7 audit tests | 0 |
| Production storage | PG-only; memory forbidden | container.ts guards | 0 |
| CSRF | sameSite=lax cookie | Manual | 0 (deferred) |
| Rate limiting | Not implemented | — | 0 (deferred) |
| Brute-force join | 128-bit mitigates | Design | 0 (deferred) |

---

## Manual Re-Review (P9)

| Check | Method | Result |
|-------|--------|--------|
| Unauthenticated `/play` API | `requireAuth` | ✅ 401 |
| CEO cross-company dashboard | scope check | ✅ 403 |
| GM cross-session mutation | session scope | ✅ 403 |
| Admin routes without PLATFORM_ADMIN | role gate | ✅ 403 |
| `BSP_USE_MEMORY=1` in production | container throw | ✅ |
| Missing `BSP_DATABASE_URL` in prod | container throw | ✅ |
| Join code injection | format validation | ✅ 400 |
| Audit sensitive payload | structured, no passwords | ✅ |

---

## P9 Pilot Security Observations

- P9 E2E pilot uses **memory mode** (Vitest) — production path validated separately via P7 PG skip test when `BSP_DATABASE_URL` set.
- GM mutations in pilot require `GmActor` with audit reason — consistent with P3/P7.
- Event fire + economy patch logged as `EVENT_FIRED`, `ECONOMY_CHANGE` in audit trail.

---

## Deferred Items (Low Risk — Classroom LAN)

| ID | Item | Risk | Plan |
|----|------|------|------|
| SEC-D1 | CSRF tokens | Low | Post-GA |
| SEC-D2 | Login/join rate limiting | Low | Post-GA |
| SEC-D3 | Token revocation list | Low | 24h TTL acceptable |
| SEC-D4 | Multi-instance WS auth stickiness | Low | Post-GA Redis |

---

## Critical Findings

**None.**

---

*Re-review completed as part of Sprint 3 P9 deliverable. Prior baseline: `security-test-p2.md`, `p7-production-readiness.md` §9.*
