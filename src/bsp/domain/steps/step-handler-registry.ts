import type { BspGameStep } from "../types";
import { STEP_TO_PHASE } from "../types";
import type { StepHandler } from "./step-handler";
import { financeStepHandler } from "./finance-step-handler";
import { facilityStepHandler } from "./facility-step-handler";
import { hrStepHandler } from "./hr-step-handler";
import { materialStepHandler } from "./material-step-handler";
import { productionStepHandler } from "./production-step-handler";
import { salesStepHandler } from "./sales-step-handler";
import { settlementStepHandler } from "./settlement-step-handler";

export class StepHandlerRegistry {
  private readonly handlers = new Map<BspGameStep, StepHandler>();

  constructor(handlers: StepHandler[] = defaultHandlers()) {
    for (const h of handlers) {
      this.handlers.set(h.step, h);
    }
  }

  get(step: BspGameStep): StepHandler {
    const handler = this.handlers.get(step);
    if (!handler) throw new Error(`No handler registered for step: ${step}`);
    return handler;
  }

  getByPhase(phase: string): StepHandler | undefined {
    for (const h of this.handlers.values()) {
      if (h.phase === phase) return h;
    }
    return undefined;
  }

  list(): StepHandler[] {
    return [...this.handlers.values()];
  }
}

function defaultHandlers(): StepHandler[] {
  return [
    financeStepHandler,
    facilityStepHandler,
    hrStepHandler,
    materialStepHandler,
    productionStepHandler,
    salesStepHandler,
    settlementStepHandler,
  ];
}

export const stepHandlerRegistry = new StepHandlerRegistry();
