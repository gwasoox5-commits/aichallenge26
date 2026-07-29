import type { BspGameStep, BspStepPhase } from "../types";

/** Canonical Korean period label: "1년차 전반기" */
export function formatPeriodParts(year: number, half: "H1" | "H2" | string): string {
  const halfKo = half === "H2" || half === "후반기" ? "후반기" : "전반기";
  return `${year}년차 ${halfKo}`;
}

/**
 * Display helper for stored period labels.
 * Accepts legacy English ("Year 1 H1", "Y1H1") and Korean ("1년차 전반기").
 */
export function formatPeriodLabel(label: string | null | undefined): string {
  if (!label) return "—";
  if (/년차/.test(label)) return label;

  const yearHalf = label.match(/Year\s*(\d+)\s*H([12])/i);
  if (yearHalf) {
    return formatPeriodParts(Number(yearHalf[1]), yearHalf[2] === "2" ? "H2" : "H1");
  }

  const compact = label.match(/Y(\d+)\s*H([12])/i);
  if (compact) {
    return formatPeriodParts(Number(compact[1]), compact[2] === "2" ? "H2" : "H1");
  }

  return label;
}

export const STEP_PHASE_LABELS: Record<string, string> = {
  STEP1_FINANCE: "1단계 · 자금조달",
  STEP2_INVESTMENT: "2단계 · 설비투자",
  STEP3_HR: "3단계 · 인력채용",
  STEP4_PURCHASE: "4단계 · 원재료구매",
  STEP5_PRODUCTION: "5단계 · 생산",
  STEP6_SALES: "6단계 · 판매",
  STEP7_SETTLEMENT: "7단계 · 결산",
  HALF_YEAR_END: "반기 마감",
  GAME_END: "게임 종료",
};

export const GAME_STEP_LABELS: Record<BspGameStep, string> = {
  LOAN: "자금조달",
  FACILITY: "설비투자",
  HIRING: "인력채용",
  MATERIAL: "원재료구매",
  PRODUCTION: "생산",
  SALES: "판매",
  SETTLEMENT: "결산",
};

export function formatStepPhaseLabel(stepPhase: string | null | undefined): string {
  if (!stepPhase) return "—";
  return STEP_PHASE_LABELS[stepPhase] ?? stepPhase.replace(/^STEP(\d+)_/, "$1단계 · ").replace(/_/g, " ");
}

export function formatStepPhase(stepPhase: BspStepPhase | string | null | undefined): string {
  return formatStepPhaseLabel(stepPhase);
}

/** Parse year from period label (English or Korean). */
export function parseYearFromPeriodLabel(label: string | null | undefined, fallback = 1): number {
  if (!label) return fallback;
  const ko = label.match(/(\d+)\s*년차/);
  if (ko) return Number(ko[1]);
  const en = label.match(/Year\s*(\d+)/i) ?? label.match(/Y(\d+)/i);
  if (en) return Number(en[1]);
  return fallback;
}
