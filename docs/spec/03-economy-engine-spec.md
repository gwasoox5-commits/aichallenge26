# 3. Economy Engine Specification

> **Supreme principles**: `00-v1-development-principles.md`  
> **Version 1.1** — D-09, D-15, G-02

---

## 3.0 v1.1 Rules

| ID | Rule |
|----|------|
| D-09 | GM `releaseDeposit(amount)` — 2% penalty, AuditLog |
| G-02 | Economy/Event patch applies **from next Decision POST**; badge on CEO UI |
| D-15 | Event effects use NORMAL scenario in V1 |

## 3.1 아키텍처

```
EconomicState (session live)
    │
    ├── EconomyEngine.getMultiplier(key, context)
    ├── patched by GM Desk / Event Engine / Scenario
    └── snapshotted → EconomicSnapshot on period close

MarketState (per region, per period)
    └── demand, price limits, supply — derived from economy + region master
```

**원칙**: 모든 CEO-facing 금액은 **Service Layer**에서 `EconomicState` 참조 후 계산.

---

## 3.2 관리 변수 (GM Editable)

| Key | UI 라벨 | Type | Default | Unit |
|-----|---------|------|---------|------|
| `interestRateLoan` | 차입금리 | decimal | 10 | %/년 |
| `interestRateDeposit` | 예금금리 | decimal | 5 | %/년 |
| `exchangeRate` | 환율 | decimal | 1,300 | KRW/USD |
| `rawMaterialIndex` | 원자재 가격지수 | index | 100 | base=100 |
| `marketDemandIndex` | 시장 수요지수 | index | 100 | base=100 |
| `marketSupplyIndex` | 시장 공급지수 | index | 100 | base=100 |
| `logisticsCostMultiplier` | 물류비 배수 | multiplier | 1.0 | × |
| `tariffRate` | 관세 | decimal | 0 | % |
| `corporateTaxRate` | 법인세 | decimal | 22 | % |
| `carbonTaxRate` | 탄소세 | decimal | 0 | %/unit or flat |
| `businessCycleIndex` | 경기지수 | index | 100 | composite |

### PRD 추가 (optional Phase 2)

| Key | Default |
|-----|---------|
| `inflationRate` | 2% — embedded in index drift |

---

## 3.3 변수별 상세 — Step · 계산 · UI

### 3.3.1 `interestRateLoan` — 차입금리

| 항목 | 내용 |
|------|------|
| **적용 Step** | LOAN (한도 안내), SETTLEMENT (이자비용) |
| **계산** | `interestExpense = avgDebtBalance × (rate/100) × (halfYearFraction)` |
| **엑셀** | Row 125, G25 |
| **CEO UI** | Step1 참고 칩; Settlement P/L 금융비용 |
| **GM UI** | Desk Live Panel 슬라이더 |
| **변경 시** | News + Step1 hint if active |

---

### 3.3.2 `interestRateDeposit` — 예금금리

| 항목 | 내용 |
|------|------|
| **적용 Step** | LOAN, SETTLEMENT (이자수익) |
| **계산** | `interestIncome = depositBalance × (rate/100) × halfYearFraction` |
| **엑셀** | Row 124 |
| **CEO UI** | Step1, Settlement |
| **GM UI** | Live Panel |

---

### 3.3.3 `exchangeRate` — 환율

| 항목 | 내용 |
|------|------|
| **적용 Step** | MATERIAL (수입 지역), SALES (수출 지역), SETTLEMENT |
| **계산** | `importUnitPrice = basePrice × (exchangeRate/baseFx) × (1+tariffRate/100)` |
| **Region** | 수입 성격: 유럽·북미 등 (마스터 flag `importWeighted`) |
| **CEO UI** | Purchase/Sales 환율 칩; 소식 탭 |
| **GM UI** | Live Panel + Event 연동 |

---

### 3.3.4 `rawMaterialIndex` — 원자재 가격

| 항목 | 내용 |
|------|------|
| **적용 Step** | MATERIAL (primary), PRODUCTION (COGS), SETTLEMENT |
| **계산** | `effectiveUnitPrice = regionBasePrice × (index/100)` |
| **엑셀** | 재료구입 C열 단가 |
| **CEO UI** | Purchase table 단가 column; Dashboard 재료비 |
| **GM UI** | Live Panel |

---

### 3.3.5 `marketDemandIndex` — 시장 수요

| 항목 | 내용 |
|------|------|
| **적용 Step** | SALES (primary), SETTLEMENT (clearing) |
| **계산** | `regionSaleLimit = baseLimit × (index/100) × regionFactor` |
| **엑셀** | 판매 가능량 G열 |
| **CEO UI** | Sales region row 수요 badge; Settlement 점유율 |
| **GM UI** | Live Panel; Ranking 점유율 |

---

### 3.3.6 `marketSupplyIndex` — 시장 공급

| 항목 | 내용 |
|------|------|
| **적용 Step** | MATERIAL (경쟁 입찰), SALES (가격 압력) |
| **계산** | `materialLimit × (index/100)`; price pressure on max sale price |
| **CEO UI** | Purchase 한도; Sales 가격 상한 hint |
| **GM UI** | Live Panel |

---

### 3.3.7 `logisticsCostMultiplier` — 물류비

| 항목 | 내용 |
|------|------|
| **적용 Step** | MATERIAL, SALES |
| **계산** | `matLogistics = qty × 5 × multiplier`; `prodLogistics = qty × 10 × multiplier` |
| **엑셀** | 5만/10만 |
| **CEO UI** | Purchase/Sales footer 물류비 |
| **GM UI** | Live Panel |

---

### 3.3.8 `tariffRate` — 관세

| 항목 | 내용 |
|------|------|
| **적용 Step** | MATERIAL (수입), SETTLEMENT (비용) |
| **계산** | `+tariffRate%` on import material cost |
| **CEO UI** | Purchase 수입 지역; Event/Event News |
| **GM UI** | Live Panel; Event Engine primary |

---

### 3.3.9 `corporateTaxRate` — 법인세

| 항목 | 내용 |
|------|------|
| **적용 Step** | SETTLEMENT only |
| **계산** | `tax = max(0, pretaxIncome) × (rate/100)` |
| **엑셀** | Sheet1 법인세 |
| **CEO UI** | Financial Statement P/L; Settlement |
| **GM UI** | Live Panel (advanced) |

---

### 3.3.10 `carbonTaxRate` — 탄소세

| 항목 | 내용 |
|------|------|
| **적용 Step** | PRODUCTION, SETTLEMENT |
| **계산** | `carbonTax = productionQty × emissionFactor × rate` (교육 단순화) |
| **CEO UI** | Production footer; P/L admin expense |
| **GM UI** | Live Panel; ESG Event |

---

### 3.3.11 `businessCycleIndex` — 경기지수

| 항목 | 내용 |
|------|------|
| **적용 Step** | ALL (composite multiplier) |
| **계산** | `composite = 0.4×demand + 0.3×supply + 0.3×rawMaterial` shortcut OR standalone |
| **CEO UI** | Dashboard environment chip |
| **GM UI** | Preset 침체/호황 → multi-var patch |

---

## 3.4 Step × Variable Matrix

| Variable | ① | ② | ③ | ④ | ⑤ | ⑥ | ⑦ |
|----------|---|---|---|---|---|---|---|
| interestRateLoan | ● | | | | | | ● |
| interestRateDeposit | ● | | | | | | ● |
| exchangeRate | ○ | | | ● | ○ | ● | ● |
| rawMaterialIndex | | | | ● | ● | | ● |
| marketDemandIndex | | | | | | ● | ● |
| marketSupplyIndex | | | | ● | | ● | |
| logisticsCostMultiplier | | | | ● | | ● | |
| tariffRate | | | | ● | | | ● |
| corporateTaxRate | | | | | | | ● |
| carbonTaxRate | | | | | ● | | ● |
| businessCycleIndex | ○ | ○ | ○ | ○ | ○ | ○ | ● |

● direct calc · ○ hint/display only

---

## 3.5 GM Patch Flow

```
GM PATCH /economy { diff }
  → validate bounds
  → EconomicState.update (version++)
  → AuditLog
  → recompute CEO hints (optional cache)
  → NewsArticle auto (template)
  → WS economyUpdated
```

**Mid-Step patch**: already-submitted decisions **not retroactive** unless GM `recalculate` (override, logged).

---

## 3.6 Snapshot

| Event | Action |
|-------|--------|
| `closePeriod` | `EconomicSnapshot.create(periodId, state)` |
| Statement | uses snapshot for tax/interest labels |

---

## 3.7 Presets

| Preset | Patch |
|--------|-------|
| 안정 | all default |
| 호황 | demand +10, supply +5, rawMat +3 |
| 침체 | demand −10, supply −5, loan +2%p |
| stagflation | demand −5, rawMat +15, logistics ×1.2 |

---

## 3.8 UI Display Map

| Surface | Variables shown |
|---------|-----------------|
| GM Desk Live Panel | all 11 |
| CEO Dashboard chip | demand, rawMat, exchange (top 3 deltas) |
| CEO Purchase | rawMat, exchange, tariff, logistics, supply |
| CEO Production | carbon, rawMat (COGS) |
| CEO Sales | demand, logistics |
| CEO Financial | tax, interest |
| CEO News | human-readable summary of last patch |

---

## 3.9 Data Model

```typescript
// Spec-only types
EconomicState {
  sessionId: string
  values: Record<EconomyKey, number>
  version: number
  updatedAt: datetime
  updatedBy: userId
}

EconomicSnapshot {
  sessionId, periodId, values, createdAt
}
```

---

## 3.10 Service Interface

```
EconomyEngine.get(sessionId): EconomicState
EconomyEngine.patch(sessionId, diff, actor): EconomicState
EconomyEngine.resolve(key, context: { step, regionId? }): number
EconomyEngine.snapshot(sessionId, periodId): EconomicSnapshot
```

Context used by Decision Engine — see `04-decision-engine-spec.md`
