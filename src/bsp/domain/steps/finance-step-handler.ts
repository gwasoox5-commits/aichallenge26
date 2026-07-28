import type { LoanPayload } from "../types";
import { NEXT_STEP_PHASE, STEP_TO_PHASE } from "../types";
import type { StepContext, StepValidationOutcome } from "../../application/ports/repositories";
import { AccountingEngine } from "../accounting/accounting-engine";
import {
  applyLoanToState,
  validateLoan,
} from "../validation/step-validators";
import { localizeValidationResult } from "../validation/messages-ko";
import type { StepHandler } from "./step-handler";

const accounting = new AccountingEngine();

export class FinanceStepHandler implements StepHandler {
  readonly step = "LOAN" as const;
  readonly phase = STEP_TO_PHASE.LOAN;
  readonly label = "자금 조달";

  validate(context: StepContext): StepValidationOutcome {
    const payload = context.payload as LoanPayload;
    const { validation, computed } = validateLoan(payload, context.company.operational);
    const localized = { ...validation, rules: localizeValidationResult(validation.rules) };
    return {
      validation: localized,
      computed,
      journalInput: accounting.buildLoanJournal(computed),
      nextOperational: applyLoanToState(context.company.operational, computed),
      nextStepPhase: NEXT_STEP_PHASE[this.phase],
    };
  }

  buildJournal(computed: unknown) {
    return accounting.buildLoanJournal(computed as Parameters<AccountingEngine["buildLoanJournal"]>[0]);
  }
}

export const financeStepHandler = new FinanceStepHandler();
