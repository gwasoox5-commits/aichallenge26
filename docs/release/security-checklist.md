# Security Checklist — Final RC

> 2026-07-28

## Secrets & Git

| Check | Status | Notes |
|-------|--------|-------|
| `.env` in `.gitignore` | ✅ | Added `.env` + `.env*.local` |
| API keys in source | ✅ | No hardcoded OpenAI/GNews keys in repo |
| Client bundle secrets | ✅ | Keys server-only |
| Default admin password in prod | ✅ Blocked | `getAdminPasswordOrThrow()` |
| Default auth secret in prod | ✅ Blocked | `token-service.ts` throws |
| Git history key scan | ⚠️ Manual | Run locally: `git secrets` or grep |

**If keys were ever committed:** rotate OpenAI/GNews keys immediately (not just delete from tree).

## Auth & Authorization

| Check | Status | Evidence |
|-------|--------|----------|
| Admin login | ✅ | `auth.test.ts` |
| GM session token scope | ✅ | `admin-gm-token-flow.test.ts` |
| CEO blocked from admin APIs | ✅ | API guards |
| Cross-session IDOR | ✅ | Token sessionId enforcement |
| Join code format (5 char) | ✅ | `p7-production.test.ts` |
| WS auth + 4401 no infinite loop | ✅ | `p6-realtime.test.ts` |

## Input & Output

| Check | Status |
|-------|--------|
| Server-side step validation | ✅ |
| SQL injection (Prisma parameterized) | ✅ |
| XSS (React default escaping) | ✅ |
| Stack traces in production UI | ✅ Hidden |
| API keys in logs/responses | ✅ Redacted |

## Production Guards

| Check | Status |
|-------|--------|
| `BSP_USE_MEMORY` forbidden in prod | ✅ |
| Demo bootstrap gated | ✅ |
| Fixture AI blocked without flag | ✅ |
| Source maps | Default Next.js (review deploy config) |

## Operator Actions Before Go-Live

1. Set strong `BSP_AUTH_SECRET` (≥32 chars)
2. Set unique `BSP_ADMIN_PASSWORD`
3. Configure `BSP_DATABASE_URL` + run migrations
4. Set `BSP_DEMO_MODE=false`, `BSP_ALLOW_FIXTURE=false`
5. Configure OpenAI/GNews if live AI/news required
6. Run `npm run build` on deploy target

**Security verdict:** **PASS for RC commit** pending operator secret rotation if keys were exposed in chat/history.
