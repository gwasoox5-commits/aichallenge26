# Post-Deploy Verification Checklist

> Run after every production or staging deploy. Estimated time: **10 minutes** (smoke test included).

## 1. Infrastructure (2 min)

- [ ] Deploy status **Success** in Railway (or hosting dashboard)
- [ ] `NODE_ENV=production` set on app service
- [ ] `BSP_DATABASE_URL` points to correct Postgres instance
- [ ] `BSP_DEMO_MODE=false`, `BSP_ALLOW_FIXTURE=false`
- [ ] Secrets set: `BSP_AUTH_SECRET`, `BSP_ADMIN_PASSWORD`
- [ ] Migrations applied: `npx prisma migrate deploy --schema=prisma/bsp.schema.prisma`

## 2. Health Endpoints (1 min)

```bash
BASE=https://<your-app>.up.railway.app

# Aggregated health (public)
curl -sf "$BASE/api/health" | jq '{status, database, websocket, openai, news}'

# Expect HTTP 200 and status READY or DEGRADED
# database.status = READY
# websocket.status = READY
```

- [ ] `/api/health` returns HTTP **200**
- [ ] `database.status` = **READY**
- [ ] `websocket.status` = **READY**
- [ ] `application.status` = **READY**

Optional (live API probe — may incur cost):

```bash
curl -sf "$BASE/api/health?live=1"
```

## 3. Admin Console (1 min)

- [ ] Open `/admin/login` — page loads
- [ ] Login with production `BSP_ADMIN_PASSWORD` — success
- [ ] `/admin/integrations` — OpenAI/News status visible (LIVE or NOT_CONFIGURED)
- [ ] `/admin/pilot-check` — storage = `postgresql`

## 4. 10-Minute Smoke Test

Complete a minimal end-to-end session flow:

| Step | Action | Pass criteria |
|------|--------|---------------|
| 1 | **Admin login** | Redirect to admin dashboard |
| 2 | **Session create** | Admin → 세션 생성 Wizard → session created with join code |
| 3 | **Learner join** | Open `/join`, enter code, join as team CEO |
| 4 | **Event publish** | GM → Event Studio → preview → approve → publish (or manual event) |
| 5 | **Settlement** | Advance to Step 7 → close period → settlement completes |
| 6 | **Game end** | Complete final period → game ended state visible |

Additional checks during smoke test:

- [ ] WebSocket connected (no infinite reconnect in browser console)
- [ ] Real-time updates on control desk when step advances
- [ ] Debrief page loads with rankings after game end

## 5. Security Spot Check (1 min)

- [ ] Dev admin password (`bsp-admin-dev`) **rejected** in production
- [ ] `/api/v1/demo/setup` returns **403** when `BSP_DEMO_MODE=false`
- [ ] No secrets in build logs or public responses

## 6. Backup & Rollback Ready

- [ ] Backup procedure documented and tested once: `npm run bsp:backup`
- [ ] Previous Railway deployment available for rollback

## 7. Sign-Off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Operator | | | |
| Instructor (optional) | | | |

---

## Failure Actions

| Symptom | Action |
|---------|--------|
| `/api/health` 503, database FAILED | Check `BSP_DATABASE_URL`, Postgres status, run migrations |
| websocket NOT_CONFIGURED | Confirm start command is `npm start` (custom server), not `next start` |
| Admin login fails | Verify `BSP_ADMIN_PASSWORD` in Railway variables |
| WebSocket 4401 loops | Re-login; check `BSP_AUTH_SECRET` unchanged across deploy |
| OpenAI ERROR | Check API key, billing; use manual events if degraded |

See [troubleshooting.md](../operations/troubleshooting.md) for details.
