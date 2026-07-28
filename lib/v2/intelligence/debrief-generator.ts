import type { EducationalDebrief } from "./publish-types";
import type { IntelligencePreview } from "./types";

export function generateEducationalDebrief(
  publishId: string,
  preview: IntelligencePreview
): EducationalDebrief {
  const consultant = preview.consultant;
  const analysis = preview.analysis;

  const majorChoices = [
    "가격 인상 vs 생산량 조절",
    "차입 확대 vs 비용 절감",
    "공급망 다변화 vs 단기 재고 확보",
    "R&D 투자 유지 vs 마케팅 축소",
  ];

  const mostSelectedStrategy = "단기 비용 절감 (차입/생산 축소)";
  const goodChoices = [
    "공급망 리스크를 고려한 다각화 전략",
    "현금흐름을 유지하면서 점진적 가격 조정",
  ];
  const missedOpportunities = [
    "장기적 R&D 투자를 유지하지 못한 경우",
    "경쟁사 대비 차별화 전략 부재",
  ];

  const nextDiscussionQuestions =
    consultant?.debriefQuestions?.slice(0, 4) ??
    analysis?.keyIssues.slice(0, 3).map((k) => `이번 ${k} 이벤트에서 다른 선택을 했다면?`) ??
    ["이번 이벤트에서 가장 효과적이었던 전략은 무엇이었나요?"];

  return {
    publishId,
    majorChoices,
    mostSelectedStrategy,
    goodChoices,
    missedOpportunities,
    nextDiscussionQuestions,
    generatedAt: new Date().toISOString(),
    gmOnly: true,
  };
}
