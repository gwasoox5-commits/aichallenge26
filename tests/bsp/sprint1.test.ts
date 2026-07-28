import { describe, expect, it, beforeEach } from "vitest";
import {
  applyFacilityToState,
  applyLoanToState,
  createInitialOperationalState,
  validateFacility,
  validateLoan,
} from "@/src/bsp/domain/validation/step-validators";
import { buildFacilityJournal, buildLoanJournal } from "@/src/bsp/domain/accounting/journal-builders";

describe("Step 1 LOAN validation", () => {
  it("passes default sprint scenario loanEarly=2 deposit=1", () => {
    const state = createInitialOperationalState();
    const { validation, computed } = validateLoan(
      { loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 },
      state
    );
    expect(validation.ok).toBe(true);
    expect(computed.cashAfterManwon).toBe(11000);
  });

  it("fails L01 when loan exceeds equity", () => {
    const state = createInitialOperationalState();
    const { validation } = validateLoan({ loanEarly: 11, loanMid: 0, deposit: 0, loanRepayment: 0 }, state);
    expect(validation.ok).toBe(false);
    expect(validation.rules.some((r) => r.ruleId === "L01" && !r.passed)).toBe(true);
  });
});

describe("Step 2 FACILITY validation", () => {
  it("passes land=1 big=1 after step1", () => {
    let state = createInitialOperationalState();
    state = applyLoanToState(state, validateLoan({ loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 }, state).computed);
    const { validation, computed } = validateFacility(
      { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
      state
    );
    expect(validation.ok).toBe(true);
    expect(computed.totalCapexManwon).toBe(3600);
  });
});

describe("Journal builders", () => {
  it("creates balanced loan journal", () => {
    const { computed } = validateLoan({ loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 }, createInitialOperationalState());
    const journal = buildLoanJournal(computed);
    const debits = journal.lines.reduce((s, l) => s + l.debitManwon, 0);
    const credits = journal.lines.reduce((s, l) => s + l.creditManwon, 0);
    expect(debits).toBe(credits);
  });

  it("creates balanced facility journal", () => {
    let state = createInitialOperationalState();
    state = applyLoanToState(state, validateLoan({ loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 }, state).computed);
    const { computed } = validateFacility({ landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 }, state);
    const journal = buildFacilityJournal(computed);
    expect(journal.lines.reduce((s, l) => s + l.debitManwon, 0)).toBe(3600);
  });
});

describe("E2E domain flow", () => {
  it("step1 → step2 updates operational state", () => {
    let state = createInitialOperationalState();
    state = applyLoanToState(state, validateLoan({ loanEarly: 2, loanMid: 0, deposit: 1, loanRepayment: 0 }, state).computed);
    state = applyFacilityToState(
      state,
      { landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 },
      validateFacility({ landPlotsPurchased: 1, machineBigPurchased: 1, machineSmallPurchased: 0 }, state).computed
    );
    expect(state.cashManwon).toBe(7400);
    expect(state.capacityMachine).toBe(30);
  });
});
