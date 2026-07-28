# 1. Game Rule Book

> **Supreme principles**: `00-v1-development-principles.md`  
> Source: `(게임용)회계기초과정 원장_시뮬레이션 사용(연습용)_복호화.xlsx`  
> Platform: 3년 · 6반기 · 7 Step (엑셀 1년 구조를 3년으로 확장)  
> **Version 1.1** — P0 Decision Log 반영 (approved)

### v1.1 변경 요약 (D-01 ~ D-15 Complete)

| ID | 변경 |
|----|------|
| D-01 | Step1 **2-phase UI** (① 연초 차입·예금 → ② 연중 차입), GM advance 1회 |
| D-02 | 구조조정 **2년차(year≥2)** 부터만 |
| D-03 | Step1 `loanRepayment`; Step7 이자·상환 자동 + GM `miscIncome` |
| D-04 | Event/Scenario `recommendedPeriod`; Y1H1 severity>3 경고 |
| D-05 | 순위 ≠ 유일 학습 평가; delta + improvement MVP |
| D-06 | Y2+ delta chips; Y3 H2 reflection (UX) |
| D-07 | **지역 잔여** GM Desk 편집 |
| D-08 | **V1 즉시 구매** (입찰 → V2) |
| D-09 | GM `releaseDeposit` (penalty 2%) |
| D-10 | 미제출 = **zero**; modal wait/zero/copy-last-half |
| D-11 | **반기별** FiscalSnapshot; 재무제표 period selector |
| D-12 | **인건비 Settlement 일괄** accrual |
| D-13 | 물류비 **발생 시 비용**; 재고=재료원가 only |
| D-14 | Ranking P1~P2: 영업 지표; P3+ 종합 |
| D-15 | Event Fire **NORMAL** default |

See: `CHANGELOG-v1.1.md`

---

## 1.1 게임 목표

### 교육 목표 (Primary)

CEO(교육생)는 가상 제조기업을 **3년(6반기)** 운영하며 다음을 학습한다:

1. **의사결정 → 회계 → 재무제표** 인과관계
2. **현금 vs 이익** 차이 (Accrual vs Cash)
3. **제조 Value Chain**: 조달 → 생산 → 판매 → 결산
4. **제약 하에서의 트레이드오프**: 현금·설비·인력·재고·시장

### 게임 목표 (Secondary)

동일 GM 환경에서 **종합 경영 점수**가 가장 높은 팀이 우승한다.  
단, **단일 정답 경로는 없다** — 전략·리스크·이벤트 대응에 따라 결과가 달라진다.

---

## 1.2 승리 조건 · 순위 산정

### 최종 순위 (게임 종료: 3년차 하반기 결산 후)

**종합점수** = 가중 합산 (GM Rubric 조정 가능, 기본값):

| 영역 | 지표 | 가중치 | 계산 |
|------|------|--------|------|
| **재무** | ROE | 12% | 당기순이익 / 평균자기자본 |
| | ROA | 8% | 당기순이익 / 평균총자산 |
| | 부채비율 (역) | 8% | 100 − min(부채/자본×100, 200) 정규화 |
| | 영업이익률 | 12% | 영업이익 / 매출 |
| **운영** | 시장점유율 | 10% | 팀 판매량 / 전체 판매량 |
| | 생산성 | 10% | 판매량 / (생산인력×반기) |
| | 재고관리 | 10% | 100 − 재고회전율 페널티 |
| **성장** | 매출 CAGR | 15% | 3년 매출 복리성장 |
| | 누적 순이익 | 15% | 6반기 순이익 합 정규화 |

- 동점: **최종 자기자본** → **최종 현금** 순
- **Live Ranking**: 반기 마감마다 중간 점수 갱신 (최종 가중치 동일, 누적 데이터)

### v1.1 — Live Ranking (D-05, D-14)

| Period | Ranking metrics |
|--------|-----------------|
| **P1 ~ P2** (1년차) | **Operating only**: 매출, 영업이익률, 시장점유율 |
| **P3 ~ P6** (2~3년차) | **Full composite** (§1.2 가중치) |

- UI: **절대점수 + 전반기 대비 delta** (D-05)
- **Improvement MVP** badge: operating score Δ 최대 팀 (순위 하위도 표창)
- 순위는 동기 부여; Learning Design이 학습 평가 primary

### 엑셀 대비 추가

엑셀에는 명시적 순위 없음 → **플랫폼 교육·경쟁 동기**용 확장.

---

## 1.3 게임 진행 순서

### Macro Flow

```
PREPARE → [반기 loop × 6] → GAME_END
```

### 반기(Half-Year) Flow — 7 Steps (GM 동기)

| Order | Step Code | CEO 라벨 | 엑셀 대응 |
|-------|-----------|----------|-----------|
| 1 | LOAN | 자금 조달 | Row 25~27 차입·예금 |
| 2 | FACILITY | 설비 투자 | Row 28~29 토지·기계 |
| 3 | HIRING | 인력 채용 | Row 32~34 (+ Y2~3 구조조정) |
| 4 | MATERIAL | 원재료 구매 | 반기 재료구입 블록 |
| 5 | PRODUCTION | 생산 | 반기 생산공정 블록 |
| 6 | SALES | 판매 | 반기 제품판매 블록 |
| 7 | SETTLEMENT | 반기 결산 | Row 124~127 + Sheet1/2 |

```
Step1 → Step2 → … → Step7 → [GM: 반기 마감] → 다음 반기 Step1
```

### 엑셀 1년 vs 플랫폼 3년

| | 엑셀 | 플랫폼 |
|---|------|--------|
| 기간 | 1년 (상·하반기) | **3년 (6반기)** |
| 구조조정 | 2·3년차 Row 36~44 | **2년차(year≥2) Step3만** — D-02 |
| 잡수익(퀴즈) | Row 127 | GM 설정 또는 Step7 |

---

## 1.4 연도 / 반기 구조

| Period ID | Year | Half | UI 라벨 |
|-----------|------|------|---------|
| P1 | 1 | H1 | 1년차 상반기 |
| P2 | 1 | H2 | 1년차 하반기 |
| P3 | 2 | H1 | 2년차 상반기 |
| P4 | 2 | H2 | 2년차 하반기 |
| P5 | 3 | H1 | 3년차 상반기 |
| P6 | 3 | H2 | 3년차 하반기 |

- **1년 = 상반기 + 하반기** (각 7 Step)
- 반기 시작: 현금·재고·설비·인력 **이월** (결산 후 잔액)
- 반기 마감: 이자·감가·법인세·결산 Journal → P/L·B/S·C/F 스냅샷

---

## 1.5 공통 상수 (엑셀 Source of Truth)

| 상수 | 값 | 단위 | 엑셀 근거 |
|------|-----|------|-----------|
| 통화 표시 | 만원 | 만원 | 전 시트 |
| 기초 현금 | 10,000 | 만원 (=1억) | B6 기초 |
| BOM | 4 재료 → 1 제품 | ratio | 인원현황·생산 |
| 차입 금리 | 10 | %/년 | G25 |
| 예금 금리 | 5 | %/년 | G27, 결산 |
| 토지 단가 | 3,000 | 만원/필지 | C28 |
| 토지 상한 | 4 | 필지 | G28 |
| 기계 Big | 600 | 만원/대 | C29 |
| Big 생산능력 | 30 | 개/대/반기 | G29 |
| Big 가동비 | 80 | 만원/대/반기 | G29 |
| 기계 Small | 300 | 만원/대 | C29 |
| Small 생산능력 | 10 | 개/대/반기 | G29 |
| Small 가동비 | 40 | 만원/대/반기 | G29 |
| 필지당 기계 | Big 2 **or** Small 4 | 대 | G29 |
| 물류(재료) | 5 | 만원/단위 | G46 등 |
| 물류(제품) | 10 | 만원/단위 | 판매 블록 |
| 구매 Capacity | 30 | 재료/인/반기 | R18 |
| 생산 Capacity | 10 | 제품/인/반기 | R19 |
| 영업 Capacity | 10 | 제품/인/반기 | R20 |
| 법인세 | 22 | % (기본) | Sheet1 (GM 변경 가능) |

### 7개 지역 (마스터 — 상반기 예시, GM·시나리오로 변동 가능)

| Region | 개설비 | 재료 단가 | 재료 보유한도 | 판매 개설비 | 판매 단가상한 | 판매 가능량 |
|--------|--------|-----------|---------------|-------------|---------------|-------------|
| 유럽 | 500 | 24 | 300 | 500 | 200 | 50 |
| 아시아 | 300 | 12 | 600 | 300 | 150 | 100 |
| 중동 | 150 | 15 | 400 | 150 | 120 | 40 |
| 아프리카 | 100 | 10 | 500 | 100 | 100 | 30 |
| 오세아니아 | 150 | 18 | 300 | 150 | 150 | 40 |
| 북미 | 500 | 21 | 500 | 500 | 180 | 100 |
| 남미 | 200 | 16 | 300 | 200 | 140 | 50 |

- **브랜치**: 신규 지역 개설 시 개설비 + 지역명 입력
- **재료 구매 (V1 — D-08)**: 지역 **표시 단가**로 즉시 구매. `unitPrice ≥ region.minPrice`, 수량 ≤ 보유한도. (엑셀 입찰·낙찰 → **V2** `bid workflow`)
- **제품 판매**: 단가 ≤ 상한, 수량 ≤ 판매가능량

---

## 1.6 Step별 입력값 · 계산식 · Validation · 제출

### Step 1 — LOAN (자금 조달)

#### v1.1 — 2-Phase UI (D-01)

CEO Step1 화면은 **2단계 wizard**, GM은 **한 번** advance:

| Phase | Label | Fields | 엑셀 |
|-------|-------|--------|------|
| **1A** | 연초 | loanEarly, deposit | D25, D27 |
| **1B** | 연중 | loanMid, loanRepayment (optional) | D26, D126 |

- Phase 1B는 1A submit 후 활성 (same Step, same session)
- Payload는 **단일** `DecisionLoan` — POST는 Phase 1B 완료 시 또는 1A only (loanMid=0, repayment=0)
- GM `advanceStep`: Step1 전체 종료

#### 입력값

| Field | Type | Unit | 엑셀 Cell |
|-------|------|------|-----------|
| loanEarly | int | 천만원 | D25 |
| loanMid | int | 천만원 | D26 |
| deposit | int | 천만원 | D27 |
| loanRepayment | int | 만원 | D126 — **D-03**, optional, ≤ debtBalance |

#### 계산식

```
loanEarlyAmt  = loanEarly × 1,000          // 만원
loanMidAmt    = loanMid × 1,000
depositAmt    = deposit × 1,000

loanRepaymentAmt = loanRepayment              // 만원 (D-03)
cashDelta     = loanEarlyAmt + loanMidAmt − depositAmt − loanRepaymentAmt
newCash       = cashBefore + cashDelta
newDebt       = debtBefore + loanEarlyAmt + loanMidAmt − loanRepaymentAmt
newDeposit    = depositBefore + depositAmt
```

#### Validation (엑셀 H열)

| Rule ID | 조건 | 메시지 |
|---------|------|--------|
| L01 | loanEarlyAmt ≤ equityBefore | 자기자본 이하만 차입(연초) |
| L02 | loanMidAmt ≤ 10,000 | 연중 차입 1억(10,000만) 이하 |
| L03 | loanEarlyAmt + loanMidAmt + depositAmt ≤ cashBefore + loanEarlyAmt + loanMidAmt | 현금 음수 불가 |
| L04 | loanEarly, loanMid, deposit ≥ 0 | 음수 불가 |
| L05 | 천만원 단위 (loan fields) | |
| L06 | loanRepayment ≤ debtBefore + loanEarly + loanMid | D-03 |

#### 제출 조건

- L01~L05 pass
- GM Step = LOAN, Session RUNNING, 미제출

#### 다음 Step

- CEO 제출 + **GM `advanceStep`** → FACILITY

---

### Step 2 — FACILITY (설비 투자)

#### 입력값

| Field | Type | 엑셀 |
|-------|------|------|
| landPlots | int 0~4 | D28 |
| machineBig | int | D29 |
| machineSmall | int | D29 |

#### 계산식

```
landCost     = landPlots × 3,000
machineCost  = machineBig × 600 + machineSmall × 300
totalCapex   = landCost + machineCost

capacityBig    = machineBig × 30
capacitySmall  = machineSmall × 10
capacityMachine = capacityBig + capacitySmall
maxMaterials   = capacityMachine × 4    // BOM inverse

cashAfter    = cashBefore − totalCapex
```

#### Validation

| Rule ID | 조건 |
|---------|------|
| F01 | landPlots ≤ 4 |
| F02 | machineBig ≤ landPlots × 2 |
| F03 | machineSmall ≤ landPlots × 4 |
| F04 | F02 OR F03 조합 per plot (Big×2 or Small×4 per plot rule) |
| F05 | totalCapex ≤ cashBefore |
| F06 | landPlots ≥ existingLand + delta (누적) |

#### 다음 Step

- 제출 + GM advance → HIRING

---

### Step 3 — HIRING (인력 채용)

#### 입력값 (1년차)

| Field | Type | 엑셀 |
|-------|------|------|
| headPurchase | int | D32 |
| headProduction | int | D33 |
| headSales | int | D34 |

#### 입력값 (2~3년차 추가 — 구조조정) — **year ≥ 2 only (D-02)**

| Field | Type | 엑셀 |
|-------|------|------|
| transferPurchaseToProduction | int | Row 36~38 |
| transferProductionToSales | int | … |
| resignPurchase / Production / Sales | int | Row 40~44 |

> **1년차(year=1)**: restructuring fields **hidden**, validation **reject** if present.

#### 계산식

```
// 채용비는 반기 인건비로 결산 시 인식 (D-12: SETTLEMENT only)
purchaseCapacity  = headPurchase × 30
productionCapacity = headProduction × 10
salesCapacity     = headSales × 10

// 구조조정 후 headcount 갱신 (year≥2)
```

#### Validation

| Rule ID | 조건 |
|---------|------|
| H01 | headcounts ≥ 0 |
| H02 | Year≥2: transfer units valid (30명 단위 전환 — 엑셀) |
| H03 | Year≥2: resign ≤ current head |

#### 다음 Step

- GM advance → MATERIAL

---

### Step 4 — MATERIAL (원재료 구매)

#### 입력값

| Field | Type |
|-------|------|
| branchNew[] | regionId, name (optional) |
| purchases[] | regionId, materialA~D qty OR bundle, unitPrice (bid) |

엑셀: **7지역 × (단가·수량)**, 구매 인건비 행 = 보유 구매 인원과 일치

#### 계산식

```
materialCost_r  = Σ (qty_i × effectiveUnitPrice_i)  per region  // V1: listed price
logisticsCost   = Σ totalMaterialUnits × 5 × logisticsMultiplier
// D-13: inventory += materialCost only; logistics → expense immediately
cashDelta       = −(materialCost + logisticsCost + branchFees)
inventoryMat    += purchasedQty
```

#### Validation

| Rule ID | 조건 |
|---------|------|
| M01 | effectiveUnitPrice ≥ region.minPrice (V1 listed) |
| M02 | qty ≤ region.materialLimit |
| M03 | Σ units ≤ headPurchase × 30 |
| M04 | cash ≥ total cost |
| M05 | branch: 개설비 지급 + 개설여부 확인 |
| ~~M06~~ | *(V2)* 입찰·낙찰 — **V1 제외** |

#### 다음 Step

- GM advance → PRODUCTION

---

### Step 5 — PRODUCTION (생산)

#### 입력값

| Field | Type |
|-------|------|
| productionQty | int |
| machineBigRun | int |
| machineSmallRun | int |

#### 계산식

```
maxByMaterial = min(inventory_A, inventory_B, inventory_C, inventory_D) / 4  // floor
maxByMachine  = bigRun×30 + smallRun×10
maxByLabor    = headProduction × 10

maxProduction = min(maxByMaterial, maxByMachine, maxByLabor)

materialConsume = productionQty × 4  // each type
machineOpCost   = bigRun×80 + smallRun×40
productionPayroll = headProduction × rate (결산)

finishedGoods  += productionQty
inventoryMat   −= materialConsume
```

#### Validation

| Rule ID | 조건 |
|---------|------|
| P01 | productionQty ≤ maxProduction |
| P02 | machineBigRun ≤ machineBigOwned |
| P03 | machineSmallRun ≤ machineSmallOwned |
| P04 | productionQty ≥ 0 |

#### 다음 Step

- GM advance → SALES

---

### Step 6 — SALES (판매)

#### 입력값

| Field | Type |
|-------|------|
| sales[] | regionId, unitPrice, qty |
| branchNew[] | (optional) |

#### 계산식

```
revenue_r     = qty × unitPrice
cogs          = soldQty × unitCOGS   // from inventory cost layer
logisticsSales = soldQty × 10
salesPayroll  = headSales × rate (결산)

cashDelta     = revenue − logisticsSales (COGS accrual in P/L)
inventoryFG   −= soldQty
```

#### Validation

| Rule ID | 조건 |
|---------|------|
| S01 | unitPrice ≤ region.maxSalePrice |
| S02 | qty ≤ region.saleLimit |
| S03 | Σ qty ≤ headSales × 10 |
| S04 | Σ qty ≤ finishedGoods |
| S05 | cash flow valid |

#### 다음 Step

- GM advance → SETTLEMENT

---

### Step 7 — SETTLEMENT (반기 결산)

#### CEO 입력

**없음** (조회·학습). 시스템 자동 + GM 보조 (D-03).

| 항목 | 처리 |
|------|------|
| 이자수익/비용 | 자동 |
| 차입상환 | Step1 `loanRepayment` 반영 (D-03) |
| 잡수익(퀴즈) | **GM Override** `miscIncome` 팀별 (CEO 입력 아님) |
| 감가·세금 | 자동 |

#### v1.1 — 재무제표 (D-11)

- `FiscalSnapshot(periodId)` — **반기 단위** P/L·B/S·C/F
- UI label: **「2년차 상반기」** (default); cumulative YTD = optional tab
- CEO Step7: guided walkthrough (UX U-02), not empty state

#### 시스템 결산 항목 (Period Close)

| 항목 | 계산 | 엑셀 |
|------|------|------|
| 이자수익 | depositBalance × 5% × (반기/년) | Row 124 |
| 이자비용 | debtBalance × 10% × (반기/년) | Row 125 |
| 차입상환 | Step1 `loanRepayment` (D-03) | Row 126 |
| 감가상각 | 토지 0, 기계 정액/定率 (교육용: 반기 일할) | Sheet2 |
| 법인세 | taxableIncome × corporateTaxRate | Sheet1 |
| 잡수익 | GM Override `miscIncome` per team | Row 127 |

#### 제출 조건

- N/A (CEO submit 없음)
- GM **반기 마감** 트리거

#### 다음 Step

- GM `closePeriod` → **HALF_YEAR_END** → NEXT_HALF → Step 1

---

## 1.7 결산 규칙 (Accounting Roll-up)

### 손익계산서 (Sheet1 구조)

```
매출액
− 매출원가
  ├ 채용/전환/퇴사 (해당 반기)
  ├ 재료비
  ├ 물류비(재료)
  ├ 기계가동비
  ├ 인건비(구매·생산)
  └ 감가상각비
= 매출총이익
− 판매관리비
  ├ 브랜치개설비
  ├ 인건비(영업)
  └ 물류비(제품)
= 영업이익
± 금융수익/비용/잡수익
= 법인세차감전순이익
− 법인세
= 당기순이익
```

### 재무상태표 (Sheet2 구조)

```
자산: 현금, 토지, 기계(−감가), 재료재고, 제품재고
부채: 장기차입금
자본: 자본금(초기), 이익잉여금(누적 NI)
```

- **모든 CEO Decision → Journal Entry → Ledger → Statements**
- UI/CEO는 **결과 직접 입력 불가**

---

## 1.8 Step 전환 조건

| 주체 | 조건 | 행동 |
|------|------|------|
| CEO | 현재 Step validation pass | `submitDecision` |
| GM | Session RUNNING | `advanceStep` |
| GM | Step 7, 결산 pipeline 완료 | `closePeriod` |
| GM | P6 SETTLEMENT closed | `endGame` |

### GM advance 옵션

| Mode | 설명 |
|------|------|
| STRICT | 전 팀 submit 필수 |
| RELAXED (default) | 미제출 → **zero (D-10)**; GM modal: `[대기]` `[zero]` `[copy last half — logged]` |
| FORCE | GM override logged |

### CEO Step Gate

- 현재 Step **만** POST 가능
- PAUSED: submit 불가
- SETTLEMENT: submit 없음

---

## 1.9 현황판 (Dashboard DTO — 엑셀 R4~21)

CEO Dashboard / 우리 회사 탭 — **Server 계산, read-only**

| Block | Fields |
|-------|--------|
| 현금 | 기초, 차입+, 예금−, 기타, **현잔액** |
| 설비 | 토지, Big/Small, **생산능력**, **필요원재료 Max** |
| 재료 | 반기 구매/생산/판매, 구매가, **잔여** |
| 생산/판매 | 수량, 판매가 |
| 인력 | 3직군 인원, Capacity |
| 지역 | 7지역 **잔여·한도** — **GM Desk 편집** (D-07, 엑셀 R21 호환) |

### v1.1 — 지역 잔여 (D-07)

| 항목 | 규칙 |
|------|------|
| **Editor** | GM only (`regionRemaining` per region) |
| **CEO** | read-only 표시 (Purchase/Sales 한도에 반영) |
| **Default** | Market master `materialLimit` / `saleLimit` |
| **Audit** | 모든 GM edit → AuditLog |
| **Auto** | V2: MarketClearingService optional override |

### v1.1 — 인건비 (D-12)

| Step | 인건비 |
|------|--------|
| Step 3~6 | **Forecast only** (UI label: "예상") |
| SETTLEMENT | **100% accrual** — 구매·생산·영업 payroll + welfare → Journal |
| Event EVT-052 등 | payroll multiplier applies **at settlement** |

### v1.1 — GM Override (D-09)

| Action | Rule |
|--------|------|
| `releaseDeposit` | GM only; amount ≤ depositBalance; penalty **2%** of amount; AuditLog |
| Use case | EVT-007 신용경색 등 — 예금 중도 해제 (엑셀 "불가" 예외, GM 교육 판단) |

### v1.1 — 재고·물류 (D-13)

| Item | Rule |
|------|------|
| Material inventory | **Unit material cost only** (no capitalized logistics) |
| Logistics (purchase) | **Expense when incurred** — P/L 판관/매출원가 block per Sheet1 |
| Logistics (sales) | Expense at sale step |
| COGS | material cost layer; excludes purchase logistics double-count |

---

## 1.10 플랫폼 확장 (엑셀 외 — 교육 강화)

| 기능 | Rule Book 반영 |
|------|----------------|
| 실시간 경제 | Economy Engine — 변수가 Step 4~6·결산에 승수 적용 |
| AI 이벤트 | Event Engine — **NORMAL default (D-15)**; `recommendedPeriod` (D-04) |
| Economy patch | **다음 Decision부터** 적용 — mid-step retroactive X (G-02) |
| AI 뉴스 | 이벤트·경제 변경 시 CEO Feed |
| AI 피드백 | Step7·연말 — Statement 기반, **점수에 미포함** (학습) |
| GM Override | AuditLog 필수, Journal adjustment |
| 3년 | 6반기 loop, Y2~ 구조조정 |

---

## 1.11 엑셀 Validation → 플랫폼 매핑

| 엑셀 H열 | 플랫폼 |
|----------|--------|
| `OK` | `ValidationResult.ok = true` |
| `다시입력` | `422 + field errors` |
| `=IF(B6<E25,…)` | Service Layer rule L01 |

---

## 1.12 문서 참조

- Decision 필드 상세: `04-decision-engine-spec.md`
- 경제 변수: `03-economy-engine-spec.md`
- 상태: `05-game-state-machine-spec.md`
