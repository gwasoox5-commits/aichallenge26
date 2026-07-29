import type { EconomyPatchEffect } from "@/src/bsp/domain/events/event-types";
import { LEARNER_EVENT_DISCLAIMER } from "@/lib/bsp/learner-event-copy";
import { economyVariableLabelKo, formatEffectValueKo } from "./scenario-labels";

const INSTRUCTOR_PHRASE = /본\s*시나리오는[^.]*?(분석|검토)한다\.?\s*/gi;
const REAL_CALENDAR_YEAR = /20\d{2}년\s*(상반기|하반기|전반기|후반기)?/g;

/** Remove GM/meta phrasing and real calendar years from learner-visible copy. */
export function stripInstructorMetaFromLearnerText(text: string): string {
  return text
    .replace(INSTRUCTOR_PHRASE, "")
    .replace(REAL_CALENDAR_YEAR, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function buildLearnerNewsSummary(params: {
  narrative: string;
  articleBody?: string;
  targetMarketOrRegion?: string;
  targetIndustry?: string;
  effects?: EconomyPatchEffect[];
}): string {
  const story =
    stripInstructorMetaFromLearnerText(params.narrative.trim()) ||
    stripInstructorMetaFromLearnerText(params.articleBody?.split("\n").find((l) => l.trim())?.trim() ?? "");

  const parts: string[] = [];
  if (story) parts.push(story);

  if (params.targetMarketOrRegion && params.targetIndustry) {
    parts.push(`${params.targetMarketOrRegion} ${params.targetIndustry} 분야에 아래와 같은 경영환경 변화가 예상됩니다.`);
  }

  const effects = params.effects?.slice(0, 4) ?? [];
  if (effects.length > 0) {
    const impactLine = effects
      .map((e) => `${economyVariableLabelKo(e.key)} ${formatEffectValueKo(e.mode, e.value)}`)
      .join(" · ");
    parts.push(`주요 영향: ${impactLine}`);
  }

  if (parts.length === 0) {
    parts.push("시장 환경 변화가 경영 의사결정에 영향을 줄 수 있습니다.");
  }

  return parts.join("\n\n");
}

export function buildInstructorNewsSummary(metaSummary: string): string {
  return metaSummary.trim();
}

/** Prompt rules — game calendar only, split instructor vs learner fields. */
export const SIMULATION_CALENDAR_PROMPT_RULES = [
  "SIMULATION CALENDAR: Fictional 3-year business game with 6 half-year periods (P1–P6).",
  "P1=1년차 전반기, P2=1년차 후반기, P3=2년차 전반기, P4=2년차 후반기, P5=3년차 전반기, P6=3년차 후반기.",
  "NEVER use real-world calendar years or months (2024년, 2025년, 2026년, etc.).",
  "meta.summary = INSTRUCTOR briefing only (e.g. '본 시나리오는 게임 2년차 전반기(P3)부터 … 교육용 분석').",
  "scenarios[].narrative and newsArticleBody = LEARNER copy: concrete industry/market impacts.",
  "Learner copy must NOT start with '본 시나리오는' and must NOT describe the analysis process.",
].join("\n");

export function appendLearnerDisclaimer(articleBody: string): string {
  if (articleBody.includes(LEARNER_EVENT_DISCLAIMER)) return articleBody;
  return `${articleBody.trim()}\n\n${LEARNER_EVENT_DISCLAIMER}`;
}
