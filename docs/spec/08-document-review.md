# Cross-Document Review & Improvement Proposals

> Version **1.1** — All Decision Log **D-01 ~ D-15 APPLIED**  
> See `CHANGELOG-v1.1.md` for file list

---

## Executive Summary

| 영역 | Status |
|------|--------|
| 교육 흐름 충돌 (C-01~06) | ✅ Resolved via D-01, D-02, D-03, D-04, D-05, D-06 |
| 게임 규칙 충돌 (R-01~05) | ✅ Resolved via D-07, D-08, D-09, D-10, D-11 |
| 계산 규칙 충돌 (A-01~04) | ✅ Resolved via D-12, D-13, D-14, D-15 |
| UX (U-01~07) | ✅ Specified in UX v1.1 Appendix |
| GM (G-01~06) | ✅ Specified in Admin/UX v1.1 |

---

## Decision Log — Final Status

| ID | Decision | Status |
|----|----------|--------|
| D-01 | Step1 2-phase UI (연초→연중) | ✅ v1.1 |
| D-02 | 구조조정 year≥2 | ✅ v1.1 |
| D-03 | loanRepayment Step1; GM miscIncome Step7 | ✅ v1.1 |
| D-04 | recommendedPeriod + Y1H1 warning | ✅ v1.1 |
| D-05 | Ranking ≠ learning; delta + MVP | ✅ v1.1 |
| D-06 | Y2+ delta chips; Y3 H2 reflection | ✅ v1.1 |
| D-07 | regionRemaining GM edit | ✅ v1.1 |
| D-08 | V1 instant purchase | ✅ v1.1 |
| D-09 | releaseDeposit override 2% | ✅ v1.1 |
| D-10 | skip=zero; wait/zero/copy modal | ✅ v1.1 |
| D-11 | per-period FiscalSnapshot | ✅ v1.1 |
| D-12 | payroll settlement-only | ✅ v1.1 |
| D-13 | logistics expense; inventory ex-logistics | ✅ v1.1 |
| D-14 | Ranking P1~P2 operating only | ✅ v1.1 |
| D-15 | Event NORMAL default | ✅ v1.1 |

---

## 문서 간 정합성 매트릭스 (v1.1)

| Topic | PRD | Rule | Decision | Economy | State | UX | Learning | Library |
|-------|-----|------|----------|---------|-------|-----|----------|---------|
| 7 Step | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Step1 2-phase | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — |
| Payroll settlement | — | ✅ | ✅ | ✅ | — | — | — | — |
| Region GM | — | ✅ | — | — | — | ✅ | — | — |
| Ranking phased | — | ✅ | — | — | — | ✅ | ✅ | — |
| recommendedPeriod | — | ✅ | — | — | — | — | ✅ | ✅ |
| Logistics D-13 | — | ✅ | ✅ | — | — | — | — | — |

---

## Next Gate

- [x] Spec v1.1 complete (D-01 ~ D-15)
- [x] Vision v2 (Doc 09)
- [ ] Vision v2 approval
- [ ] JSON Specification

---

## Historical Notes (v1.0 review — superseded)

Original conflict analysis (C-01 through G-06) preserved in git history.  
All P0/P1/P2 decisions from that review are now **merged into v1.1** unless explicitly deferred to V2 in `09-future-experience-design.md` (e.g. bid workflow = V2).
