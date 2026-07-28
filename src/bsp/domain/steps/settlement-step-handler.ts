import { STEP_TO_PHASE, type JournalEntryInput } from "../types";
import type { StepContext, StepValidationOutcome } from "../../application/ports/repositories";
import { StepNotImplementedError, type StepHandler } from "./step-handler";

/** SETTLEMENT is GM-triggered via GameEngine.closePeriod — not CEO POST */
export class SettlementStepHandler implements StepHandler {
  readonly step = "SETTLEMENT" as const;
  readonly phase = STEP_TO_PHASE.SETTLEMENT;
  readonly label = "반기 결산";

  validate(_context: StepContext): StepValidationOutcome {
    throw new StepNotImplementedError("SETTLEMENT");
  }

  buildJournal(_computed: unknown): JournalEntryInput {
    throw new StepNotImplementedError("SETTLEMENT");
  }
}

export const settlementStepHandler = new SettlementStepHandler();
