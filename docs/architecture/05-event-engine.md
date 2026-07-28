# 05. Event Engine 설계

> Phase 0-5 | **Superseded by** `docs/spec/02-event-engine-spec.md` **v1.1** (D-04, D-15)

## 5.1 목적

시나리오·강사 개입·경제 변수 변화를 **런타임 이벤트**로 표현하고,  
시장·경제·회계·AI News에 **일관된 영향**을 적용한다.

---

## 5.2 개념 모델

```
EventTemplate (Library, reusable)
       │
       ▼ clone / reference
SimulationEvent (Runtime, per Session)
       │
       ├── Effect[] → EconomicState, MarketState, CompanyState
       ├── Trigger (manual | scheduled | condition)
       └── Duration (instant | period | N periods)
```

---

## 5.3 EventTemplate 스키마 (논리)

| Field | Type | 설명 |
|-------|------|------|
| id | UUID | |
| code | string | FX_SURGE |
| title | string | 환율 급등 |
| description | text | 교육용 설명 |
| category | enum | ECONOMY, MARKET, SUPPLY, LABOR, TECH, POLICY, DISASTER |
| defaultTiming | {year?, half?} | Scenario 기본 시점 |
| effects | Effect[] | |
| newsTemplate | object | AI News seed |
| severity | 1-5 | |
| isActive | bool | Library enabled |

### Effect Types

| type | target | payload example |
|------|--------|-----------------|
| ECONOMIC_DELTA | var key | `{ "exchangeRate": "+15%" }` |
| MARKET_DELTA | regionId \| ALL | `{ "demandMultiplier": 0.8 }` |
| COST_DELTA | sku \| LOGISTICS | `{ "multiplier": 1.2 }` |
| CAPACITY_DELTA | machine \| labor | `{ "factor": 0.9 }` |
| TAX_DELTA | corporateTax | `{ "absolute": 25 }` |
| ONE_TIME_COST | company | `{ "amount": 500, "account": "EXP_MISC" }` |
| BLOCK_STEP | step | `{ "blocked": ["PRODUCTION"], "periods": 1 }` |

---

## 5.4 SimulationEvent (Runtime)

| Field | 설명 |
|-------|------|
| sessionId | |
| templateId | nullable (ad-hoc) |
| status | SCHEDULED, ACTIVE, EXPIRED, CANCELLED |
| firedAt | |
| expiresAtPeriod | |
| targetScope | GLOBAL, COMPANY, REGION |
| targetIds | |
| resolvedEffects | snapshot after apply |
| newsArticleId | |

---

## 5.5 Trigger 모델

| Trigger | 설명 |
|---------|------|
| MANUAL | Admin Fire Event |
| SCHEDULED | Scenario: Y2 H1 on Step MATERIAL |
| ON_PERIOD_START | Period open hook |
| ON_PERIOD_END | After settlement |
| CONDITION | e.g. avgCash < threshold |

---

## 5.6 Event Engine 처리 순서

```
EventFireRequest
  → validate (session RUNNING, no conflict)
  → resolve targets
  → apply effects (transactional)
      → EconomicStateService.patch
      → MarketStateService.patch
      → CompanyEffectService (if scoped)
  → persist SimulationEvent
  → emit domain: EventFired
  → AI News Engine.enqueue
  → WebSocket broadcast
```

---

## 5.7 충돌·중첩 규칙

| 규칙 | 동작 |
|------|------|
| 동일 var 동시 ACTIVE | merge policy: ADDITIVE or MAX_SEVERITY (config) |
| BLOCK_STEP | CEO 해당 Step submit 403 |
| EXPIRE | Period 경과 시 auto EXPIRED, reverse optional |

---

## 5.8 Scenario Editor 연동

Timeline row:
```json
{
  "year": 2,
  "half": "H1",
  "onStep": "MATERIAL",
  "action": "FIRE_EVENT",
  "eventTemplateId": "..."
}
```

Load to session → `ScheduledEvent` rows 생성

---

## 5.9 AI News Engine 연동

Event fired → NewsJob:
- headline, summary, marketImpact, risks[], strategyHints[]
- scope GLOBAL → all CEOs
- scope COMPANY → personalized (inventory, debt context)

---

## 5.10 Event Library 예시

| Code | Title | Effects |
|------|-------|---------|
| FX_SURGE | 환율 급등 | exchangeRate +15%, rawMaterialIndex +8% |
| MATERIAL_SHORTAGE | 원자재 부족 | supply -20%, cost +10% |
| LABOR_STRIKE | 노조 파업 | production capacity -30% 1 period |
| AI_REVOLUTION | AI 혁명 | small machine efficiency +20%, hire cost +5% |
| TARIFF_HIKE | 관세 인상 | tariffRate +10% |
| CARBON_TAX | 탄소세 | carbonTaxRate new, ONE_TIME_COST optional |

---

## 5.11 Service 인터페이스 (설계)

```
EventEngineService.fire(sessionId, templateId, overrides?)
EventEngineService.schedule(sessionId, schedule[])
EventEngineService.cancel(eventId)
EventEngineService.onPeriodEnd(sessionId, periodId)
EffectResolver.resolve(template, context) → ResolvedEffect[]
```

Context: EconomicState, MarketState, Companies[], current Period/Step

---

## 5.12 감사·롤백

- 모든 fire/cancel → AuditLog
- Phase 2: `reverseEvent(eventId)` — inverse effects where defined
