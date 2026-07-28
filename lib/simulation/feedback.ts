import type { KpiDelta } from "@/types/kpi";
import type {
  CumulativeState,
  RoundNumber,
} from "@/types/simulation";
import type { Allocation } from "@/types/strategy";

type FeedbackRule = {
  condition: (
    allocation: Allocation,
    delta: KpiDelta,
    round: RoundNumber,
    cumulative: CumulativeState,
  ) => boolean;
  message: string;
};

const ROUND_FEEDBACK: Record<RoundNumber, FeedbackRule[]> = {
  1: [
    {
      condition: (a) => a.costReduction >= 40,
      message:
        "단기 영업이익 개선에 유리하나, 품질·인재 기반이 약해지면 이후 외부 충격에 취약해질 수 있습니다.",
    },
    {
      condition: (a) =>
        a.talent >= 20 &&
        a.talent <= 35 &&
        a.costReduction >= 20 &&
        a.costReduction <= 35,
      message:
        "점진적 개선에 적합한 균형입니다. AI·ESG·R&D에 전혀 투자하지 않았다면 다음 라운드 전환 비용이 커질 수 있습니다.",
    },
    {
      condition: (a) => a.rnd >= 25 && a.aiAutomation >= 25,
      message:
        "장기 경쟁력에 베팅한 선택입니다. 단기 실적은 다소 아쉬울 수 있으나 후반 라운드에서 기술·제품 포트폴리오가 빛날 여지가 있습니다.",
    },
    {
      condition: (a) => a.esg >= 35,
      message:
        "선제적 ESG는 탄소 리스크 완화에 유리합니다. 아직 규제가 약한 시기라 '왜 지금?'을 팀에서 설명해 보세요.",
    },
  ],
  2: [
    {
      condition: (a) => a.costReduction >= 45,
      message:
        "단기 마진 방어에는 효과적일 수 있습니다. 공급망·품질 투자가 부족하면 납기 지연이 매출 손실로 이어질 수 있습니다.",
    },
    {
      condition: (a) => a.supplyChain >= 30,
      message:
        "불확실성 시기에 적절한 방어적 선택입니다. 재고·다원화 비용으로 영업이익은 당분간 압박받을 수 있습니다.",
    },
    {
      condition: (a) => a.aiAutomation + a.costReduction >= 50,
      message:
        "효율과 절감의 조합은 논리적입니다. 현장 인력 교육이 부족하면 AI 효과가 절반만 나올 수 있습니다.",
    },
    {
      condition: (a) => a.rnd >= 15 && a.esg >= 15,
      message:
        "단기 실적 압박 속에서도 장기 축을 지킨 선택입니다. '왜 지금 포기하지 않았는가'를 정리하면 좋은 토론 소재가 됩니다.",
    },
  ],
  3: [
    {
      condition: (a) => a.esg + a.aiAutomation >= 50,
      message:
        "전환기에 맞는 공격적 포트폴리오입니다. 단기 비용 부담은 크지만 규제·고객 RFQ 대응력이 강화됩니다.",
    },
    {
      condition: (a) =>
        a.costReduction >= 40 && a.esg < 10 && a.aiAutomation < 10,
      message:
        "단기 이익에는 유리할 수 있으나, 탄소·디지털 요구 미충족 시 수출·입찰에서 불리해질 위험이 큽니다.",
    },
    {
      condition: (a) => a.talent >= 30 && a.aiAutomation >= 15,
      message:
        "사람과 기술을 함께 키우는 전환 전략입니다. ESG가 부족하면 규제 리스크가 남습니다.",
    },
    {
      condition: (a) => a.rnd >= 25,
      message:
        "미래 제품·공정에 베팅했습니다. 당기 영업이익과 현금 흐름을 감당할 수 있는지 점검이 필요합니다.",
    },
  ],
  4: [
    {
      condition: (_, __, ___, c) =>
        c.aiMaturity >= 0.3 && c.rndPipeline >= 0.25,
      message:
        "4년에 걸친 '미래형 제조' 경로입니다. 중간에 실적이 흔들렸더라도 재편기에서 성장·제휴 옵션이 열릴 수 있습니다.",
    },
    {
      condition: (_, __, ___, c) => c.totalPoints.costReduction >= 100,
      message:
        "일관된 단기 수익 전략입니다. 산업 재편에서 상위 tier 진입은 어려울 수 있습니다. 의도적 선택이었는지 돌아보세요.",
    },
    {
      condition: (a, _, round, c) =>
        round === 4 && a.esg >= 30 && a.aiAutomation >= 30 && c.esgReadiness < 0.2,
      message:
        "마지막 라운드 catch-up 투자입니다. 일부 지표는 개선되나 4년 누적 관점에서는 '늦은 전환' 비용이 남을 수 있습니다.",
    },
    {
      condition: (a) => a.supplyChain >= 25 && a.rnd >= 25,
      message:
        "지역·제품 포트폴리오를 재구성한 전략입니다. 운영 복잡도와 조직역량이 따라갔는지가 성공 조건입니다.",
    },
  ],
};

const DEFAULT_FEEDBACK =
  "이번 라운드 선택의 결과가 주요 지표에 반영되었습니다. 단기 수익성과 장기 경쟁력 중 무엇에 더 무게를 두었는지 팀에서 공유해 보세요.";

export function generateFeedback(
  round: RoundNumber,
  allocation: Allocation,
  delta: KpiDelta,
  cumulative: CumulativeState,
): string[] {
  const rules = ROUND_FEEDBACK[round];
  const matched = rules
    .filter((r) => r.condition(allocation, delta, round, cumulative))
    .map((r) => r.message);

  if (matched.length === 0) {
    return [DEFAULT_FEEDBACK];
  }

  return matched.slice(0, 2);
}
