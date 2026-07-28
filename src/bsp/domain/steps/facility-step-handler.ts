import type { FacilityPayload } from "../types";
import { NEXT_STEP_PHASE, STEP_TO_PHASE } from "../types";
import type { StepContext, StepValidationOutcome } from "../../application/ports/repositories";
import { AccountingEngine } from "../accounting/accounting-engine";
import {
  applyFacilityToState,
  validateFacility,
} from "../validation/step-validators";
import { localizeValidationResult } from "../validation/messages-ko";
import type { StepHandler } from "./step-handler";

const accounting = new AccountingEngine();

export class FacilityStepHandler implements StepHandler {
  readonly step = "FACILITY" as const;
  readonly phase = STEP_TO_PHASE.FACILITY;
  readonly label = "설비 투자";

  validate(context: StepContext): StepValidationOutcome {
    const payload = context.payload as FacilityPayload;
    const { validation, computed } = validateFacility(payload, context.company.operational);
    const localized = { ...validation, rules: localizeValidationResult(validation.rules) };
    return {
      validation: localized,
      computed,
      journalInput: accounting.buildFacilityJournal(computed),
      nextOperational: applyFacilityToState(context.company.operational, payload, computed),
      nextStepPhase: NEXT_STEP_PHASE[this.phase],
    };
  }

  buildJournal(computed: unknown) {
    return accounting.buildFacilityJournal(computed as Parameters<AccountingEngine["buildFacilityJournal"]>[0]);
  }
}

export const facilityStepHandler = new FacilityStepHandler();
