import { TOTAL_PERIODS } from "@/src/bsp/domain/period/period-calendar";
import type { SessionWizardMeta } from "@/src/bsp/application/ports/repositories";

export interface CreateSessionOptions {
  stepDurationSec?: number;
  maxPeriodIndex?: number;
  economyPresetId?: string;
  wizardMeta?: SessionWizardMeta;
  maxTeams?: number;
  teamNames?: string[];
}

export const MAX_TEAMS_LIMIT = 20;

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

export function normalizeMaxTeams(value?: number): number | undefined {
  if (!value || !Number.isFinite(value) || value < 1) return undefined;
  return Math.min(Math.floor(value), MAX_TEAMS_LIMIT);
}

/** Team capacity for a session, or undefined when uncapped (demo/legacy sessions). */
export function getSessionMaxTeams(session: { wizardMeta?: SessionWizardMeta | null }): number | undefined {
  const meta = session.wizardMeta;
  if (!meta) return undefined;
  return normalizeMaxTeams(meta.maxTeams ?? meta.expectedTeams);
}
