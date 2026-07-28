import type { MaterialPayload } from "../types";
import { NEXT_STEP_PHASE, STEP_TO_PHASE } from "../types";
import type { StepContext, StepValidationOutcome } from "../../application/ports/repositories";
import { AccountingEngine } from "../accounting/accounting-engine";
import {
  applyMaterialToState,
  validateMaterial,
} from "../validation/step-validators";
import { localizeValidationResult } from "../validation/messages-ko";
import type { StepHandler } from "./step-handler";

const accounting = new AccountingEngine();

export class MaterialStepHandler implements StepHandler {
  readonly step = "MATERIAL" as const;
  readonly phase = STEP_TO_PHASE.MATERIAL;
  readonly label = "원재료 구매";

  validate(context: StepContext): StepValidationOutcome {
    const payload = context.payload as MaterialPayload;
    const { validation, computed } = validateMaterial(
      payload,
      context.company.operational,
      context.session.economy
    );
    const localized = { ...validation, rules: localizeValidationResult(validation.rules) };
    return {
      validation: localized,
      computed,
      journalInput: accounting.buildMaterialJournal(computed),
      nextOperational: applyMaterialToState(context.company.operational, computed),
      nextStepPhase: NEXT_STEP_PHASE[this.phase],
    };
  }

  buildJournal(computed: unknown) {
    return accounting.buildMaterialJournal(computed as Parameters<AccountingEngine["buildMaterialJournal"]>[0]);
  }
}

export const materialStepHandler = new MaterialStepHandler();
