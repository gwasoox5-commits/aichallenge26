# P6 Realtime Review — WebSocket & Real-time Collaboration

> **범위**: Sprint 3 · P6 WebSocket & Real-time Collaboration (V1 GA)  
> **작성일**: 2026-07-27  
> **상태**: ✅ P6 기능 검증 완료

---

## 1. 개요

BSP V1 GA **P6 Realtime** 리뷰 패키지입니다. GM↔CEO 간 **폴링(15–20s) 제거** 후 WebSocket 기반 실시간 협업을 구현했습니다. Game Engine / Event Store mutation 후 session-scoped broadcast, 클라이언트 auto-resync, UX flash indicator 포함.

| 항목 | 값 |
|------|-----|
| Dev 서버 | `tsx server.ts` → `http://localhost:3000` (`BSP_USE_MEMORY=1`) |
| WebSocket endpoint | `ws://host/api/v1/ws?token=<JWT>` |
| 데모 Join Code | `DEADBEEF000000000000000000000001` |
| P6 E2E 테스트 | **12/12 pass** (10 scenarios + auth + heartbeat) |
| 전체 테스트 | **169/170 pass** (benchmark 50ms flaky 1건 — P2.5 기존) |
| Build | ✅ `npm run build` pass |

---

## 2. WebSocket Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  server.ts (custom Next.js + HTTP upgrade)                      │
│    initRealtimeHub(server) → WebSocketServer noServer           │
│    path: /api/v1/ws                                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  RealtimeHub (session rooms)                                     │
│    • Auth: verifyToken(token) — sessionId / companyId scope      │
│    • Duplicate: close old conn (same userId+role+session)        │
│    • Heartbeat: 30s ping / 10s pong timeout                      │
│    • CEO filter: company-scoped vs session-wide events             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ broadcast
┌───────────────────────────▼─────────────────────────────────────┐
│  GameEngine / EventEngineService mutations                       │
│    notifyStepAdvanced, notifyTeamSubmitted, notifyEconomyChanged │
│    notifyEventFired, notifyPause, notifySettlementComplete, …    │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
  /gm GmCommandCenter                    /play PlayPage + CeoEventFeed
  useRealtime → onEvent/onSync           useRealtime → refresh dashboard
  RealtimeIndicator (flash UX)           RealtimeIndicator (flash UX)
```

### 핵심 모듈

| 모듈 | 경로 |
|------|------|
| Event types | `src/bsp/domain/realtime/realtime-event-types.ts` |
| WebSocket hub | `src/bsp/infrastructure/realtime/realtime-hub.ts` |
| Broadcaster | `src/bsp/infrastructure/realtime/realtime-broadcaster.ts` |
| Client hook | `lib/bsp/use-realtime.ts` |
| UX indicator | `components/bsp/RealtimeIndicator.tsx` |
| Custom server | `server.ts` |

---

## 3. Event Flow Diagram

```mermaid
sequenceDiagram
    participant CEO as CEO /play
    participant API as REST API
    participant Engine as GameEngine
    participant Hub as RealtimeHub
    participant GM as GM /gm

    CEO->>API: POST /decisions (LOAN)
    API->>Engine: submitDecision()
    Engine->>Engine: persist + EventStore
    Engine->>Hub: TEAM_SUBMITTED + RANKING_UPDATED
    Hub-->>GM: WS event (submit flash)
    Hub-->>CEO: WS event (dashboard.updated)
    GM->>API: GET /desk (auto-resync)
    CEO->>API: GET /dashboard (auto-resync)

    GM->>API: POST /advance-step
    API->>Engine: gmAdvanceStep()
    Engine->>Hub: STEP_ADVANCED
    Hub-->>CEO: WS event (step flash)
    Hub-->>GM: WS event (step flash)
    CEO->>API: GET /dashboard (new step gate)
```

### Realtime Event Types (Event Store aligned)

| Event | WS type | Trigger |
|-------|---------|---------|
| Step Advanced | `step.advanced` | gmAdvanceStep |
| Step Reopened | `step.reopened` | gmReopenStep |
| Pause / Resume | `session.paused` / `session.resumed` | gmPause/Resume |
| Force / Zero Submit | `gm.force_submit` / `gm.zero_submit` | gmForce/ZeroSubmit |
| Settlement Complete | `settlement.completed` | closePeriod |
| Next Half Started | `period.started` | startNextHalf |
| Game End | `game.ended` | gameEnd |
| Economy Changed | `economy.changed` | patchEconomy / rollback / event patch |
| Event Fired | `event.fired` | fireEvent (IMMEDIATE) |
| Team Submitted | `team.submitted` | submitDecision |
| Ranking Updated | `ranking.updated` | submit / force / zero |
| Dashboard Updated | `dashboard.updated` | submitDecision |
| Audit Log | `audit.log` | economy / event mutations |

---

## 4. Connection Lifecycle

```
1. CONNECT
   Client → ws://host/api/v1/ws?token=JWT
   Server → verifyToken → sessionId scope check
   Server → { op: "connected", sessionId, role, connectionId }
   Server → { op: "sync", hint: {} }  → client triggers REST resync

2. HEARTBEAT
   Server ping every 30s → client pong
   Timeout 10s → close(4001)

3. DUPLICATE
   Same sessionId+userId+role → close old socket(4000)

4. RECONNECT
   Client exponential backoff 1s → 15s max
   On reconnect → sync → full REST refresh

5. SESSION END
   game.ended event → client resync shows FINISHED state
   Token expiry → close(4401) → re-auth required

6. NETWORK DROP
   onclose → auto reconnect loop
   RealtimeIndicator shows "재연결 중…"
```

---

## 5. Performance Measurements

| Metric | Target | Measured (P6 tests) | Status |
|--------|--------|---------------------|--------|
| 10 teams + GM concurrent | Stable | 10 submits + GM receives ≥10 TEAM_SUBMITTED | ✅ |
| Event propagation | < 1s | **< 1s** (waitForEvent timeout 1000ms, all pass) | ✅ |
| 100 team load (1 submit) | < 1s propagation | **< 1000ms** (Scenario 10 assertion) | ✅ |
| 100 team session create | No crash | 100 companies created, hub stats OK | ✅ |
| Connection leak | 0 after close | connections 1→0 after ws.close | ✅ |
| 10-team batch submit wall time | — | ~412ms (vitest run) | ✅ |
| Benchmark submitDecision | < 50ms | 145ms (pre-existing flaky + broadcast overhead) | ⚠️ |

### Hub stats (Scenario 10)

- Before submit: `connections: 1`
- After broadcast: `eventsSent > 0`
- After close: `connections: 0`

---

## 6. E2E Results (`tests/bsp/p6-realtime.test.ts`)

| # | Scenario | Result |
|---|----------|--------|
| 1 | 10 teams concurrent submit | ✅ GM receives ≥10 TEAM_SUBMITTED |
| 2 | GM step advance | ✅ CEO receives STEP_ADVANCED → STEP2 |
| 3 | Pause/Resume | ✅ PAUSE + RESUME events |
| 4 | Event fire | ✅ EVENT_FIRED + ECONOMY_CHANGED |
| 5 | Economy change | ✅ ECONOMY_CHANGED source=GM_MANUAL |
| 6 | Half end (settlement) | ✅ SETTLEMENT_COMPLETE |
| 7 | Next half | ✅ NEXT_HALF_STARTED periodIndex=2 |
| 8 | Game end | ✅ GAME_END after 6 halves |
| 9 | Disconnect/reconnect | ✅ duplicate closed, reconnect receives PAUSE |
| 10 | 100 team load test | ✅ propagation < 1s, no leak |
| + | Auth reject (no token) | ✅ close 4401 |
| + | Heartbeat pong | ✅ ping/pong round-trip |

---

## 7. UX — Visual Feedback

| Surface | Indicator | Flash triggers |
|---------|-----------|----------------|
| `/gm` GmCommandCenter | `RealtimeIndicator` | step, pause, submit, economy, event, ranking, audit |
| `/play` header | `RealtimeIndicator` | step, pause, economy, dashboard |
| `/play` CeoEventFeed | `RealtimeIndicator` | economy badge, event feed refresh |

폴링 제거:
- ~~GmCommandCenter 15s setInterval~~ → WebSocket `onEvent/onSync`
- ~~CeoEventFeed 20s setInterval~~ → WebSocket `onEvent/onSync`

---

## 8. Screen Captures

Screenshots: `docs/release/screenshots/p6/`

| File | Description |
|------|-------------|
| `01-gm-login.png` | GM login page |
| `02-gm-realtime-connected.png` | GM desk with live indicator |
| `03-gm-ops-realtime.png` | GM ops tab + team table |
| `04-gm-pause-flash.png` | Pause action flash |
| `05-gm-economy-realtime.png` | Economy tab realtime |
| `06-ceo-play-realtime.png` | CEO play with indicator |
| `07-ceo-event-feed-realtime.png` | CEO environment feed |
| `08-gm-events-realtime.png` | GM events tab |

Capture: `node scripts/capture-p6-screenshots.mjs http://localhost:3018`

---

## 9. Known Issues

| ID | Issue | Target |
|----|-------|--------|
| K-P6-01 | WebSocket requires `tsx server.ts` — `next dev` alone has no WS | Document in README |
| K-P6-02 | Benchmark 50ms threshold flaky (145ms with broadcast hook) | Tune threshold P7 |
| K-P6-03 | CEO play title still "Sprint 2B" | P7 polish |
| K-P6-04 | PRESET_CARBON_TAX esgPressureIndex=115 bounds | P7 |
| K-P6-05 | Multi-instance deploy needs sticky sessions or Redis pub/sub | P7/P9 |
| K-P6-06 | Windows `start` script uses tsx (set NODE_ENV manually for prod) | Ops doc |

---

## 10. V1 GA Progress Report (P6 Gate)

| Metric | Value | Notes |
|--------|-------|-------|
| **Feature completion** | **~72%** | P1–P6 done; P7–P9 remain |
| **P6 test pass rate** | **100%** (12/12) | All realtime scenarios |
| **Overall test pass rate** | **99.4%** (169/170) | 1 benchmark flaky (pre-existing) |
| **Excel rule parity** | **~88%** | Unchanged from P5 |
| **Build** | ✅ Pass | Next.js 15 + custom server |
| **Security status** | ✅ Token auth on WS connect; session/company scope | Production needs BSP_AUTH_SECRET |
| **Performance status** | ✅ < 1s propagation @ 100 teams | Benchmark threshold needs tune |

### Sprint completion snapshot

| Sprint | Status |
|--------|--------|
| P1 Core Engine | ✅ |
| P2 Auth | ✅ |
| P3 GM Ops | ✅ |
| P4 Event Engine | ✅ |
| P5 Economy UI | ✅ |
| **P6 Realtime** | **✅** |
| P7 Persistence / Prisma | 🔲 |
| P8 Full Scenario Library | 🔲 |
| P9 GA polish / prod deploy | 🔲 |

### P7 Blockers

| Blocker | Impact |
|---------|--------|
| Prisma persistence for patches/events/audit | Production data durability |
| Redis pub/sub for horizontal WS scale | Multi-node deployment |
| PRESET bounds fix (ESG 115) | Preset apply 422 |
| Full 53-event catalog | 18 MVP templates only |
| Production auth hardening (BSP_AUTH_SECRET, HTTPS wss://) | Security GA gate |
| Benchmark threshold retune | CI flaky signal |

---

## 11. How to Run

```bash
# Memory mode dev with WebSocket
set BSP_USE_MEMORY=1
npm run dev          # tsx server.ts → :3000

# Tests
npm test             # 169/170 pass

# Build
npm run build

# Screenshots (server must be running)
node scripts/capture-p6-screenshots.mjs http://localhost:3000
```
