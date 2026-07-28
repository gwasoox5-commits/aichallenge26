import type { ConsultantFollowUp } from "./publish-types";
import type { IntelligencePreview } from "./types";
import { CURRENT_PROMPT_VERSION } from "./prompt-registry";

export function generateConsultantFollowUp(
  publishId: string,
  preview: IntelligencePreview
): ConsultantFollowUp {
  const analysis = preview.analysis;
  const consultant = preview.consultant;

  const comments: string[] = [];
  const studentBehaviorPredictions: string[] = [];
  const discussionGuidance: string[] = [];

  if (consultant) {
    comments.push(
      `이번 이벤트에서는 ${consultant.mostAffectedDivision} 부문이 가장 큰 영향을 받을 것으로 예상됩니다.`
    );
    if (consultant.commonStudentMistakes.length > 0) {
      studentBehaviorPredictions.push(
        `학생들은 ${consultant.commonStudentMistakes[0]}을(를) 선택할 가능성이 높습니다.`
      );
    }
    if (consultant.instructorComments) {
      comments.push(consultant.instructorComments);
    }
    discussionGuidance.push(
      ...consultant.instructorDiscussionQuestions.slice(0, 2).map(
        (q) => `토론 유도: ${q}`
      )
    );
  }

  if (analysis) {
    if (analysis.financialImpact.includes("차입") || analysis.financialImpact.includes("현금")) {
      studentBehaviorPredictions.push(
        "원가 상승보다 차입 증가를 먼저 선택할 가능성이 높습니다."
      );
      discussionGuidance.push(
        "이번 이벤트에서는 가격 전략보다 공급망 전략을 토론하도록 유도하는 것이 좋습니다."
      );
    }
    if (analysis.supplyChainImpact) {
      comments.push(`공급망 영향: ${analysis.supplyChainImpact.slice(0, 120)}…`);
    }
  }

  if (comments.length === 0) {
    comments.push("발행 후 학생들의 초기 의사결정 패턴을 관찰하세요.");
  }
  if (studentBehaviorPredictions.length === 0) {
    studentBehaviorPredictions.push("단기적 비용 절감보다 장기 투자를 선택할 학생도 있을 수 있습니다.");
  }

  return {
    publishId,
    comments,
    studentBehaviorPredictions,
    discussionGuidance,
    gmOnly: true,
    generatedAt: new Date().toISOString(),
    promptVersion: CURRENT_PROMPT_VERSION,
  };
}
