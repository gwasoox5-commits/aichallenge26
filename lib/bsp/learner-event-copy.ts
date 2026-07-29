/** Learner-facing copy for market events — strips GM/internal metadata. */

const GM_ONLY_PATTERNS = [
  /동시에 3개 이상의 이벤트가 활성화되어 있습니다\.\s*/gi,
  /완충 또는 만료를 검토하세요\.?\s*/gi,
  /Global Growth:\s*\d+\s*·\s*Inflation:\s*\d+\s*·\s*Tech:\s*\d+\s*/gi,
  /※[^\n]*/gi,
  /World Engine 추정[^\n]*/gi,
  /Event Chain 확률 분기[^\n]*/gi,
  /GM 승인[^\n]*/gi,
  /V2\.4 Publish Workflow[^\n]*/gi,
];

export function sanitizeLearnerEventDescription(text: string): string {
  let result = text;
  for (const pattern of GM_ONLY_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type EconomyImpact = {
  key: string;
  mode: "DELTA" | "PERCENT";
  value: number;
  rationale?: string;
};

function impactLearningHint(impact: EconomyImpact): string | null {
  const { key, value } = impact;
  if (key === "marketDemandIndex") {
    return value < 0
      ? "판매 Step에서 수요 감소를 반영해 가격·물량·재고 계획을 점검하세요."
      : "시장 수요 확대를 활용할 판매·생산 계획을 검토하세요.";
  }
  if (key === "rawMaterialIndex") {
    return value > 0
      ? "원재료 조달 Step에서 원가 상승을 감안해 구매량과 예산을 재검토하세요."
      : "원자재 가격 안정을 활용해 조달 전략을 점검하세요.";
  }
  if (key === "interestRateLoan") {
    return value > 0
      ? "금융 환경 변화에 따라 차입·이자비용과 현금흐름을 보수적으로 관리하세요."
      : "금리 완화를 활용할 투자·차입 전략을 검토하세요.";
  }
  if (key === "techInnovationIndex") {
    return value > 0
      ? "기술·혁신 수요가 커지며 생산 능력과 투자 우선순위를 재점검할 시점입니다."
      : null;
  }
  return null;
}

function titleContext(title: string): string {
  if (title.includes("경기 침체") || title.includes("수요 위축")) {
    return "글로벌 경기가 침체되면서 시장 수요가 줄어들고 있습니다. 판매·생산·재고 계획을 검토하며 현금흐름을 보수적으로 관리하세요.";
  }
  if (title.includes("인플레이션")) {
    return "물가와 금리 압력이 커지고 있습니다. 원가·가격·자금 조달 결정에 주의가 필요합니다.";
  }
  if (title.includes("AI") || title.includes("반도체")) {
    return "기술 수요 급증으로 공급망과 생산 능력에 변화가 예상됩니다. 투자와 조달 계획을 점검하세요.";
  }
  if (title.includes("지정학") || title.includes("관세") || title.includes("무역")) {
    return "무역·지정학적 불확실성이 커지고 있습니다. 공급망과 원가 구조를 재검토하세요.";
  }
  if (title.startsWith("[Chain]")) {
    return "시장 환경 변화가 연쇄적으로 이어지고 있습니다. 이번 Step 결정이 다음 반기에 미칠 영향을 고려하세요.";
  }
  return "거시 경제 환경 변화가 경영 의사결정에 영향을 줄 수 있습니다. 이번 Step 목표와 연결해 대응 방향을 정하세요.";
}

export function buildWorldProposalLearnerDescription(input: {
  title: string;
  economyImpacts: EconomyImpact[];
}): string {
  const parts = [titleContext(input.title.replace(/^\[Chain\]\s*/, ""))];
  const hints = input.economyImpacts
    .map((impact) => impactLearningHint(impact))
    .filter((line): line is string => Boolean(line));
  for (const hint of new Set(hints)) {
    parts.push(hint);
  }
  return parts.join("\n\n");
}

export const LEARNER_EVENT_DISCLAIMER =
  "※ 본 내용은 교육용 시뮬레이션 시나리오이며, 실제 시장과 다를 수 있습니다.";

export const LEARNER_APPLY_TIMING_HINTS: Record<string, string> = {
  IMMEDIATE: "즉시 적용됨 — 이번 Step 결정에 바로 반영됩니다",
  NEXT_STEP: "다음 Step부터 적용 — 이번 Step 결정에는 반영되지 않습니다",
  NEXT_HALF: "다음 반기부터 적용 — 현재 반기 계획을 먼저 마무리하세요",
};
