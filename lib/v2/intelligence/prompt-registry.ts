import type { PromptVersion } from "./types";

export const CURRENT_PROMPT_VERSION: PromptVersion = "v1.2";

export const PROMPT_VERSIONS: Record<
  PromptVersion,
  { analysis: string; scenarios: string; consultant: string; releasedAt: string }
> = {
  "v1.0": {
    releasedAt: "2026-07-01",
    analysis: "Analyze real news for supply chain, production, sales, and financial impacts. Distinguish estimates from assumptions.",
    scenarios: "Generate pessimistic, neutral, optimistic scenarios with economy variable impacts.",
    consultant: "Generate GM-only management consultant briefing for instructors.",
  },
  "v1.1": {
    releasedAt: "2026-07-27",
    analysis:
      "Analyze selected news articles for educational business simulation. Output structured impacts with source citations. Mark uncertain items as estimates. Korean labels OK for instructor fields.",
    scenarios:
      "Generate three what-if scenarios (pessimistic/neutral/optimistic) mapped to 14 studio economy variables. Include assumptions per scenario and explainability per variable.",
    consultant:
      "Generate GM-only AI Management Consultant: risks, opportunities, division impact, CEO priorities, student mistakes, discussion/debrief questions, learning objectives. NOT for student view.",
  },
  "v1.2": {
    releasedAt: "2026-07-29",
    analysis:
      "Analyze selected news for Korean educational business simulation. ALL narrative fields in Korean (한국어). Citations and estimates required.",
    scenarios:
      "Generate pessimistic/neutral/optimistic what-if scenarios in Korean with studio economy variable impacts, assumptions, and rationales.",
    consultant:
      "Generate GM-only AI Management Consultant briefing entirely in Korean: risks, opportunities, division impacts, CEO priorities, student mistakes, discussion/debrief questions, learning objectives.",
  },
};

export function resolvePromptVersion(version?: string): PromptVersion {
  if (version === "v1.0" || version === "v1.1" || version === "v1.2") return version;
  return CURRENT_PROMPT_VERSION;
}

export function getPromptMeta(version: PromptVersion) {
  return { version, ...PROMPT_VERSIONS[version] };
}
