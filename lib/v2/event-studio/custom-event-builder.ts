import type { EventCategory, EventTemplate } from "@/src/bsp/domain/events/event-types";
import type { ScenarioKey, EventScenarioStudioOutput } from "./types";

const CATEGORY_MAP: Record<string, EventCategory> = {
  환율: "환율",
  금리: "금리",
  원자재: "원자재",
  공급망: "공급망",
  관세: "관세",
  경쟁사: "경쟁사",
  정부정책: "정부정책",
  자연재해: "자연재해",
};

export function mapStudioCategory(category: string): EventCategory {
  return CATEGORY_MAP[category] ?? "정부정책";
}

export function buildCustomEventTemplate(
  draftId: string,
  output: EventScenarioStudioOutput,
  selected: ScenarioKey,
  effects: EventTemplate["normalEffects"]
): EventTemplate {
  const scenario = output.scenarios[selected];
  return {
    eventId: `AI-${draftId.slice(0, 8)}`,
    title: output.meta.title,
    description: scenario.narrative,
    category: mapStudioCategory(output.meta.category),
    educationPurpose: output.meta.summary,
    learningPoints: output.assumptions.slice(0, 3),
    discussionQuestions: scenario.discussionQuestions ?? [],
    normalEffects: effects,
    relatedSteps: ["SALES", "MATERIAL", "PRODUCTION"],
    severity: severityToNumber(scenario.severity),
    difficulty: "NORMAL",
    tags: ["AI-STUDIO", output.meta.category],
    recommendedPeriod: [output.meta.targetPeriodLabel ?? "Y1H1"],
    avoidPeriod: [],
    maxSeverityInAvoid: 3,
    duration: "PERIOD",
    durationPeriods: 1,
  };
}

function severityToNumber(severity: string): number {
  switch (severity) {
    case "CRITICAL":
      return 5;
    case "HIGH":
      return 4;
    case "MEDIUM":
      return 3;
    case "LOW":
      return 2;
    default:
      return 3;
  }
}
