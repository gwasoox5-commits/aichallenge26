import type { HiringPayload } from "../types";
import { NEXT_STEP_PHASE, STEP_TO_PHASE } from "../types";
import type { StepContext, StepValidationOutcome } from "../../application/ports/repositories";
import { AccountingEngine } from "../accounting/accounting-engine";
import {
  applyHiringToState,
  validateHiring,
} from "../validation/step-validators";
import { localizeValidationResult } from "../validation/messages-ko";
import { parseYearFromPeriodLabel } from "../period/display-labels";
import type { StepHandler } from "./step-handler";

const accounting = new AccountingEngine();

export class HRStepHandler implements StepHandler {
  readonly step = "HIRING" as const;
  readonly phase = STEP_TO_PHASE.HIRING;
  readonly label = "인력 채용";

  validate(context: StepContext): StepValidationOutcome {
    const payload = context.payload as HiringPayload;
    const periodYear = context.session.year ?? parseYearFromPeriodLabel(context.session.periodLabel);
    const currentHeads = {
      headPurchase: context.company.operational.headPurchase,
      headProduction: context.company.operational.headProduction,
      headSales: context.company.operational.headSales,
    };
    const { validation, computed } = validateHiring(payload, periodYear, currentHeads);
    const localized = { ...validation, rules: localizeValidationResult(validation.rules) };
    return {
      validation: localized,
      computed,
      journalInput: accounting.buildHiringJournal(),
      nextOperational: applyHiringToState(context.company.operational, computed),
      nextStepPhase: NEXT_STEP_PHASE[this.phase],
    };
  }

  buildJournal() {
    return accounting.buildHiringJournal();
  }
}

export const hrStepHandler = new HRStepHandler();
