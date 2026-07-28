import type { ProductionPayload } from "../types";
import { NEXT_STEP_PHASE, STEP_TO_PHASE } from "../types";
import type { StepContext, StepValidationOutcome } from "../../application/ports/repositories";
import { AccountingEngine } from "../accounting/accounting-engine";
import { applyProductionToState, validateProduction } from "../validation/step-validators";
import { localizeValidationResult } from "../validation/messages-ko";
import type { StepHandler } from "./step-handler";

const accounting = new AccountingEngine();

export class ProductionStepHandler implements StepHandler {
  readonly step = "PRODUCTION" as const;
  readonly phase = STEP_TO_PHASE.PRODUCTION;
  readonly label = "생산";

  validate(context: StepContext): StepValidationOutcome {
    const payload = context.payload as ProductionPayload;
    const { validation, computed } = validateProduction(
      payload,
      context.company.operational,
      context.session.economy
    );
    const localized = { ...validation, rules: localizeValidationResult(validation.rules) };
    return {
      validation: localized,
      computed,
      journalInput: accounting.buildProductionJournal(computed),
      nextOperational: applyProductionToState(context.company.operational, payload, computed),
      nextStepPhase: NEXT_STEP_PHASE[this.phase],
    };
  }

  buildJournal(computed: unknown) {
    return accounting.buildProductionJournal(computed as Parameters<AccountingEngine["buildProductionJournal"]>[0]);
  }
}

export const productionStepHandler = new ProductionStepHandler();
