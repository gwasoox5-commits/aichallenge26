# Rule Conflict Report — V1 Readiness Review

> Sprint 2B Readiness Audit · 2026-07-26  
> 비교 대상: Rule Book v1.1 · JSON Spec · Engine Spec · 실제 코드

---

## 요약

| 영역 | 일치율 | 심각도 |
|------|--------|--------|
| Accounting Engine (Step 1~7 Journal) | **95%** | Medium |
| Decision / Validation (L/F/H/M/P/S) | **85%** | Medium |
| Economy Engine | **70%** | High |
| Event Engine | **10%** | Blocker |
| Gate Rules (G01~G07) | **71%** (5/7) | High |
| Game State (3yr/6 half) | **20%** | Blocker |

---

## RC-01 · Event Engine 미구현 [BLOCKER]

| 항목 | Spec | Code |
|------|------|------|
| Event Fire | `docs/spec/02-event-engine-spec.md` — NL/Template → approve → fire | Domain event log only (`event-store-service.ts`) |
| Scenario Library | 53 events in `07-scenario-library.md` | Not wired |
| D-04 recommendedPeriod | Y1H1 severity warning | Not implemented |
| D-15 NORMAL default | Event fire mode | N/A |

**제안**: Sprint 3 P0 — Event Engine MVP (preset fire + economy patch)

---

## RC-02 · 3년 6반기 미구현 [BLOCKER for full V1]

| 항목 | Spec | Code |
|------|------|------|
| Period P1~P6 | Rule Book §1.4 | Only `Year 1 H1` created |
| `closePeriod` → next half | State machine §HALF_YEAR_END → Step1 | Settlement only, no period advance |
| Carry-forward | Cash/inventory/equipment roll | Single half reset N/A |
| D-02 구조조정 | Year≥2 Step3 | H02/H03 stub always pass |

**제안**: Sprint 3 — `startNextHalf()`, period selector, operational carry-forward

---

## RC-03 · Gate G03 PAUSED 미구현 [HIGH]

| Spec | Code |
|------|------|
| `ERR_SESSION_PAUSED` when `sessionPhase === PAUSED` | All non-RUNNING → G01 `ERR_SESSION_NOT_RUNNING` |
| GM Pause/Resume API | No API, no UI |

**제안**: `gmPauseSession()` / `gmResumeSession()` + G03 distinct error

---

## RC-04 · Gate G04 JWT Scope 미구현 [HIGH / SECURITY]

| Spec | Code |
|------|------|
| CEO token scoped to `companyId` | Any caller with UUID can read/write |
| `ERR_FORBIDDEN_COMPANY` | Not implemented |

**제안**: Auth middleware + company claim validation on all `/play/companies/{id}/*`

---

## RC-05 · Join Code Entropy [HIGH / SECURITY]

| Spec (NFR-S07) | Code |
|----------------|------|
| ≥ 128-bit entropy | 6 chars × 32 alphabet ≈ **30 bits** |

**제안**: 12+ char code or UUID-based join token

---

## RC-06 · Validation Stubs [MEDIUM]

| Rule | Spec | Code |
|------|------|------|
| L05 | 천만원 단위 검증 | Always `pass` |
| H02 | 구조조정 전환 | Stub "deferred year 2+" |
| H03 | 퇴사 인원 | Stub |
| M05 | 브랜치 개설 조건 | Always `pass` |

**영향**: Year 1 교육에는 영향 적음. Year 2+ 또는 엄격 Excel parity 시 수정 필요.

---

## RC-07 · Step1 2-Phase UI (D-01) [MEDIUM / UX]

| Spec | Code |
|------|------|
| Phase 1A (loanEarly, deposit) → 1B (loanMid, repayment) wizard | Single form, one POST |
| GM advance once after Step1 complete | GM advance after each team submit (same) |

**영향**: 기능 동일, UX 차이. Excel parity 숫자에는 영향 없음.

---

## RC-08 · P/L Expense Aggregation [MEDIUM]

| Spec | Code |
|------|------|
| Sheet1 COGS/SGA full breakdown in operating income | When `cogsFromLedger > 0`, machine op / logistics material not subtracted in `operatingIncome` calc |
| Post-settlement | Revenue/income accounts use credit-normal read (fixed in 2B) |

**제안**: Align `operatingIncome = revenue - all expense accounts` with Excel Sheet1 row structure

---

## RC-09 · Prisma Schema Gap [HIGH if PostgreSQL]

| Spec | Code |
|------|------|
| Full `CompanyOperationalState` (~30 fields) | Prisma `BspCompanyOperational` ~10 fields |
| Tests | All CI on memory repos |

**제안**: JSON column for operational state or schema migration before DB production

---

## RC-10 · D-09 releaseDeposit [LOW]

| Spec | Code |
|------|------|
| GM `releaseDeposit` with 2% penalty | Not found in `src/` |

---

## RC-11 · Region Code Naming [LOW]

| Spec Scenario Library | Code |
|-----------------------|------|
| `EU`, `NA`, `SA` | `EUROPE`, `NORTH_AMERICA`, `SOUTH_AMERICA` |

**영향**: API/UI only; internal catalog consistent.

---

## 일치 확인됨 (No Conflict)

- BOM 4:1, Capacity formulas (구30/생10/영10 per head)
- Machine op cost Big 80 / Small 40
- Sales logistics 10/unit, Material logistics 5/unit
- D-12 payroll Settlement accrual
- D-13 inventory = material cost only in FG
- Settlement: depreciation 5%/half, interest half-year fraction
- Corporate tax 22% on positive pretax
- Journal Lock after settlement
- G07 CEO cannot POST settlement
- G05 duplicate step block
- G06 optimistic lock

---

## Rule 일치율 산출

```
Implemented & aligned:  42 rules/behaviors
Partial/stub:           8
Missing:               12 (Event, multi-period, auth, pause)
─────────────────────
Rule match rate: ~74% (full V1 spec)
Rule match rate: ~95% (single half-year scope)
```
