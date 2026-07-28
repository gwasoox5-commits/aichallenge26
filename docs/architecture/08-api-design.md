# 08. API 설계

> **Supreme principles**: `../spec/00-v1-development-principles.md`  
> Phase 0-8 | **Version 1.1** — D-01, D-07, D-09, D-11

## 8.1 원칙

- UI는 계산하지 않음 — 모든 비즈니스 로직 Service Layer
- Idempotency-Key on POST decisions
- Session-scoped auth (JWT + role)
- OpenAPI 3.1 spec → Phase 1 JSON Spec 후 생성

---

## 8.2 Auth

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/login` | instructor email/password |
| POST | `/auth/join` | joinCode + ceo profile → token |
| POST | `/auth/refresh` | |
| GET | `/auth/me` | |

---

## 8.3 Sessions (Admin)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/admin/sessions` | list |
| POST | `/admin/sessions` | create |
| GET | `/admin/sessions/:id` | detail + progress |
| PATCH | `/admin/sessions/:id` | settings |
| DELETE | `/admin/sessions/:id` | soft delete |
| POST | `/admin/sessions/:id/start` | |
| POST | `/admin/sessions/:id/pause` | |
| POST | `/admin/sessions/:id/resume` | |
| POST | `/admin/sessions/:id/end` | |
| GET | `/admin/sessions/:id/participants` | |
| POST | `/admin/sessions/:id/participants` | assign |

---

## 8.4 Game Progress (Admin)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/admin/sessions/:id/progress` | period, step, completion |
| POST | `/admin/sessions/:id/progress/advance-step` | |
| POST | `/admin/sessions/:id/progress/set-step` | { step } |
| POST | `/admin/sessions/:id/progress/close-period` | triggers settlement pipeline |
| GET | `/admin/sessions/:id/companies` | monitor table |
| GET | `/admin/sessions/:id/companies/:cid` | detail |
| POST | `/admin/sessions/:id/companies/:cid/override` | |

---

## 8.5 Environment (Admin)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/admin/sessions/:id/economy` | EconomicState |
| PATCH | `/admin/sessions/:id/economy` | partial update |
| GET | `/admin/sessions/:id/market` | all regions |
| PATCH | `/admin/sessions/:id/market` | |
| GET | `/admin/sessions/:id/market/results` | clearing results |

---

## 8.6 Events (Admin)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/admin/event-templates` | library |
| POST | `/admin/event-templates` | create |
| GET | `/admin/event-templates/:id` | |
| PATCH | `/admin/event-templates/:id` | |
| POST | `/admin/event-templates/generate` | **NL AI generator** |
| GET | `/admin/sessions/:id/events` | runtime list |
| POST | `/admin/sessions/:id/events/fire` | { templateId, overrides? } |
| POST | `/admin/sessions/:id/events/:eid/cancel` | |
| POST | `/admin/sessions/:id/events/schedule` | bulk from scenario |

---

## 8.7 Scenarios (Admin)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/admin/scenarios` | |
| POST | `/admin/scenarios` | |
| GET | `/admin/scenarios/:id` | with actions |
| PUT | `/admin/scenarios/:id` | |
| POST | `/admin/scenarios/:id/clone` | |
| POST | `/admin/sessions/:id/load-scenario` | { scenarioId } |

---

## 8.8 Scoring & AI (Admin)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/admin/sessions/:id/scoring` | |
| PATCH | `/admin/sessions/:id/scoring/rubric` | |
| POST | `/admin/sessions/:id/scoring/finalize` | |
| GET | `/admin/sessions/:id/rankings` | |
| GET | `/admin/sessions/:id/news` | |
| PATCH | `/admin/sessions/:id/news/:nid` | approve/edit |
| GET | `/admin/sessions/:id/ai-annual` | |
| POST | `/admin/sessions/:id/ai-annual/generate` | { year } |

---

## 8.9 Audit

| Method | Path | 설명 |
|--------|------|------|
| GET | `/admin/sessions/:id/audit-log` | paginated |

---

## 8.10 CEO — Context

| Method | Path | 설명 |
|--------|------|------|
| GET | `/ceo/context` | session, company, period, step, gates |
| GET | `/ceo/environment` | economy + market summary |
| GET | `/ceo/news` | feed |
| GET | `/ceo/progress` | step checklist |

---

## 8.11 CEO — Decisions

| Method | Path | Step |
|--------|------|------|
| GET | `/ceo/decisions/current` | active step draft |
| POST | `/ceo/decisions/loan` | LOAN |
| POST | `/ceo/decisions/facility` | FACILITY |
| POST | `/ceo/decisions/hire` | HIRING |
| POST | `/ceo/decisions/purchase` | MATERIAL |
| POST | `/ceo/decisions/production` | PRODUCTION |
| POST | `/ceo/decisions/sales` | SALES |

**Response pattern**
```json
{
  "decisionId": "...",
  "status": "POSTED",
  "validation": { "ok": true },
  "journalEntryIds": ["..."],
  "stepCompleted": true
}
```

Headers: `Idempotency-Key: uuid`

---

## 8.12 CEO — Reports

| Method | Path | 설명 |
|--------|------|------|
| GET | `/ceo/status` | cash, assets, inventory, headcount |
| GET | `/ceo/reports/balance-sheet` | ?periodId |
| GET | `/ceo/reports/income-statement` | |
| GET | `/ceo/reports/cash-flow` | |
| GET | `/ceo/reports/ledger` | paginated |
| GET | `/ceo/settlement` | current period close summary |
| GET | `/ceo/results` | historical |
| GET | `/ceo/reports/ai-annual/:year` | |

---

## 8.13 WebSocket

**Channel**: `/ws/v1/sessions/:sessionId`

### Server → Client Events

| Event | Payload |
|-------|---------|
| `session.statusChanged` | { status } |
| `progress.stepChanged` | { step, periodIndex } |
| `progress.periodClosed` | { periodId } |
| `decision.posted` | { companyId, step } (admin) |
| `economy.updated` | { diff } |
| `event.fired` | { eventId, title } |
| `news.published` | { articleId, headline, scope } |
| `ranking.updated` | { ... } |

### Client → Server
- `subscribe` { companyId? } — CEO personal news
- `ping`

---

## 8.14 Error Model

```json
{
  "error": {
    "code": "STEP_GATE_VIOLATION",
    "message": "현재 Step에서는 해당 의사결정을 할 수 없습니다.",
    "details": { "currentStep": "LOAN", "requiredStep": "MATERIAL" }
  }
}
```

| Code | HTTP |
|------|------|
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| STEP_GATE_VIOLATION | 403 |
| VALIDATION_ERROR | 422 |
| INSUFFICIENT_CASH | 422 |
| IDEMPOTENCY_REPLAY | 200 (cached) |
| CONFLICT | 409 |

---

## 8.15 Service Layer Mapping

```
Controller → ApplicationService → DomainService → Repository
```

| API group | Application Service |
|-----------|---------------------|
| decisions | DecisionOrchestrator |
| progress | GameProgressService |
| economy | EconomicStateService |
| events | EventEngineService |
| reports | FinancialStatementService |
| generate | NLEventGeneratorService |

---

## 8.16 v1.1 Endpoints

| Method | Path | Decision |
|--------|------|----------|
| POST | `/ceo/decisions/loan/phase-a` | D-01 save 1A draft |
| POST | `/ceo/decisions/loan` | D-01 final POST (1B) |
| GET | `/ceo/reports/*?periodId=` | D-11 |
| GET | `/ceo/reports/*?scope=cumulative` | D-11 YTD |
| PATCH | `/gm/sessions/:id/regions/:rid/remaining` | D-07 |
| POST | `/gm/sessions/:id/companies/:cid/release-deposit` | D-09 |
| POST | `/gm/sessions/:id/companies/:cid/misc-income` | D-03 |
| POST | `/gm/sessions/:id/progress/advance-step` | body: `{ mode: wait\|zero\|copyLastHalf }` D-10 |
| GET | `/gm/sessions/:id/ranking?mode=operating\|composite` | D-14 |

---

## 8.17 Phase 1 산출물

- OpenAPI YAML from this doc
- JSON Schema: Decision payloads, EventTemplate, ScenarioAction
- WebSocket AsyncAPI (optional)

---

## 8.17 Non-goals (Phase 0)

- Implementation
- GraphQL
- Public API keys
