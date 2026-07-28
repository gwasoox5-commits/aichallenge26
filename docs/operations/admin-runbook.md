# Admin Operations Runbook

> Operator guide for BSP production sessions. Korean labels match the admin UI.

## Pre-Session Checklist

1. **Health check**
   ```bash
   curl -s https://<host>/api/health | jq .status
   ```
   Expect `READY` or `DEGRADED`. Database and WebSocket must be `READY`.

2. **Integrations panel** — `/admin/integrations`
   - OpenAI: LIVE (preferred) or NOT_CONFIGURED (manual events OK)
   - News: LIVE or NOT_CONFIGURED

3. **Pilot check** — `/admin/pilot-check`
   - Storage: `postgresql`
   - Demo bootstrap: disabled in production

4. **Create session** — Admin → **세션 생성 Wizard**
   - Set session name, team count, period config
   - Copy **join code** and share URL `/join` with participants

5. **Verify WebSocket** — custom server must be running (`npm start` / Railway default)

## During Session

### Control Desk (`/admin/control`)

| Action | When |
|--------|------|
| Monitor submissions | Each decision step |
| **Pause / Resume** | Breaks, technical issues |
| **Advance step** | All teams submitted (or after force-submit) |
| **Force submit** | Team timeout — use with audit reason |
| **Zero submit** | Team absent — zeroes their decision |

### Events

1. Event Studio → draft scenario
2. Preview impact
3. Approve → Publish to session
4. Verify learners see event on dashboard

### Economy

- GM economy panel → apply preset or patch
- FX reference changes require GM approval

### Settlement (Step 7)

1. Confirm all teams submitted Step 7 decisions
2. **Close period** — triggers accounting settlement
3. Optional: `/admin/accounting-audit` for B/S validation

### Game End

- Advance through final period
- Trigger **Game end**
- Confirm rankings and debrief data available

## Post-Session

1. **Debrief** — `/admin/debrief`
   - Review rankings
   - Export CSV/JSON if needed

2. **Audit log** — `/admin/audit`
   - Review GM actions (force submit, events, economy patches)

3. **Accounting audit** — `/admin/accounting-audit`
   - B/S validation per team

4. **Backup** (recommended after important sessions)
   ```bash
   npm run bsp:backup
   ```

## Production Environment Rules

| Variable | Required value |
|----------|----------------|
| `BSP_DEMO_MODE` | `false` |
| `BSP_ALLOW_FIXTURE` | `false` |
| `BSP_USE_MEMORY` | unset |
| `BSP_DATABASE_URL` | PostgreSQL connection |
| `BSP_AUTH_SECRET` | ≥32 chars, unique |
| `BSP_ADMIN_PASSWORD` | ≥8 chars, not dev default |

## Database Operations

```bash
# Apply pending migrations (deploy / one-off)
npx prisma migrate deploy --schema=prisma/bsp.schema.prisma

# Backup
npm run bsp:backup

# Restore (destructive — test on staging first)
npm run bsp:restore
```

## WebSocket Architecture

- Custom server: `server.ts` → `initRealtimeHub(server)`
- Path: `/api/v1/ws?token=<JWT>`
- **Do not** use plain `next start` in production — WebSocket will not work

## Health & Monitoring

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `/api/health` | Public | Aggregated status for load balancers |
| `/api/integrations/health` | GM / Admin | Detailed integration status |
| `/api/v1/pilot/health` | Public | Legacy pilot check |

Railway health check: `/api/health` (see `railway.toml`).

## Escalation

See [troubleshooting.md](./troubleshooting.md) for common issues.

Deployment docs: [railway.md](../deployment/railway.md), [post-deploy-checklist.md](../deployment/post-deploy-checklist.md).
