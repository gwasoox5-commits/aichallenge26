# 03. Admin 기능 상세 설계

> Phase 0-3 | **Version 1.1** — D-07, D-09, D-10, D-14, G-01~G-06

## 3.1 기능 목록 (13 Core + 확장)

| ID | 기능 | 우선순위 | 설명 |
|----|------|----------|------|
| ADM-01 | 세션 CRUD | P0 | 생성·삭제·복제 |
| ADM-02 | START/END/PAUSE | P0 | 생명주기 |
| ADM-03 | Step·Period 제어 | P0 | 7 Step, 6 Period |
| ADM-04 | 참가자·회사 관리 | P0 | joinCode, 팀 배정 |
| ADM-05 | Dashboard 모니터링 | P0 | KPI 테이블·알림 |
| ADM-06 | 회사 Override | P1 | 현금·재고·인력 강제 |
| ADM-07 | 경제 변수 | P0 | 14 vars live edit |
| ADM-08 | 시장 설정·정산 | P0 | 7 regions, demand |
| ADM-09 | 이벤트 관리 | P0 | library + runtime |
| ADM-10 | Scenario Editor | P1 | timeline actions |
| ADM-11 | AI News | P1 | 검수·재생성 |
| ADM-12 | Scoring·Ranking | P1 | Rubric, final |
| ADM-13 | Audit Log | P0 | 전 Admin 행위 |

### v1.1 GM additions

| Feature | Decision |
|---------|----------|
| Region remaining edit | D-07 |
| releaseDeposit (2%) | D-09 |
| miscIncome per team @ Step7 | D-03 |
| Advance modal wait/zero/copy | D-10 |
| Ranking operating vs composite | D-14 |
| Event Y1H1 severity warning | D-04 |
| Desk: 미제출 filter, economy badge | G-01, G-02 |

---

## 3.2 Dashboard (SCR-ADM-003)

### 레이아웃
```
┌─ Control Bar ─────────────────────────────────────┐
│ Session · Period · Step · [Pause][Advance][Event] │
├─ Company Table ───────────────────────────────────┤
│ Team | Cash | Debt | Step | Status | Alerts      │
├─ Quick Actions ───────────────────────────────────┤
│ Economy | Market | Events | Scoring | AI          │
└─ Activity Feed ───────────────────────────────────┘
```

### Company Table 컬럼
- teamName, ceoName
- cash (만원), totalDebt, equity
- currentStep, stepCompleted (7/check)
- lastActivityAt
- alertFlags: LOW_CASH, OVERCAPACITY, VALIDATION_ERROR

### Control Bar 액션
| 버튼 | 동작 |
|------|------|
| Pause | CEO 입력 freeze, Admin만 |
| Resume | RUNNING 복귀 |
| Advance Step | 현재 Step → 다음 (검증 옵션) |
| Close Period | SETTLEMENT 후만, 결산 파이프라인 |
| Fire Event | Event picker modal |

---

## 3.3 Step·Period 제어 (ADM-03)

### 데이터
- `GameProgress`: sessionId, periodIndex(1-6), step(enum), stepStartedAt
- `CompanyStepStatus`: companyId, step, completedAt, decisionId

### 규칙
1. Step은 세션 전역 동기 (모든 CEO 동일 Step)
2. Admin만 Step 전환 (교육용 통제)
3. `forceAdvance`: 미완료 CEO 있어도 진행 (경고 로그)
4. Period = (year, half): (1,H1)…(3,H2)

### API (설계 수준)
- `POST /sessions/:id/progress/advance-step`
- `POST /sessions/:id/progress/close-period`
- `GET /sessions/:id/progress`

---

## 3.4 경제 변수 (ADM-07)

### 14 Variables
| Key | 단위 | 기본값(참고) |
|-----|------|-------------|
| interestRateLoan | % | 10 |
| interestRateDeposit | % | 5 |
| exchangeRate | KRW/USD | 1300 |
| rawMaterialIndex | index | 100 |
| marketDemandIndex | index | 100 |
| marketSupplyIndex | index | 100 |
| logisticsCostMultiplier | x | 1.0 |
| tariffRate | % | 0 |
| corporateTaxRate | % | 22 |
| carbonTaxRate | % | 0 |
| inflationRate | % | 2 |
| fxVolatility | % | 5 |
| businessCyclePhase | enum | EXPANSION |
| crudeOilPrice | USD | 80 |

### 모델
- `EconomicState`: sessionId, values JSON, updatedAt
- `EconomicSnapshot`: periodId, values JSON (결산 시점 고정)

### UI
- 슬라이더 + 숫자 입력 + preset (침체/호황)
- 변경 시 AuditLog + optional Event (경제 뉴스)

---

## 3.5 시장 (ADM-08)

### 7 Regions
- 각 region: baseDemand, priceElasticity, logisticsPremium
- CEO MATERIAL/SALES에서 region 선택

### Admin
- Period별 demand multiplier
- `MarketClearingService`: SALES Step 종료 후 수요·가격 정산 (Phase 2)

---

## 3.6 Override (ADM-06)

| 대상 | 필드 | 제약 |
|------|------|------|
| Cash | amount, reason | Journal ADJUSTMENT |
| Inventory | sku, qty | Audit 필수 |
| Headcount | dept, count | 다음 Period 인건비 반영 |

모든 override → `AuditLog` + optional CEO 알림

---

## 3.7 Scoring (ADM-12)

### Rubric (기본)
| 영역 | 가중치 |
|------|--------|
| 최종 자기자본 | 25% |
| 누적 영업이익 | 25% |
| 현금흐름 안정 | 20% |
| Step 준수·제출 | 15% |
| AI 평가 점수 | 15% |

Admin: 가중치 편집, 수동 보정, 최종 순위 확정

---

## 3.8 권한

| Action | INSTRUCTOR | ASSISTANT (future) |
|--------|------------|-------------------|
| START/END | ✓ | ✗ |
| Step advance | ✓ | ✓ |
| Override | ✓ | ✗ |
| Economy edit | ✓ | ✓ |
| View only | ✓ | ✓ |

---

## 3.9 Admin 메뉴 트리

```
Sessions
├── Active Dashboard
├── Progress Control
├── Participants
├── Monitor
│   ├── Companies
│   ├── Compare
│   └── Activity
├── Environment
│   ├── Economy
│   ├── Market
│   └── Events
├── Scenarios
│   └── Editor
├── Event Templates
│   └── NL Generator
├── Scoring & Rankings
├── AI
│   ├── News
│   └── Annual Reports
└── Audit Log
```
