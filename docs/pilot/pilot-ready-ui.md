# Pilot Ready UI

## Overview

Pilot Ready UI integrates existing V1/V2/V3 engines into a unified product experience for classroom pilots. No new calculation logic was added.

## User Journeys

### Administrator / GM

1. Open `/` → **관리자·강사로 시작** → `/admin/login`
2. Login → `/admin` dashboard
3. Create session via Wizard (`/admin/sessions/new`) or **파일럿 데모 세션**
4. Share join URL/code with learners
5. Monitor teams, control game (`/admin/control`)
6. Publish events via Event Studio / Intelligence / World (linked from nav)
7. Close period, next half, debrief (`/admin/debrief`)

### Learner / CEO

1. Open `/` → **학습자로 참여** → `/join`
2. Enter join code, team name, optional nickname
3. Auto-redirect to `/play`
4. Complete Step 1–7 decisions with checklist gate
5. Wait after submit; auto-advance on GM step change via WebSocket

## Information Architecture

### Admin (`/admin`)

| Section | Route |
|---------|-------|
| 운영 개요 | `/admin` |
| 세션 생성 | `/admin/sessions/new` |
| 팀 현황 | `/admin/teams` |
| 게임 진행 | `/admin/control` |
| 이벤트 스튜디오 | `/event-studio` |
| 뉴스 Intelligence | `/event-studio/intelligence` |
| World Simulation | `/world` |
| 디브리프 | `/admin/debrief` |
| 운영 로그 | `/admin/audit` |
| 파일럿 점검 | `/admin/pilot-check` |

### Learner

| Screen | Route |
|--------|-------|
| Join | `/join` |
| CEO Desk | `/play` |

## Roles & Permissions

- **PLATFORM_ADMIN / GM**: `/admin/*`, `/gm`, event/world tools
- **CEO**: `/join`, `/play` only; blocked from `/admin`
- Internal IDs/tokens not shown in learner UI
- Join URL strips `companyId` after auth

## State Handling

Loading, empty, error, disconnected, submitted, session ended — handled per screen. WebSocket reconnect via existing `useRealtime`.

## Pilot Mode

Set `BSP_PILOT_MODE=true` or `PILOT_MODE=true`. Defaults: 1 year 2 halves, 5 teams, manual step advance, GM approval for AI publish.

## E2E Test Coverage

See `tests/bsp/pilot-ui.test.ts` — 50+ scenarios covering session lifecycle, join, submit, advance, pause, settlement, access control, checklist gate.

## Known Issues

- Session Wizard Step 2–4 settings are informational; engine session API accepts name only (economy/period applied via existing GM tools post-create)
- PDF debrief export not implemented (CSV/JSON/print available)
- Browser screenshot evidence requires running dev server with live session
- Event/World pages retain legacy session ID query param fallback if admin context empty
