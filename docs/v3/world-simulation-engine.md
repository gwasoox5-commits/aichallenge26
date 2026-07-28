# V3.0 World Simulation Engine

> GM이 이벤트를 하나씩 넣는 것이 아니라, **살아있는 경제 세계**를 구축합니다.  
> World Engine은 다음 이벤트를 **제안**만 하며, 실제 발행은 **GM 승인 → V2.4 Publish Workflow**를 거칩니다.

## Overview

```
World Profile → World State (10 dimensions + regions + industries)
        ↓
Half End → AI Evolution + Event Chain + Game Director
        ↓
GM Approve → V2.4 Publish → Event Engine → Economy Patch
```

V1/V2 Event Engine은 **변경하지 않습니다**.

## Architecture

| Layer | Path | Role |
|-------|------|------|
| Domain | `lib/v3/world/*` | World state, evolution, director, forecast |
| Event Chain | `lib/v3/event-chain/*` | Templates, probability, executor |
| Proposals | `lib/v3/proposals/*` | Proposal → IntelligencePreview bridge |
| API | `app/api/v3/world/*` | GM-authenticated REST |
| UI | `components/v3/world/*`, `/world` | World Dashboard |
| Lifecycle | `lib/v3/world/world-lifecycle-hook.ts` | Half-end / period-start hooks |
| Storage | `.bsp-data/v3-world.json` | Session world snapshots |

### V1/V2 isolation

- V1 game rules, Event Engine, economy patch logic **미변경**
- V2.4 `IntelligencePublishService.publishFromPreview()` 재사용
- `GameEngine.closePeriod()` / `startNextHalf()`에 **additive hook**만 추가

## World State

10개 거시 경제 차원 (0–100):

| Key | Label |
|-----|-------|
| `globalGrowth` | Global Growth |
| `inflation` | Inflation |
| `interestRateTrend` | Interest Rate Trend |
| `supplyStability` | Supply Stability |
| `energyPrice` | Energy Price |
| `technologyInnovation` | Technology Innovation |
| `consumerConfidence` | Consumer Confidence |
| `geopoliticalTension` | Geopolitical Tension |
| `climateRisk` | Climate Risk |
| `tradeEnvironment` | Trade Environment |

Plus:
- **5 Regions**: 북미, 유럽, 중국, 한국, 동남아
- **6 Industries**: 자동차, 반도체, 배터리, 철강, 화학, 소비재

## World Profile

| Profile | Description |
|---------|-------------|
| `STABLE_GROWTH` | 완만한 성장, 초보 교육 |
| `HIGH_INFLATION` | 물가·금리 압박 |
| `AI_BOOM` | AI/GPU/반도체 수요 급증 |
| `RECESSION` | 경기 침체, 현금흐름 교육 |
| `TRADE_WAR` | 관세·지정학적 긴장 |
| `ENERGY_CRISIS` | 에너지 가격 급등 |
| `CLIMATE_TRANSITION` | 탄소 규제·ESG |
| `CUSTOM` | GM 직접 설정 |

Profile 선택 시 Event Chain template이 자동 연결됩니다.

## AI World Evolution

반기 종료(`closePeriod`) 시:

1. 현재 World State drift
2. AI Game Director 평가
3. Evolution Proposal 생성
4. Event Chain 확률 분기 평가
5. AI Forecast 갱신
6. World Timeline 기록

입력: economy, team aggregates, active events, educational balance.

## Event Chain

7개 chain template:

- `tariff-supply-cost` — 관세 → 공급망 → 원가 → 가격 → 수요 → 금리
- `ai-boom-chain` — AI → 반도체 → 원가 → 경쟁사
- `energy-crisis-chain` — 에너지 → 물류 → ESG
- `supply-crisis-chain` — 공급 위기 → 항만 파업(30%) → 물류비(40%) → 지원(20%)
- `recession-recovery`, `climate-transition-chain`, `stable-recovery`

Chain node status: `PLANNED → PROPOSED → APPROVED → PUBLISHED`

## Probability Model

- 각 chain branch에 `probability` (0–1)
- GM이 `gmProbability`로 override 가능
- `seededRandom(seed, index)`로 reproducible roll
- API: `PATCH /api/v3/world/sessions/[sessionId]/chains`

## AI Game Director

팀 성과 기반 자동 난이도 조절 **제안** (GM 승인 필수):

| Action | Trigger |
|--------|---------|
| `INCREASE_DIFFICULTY` | 대부분 팀 안정 운영 |
| `RECOVERY_EVENT` | 60%+ 팀 struggling |
| `BUFFER_EVENT` | 3+ active events |
| `MAINTAIN` | 밸런스 적절 |

`gmOnly: true` — 학생에게 공개하지 않음.

## AI Forecast

1/2/3반기 후 예측 (GM 전용):

- 각 dimension별 UP/DOWN/STABLE + probability
- `highlightTopRisks()` — 상위 리스크 요약

## Educational Balance

Profile `educationalFocus` 기반 event weighting:

- 공급망, 재무, 혁신, ESG focus area
- Proposal summary에 `[교육 우선]` tag

## Replay World

동일 `randomSeed` + initial World State로 replay:

- API: `POST /api/v3/world/replay`
- `{ sessionId, sourceSessionId }`

## World Dashboard

Route: `/world`

Panels:
- **World State** — 10 dimension bars
- **Risk Map** — regions + industries
- **AI Game Director** — difficulty suggestion
- **AI Forecast** — 1/2/3 half predictions
- **Upcoming Events** — pending/approved proposals
- **Event Chains** — chain graph with probabilities
- **World Timeline** — chronological history

## Publish Integration (V2.4)

```
WorldEvolutionProposal (APPROVED)
  → buildPreviewFromProposal()
  → IntelligencePreview
  → IntelligencePublishService.publishFromPreview()
  → Event Engine → Economy Patch → WebSocket
```

World Engine은 **계산하지 않습니다**. Economy 계산은 기존 Engine이 수행합니다.

## API Design

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/v3/world/sessions/[sessionId]/state` | Get / init world |
| POST | `/api/v3/world/sessions/[sessionId]/evolve` | Manual evolution |
| GET | `/api/v3/world/sessions/[sessionId]/proposals` | List proposals |
| GET | `/api/v3/world/sessions/[sessionId]/timeline` | World timeline |
| GET | `/api/v3/world/sessions/[sessionId]/forecast` | AI forecast |
| GET | `/api/v3/world/sessions/[sessionId]/director` | Game director |
| PATCH | `/api/v3/world/sessions/[sessionId]/chains` | Update probability |
| POST | `/api/v3/world/proposals/[id]/approve` | GM approve |
| POST | `/api/v3/world/proposals/[id]/publish` | Publish via V2.4 |
| POST | `/api/v3/world/replay` | Replay world |

## Lifecycle Hooks

| Hook | Trigger | Action |
|------|---------|--------|
| `HALF_END` | `GameEngine.closePeriod()` | AI evolution + chain roll |
| `PERIOD_START` | `GameEngine.startNextHalf()` | Update period label |

## Tests

`tests/bsp/v3-world-simulation.test.ts` — **62 tests**:

- 7 world profiles
- Regional/industry layer
- Probability model
- 7 chain templates
- Game director (4 scenarios)
- Forecast
- Educational balance
- Evolution engine
- Full E2E: init, evolve, approve, publish, reject, replay
- Lifecycle hook via closePeriod
- 7 theme scenarios
- Multi-period evolution

Run:

```bash
npx vitest run tests/bsp/v3-world-simulation.test.ts
```

## Manual Test Flow

1. `npm run dev`
2. GM 세션 생성 (`/gm`)
3. `/world` — Session ID 입력 → World Profile 선택 → **World 초기화**
4. **AI Evolution** 클릭 (또는 게임에서 반기 종료)
5. Upcoming Events에서 **GM Approve** → **Publish via V2.4**
6. CEO 화면에서 Breaking News 확인

## Known Issues

- OpenAI live integration deferred — fixture-based evolution/director/forecast
- World store is file JSON (PostgreSQL deferred)
- Regional states not yet linked to game `RegionCode` catalog
- Industry impact multipliers are metadata-only (not applied to team calculations)
- GM audit for world events separate from V1 audit log
- Event chain auto-publish not implemented — proposals require GM approve

## Related Docs

- [V2.4 Live Event Publishing](../v2/v2.4-live-event-publishing.md)
- [V2.3 Real-world Intelligence](../v2/v2.3-real-world-intelligence.md)
