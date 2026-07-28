import type { SalesPayload } from "../types";
import { NEXT_STEP_PHASE, STEP_TO_PHASE } from "../types";
import type { StepContext, StepValidationOutcome } from "../../application/ports/repositories";
import { AccountingEngine } from "../accounting/accounting-engine";
import { applySalesToState, validateSales } from "../validation/step-validators";
import { localizeValidationResult } from "../validation/messages-ko";
import type { StepHandler } from "./step-handler";

const accounting = new AccountingEngine();

export class SalesStepHandler implements StepHandler {
  readonly step = "SALES" as const;
  readonly phase = STEP_TO_PHASE.SALES;
  readonly label = "판매";

  validate(context: StepContext): StepValidationOutcome {
    const payload = context.payload as SalesPayload;
    const { validation, computed } = validateSales(
      payload,
      context.company.operational,
      context.session.economy
    );
    const localized = { ...validation, rules: localizeValidationResult(validation.rules) };
    return {
      validation: localized,
      computed,
      journalInput: accounting.buildSalesJournal(computed),
      nextOperational: applySalesToState(context.company.operational, computed),
      nextStepPhase: NEXT_STEP_PHASE[this.phase],
    };
  }

  buildJournal(computed: unknown) {
    return accounting.buildSalesJournal(computed as Parameters<AccountingEngine["buildSalesJournal"]>[0]);
  }
}

export const salesStepHandler = new SalesStepHandler();
