# 11. Acceptance Criteria (V1)

> **Supreme principles**: `00-v1-development-principles.md`

> **목적**: V1 **개발 완료 기준**을 명확히 정의 — QA·UAT·GA 게이트  
> Status: **Approved** 2026-07-26  
> **Supreme principles**: `00-v1-development-principles.md`  
> Scope: `10-web-only-education-experience.md` §3 V1 Gate (G1, G2)  
> Truth: `01-game-rule-book.md` v1.1 · Engine Specs 02~05

---

## 0. 문서 범위

### 0.1 V1 GA 정의 (반복)

| Gate | 완료 조건 |
|------|-----------|
| **G1** | 엑셀 `(게임용)회계기초과정 원장` 전 교육 과정을 웹만으로 재현 |
| **G2** | GM이 **단일 GM Desk**로 세션 생성→진행→결산→회고; **엑셀 0** |

### 0.2 V1 In / Out

| In Scope (AC 적용) | Out of Scope (V1 AC 없음) |
|--------------------|---------------------------|
| CEO Play Step 1~7 · Dashboard · Financial Statement | Replay UI · What-if · Advisor · Copilot |
| GM Desk · Event · Economy · Ranking | Full Debrief · Analytics v2 |
| Decision · Validation · Accounting · Economy · Event Engine | Institution cohort · 3yr Replay |

### 0.3 AC 표기 규칙

| 필드 | 의미 |
|------|------|
| **CAN** | 사용자/시스템이 **반드시** 할 수 있어야 함 |
| **CANNOT** | **반드시** 불가 |
| **Validation** | 서버·클라이언트 검증 규칙 |
| **Done** | 화면/기능 **완료(DoD)** 조건 |

### 0.4 Screen ID 참조

| 사용자 명칭 | Screen ID | Route |
|-------------|-----------|-------|
| Student Dashboard | SCR-CEO-002 Tab 2 | `/play` |
| Step 1~7 | SCR-CEO-002 Tab 1 | `/play/step/[n]` |
| GM Dashboard | SCR-GM-003 | `/gm/game/[id]` |
| Event Management | SCR-GM-D03 + SCR-GM-007 | Desk Modal · `/gm/events` |

---

## 1. 화면별 Acceptance Criteria

### 1.1 Student Dashboard (CEO · 우리 회사 Tab)

**Screen**: SCR-CEO-002 Tab 2 · `CeoStatusDTO` + 반기 재무 요약

#### CAN

| # | 행동 |
|---|------|
| SD-01 | 현재 반기·Step Phase 확인 (읽기 전용 배지) |
| SD-02 | 현금·부채·예금·설비·인력·재료·완제품 **현황판** 조회 (Rule Book §1.9) |
| SD-03 | Live Ranking 조회 (P1~P2: operating only; P3+: composite, D-14) |
| SD-04 | 전반기 대비 delta chip 조회 (Y2+, D-05) |
| SD-05 | Step 3~6 인건비·비용 **예상(Forecast)** 라벨 표시 (D-12) |
| SD-06 | PAUSED / FINISHED 상태에서도 **읽기** 가능 |

#### CANNOT

| # | 금지 |
|---|------|
| SD-N01 | 현황판 숫자 **직접 수정** |
| SD-N02 | 순위·점수 **수동 조정** |
| SD-N03 | 미래 반기 데이터 선조회 (해당 period 미도달) |
| SD-N04 | 다른 팀 Dashboard 조회 |

#### Validation

| # | 규칙 |
|---|------|
| SD-V01 | 표시 값 = 최신 POSTED Decision + Settlement 반영 `CompanyStatus` |
| SD-V02 | Forecast 필드는 Journal 미반영 UI 라벨 `"예상"` 필수 |
| SD-V03 | Ranking period 규칙: P1~P2 operating / P3+ full |

#### Done

- [ ] 10팀 동시 조회 시 본인 팀 데이터만 표시
- [ ] Step advance 후 3초 이내 WebSocket/poll로 현황 갱신
- [ ] 엑셀 R4~R21 대응 필드 매핑 문서화 완료

---

### 1.2 Step 1 — LOAN (자금 조달)

**Screen**: SCR-CEO-002 Tab 1 · Step 1 · D-01 2-Phase

#### CAN

| # | 행동 |
|---|------|
| S1-01 | Phase **1A**: `loanEarly`, `deposit` 입력·로컬 저장 |
| S1-02 | Phase **1B**: 1A 완료 후 `loanMid`, `loanRepayment` 입력 |
| S1-03 | Phase 1B 완료 시 **단일** `DecisionLoan` POST |
| S1-04 | 1A only 제출 (loanMid=0, loanRepayment=0) |
| S1-05 | 제출 후 read-only + POSTED 배지 |
| S1-06 | 현금·부채·예금 **preview** (computed) |

#### CANNOT

| # | 금지 |
|---|------|
| S1-N01 | Phase 1B를 1A 전에 제출 |
| S1-N02 | POSTED 후 수정·재제출 |
| S1-N03 | Step ≠ LOAN 또는 PAUSED/PREPARE에서 제출 |
| S1-N04 | 음수·소수 입력 (loan fields) |

#### Validation

| Rule ID | 조건 |
|---------|------|
| L01 | loanEarly×1000 ≤ equityBefore |
| L02 | loanMid×1000 ≤ 10,000 |
| L03 | cashAfter ≥ 0 |
| L04 | loanEarly, loanMid, deposit ≥ 0, integer |
| L06 | loanRepayment ≤ debtBefore + loanEarlyAmt + loanMidAmt |

#### Done

- [ ] Journal 3-line (차입·예금·상환 D-03) POSTED
- [ ] GM advance 전까지 Step 2 비활성
- [ ] Idempotency: 동일 (company, period, LOAN) 중복 POST → 409

---

### 1.3 Step 2 — FACILITY (설비 투자)

#### CAN

| # | 행동 |
|---|------|
| S2-01 | `landPlots`, `machineBig`, `machineSmall` 입력 |
| S2-02 | CAPEX·capacity·maxMaterials preview |
| S2-03 | skip = zero (미제출 시 GM D-10 처리 대기) |

#### CANNOT

| # | 금지 |
|---|------|
| S2-N01 | cashBefore < totalCapex 제출 |
| S2-N02 | landPlots > 4 |
| S2-N03 | machineBig > landPlots×2 또는 machineSmall > landPlots×4 |

#### Validation

F01~F06 (Rule Book §1.6 Step 2)

#### Done

- [ ] Land·Machinery Journal + Cash↓
- [ ] Dashboard 설비·생산능력 갱신

---

### 1.4 Step 3 — HIRING (인력 채용)

#### CAN

| # | 행동 |
|---|------|
| S3-01 | Year 1: headPurchase / headProduction / headSales 입력 |
| S3-02 | Year ≥ 2: 구조조정 필드 표시 (transfer, resign, D-02) |
| S3-03 | Capacity preview (30/10/10 rule) |
| S3-04 | payroll **forecast** 표시 (Settlement 인식 안내) |

#### CANNOT

| # | 금지 |
|---|------|
| S3-N01 | Year 1에 restructuring payload 전송 |
| S3-N02 | resign > current head |
| S3-N03 | Step 3 Journal에 인건비 accrual (D-12) |

#### Validation

H01~H04

#### Done

- [ ] Headcount·Capacity Dashboard 반영
- [ ] Payroll는 Step7 pipeline에서만 Journal

---

### 1.5 Step 4 — Purchase (원재료 구매)

**Screen**: Step 4 전용 뷰 (지역·재료·지사)

#### CAN

| # | 행동 |
|---|------|
| P4-01 | 지역별 material A~D 수량 입력 (V1 instant purchase, D-08) |
| P4-02 | 신규 지사 개설 (branch fee) |
| P4-03 | Economy 반영 **effectiveUnitPrice** 표시 (환율·원자재·관세) |
| P4-04 | 물류비·총비용 preview (D-13: logistics=비용, 재고=재료원가) |
| P4-05 | GM이 편집한 **지역 잔여 한도** 조회 (D-07) |

#### CANNOT

| # | 금지 |
|---|------|
| P4-N01 | V1 입찰·낙찰 UI (M06, V2) |
| P4-N02 | qty > region.materialLimit 또는 > headPurchase×30 |
| P4-N03 | cash < totalCost 제출 |
| P4-N04 | unitPrice CEO 수동 override (V1) |

#### Validation

M01~M05

#### Done

- [ ] Inventory↑ (material cost only) · Logistics expense · Cash↓
- [ ] Event/Economy patch 후 다음 POST부터 단가 반영 (G-02)

---

### 1.6 Step 5 — Production (생산 계획)

#### CAN

| # | 행동 |
|---|------|
| P5-01 | `productionQty`, `machineBigRun`, `machineSmallRun` 입력 |
| P5-02 | maxProduction = min(material, machine, labor) **실시간** 표시 |
| P5-03 | material consume·machine op cost preview |

#### CANNOT

| # | 금지 |
|---|------|
| P5-N01 | productionQty > maxProduction |
| P5-N02 | machineRun > owned |
| P5-N03 | productionQty < 0 |

#### Validation

P01~P04

#### Done

- [ ] Finished goods↑ · Raw inventory↓ · Machine op Journal
- [ ] unitManufacturingCost computed 저장

---

### 1.7 Step 6 — Sales (판매 전략)

#### CAN

| # | 행동 |
|---|------|
| P6-01 | 지역별 `unitPrice`, `qty` 입력 |
| P6-02 | region maxSalePrice·saleLimit·수요 badge 표시 |
| P6-03 | revenue·logistics·cash delta preview |

#### CANNOT

| # | 금지 |
|---|------|
| P6-N01 | Σ qty > finishedGoods |
| P6-N02 | Σ qty > headSales×10 |
| P6-N03 | unitPrice > region.maxSalePrice |

#### Validation

S01~S05

#### Done

- [ ] Revenue Journal · FG↓ · Ranking 입력 데이터 저장

---

### 1.8 Step 7 — SETTLEMENT (반기 결산)

#### CAN

| # | 행동 |
|---|------|
| S7-01 | **조회만** — P/L·B/S·C/F current period |
| S7-02 | Step7 **한 줄** AI settlement 코멘트 (§4 Guardrails) |
| S7-03 | 반기 Ranking·Improvement MVP badge |

#### CANNOT

| # | 금지 |
|---|------|
| S7-N01 | CEO Decision submit |
| S7-N02 | AI가 최적 전략·정답 제시 |
| S7-N03 | Settlement 전 current period P/L "확정" 표시 |

#### Validation

| # | 규칙 |
|---|------|
| S7-V01 | Settlement pipeline 완료 후에만 period `CLOSED` |
| S7-V02 | payroll accrual 전 department (D-12) |
| S7-V03 | loanRepayment Step1 반영 + interest auto (D-03) |

#### Done

- [ ] `FiscalSnapshot` period별 저장 (D-11)
- [ ] GM `closeHalf` → HALF_YEAR_END → next period

---

### 1.9 Financial Statement (재무제표)

**Screen**: SCR-CEO-002 Tab 2 · Period selector · GM results

#### CAN

| # | 행동 |
|---|------|
| FS-01 | Period selector: P1~P6 + **반기별** FiscalSnapshot (D-11) |
| FS-02 | P/L · B/S · (C/F optional V1) 조회 |
| FS-03 | Step7 이후 **해당 반기** 확정본 조회 |
| FS-04 | GM Results 화면에서 전 팀 export |

#### CANNOT

| # | 금지 |
|---|------|
| FS-N01 | CEO가 line item 직접 편집 |
| FS-N02 | Settlement 전 current period "마감" 라벨 |
| FS-N03 | 엑셀과 다른 period merge |

#### Validation

| # | 규칙 |
|---|------|
| FS-V01 | Snapshot = Journal roll-up (Accounting Engine) |
| FS-V02 | Prior period BS ending = next period opening |
| FS-V03 | Numbers match Rule Book §1.7 within ±1 만원 rounding |

#### Done

- [ ] 6반기 × 10팀 Snapshot 조회 성능 NFR 충족
- [ ] 엑셀 Sheet1/2 샘플 3케이스 대조 통과

---

### 1.10 GM Dashboard (GM Desk)

**Screen**: SCR-GM-003

#### CAN

| # | 행동 |
|---|------|
| GM-01 | Step Timeline · 팀별 제출 상태 (✓/⏳/0) |
| GM-02 | `advanceStep` · `closeHalf` · `startNextHalf` |
| GM-03 | Live Economy Panel patch (§3 Economy) |
| GM-04 | Event fire (NORMAL default, D-15) |
| GM-05 | Broadcast 메시지 |
| GM-06 | 미제출 팀: wait / zero / copy-last-half (D-10) |
| GM-07 | `miscIncome` · `releaseDeposit` (D-03, D-09) |
| GM-08 | Team Override (audit log) |
| GM-09 | Pause / Resume session |
| GM-10 | Live Ranking · Improvement MVP |

#### CANNOT

| # | 금지 |
|---|------|
| GM-N01 | CEO Decision **대신** 입력 (Override는 audit + scope 제한) |
| GM-N02 | PAUSED 중 CEO submit 허용 |
| GM-N03 | Step7 skip without settlement pipeline |
| GM-N04 | Event PROBABILISTIC auto branch (V1) |

#### Validation

| # | 규칙 |
|---|------|
| GM-V01 | advanceStep: current step complete or D-10 applied |
| GM-V02 | Economy patch → audit + CEO badge (G-02) |
| GM-V03 | Y1H1 severity>3 event → confirm modal (D-04) |

#### Done

- [ ] **10팀·1 GM** 전 과정 엑셀 없이 완료 (G2)
- [ ] 모든 GM action `AuditLog` append

---

### 1.11 Event Management

**Screen**: SCR-GM-D03 (Desk Modal) · SCR-GM-007 · SCR-GM-008 (NL Generate)

#### CAN

| # | 행동 |
|---|------|
| EV-01 | Scenario Library 53건 browse · filter |
| EV-02 | Event draft → GM review → approve → fire |
| EV-03 | NL Generate → schema validate → impact preview |
| EV-04 | Fire scope: session-wide · step hint |
| EV-05 | CEO Tab 3 소식·AI News feed |
| EV-06 | `recommendedPeriod` warning (D-04) |

#### CANNOT

| # | 금지 |
|---|------|
| EV-N01 | AI **자동** fire (GM confirm 필수) |
| EV-N02 | V1 Best/Worst scenario **적용** (토론 only, D-15) |
| EV-N03 | Event가 Rule Book 계산 **우회** |

#### Validation

| # | 규칙 |
|---|------|
| EV-V01 | EventDraftPackage schema valid |
| EV-V02 | Effects → Economy/Market keys only |
| EV-V03 | `approvedBy` + `approvedAt` on fire |

#### Done

- [ ] Fire → CEO feed 5초 이내
- [ ] Event + Economy change audit trail

---

## 2. 기능별 Acceptance Criteria

### 2.1 Decision Engine

| 항목 | V1 기준 |
|------|---------|
| **입력** | `Decision{step}` payload · `companyId` · `periodId` · `submittedBy` · session `stepPhase` |
| **처리** | DRAFT(client) → SUBMITTED → ValidationEngine → VALIDATED → compute → Journal → POSTED → LOCKED on advance |
| **출력** | `Decision` record · `computed{}` · `journalEntryIds[]` · `CompanyStatus` update · WebSocket event |
| **오류** | 422 `ValidationResult{ok:false, rules[]}` · 409 duplicate POST · 403 wrong step/role · 423 PAUSED |
| **예외** | GM zero decision (D-10): empty payload POSTED by system · copy-last-half: clone prior period same step · Idempotency key `(companyId, periodId, step)` |

**Done**

- [ ] 7 Step payload schema = Decision Engine Spec §4.3~4.9
- [ ] POSTED Decision **immutable** (no UPDATE)
- [ ] Event Store: Decision + Journal append-only

---

### 2.2 Validation Engine

| 항목 | V1 기준 |
|------|---------|
| **입력** | Draft payload · `CompanyStatus` before · `EconomicState` · `MarketState` · `period.year` · step |
| **처리** | Rule chain L/F/H/M/P/S per step · cross-field · role/state gate |
| **출력** | `{ ok: boolean, rules: [{ id, message, field? }] }` |
| **오류** | `ok:false` → Decision FAILED, status ≠ POSTED |
| **예외** | Year 1 H04 reject restructuring · Phase 1B without 1A → client block + server 422 · Partial draft: client-only until POST |

**Done**

- [ ] Rule Book §1.6 모든 Rule ID 구현
- [ ] Server validation **authoritative** (client bypass 불가)
- [ ] Excel H열 `OK` / `다시입력` 1:1 message mapping (§1.11)

---

### 2.3 Accounting Engine

| 항목 | V1 기준 |
|------|---------|
| **입력** | POSTED Decision · Settlement trigger · `EconomicState` at period close |
| **처리** | Double-entry Journal per step · HALF_YEAR_END pipeline: payroll(D-12), depreciation, interest(D-03), tax, COGS, ranking inputs |
| **출력** | `JournalEntry`(append-only) · `FiscalSnapshot` per period · P/L·B/S DTO |
| **오류** | Unbalanced journal → rollback transaction · Settlement failure → GM alert, half not closed |
| **예외** | GM `miscIncome` · `releaseDeposit` penalty 2% (D-09) · Rounding: 만원 integer display, internal decimal OK |

**Done**

- [ ] Σ Debit = Σ Credit every entry
- [ ] 3 excel golden cases: BS continuity, P/L roll-forward
- [ ] D-13: logistics expense ≠ inventory cost

---

### 2.4 Economy Engine

| 항목 | V1 기준 |
|------|---------|
| **입력** | GM patch `{ key, value }` · Event `variableImpact` (NORMAL) · Scenario preset |
| **처리** | `EconomicState` live mutate · `getMultiplier(key, context)` · snapshot on period close |
| **출력** | Updated multipliers · CEO badge "경제 환경 변경" · News item |
| **오류** | Invalid key → 400 · Out-of-range → 422 with bounds |
| **예외** | Patch applies **from next Decision POST** (G-02), not retroactive on POSTED · `releaseDeposit` separate API |

**Done**

- [ ] 11 GM variables (§3.2) editable on Desk
- [ ] Purchase/Sales/Settlement formulas use live state
- [ ] `EconomicSnapshot` frozen at `closeHalf`

---

### 2.5 Event Engine

| 항목 | V1 기준 |
|------|---------|
| **입력** | GM prompt · EventTemplate · Fire `{ eventId, scenario: NORMAL }` |
| **처리** | Draft → validate → GM approve → merge effects → Economy/Market patch → News |
| **출력** | `SimulationEvent` · CEO feed · step hints · audit |
| **오류** | Schema fail → draft reject · Fire without approve → 403 |
| **예외** | D-15: NORMAL only applied · Best/Worst stored for discussion only · D-04: period warning non-blocking |

**Done**

- [ ] 53 library events loadable
- [ ] NL generate → human approve path
- [ ] No auto-fire on timer (V1)

---

## 3. QA Test Scenarios

> 각 Step **최소 10건** (정상 + 예외). ID: `QA-{STEP}-{NN}`  
> **Pass**: Expected = actual (HTTP code · status · key metrics)

### 3.1 Step 1 — LOAN

| ID | 유형 | 시나리오 | Expected |
|----|------|----------|----------|
| QA-S1-01 | 정상 | 1A: loanEarly=2, deposit=1 → 1B: loanMid=0, repay=0 | POSTED, cash+1000, debt+2000 |
| QA-S1-02 | 정상 | Full: early=1, mid=1, deposit=0, repay=0 | cash+2000, debt+2000 |
| QA-S1-03 | 정상 | repay=500, debt sufficient | debt−500, cash−500 |
| QA-S1-04 | 정상 | 1A only submit (mid=0) | POSTED valid |
| QA-S1-05 | 정상 | deposit=2, no loan | cash−2000, deposit asset↑ |
| QA-S1-06 | 예외 | loanEarly > equity | 422 L01 |
| QA-S1-07 | 예외 | loanMid=11 (11000만) | 422 L02 |
| QA-S1-08 | 예외 | deposit > available cash after loan | 422 L03 |
| QA-S1-09 | 예외 | loanRepayment > total debt | 422 L06 |
| QA-S1-10 | 예외 | Double POST same period LOAN | 409 |
| QA-S1-11 | 예외 | Submit at STEP2 | 403 |
| QA-S1-12 | 예외 | Submit while PAUSED | 423 |

### 3.2 Step 2 — FACILITY

| ID | 유형 | 시나리오 | Expected |
|----|------|----------|----------|
| QA-S2-01 | 정상 | land=1, big=1, small=0 | capex=3600, cap=30 |
| QA-S2-02 | 정상 | land=0, all machines=0 (skip) | POSTED zero capex |
| QA-S2-03 | 정상 | land=2, small=4 | valid F04 combo |
| QA-S2-04 | 정상 | max land=4 cumulative | accepted |
| QA-S2-05 | 정상 | cash exactly = capex | POSTED, cash=0 |
| QA-S2-06 | 예외 | land=5 | 422 F01 |
| QA-S2-07 | 예외 | big=3 on land=1 | 422 F02 |
| QA-S2-08 | 예외 | small=5 on land=1 | 422 F03 |
| QA-S2-09 | 예외 | capex > cash | 422 F05 |
| QA-S2-10 | 예외 | GM not advanced, double facility | 409 |
| QA-S2-11 | 예외 | Negative land delta | 422 F06 |
| QA-S2-12 | 예외 | PAUSED submit | 423 |

### 3.3 Step 3 — HIRING

| ID | 유형 | 시나리오 | Expected |
|----|------|----------|----------|
| QA-S3-01 | 정상 | Y1: purchase=2, prod=3, sales=2 | capacity 60/30/20 |
| QA-S3-02 | 정상 | All zeros (skip) | POSTED, no journal payroll |
| QA-S3-03 | 정상 | Y2: transfer 30 purchase→production | headcount shift |
| QA-S3-04 | 정상 | Y2: resign sales=1 | head−1 |
| QA-S3-05 | 정상 | Forecast payroll shown, not in BS | UI "예상" |
| QA-S3-06 | 예외 | Y1 payload with transfers | 422 H04 |
| QA-S3-07 | 예외 | resign > current | 422 H03 |
| QA-S3-08 | 예외 | negative headcount | 422 H01 |
| QA-S3-09 | 예외 | Submit wrong step | 403 |
| QA-S3-10 | 예외 | GM zero applied | System POSTED empty |
| QA-S3-11 | 예외 | copy-last-half from P1 | Same heads P2 |
| QA-S3-12 | 예외 | Double POST HIRE | 409 |

### 3.4 Step 4 — PURCHASE

| ID | 유형 | 시나리오 | Expected |
|----|------|----------|----------|
| QA-S4-01 | 정상 | ASIA A=100 only | inventory↑, logistics exp, cash↓ |
| QA-S4-02 | 정상 | Multi-region lines | sum costs correct |
| QA-S4-03 | 정상 | New branch + purchase | branch fee journal |
| QA-S4-04 | 정상 | Economy rawMaterialIndex=120 | unit price ×1.2 |
| QA-S4-05 | 정상 | FX region with exchangeRate patch | import price updated |
| QA-S4-06 | 예외 | qty > materialLimit | 422 M02 |
| QA-S4-07 | 예외 | total units > purchaseCapacity | 422 M03 |
| QA-S4-08 | 예외 | cash insufficient | 422 M04 |
| QA-S4-09 | 예외 | qty=0 all (skip) | POSTED zero |
| QA-S4-10 | 예외 | GM region limit edited (D-07) | enforce new limit |
| QA-S4-11 | 예외 | Post after step advanced | 403 |
| QA-S4-12 | 예외 | Event tariff + purchase | NORMAL effect on price |

### 3.5 Step 5 — PRODUCTION

| ID | 유형 | 시나리오 | Expected |
|----|------|----------|----------|
| QA-S5-01 | 정상 | qty=10, valid runs | FG+10, material−40 each |
| QA-S5-02 | 정상 | maxProduction exactly | POSTED |
| QA-S5-03 | 정상 | qty=0 skip | POSTED |
| QA-S5-04 | 정상 | machine op cost journal | cash−(big×80+small×40) |
| QA-S5-05 | 정상 | bottleneck=material | max capped correctly |
| QA-S5-06 | 예외 | qty > maxProduction | 422 P01 |
| QA-S5-07 | 예외 | bigRun > owned | 422 P02 |
| QA-S5-08 | 예외 | smallRun > owned | 422 P03 |
| QA-S5-09 | 예외 | negative qty | 422 P04 |
| QA-S5-10 | 예외 | no material inventory | max=0, qty=0 only |
| QA-S5-11 | 예외 | carbon tax rate > 0 | tax in computed |
| QA-S5-12 | 예외 | Double POST | 409 |

### 3.6 Step 6 — SALES

| ID | 유형 | 시나리오 | Expected |
|----|------|----------|----------|
| QA-S6-01 | 정상 | 1 region, qty=5, valid price | revenue, FG−5 |
| QA-S6-02 | 정상 | Multi-region split | sum revenue |
| QA-S6-03 | 정상 | max qty = finishedGoods | POSTED |
| QA-S6-04 | 정상 | demand index limits sale | S02 enforced |
| QA-S6-05 | 정상 | skip qty=0 | POSTED |
| QA-S6-06 | 예외 | price > maxSalePrice | 422 S01 |
| QA-S6-07 | 예외 | qty > FG | 422 S04 |
| QA-S6-08 | 예외 | qty > salesCapacity | 422 S03 |
| QA-S6-09 | 예외 | qty > region saleLimit | 422 S02 |
| QA-S6-10 | 예외 | Submit at STEP7 | 403 |
| QA-S6-11 | 예외 | Economy demand patch mid-step | applies next POST |
| QA-S6-12 | 예외 | Ranking input stored for close | data in snapshot prep |

### 3.7 Step 7 — SETTLEMENT

| ID | 유형 | 시나리오 | Expected |
|----|------|----------|----------|
| QA-S7-01 | 정상 | GM closeHalf after Step6 all posted | pipeline complete |
| QA-S7-02 | 정상 | Payroll 3 departments accrued | D-12 journal |
| QA-S7-03 | 정상 | Interest income/expense | auto calc |
| QA-S7-04 | 정상 | Depreciation | BS accumulated |
| QA-S7-05 | 정상 | FiscalSnapshot saved | D-11 |
| QA-S7-06 | 정상 | One-liner AI comment | no strategy advice |
| QA-S7-07 | 예외 | closeHalf with team unsubmitted | D-10 modal path |
| QA-S7-08 | 예외 | CEO submit at SETTLEMENT | 403 |
| QA-S7-09 | 예외 | P6 close → GAME_END | no Step1 next |
| QA-S7-10 | 예외 | GM miscIncome override | audit + P/L |
| QA-S7-11 | 예외 | releaseDeposit | 2% penalty D-09 |
| QA-S7-12 | 예외 | Ranking P1 operating only | D-14 |

### 3.8 Cross-Cutting / E2E

| ID | 유형 | 시나리오 | Expected |
|----|------|----------|----------|
| QA-E2E-01 | E2E | Full P1: 10 teams, 7 steps, GM only | G2 pass |
| QA-E2E-02 | E2E | Full 6 periods × 3 years | GAME_END ranking |
| QA-E2E-03 | E2E | GM pause mid-Step4 | all submit blocked |
| QA-E2E-04 | E2E | Event fire Step4 + purchase | NORMAL price effect |
| QA-E2E-05 | E2E | Excel golden workbook 1 team | FS ±1만원 |

---

## 4. Non-Functional Requirements

### 4.1 성능 (Performance)

| ID | Metric | V1 Target |
|----|--------|-----------|
| NFR-P01 | CEO Step form load | p95 < 1.5s |
| NFR-P02 | Decision POST (validate+journal) | p95 < 2s |
| NFR-P03 | Settlement pipeline (1 team) | p95 < 5s |
| NFR-P04 | Settlement batch (10 teams) | p95 < 30s |
| NFR-P05 | GM Desk initial load | p95 < 2s |
| NFR-P06 | Financial Statement period switch | p95 < 1s |
| NFR-P07 | WebSocket step advance propagation | p95 < 3s to all clients |
| NFR-P08 | Event fire → CEO feed | p95 < 5s |

### 4.2 보안 (Security)

| ID | Requirement |
|----|-------------|
| NFR-S01 | CEO JWT/session **team-scoped** — other companyId → 403 |
| NFR-S02 | GM role only `/gm/*` mutations |
| NFR-S03 | All GM mutations → `AuditLog` (who, when, before/after) |
| NFR-S04 | No PII in client logs; Decision payload no secrets |
| NFR-S05 | Rate limit: Decision POST 30/min/team |
| NFR-S06 | AI Step7 one-liner: Guardrails filter (Doc 10 §4) |
| NFR-S07 | Session join code entropy ≥ 128-bit equivalent |

### 4.3 동시접속 (Concurrency)

| ID | Requirement |
|----|-------------|
| NFR-C01 | **1 session · 10 CEO + 1 GM** simultaneous — no data corruption |
| NFR-C02 | Optimistic lock on `CompanyStatus.version` — stale POST → 409 |
| NFR-C03 | GM advance serialized per session (mutex) |
| NFR-C04 | Idempotent Decision POST per (company, period, step) |
| NFR-C05 | 3 concurrent sessions × 10 teams (30 CEOs) — NFR-P thresholds hold |

### 4.4 저장 (Storage)

| ID | Requirement |
|----|-------------|
| NFR-D01 | Decision · Journal · FiscalSnapshot **append-only** |
| NFR-D02 | 1 game (10 teams × 6 periods × 7 steps) ≤ 50MB DB growth |
| NFR-D03 | Session data retention default **1 year** (configurable) |
| NFR-D04 | Backup daily; RPO ≤ 24h |
| NFR-D05 | Event Store V1 complete for future Replay (no migration) |

### 4.5 로그 (Logging)

| ID | Requirement |
|----|-------------|
| NFR-L01 | Structured JSON logs: `traceId`, `sessionId`, `companyId` |
| NFR-L02 | Validation failures logged with rule IDs (no full payload PII) |
| NFR-L03 | Settlement pipeline step timing per team |
| NFR-L04 | GM AuditLog queryable on Desk D05 |
| NFR-L05 | Error rate alert: 5xx > 1% over 5min |

### 4.6 복구 (Recovery)

| ID | Requirement |
|----|-------------|
| NFR-R01 | Decision POST transactional — fail → no partial journal |
| NFR-R02 | Settlement fail → half stays open, GM retry |
| NFR-R03 | PAUSED session resume → same stepPhase |
| NFR-R04 | DB restore drill documented; game in-progress → manual GM verify |
| NFR-R05 | Client draft localStorage recover on refresh (Step form) |

---

## 5. V1 Definition of Done (Master Checklist)

### 5.1 Functional

- [ ] §1 모든 화면 AC — CAN / CANNOT / Validation / Done
- [ ] §2 모든 Engine AC — 입출력·오류·예외
- [ ] §3 QA scenarios **전건 Pass** (CI automation where applicable)
- [ ] G1: Excel parity sign-off (3 golden + 1 full class)
- [ ] G2: GM zero Excel sign-off

### 5.2 Non-Functional

- [ ] §4 NFR load test report (10 teams × 1 session minimum)
- [ ] Security review: role matrix + audit completeness
- [ ] Backup/restore runbook

### 5.3 Out of Scope Confirmation

- [ ] Replay · What-if · Advisor · Copilot · Full Debrief **미구현** 또는 featureFlag off
- [ ] No V2 feature blocks V1 GA

---

## 6. Document Index

| Doc | Role |
|-----|------|
| `10-web-only-education-experience.md` | V1/V2 gate (approved) |
| `01-game-rule-book.md` | Validation truth |
| `04-decision-engine-spec.md` | Decision schemas |
| `05-game-state-machine-spec.md` | State gates |
| **This doc (11)** | **Development complete criteria** |

---

## 7. Approval

- [x] Screen AC (§1) approved
- [x] Engine AC (§2) approved
- [x] QA Scenarios (§3) approved
- [x] NFR (§4) approved

**Approved**: 2026-07-26 — Phase 0 closed

- [ ] JSON Specification (V1 Scope) — see `json/00-index.md`
