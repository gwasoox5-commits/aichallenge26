export type BspHalf = "H1" | "H2";

export const TOTAL_PERIODS = 6;

export interface PeriodDescriptor {
  periodIndex: number;
  year: number;
  half: BspHalf;
  label: string;
}

export const PERIOD_CALENDAR: PeriodDescriptor[] = [
  { periodIndex: 1, year: 1, half: "H1", label: "Year 1 H1" },
  { periodIndex: 2, year: 1, half: "H2", label: "Year 1 H2" },
  { periodIndex: 3, year: 2, half: "H1", label: "Year 2 H1" },
  { periodIndex: 4, year: 2, half: "H2", label: "Year 2 H2" },
  { periodIndex: 5, year: 3, half: "H1", label: "Year 3 H1" },
  { periodIndex: 6, year: 3, half: "H2", label: "Year 3 H2" },
];

export function getPeriodDescriptor(periodIndex: number): PeriodDescriptor {
  const found = PERIOD_CALENDAR.find((p) => p.periodIndex === periodIndex);
  if (!found) throw new Error(`Invalid periodIndex: ${periodIndex}`);
  return found;
}

export function getNextPeriod(periodIndex: number): PeriodDescriptor | null {
  if (periodIndex >= TOTAL_PERIODS) return null;
  return getPeriodDescriptor(periodIndex + 1);
}

export function isFinalPeriod(periodIndex: number): boolean {
  return periodIndex >= TOTAL_PERIODS;
}

export function getSessionMaxPeriodIndex(session: { maxPeriodIndex?: number }): number {
  const max = session.maxPeriodIndex ?? TOTAL_PERIODS;
  return Math.min(Math.max(1, max), TOTAL_PERIODS);
}

export function isSessionFinalPeriod(session: { periodIndex: number; maxPeriodIndex?: number }): boolean {
  return session.periodIndex >= getSessionMaxPeriodIndex(session);
}
