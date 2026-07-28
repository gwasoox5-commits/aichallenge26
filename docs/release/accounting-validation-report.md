# Accounting Validation Report

> Run: 2026-07-28 · Command: `npm test -- tests/bsp/accounting-validation.test.ts tests/bsp/excel-regression-20.test.ts`

## Summary

| Suite | Tests | Result |
|-------|-------|--------|
| Accounting validation (B/S, TB, audit) | 4 | **PASS** |
| Excel regression (20 scenarios) | 22 | **PASS** |

**Tolerance:** Zero (만원 단위). Rounding rule: integer manwon throughout engine; no client-side recalculation on learner UI.

## Validation Layers

1. **Decision** → step handlers + `submitDecision`
2. **Journal** → debit = credit per entry (`accounting-engine.test.ts`)
3. **Ledger** → account balances
4. **Trial balance** → debit balance = credit balance
5. **Income statement** → revenue − COGS − opex − interest ± other − tax = net income
6. **Balance sheet** → **Assets = Liabilities + Equity** (hard validation in `closePeriod`)
7. **Cash** → operational cash flow vs ledger cash account
8. **KPI** → dashboard service from engine state
9. **Learner UI** → `FinancialStatementsPanel` reads API only
10. **Admin audit** → `/admin/accounting-audit`, `AccountingAuditPanel`

## Excel Scenarios (S01–S20)

All scenarios in `tests/bsp/excel-regression-20.test.ts` pass with **zero delta** on:

- Cash, inventory, equipment, accumulated depreciation
- Total assets, loans, total liabilities, equity, retained earnings
- Revenue, COGS, payroll, depreciation, interest, other income/expense, tax, net income
- KPI (ROE etc.)

Scenarios include: baseline, high loan/investment, no debt, overproduction, stockout, loss, high profit, raw material spike, rate spike, FX spike, demand drop, and multi-step edge cases.

## Multi-Period

`multi-period.test.ts` (24 tests) and `p9-rc-pilot.test.ts` E2E validate:

- Balance carry-forward across halves
- Settlement → next half → game end at period 6
- `maxPeriodIndex` support for shorter games (2/4/6 half-years)

## Artifacts

- Machine-readable summary: `docs/release/accounting-validation-artifact.json`
- Screenshot placeholders: `docs/release/screenshots/` (browser E2E manual)

## Release Blocker

**PASS** — No accounting equation failures in automated regression.
