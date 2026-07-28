# Excel Parity — 6 Half-Year Evidence

> **Sprint**: P9 Release Candidate  
> **Date**: 2026-07-27  
> **Source of truth**: `(게임용)회계기초과정 원장` · `docs/spec/01-game-rule-book.md`

---

## 1. Summary

| Metric | Result | Classification |
|--------|--------|----------------|
| Single-half scenarios (S01–S20) | **20/20 PASS** (zero tolerance) | ✅ Pass |
| 6-period carry-forward E2E | **PASS** (3 teams, H1=S01, H2–H6=minimal) | ⚠️ Conditional |
| 20 scenarios × 6 periods each | **Not run** | Post-GA / P10 |
| **G1 gate (Excel 100%)** | **CONDITIONAL PASS** | See §4 |

---

## 2. Single-Half Regression (20/20)

Automated in `tests/bsp/excel-regression-20.test.ts`. Each scenario runs Step 1→7 + settlement and compares cash, inventory, capacity, revenue, net income, journal count, ROE against Rule Book formulas.

| ID | Scenario | Pass | Notes |
|----|----------|------|-------|
| S01 | Baseline Demo (2A+2B) | ✅ | Golden path; used as P9 pilot H1 |
| S02 | No external funding | ✅ | |
| S03 | Max early loan (10×1000) | ✅ | L01 boundary |
| S04 | Loan with repayment | ✅ | D-03 repayment journal |
| S05 | Small machine only | ✅ | G29 Small capacity |
| S06 | Zero production | ✅ | |
| S07 | Europe expensive material | ✅ | Regional pricing |
| S08 | Minimal hiring | ✅ | |
| S09 | High deposit | ✅ | |
| S10 | Mid-year loan | ✅ | 1B phase |
| S11 | Africa low cost | ✅ | |
| S12 | Oceania region | ✅ | |
| S13 | North America | ✅ | |
| S14 | South America | ✅ | |
| S15 | Max price ASIA | ✅ | S01 price cap |
| S16 | Two land plots | ✅ | G28 |
| S17 | Partial sales | ✅ | |
| S18 | Large team capacity | ✅ | Hiring capacity |
| S19 | Misc income at settlement | ✅ | GM miscIncome |
| S20 | Single unit minimal | ✅ | |

**Evidence**: `npm test` — `excel-regression-20.test.ts` (also re-run via `p9-rc-pilot.test.ts` import).

---

## 3. Six-Period E2E Parity

### 3.1 Test coverage

| Test file | What it proves |
|-----------|----------------|
| `multi-period.test.ts` | 1 team · 6 periods · carry-forward · `gameEnd` |
| `p9-rc-pilot.test.ts` | **3 teams join** · event + economy patch · 6 periods · audit · `gameEnd` |
| `p4-event-engine.test.ts` | Events through 6 halves |
| `p6-realtime.test.ts` | Scenario 8: 6 halves + `GAME_END` broadcast |

### 3.2 Period-by-period design (P9 pilot)

| Period | Scenario | Excel fields verified |
|--------|----------|----------------------|
| H1 (P1) | **S01 Baseline Demo** | Full Step 1–7 + settlement parity |
| H2 (P2) | MINIMAL (zero capex/prod/sales) | Carry-forward: cash, equity, assets |
| H3 (P3) | MINIMAL | State continuity |
| H4 (P4) | MINIMAL | State continuity |
| H5 (P5) | MINIMAL | State continuity |
| H6 (P6) | MINIMAL | Final settlement → `FINISHED` |

### 3.3 Carry-forward assertions (P9 pilot)

After H1 → H2 `startNextHalf`:

- `cashManwon` equals post-H1 settlement cash
- `settlementComplete` resets to `false`
- `completedSteps` empty for new half
- All 3 teams complete SALES each period

After H6 `gameEnd`:

- `sessionPhase` = `FINISHED`
- `stepPhase` = `GAME_END`
- All teams `settlementComplete` = `true`

---

## 4. G1 Honest Assessment

| G1 requirement (Doc 10 §3) | Status | Gap |
|----------------------------|--------|-----|
| 7 Step · P/L · B/S | ✅ 20/20 single-half | — |
| 3년 6반기 engine | ✅ E2E pass | H2–H6 use minimal decisions, not full Excel workbook paths |
| GM 경제·이벤트 | ✅ P4/P5/P9 pilot | 18 MVP events (53 catalog deferred) |
| **100% Excel retired** | ⚠️ **Conditional** | Instructor may still reference Rule Book PDF; no spreadsheet **required** for GM |

**Classification**: **Conditional** — engine parity proven for representative + carry-forward paths; full **20×6** matrix not executed.

---

## 5. Comparison Table (Key S01 Fields — H1)

From `runExcelScenario(S01)` (P9 pilot reference test):

| Field | Expected (Rule Book) | Engine | Delta |
|-------|---------------------|--------|-------|
| cash | computed | match | 0 |
| inventoryUnits | computed | match | 0 |
| productionQty | computed | match | 0 |
| salesQty | computed | match | 0 |
| revenue | computed | match | 0 |
| netIncome | computed | match | 0 |
| journalCount | computed | match | 0 |
| roe | computed | match | 0 |

`result.deltas.length === 0` — **100% match** for golden scenario.

---

## 6. Commands

```bash
npx vitest run tests/bsp/excel-regression-20.test.ts
npx vitest run tests/bsp/multi-period.test.ts
npx vitest run tests/bsp/p9-rc-pilot.test.ts
```

---

*Part of Sprint 3 P9 deliverable. Next: Post-GA 20×6 matrix or classroom golden-run sign-off.*
