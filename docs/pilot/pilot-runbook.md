# Pilot Runbook

## Pre-Flight

1. Set environment variables (see pilot-check)
2. Open `/admin/pilot-check` — all critical items green or warn-only
3. Login at `/admin/login`

## Session Creation

**Option A — Wizard:** `/admin/sessions/new` → complete 5 steps → copy join guide

**Option B — Demo:** `/admin` → **파일럿 데모 세션 (5팀)** → Alpha–Echo pre-registered teams available

## Learner Onboarding

1. Share URL: `https://<host>/join?code=<JOIN_CODE>`
2. Learners enter team name (must match available slot)
3. Confirm teams appear in `/admin/teams`

## Game Operation

1. Start game from GM control (`/admin/control`)
2. For each Step 1–6: wait for submissions → advance step
3. Step 7: run **반기 결산** from control panel
4. **다음 반기** when ready
5. Optional: publish Breaking News from Intelligence tab

## Incident Response

| Issue | Action |
|-------|--------|
| WebSocket disconnect | Top banner shows status; refresh or wait for auto-reconnect |
| Stuck team | GM force submit or zero submit from team table |
| Wrong submission | GM reopen step |
| Pause needed | Pause from dashboard quick actions |
| OpenAI unavailable | Continue without AI events; manual Event Studio |

## Settlement & Close

1. Verify all teams calculable (pilot-check / control panel)
2. Close period
3. Review debrief at `/admin/debrief`
4. Export CSV/JSON for records
5. Game end when program complete

## Data Retention

- Audit log: `/admin/audit`
- Debrief export: CSV/JSON from debrief page
- PostgreSQL sessions persist when `BSP_DATABASE_URL` set
