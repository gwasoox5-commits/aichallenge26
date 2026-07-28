import type { BspGameStep, BspStepPhase, JournalEntryInput } from "../types";
import type { StepContext, StepValidationOutcome } from "../../application/ports/repositories";

export interface StepHandler {
  readonly step: BspGameStep;
  readonly phase: BspStepPhase;
  readonly label: string;
  validate(context: StepContext): StepValidationOutcome;
  buildJournal(computed: unknown): JournalEntryInput;
}

export class StepNotImplementedError extends Error {
  constructor(step: BspGameStep) {
    super(`Step ${step} is not implemented yet (Sprint 2+)`);
    this.name = "StepNotImplementedError";
  }
}

export function createStubHandler(step: BspGameStep, phase: BspStepPhase, label: string): StepHandler {
  return {
    step,
    phase,
    label,
    validate() {
      throw new StepNotImplementedError(step);
    },
    buildJournal() {
      throw new StepNotImplementedError(step);
    },
  };
}
