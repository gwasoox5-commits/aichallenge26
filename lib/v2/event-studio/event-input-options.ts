import { PERIOD_CALENDAR } from "@/src/bsp/domain/period/period-calendar";

/** Stored in EventStudioInput.expectedDuration — passed to AI prompt as-is. */
export const EVENT_DURATION_OPTIONS = [
  { value: "1반기", label: "1반기", hint: "이번 반기만" },
  { value: "1~2반기", label: "1~2반기", hint: "연속 2반기" },
  { value: "2~3반기", label: "2~3반기", hint: "연속 2반기" },
  { value: "3~4반기", label: "3~4반기", hint: "연속 2반기" },
  { value: "4~5반기", label: "4~5반기", hint: "연속 2반기" },
  { value: "5~6반기", label: "5~6반기", hint: "연속 2반기" },
  { value: "전체 (6반기)", label: "전체 게임", hint: "6반기 내내" },
] as const;

export function formatImpactPeriodValue(periodIndex: number): string {
  const p = PERIOD_CALENDAR.find((x) => x.periodIndex === periodIndex);
  if (!p) return `P${periodIndex}/6`;
  const code = `Y${p.year}H${p.half === "H1" ? "1" : "2"}`;
  return `${code} (P${p.periodIndex}/6)`;
}

/** Stored in EventStudioInput.targetHalfLabel — compatible with existing AI prompts. */
export const EVENT_IMPACT_PERIOD_OPTIONS = PERIOD_CALENDAR.map((p) => ({
  value: formatImpactPeriodValue(p.periodIndex),
  label: p.label,
  hint: `P${p.periodIndex}/6`,
}));

export function normalizeImpactPeriodValue(raw: string): string {
  const exact = EVENT_IMPACT_PERIOD_OPTIONS.find((o) => o.value === raw);
  if (exact) return exact.value;
  const byLabel = EVENT_IMPACT_PERIOD_OPTIONS.find((o) => o.label === raw);
  if (byLabel) return byLabel.value;
  const periodMatch = raw.match(/P(\d)\/6/i);
  if (periodMatch) return formatImpactPeriodValue(Number(periodMatch[1]));
  return raw;
}

export function normalizeDurationValue(raw: string): string {
  const exact = EVENT_DURATION_OPTIONS.find((o) => o.value === raw);
  if (exact) return exact.value;
  const byLabel = EVENT_DURATION_OPTIONS.find((o) => o.label === raw);
  if (byLabel) return byLabel.value;
  return raw;
}

export function impactPeriodLabelForPrompt(targetHalfLabel: string): string {
  const normalized = normalizeImpactPeriodValue(targetHalfLabel);
  const opt = EVENT_IMPACT_PERIOD_OPTIONS.find((o) => o.value === normalized);
  return opt ? `${opt.label} (${opt.hint})` : targetHalfLabel;
}

export function durationLabelForPrompt(expectedDuration: string): string {
  const normalized = normalizeDurationValue(expectedDuration);
  const opt = EVENT_DURATION_OPTIONS.find((o) => o.value === normalized);
  return opt ? `${opt.label} — ${opt.hint}` : expectedDuration;
}
