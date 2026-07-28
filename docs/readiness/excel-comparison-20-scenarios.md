# Excel 완전 비교 검증 — 20 시나리오

> **기준**: Game Rule Book v1.1 = Excel Source of Truth  
> **방법**: Domain compute chain(독립 경로) vs GameEngine(Accounting Engine 경유) — **허용 오차 0**  
> **실행**: `tests/bsp/excel-regression-20.test.ts` — **22/22 PASS** (20 시나리오 + 강의 시뮬 + 성능)

---

## 검증 범위

| 항목 | 검증 방식 |
|------|-----------|
| 현금 | `cash(pre-settle)` compute vs Dashboard · `cash(post-settle)` Dashboard vs B/S |
| 재고 | `inventoryUnits` compute vs Dashboard |
| 생산량 | `productionQty` input vs `halfYearProductionQty` |
| 판매량 | `sales.qty` input vs `halfYearSalesQty` |
| Capacity | purchase/production/sales capacity compute vs Dashboard |
| Journal | Step 1~6 POST + Settlement journals 생성 (E2E) |
| 손익계산서 | `revenue` compute vs P/L |
| 재무상태표 | post-settle cash Dashboard = B/S cash |
| Dashboard KPI | ROE/ROA/부채비율 settlement 후 계산 |

---

## 20 시나리오 비교 결과표

| ID | 시나리오 | Step1~7 | 현금 Δ | 재고 Δ | 생산 Δ | 판매 Δ | Capacity Δ | 매출 Δ | Journal | P/L·B/S | 결과 |
|----|----------|---------|--------|--------|--------|--------|------------|--------|---------|---------|------|
| S01 | Baseline Demo (2A+2B) | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S02 | No external funding | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S03 | Max early loan (10×1000) | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S04 | Loan with repayment | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S05 | Small machine only | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S06 | Zero production | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S07 | Europe expensive material | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S08 | Minimal hiring | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S09 | High deposit | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S10 | Mid-year loan | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S11 | Africa low cost | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S12 | Oceania region | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S13 | North America | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S14 | South America | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S15 | Max price ASIA (150) | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S16 | Two land plots | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S17 | Partial sales | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S18 | Large team capacity | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S19 | Misc income settlement | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |
| S20 | Single unit minimal | ✅ | 0 | 0 | 0 | 0 | 0 | 0 | ✅ | ✅ | **PASS** |

**Excel parity (1반기 Step 1~7): 20/20 = 100%**

---

## S01 Baseline 수치 (Excel Demo 동일)

| 단계 | 현금(만원) | 비고 |
|------|-----------|------|
| Step4 후 | 6,380 | ASIA 60 units |
| Step5 후 | 6,300 | 생산 3, 기계가동비 80 |
| Step6 후 | 6,570 | 판매 3@100, 물류 30 |
| 결산 후 | (이자·세금 반영) | Journal Lock |

| 항목 | 값 |
|------|-----|
| 생산량 | 3 (BOM 4:1, 60 units → max 3) |
| 판매량 | 3 |
| 매출 | 300 |
| 원재료 잔존 | 144 (12 units × 4 types) |
| Capacity (구/생/영) | 60 / 30 / 20 |

---

## 한계 (Readiness 관점)

| 항목 | 상태 |
|------|------|
| 실제 `.xlsx` 파일 자동 대조 | ❌ Rule Book 공식으로 대체 (동일 Source of Truth) |
| 2~6반기 시나리오 | ❌ 런타임 미구현 — 1반기만 검증 |
| Economy preset 변경 후 parity | ⚠️ 미검증 (baseline economy only) |
| 7지역 동시 판매 복합 시나리오 | ⚠️ 단일 지역 위주 (S07~S14는 지역별 단독) |

---

## 결론

**1반기 · 7 Step · Rule Book 공식 기준 Excel parity 100%** 달성.  
3년 6반기 전체 Excel parity는 **다음 Sprint(다기간 엔진) 선행 필요**.
