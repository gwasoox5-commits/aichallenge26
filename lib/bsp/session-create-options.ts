import { TOTAL_PERIODS } from "@/src/bsp/domain/period/period-calendar";
import type { SessionWizardMeta } from "@/src/bsp/application/ports/repositories";

export interface CreateSessionOptions {
  stepDurationSec?: number;
  maxPeriodIndex?: number;
  economyPresetId?: string;
  wizardMeta?: SessionWizardMeta;
  teamNames?: string[];
}

const WIZARD_PRESET_MAP: Record<string, string | undefined> = {
  default: undefined,
  "high-rate": "PRESET_HIGH_INTEREST",
  "weak-demand": "PRESET_GLOBAL_RECESSION",
  PRESET_HIGH_INTEREST: "PRESET_HIGH_INTEREST",
  PRESET_GLOBAL_RECESSION: "PRESET_GLOBAL_RECESSION",
  PRESET_LOW_INTEREST: "PRESET_LOW_INTEREST",
};

export function mapWizardPresetId(wizardValue: string): string | undefined {
  return WIZARD_PRESET_MAP[wizardValue] ?? (wizardValue.startsWith("PRESET_") ? wizardValue : undefined);
}

export function normalizeMaxPeriodIndex(periods?: number): number {
  if (!periods || periods < 1) return TOTAL_PERIODS;
  return Math.min(Math.max(1, periods), TOTAL_PERIODS);
}

export function normalizeStepDurationSec(value?: number): number {
  if (!value || value < 60) return 900;
  return Math.min(value, 7200);
}
