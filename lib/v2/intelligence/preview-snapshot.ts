import type { IntelligencePreview } from "./types";

/** Client-safe preview payload builder (no Node/fs imports). */
export function buildClientPreviewSnapshot(input: {
  previewId: string;
  sessionId: string;
  articles: IntelligencePreview["articles"];
  analysis: NonNullable<IntelligencePreview["analysis"]>;
  scenarios: NonNullable<IntelligencePreview["scenarios"]>;
  consultant?: IntelligencePreview["consultant"];
  quality?: IntelligencePreview["quality"];
  createdBy?: string;
}): IntelligencePreview {
  const now = new Date().toISOString();
  return {
    previewId: input.previewId,
    sessionId: input.sessionId,
    articles: input.articles,
    analysis: input.analysis,
    scenarios: input.scenarios,
    consultant: input.consultant,
    quality: input.quality,
    status: "PREVIEW",
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy ?? "gm-ui",
  };
}
