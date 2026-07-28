# Troubleshooting Guide

> Common production issues and fixes for BSP operators.

## Health Check Failures

### `/api/health` returns 503

**Symptoms:** Railway deploy unhealthy, `status: "FAILED"`

| Component | Likely cause | Fix |
|-----------|--------------|-----|
| `database` | Wrong/missing `BSP_DATABASE_URL` | Set URL from Postgres plugin; run migrations |
| `database` | Postgres unreachable | Check Railway Postgres service status |
| `websocket` | Plain `next start` used | Use `npm start` (`tsx server.ts`) |
| `application` | Invalid production config | Check logs for startup errors |

```bash
curl -s https://<host>/api/health | jq
```

### Database connection pool exhausted

- Reduce concurrent sessions or increase `BSP_DB_POOL_SIZE`
- Verify connection string doesn't duplicate `connection_limit`

---

## Authentication

### Admin cannot login

- Verify `BSP_ADMIN_PASSWORD` in hosting variables
- Production rejects dev default `bsp-admin-dev`
- Password must be ≥8 characters

### Join code invalid

- Codes are **5 characters** (A–Z, 0–9)
- Case-insensitive entry
- Session must exist in PostgreSQL (not lost on restart)

### JWT / token errors (4401)

- `BSP_AUTH_SECRET` must be ≥32 chars and **unchanged** across deploys
- Changing secret invalidates all active tokens — users must re-login

---

## WebSocket

### WebSocket disconnected / no realtime updates

1. Confirm custom server running: `npm start` or Railway default start command
2. Check browser console for 4401 auth errors → re-login
3. Verify token includes `sessionId` (GM/CEO tokens)
4. Path must be `/api/v1/ws?token=...`

### Infinite reconnect loop

- Fixed in `use-realtime.ts` for 4401 errors — update to latest build
- Clear browser cache / hard refresh

---

## Integrations

### OpenAI shows FIXTURE / NOT_CONFIGURED / ERROR

| Status | Meaning | Action |
|--------|---------|--------|
| NOT_CONFIGURED | No API key | Set `OPENAI_API_KEY` |
| FIXTURE | Using test data | Set key; keep `BSP_ALLOW_FIXTURE=false` in prod |
| ERROR | API failure | Check billing, rate limits, model name |

Production: use manual event input when AI unavailable. Do not enable `BSP_ALLOW_FIXTURE=true` unless explicitly approved.

### News not live

```env
BSP_NEWS_PROVIDER=gnews
BSP_GNEWS_API_KEY=<your-key>
```

Verify at `/admin/integrations`.

---

## Session & Gameplay

### Demo button returns 403

- Expected when `BSP_DEMO_MODE=false`
- Use **세션 생성 Wizard** instead

### Settlement / accounting validation failed

- Check `/admin/accounting-audit`
- Run locally: `npm test -- tests/bsp/accounting-validation.test.ts`

### Data lost after restart

- Production must use PostgreSQL (`BSP_DATABASE_URL`)
- `BSP_USE_MEMORY=1` is forbidden in production

---

## Build & Deploy

### Build fails on Railway

1. Check build logs for TypeScript errors
2. Verify `npm run bsp:generate` runs before `npm run build`
3. Reproduce locally: `npm ci && npm run bsp:generate && npm run build`

### Migrations not applied

```bash
npx prisma migrate deploy --schema=prisma/bsp.schema.prisma
```

Fresh DB: migrate then optional seed. Existing DB: **backup first**.

### Secret scan warnings

```bash
npm run secret-scan
```

- Ensure `.env.local` is not git-tracked
- Never commit API keys or database passwords

---

## Git / Repository

### `.env.local` accidentally tracked

```bash
git rm --cached .env.local
git commit -m "chore: stop tracking .env.local"
```

Rotate any exposed secrets immediately.

---

## Getting Help

1. Collect `/api/health` JSON output
2. Check Railway deployment logs (build + runtime)
3. Note session ID, join code, and timestamp of issue
4. Review [admin-runbook.md](./admin-runbook.md) and [post-deploy-checklist.md](../deployment/post-deploy-checklist.md)
