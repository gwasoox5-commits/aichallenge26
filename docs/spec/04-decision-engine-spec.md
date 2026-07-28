# 4. Decision Engine Specification

> **Supreme principles**: `00-v1-development-principles.md`  
> **Version 1.1** — D-01 ~ D-15 complete

---

## 4.1 Decision 생명주기

```
DRAFT → SUBMITTED → VALIDATED → POSTED → LOCKED
                              ↘ FAILED (422)
```

| Status | CEO | System |
|--------|-----|--------|
| DRAFT | client cache | — |
| SUBMITTED | — | validate |
| VALIDATED | — | compute + journal |
| POSTED | read-only | dashboard/fs update |
| LOCKED | read-only | step advanced |

**Idempotency**: `(companyId, periodId, step)` unique when POSTED.

---

## 4.2 Decision 공통 스키마

```json
{
  "decisionId": "uuid",
  "companyId": "uuid",
  "periodId": "uuid",
  "step": "LOAN|FACILITY|...",
  "payload": { },
  "status": "POSTED",
  "validation": { "ok": true, "rules": [] },
  "computed": { },
  "journalEntryIds": ["uuid"],
  "submittedAt": "iso",
  "submittedBy": "userId"
}
```

---

## 4.3 Step 1 — LOAN (`DecisionLoan`)

### 엑셀 매핑

| Field | Cell | Col D |
|-------|------|-------|
| loanEarly | D25 | 천만원 |
| loanMid | D26 | 천만원 |
| deposit | D27 | 천만원 |

### Payload (D-01 phases → single POST)

```json
{
  "loanEarly": 2,
  "loanMid": 0,
  "deposit": 1,
  "loanRepayment": 0
}
```

### UI Flow (D-01)

```
Phase 1A: loanEarly + deposit → local save
Phase 1B: loanMid + loanRepayment → SUBMIT → POSTED
```

### Validation Rules

| ID | Rule |
|----|------|
| L01 | loanEarly×1000 ≤ equityBefore |
| L02 | loanMid×1000 ≤ 10000 |
| L03 | cashAfter ≥ 0 |
| L04 | values ≥ 0, integer |
| L06 | loanRepayment ≤ debtBefore + loanEarly×1000 + loanMid×1000 |

### Computed

```json
{
  "loanEarlyAmt": 2000,
  "loanMidAmt": 0,
  "depositAmt": 1000,
  "cashDelta": 1000,
  "cashAfter": 11000,
  "debtAfter": 2000,
  "depositAfter": 1000
}
```

### Journal (POSTED)

| Line | Account | Debit | Credit |
|------|---------|-------|--------|
| 1 | Cash | loanEarly+loanMid | |
| | Long-term Debt | | loanEarly+loanMid |
| 2 | Cash | | depositAmt |
| | Deposits | depositAmt | |
| 3 | Long-term Debt | loanRepayment | |  // D-03
| | Cash | | loanRepayment |

### Dashboard 반영

- 현금현황: 차입+, 예금−, 현잔액
- 부채 (implicit in status)

### 재무제표

- **B/S**: Cash, Long-term Debt, Deposits (if shown as asset/liability split)
- **P/L**: — (반기)
- **C/F**: Financing inflow

---

## 4.4 Step 2 — FACILITY (`DecisionFacility`)

### 엑셀: D28, D29

### Payload

```json
{
  "landPlotsPurchased": 1,
  "machineBigPurchased": 0,
  "machineSmallPurchased": 2
}
```

### Validation: F01~F06 (Rule Book)

### Computed

```json
{
  "landCost": 3000,
  "machineCost": 600,
  "totalCapex": 3600,
  "capacityMachine": 20,
  "maxMaterials": 80
}
```

### Journal

| Line | Account | Debit | Credit |
|------|---------|-------|--------|
| 1 | Land | 3000 | |
| 2 | Machinery | 600 | |
| | Cash | | 3600 |

### Dashboard

- 설비현황: 토지, Big/Small, 생산능력, 필요원재료 Max

### 재무제표

- **B/S**: Land, Machinery, Cash↓

---

## 4.5 Step 3 — HIRING (`DecisionHire`)

### 엑셀: D32~34 (+ Y2 restructuring)

### Payload (Year 1)

```json
{
  "headPurchase": 2,
  "headProduction": 3,
  "headSales": 2
}
```

### Payload (Year 2+ optional — D-02)

```json
{
  "headPurchase": 2,
  "headProduction": 3,
  "headSales": 2,
  "transfers": [],
  "resignations": { "purchase": 0, "production": 0, "sales": 0 }
}
```

> **Validation H04**: if `period.year < 2` and `transfers` or `resignations` non-empty → reject.

### Validation: H01~H04

### Computed

```json
{
  "purchaseCapacity": 60,
  "productionCapacity": 30,
  "salesCapacity": 20,
  "payrollForecastHalf": 2100
}
```

> `payrollForecastHalf` — **UI forecast only (D-12)**. Not journaled until SETTLEMENT.

### Journal

- **Step 3**: no payroll journal
- **SETTLEMENT**: accrue all departments — see §4.9

### Dashboard

- 인원현황 3직군 + Capacity

---

## 4.6 Step 4 — MATERIAL (`DecisionPurchase`)

### 엑셀: 반기 재료구입 블록 (Row ~46+)

### Payload (V1 — D-08 instant purchase)

```json
{
  "branches": [{ "regionId": "ASIA", "name": "Asia Hub" }],
  "lines": [
    {
      "regionId": "ASIA",
      "materials": { "A": 100, "B": 80, "C": 50, "D": 50 }
    }
  ]
}
```

> V1: **no bid price** — `effectiveUnitPrice` from region master × Economy.  
> V2: add `unitPriceBid`, two-phase bid workflow.

### Validation: M01~M05 (M06 removed in V1)

### Computed (Economy applied)

```
unitPrice = regionBase × (rawMaterialIndex/100) × fxFactor × (1+tariff)
lineCost = Σ qty × unitPrice
logistics = Σ totalUnits × 5 × logisticsMultiplier
totalCost = lineCost + logistics + branchFees
```

### Journal

| Line | Account | Debit | Credit |
|------|---------|-------|--------|
| 1 | Raw Materials Inventory | materialCost | |
| 2 | Logistics Expense | logistics | |
| 3 | Branch Setup | branchFee | |
| | Cash | | total |

### Dashboard

- 재료현황: 구매, 구매가, 잔여재료
- 현금↓

### 재무제표

- **B/S**: Inventory↑, Cash↓
- **P/L**: Logistics (if expensed immediately per excel)

---

## 4.7 Step 5 — PRODUCTION (`DecisionProduction`)

### 엑셀: 생산공정 블록

### Payload

```json
{
  "productionQty": 18,
  "machineBigRun": 0,
  "machineSmallRun": 2
}
```

### Validation: P01~P04

### Computed

```json
{
  "materialConsumed": { "A": 72, "B": 72, "C": 72, "D": 72 },
  "machineOpCost": 80,
  "carbonTax": 0,
  "unitManufacturingCost": 30
}
```

### Journal

| Line | Account | Debit | Credit |
|------|---------|-------|--------|
| 1 | WIP / COGS build | mfgCost | |
| | Raw Materials Inv | | materialCost |
| 2 | Machine Operating | 80 | |
| | Cash | | 80 |
| 3 | Finished Goods | units×cost | |
| | WIP | | |

### Dashboard

- 생산 수량, 재료 잔여, 완제품

### 재무제표

- **B/S**: Inventory mix change
- **P/L**: Machine op, carbon (if expensed)

---

## 4.8 Step 6 — SALES (`DecisionSales`)

### 엑셀: 제품판매 블록

### Payload

```json
{
  "lines": [
    { "regionId": "ASIA", "unitPrice": 150, "qty": 8 },
    { "regionId": "EU", "unitPrice": 195, "qty": 5 }
  ]
}
```

### Validation: S01~S05

### Computed

```json
{
  "revenue": 1486,
  "cogs": 390,
  "logistics": 130,
  "grossProfit": 1096
}
```

### Journal

| Line | Account | Debit | Credit |
|------|---------|-------|--------|
| 1 | Cash | revenue - logistics | |
| 2 | Logistics Expense | logistics | |
| 3 | COGS | cogs | |
| | Revenue | | revenue |
| | Finished Goods | | cogs |

### Dashboard

- 판매 수량, 판매가, 현금, 재고

### 재무제표

- **P/L**: Revenue, COGS, Logistics
- **B/S**: Cash, FG↓

---

## 4.9 Step 7 — SETTLEMENT (`DecisionSettlement`)

### CEO Payload

**none** — system-generated `SettlementRun`

### System Pipeline (D-12 payroll accrual)

```
1. Accrue payroll (3 departments) — sole payroll journal point
2. Depreciation (machinery)
3. Interest income / expense
4. Loan repayment (from LOAN or auto 0)
5. Misc income (GM quiz)
6. Corporate tax
7. Close P/L → Retained earnings
8. FiscalSnapshot (BS, PL, CF)
```

### Journal (examples)

| Item | Debit | Credit |
|------|-------|--------|
| Interest expense | Interest Exp | Cash |
| Interest income | Cash | Interest Rev |
| Depreciation | Dep Exp | Accum Dep |
| Tax | Tax Exp | Cash |

### Dashboard

- 전 블록 갱신 (현금·설비·재료·손익 요약)

### 재무제표

- **Full P/L, B/S, C/F** for period

---

## 4.10 엑셀 H열 → ValidationService

```typescript
// Spec pseudocode
validate(decision, companyState, economy, step): ValidationResult {
  const rules = RULES_BY_STEP[step]
  for (const rule of rules) {
    if (!rule.check(decision, companyState, economy))
      return fail(rule.id, rule.message)
  }
  return ok()
}
```

| Excel H | Platform |
|---------|----------|
| `=IF(B6<E25,"다시입력","OK")` | L01 |
| `=IF(OR(D46=G6,D46=0),"OK","다시입력")` | *(V1)* removed — payroll not in purchase step |

### v1.1 — Skip-as-zero & copy-last-half (D-10)

When GM `advanceStep` RELAXED:

| Modal choice | Behavior |
|--------------|----------|
| **대기** | Cancel advance |
| **zero** (default) | `createZeroDecision()` → SKIPPED_ZERO |
| **copy last half** | Clone prior period POSTED payload → POSTED, audit: COPIED_FROM_PREVIOUS |

### v1.1 — Financial Statements (D-11)

```
GET /ceo/reports/income-statement?periodId=P3
→ FiscalSnapshot for that period only (half-year label)

GET /ceo/reports/income-statement?scope=cumulative&through=P3
→ optional YTD rollup tab
```

### v1.1 — Inventory & Logistics (D-13)

- Purchase journal: Dr Inventory (material only), Dr Logistics Expense, Cr Cash
- COGS at sale: material layer only
- Sales logistics: separate expense line

---

## 4.11 DecisionOrchestrator

```
submit(decision):
  assert gameState allows step
  validate()
  computed = DecisionCalculator.compute(payload, economy, state)
  entries = JournalBuilder.fromTemplate(step, computed)
  post(entries)
  updateInventory()
  updateCompanyState()
  markStepComplete()
  emit decision.posted
```

---

## 4.12 Dashboard DTO (`CeoStatusDTO`)

엑셀 R4~21 필드 1:1 (read-only):

| DTO Path | Excel |
|----------|-------|
| cash.opening | B6 |
| cash.loanIn | sum loans |
| cash.depositOut | deposit |
| cash.balance | B10 |
| facility.land | … |
| materials.* | R14~17 |
| headcount.* | R18~20 |
| regions.* | R21 block |

Recomputed after every POSTED decision + settlement.

---

## 4.13 Financial Statement Mapping

| Statement | Source |
|-----------|--------|
| P/L | Journal by account type, period filter |
| B/S | Ledger balances at period end |
| C/F | Indirect method from P/L + BS Δ |

**CEO never edits** — StatementService only.

---

## 4.14 Excel Yellow Cell Index (Complete)

| Row | Item | Step | Field |
|-----|------|------|-------|
| 25 | 차입(연초) | LOAN | loanEarly |
| 26 | 차입(연중) | LOAN | loanMid |
| 27 | 예금 | LOAN | deposit |
| 28 | 토지 | FACILITY | landPlots |
| 29 | 기계 | FACILITY | machineBig/Small |
| 32-34 | 채용 | HIRING | head* |
| 36-44 | 구조조정 | HIRING | transfers/resign |
| 46+ | 재료구입 | MATERIAL | lines[] |
| ~70+ | 생산 | PRODUCTION | qty, machines |
| ~90+ | 판매 | SALES | lines[] |
| 124-127 | 결산 | SETTLEMENT | system |

---

## 4.15 Platform Extensions (non-Excel)

| Extension | Decision impact |
|-----------|-----------------|
| Economy live | computed fields use EconomyEngine.resolve |
| Event | temporary modifiers in compute context |
| GM Override | adjustment Journal, not decision edit |

See: `01-game-rule-book.md`, `03-economy-engine-spec.md`
