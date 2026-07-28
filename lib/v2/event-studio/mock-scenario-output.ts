import type { EventScenarioStudioOutput } from "./types";

/** Prototype mock — no OpenAI call. Represents Structured Output shape. */
export const MOCK_SCENARIO_OUTPUT: EventScenarioStudioOutput = {
  meta: {
    title: "미·EU 전기차 보조금 축소 및 수입 관세 검토",
    summary:
      "주요 수출 시장에서 EV 보조금이 축소되고, 일부 품목에 대해 관세 인상이 논의됩니다. 교육용 시나리오로 수요·원가·환율 경로를 토론합니다.",
    category: "정부정책",
    confidenceLabel: "MEDIUM",
    isEstimate: true,
    targetIndustry: "자동차·부품 제조",
    targetMarketOrRegion: "북미 · EU",
    expectedDuration: "1~2반기",
    targetPeriodLabel: "Y2H1 (P3/6)",
    analysisIntensity: "STANDARD",
  },
  assumptions: [
    "보조금 축소는 6~12개월에 걸쳐 단계적으로 적용된다고 가정",
    "관세는 즉시 발효되지 않고 협상 기간(1반기)이 있다고 가정",
    "원자재·에너지 가격은 별도 충격 없이 현 수준 유지",
  ],
  impactPathways: [
    {
      path: "수요 감소 → Step6 판매 가격·물량 압박 → 매출·현금흐름",
      affectedSteps: ["SALES", "SETTLEMENT"],
    },
    {
      path: "관세·물류비 상승 → Step4 구매·Step5 COGS 상승",
      affectedSteps: ["MATERIAL", "PRODUCTION", "SETTLEMENT"],
    },
  ],
  scenarios: {
    pessimistic: {
      label: "비관적",
      narrative:
        "보조금 급격 축소와 관세 부과가 동시에 진행되어 수출 수요가 크게 줄고, 환율·물류비까지 악화됩니다.",
      rationale:
        "무역 마찰 심화 + 경기 둔화가 겹치는 전형적 downside. 교육 토론: 방어 vs 다변화.",
      discussionQuestions: [
        "수출 의존도를 줄이고 내수 비중을 높일 것인가?",
        "가격 인상 vs 마진 희생 중 무엇을 선택할 것인가?",
      ],
      newsHeadline: "[속보] EV 보조금 급축·관세 부과, 수출 기업 전망 악화",
      newsArticleBody:
        "미국과 EU가 전기차 보조금을 대폭 축소하고 아시아산 부품 관세를 검토합니다. 업계는 수출 수요 감소와 원가 상승을 동시에 우려하고 있습니다.",
      severity: "HIGH",
    },
    neutral: {
      label: "중립적",
      narrative:
        "보조금은 점진 축소, 관세는 일부 품목에만 적용. 수요는 완만히 감소하고 원가는 소폭 상승합니다.",
      rationale: "정책 협상·완충 장치가 작동하는 baseline.",
      discussionQuestions: ["어느 지역·제품 mix를 조정할 것인가?"],
      newsHeadline: "EV 보조금 점진 축소·선별 관세, 시장 영향 제한적 전망",
      newsArticleBody:
        "정부들은 보조금을 단계적으로 줄이고 일부 품목에만 관세를 적용할 계획입니다. 전문가들은 수요와 원가에 완만한 영향을 예상합니다.",
      severity: "MEDIUM",
    },
    optimistic: {
      label: "낙관적",
      narrative:
        "관세 협상 타결, 보조금은 신규 친환경 라인에만 재편. 고부가 제품 수요는 유지됩니다.",
      rationale: "정책 불확실성 해소 + 기술 차별화 시나리오.",
      discussionQuestions: ["R&D·ESG 투자를 늘릴 타이밍인가?"],
      newsHeadline: "EV 정책 협상 타결, 친환경 라인 보조 재편",
      newsArticleBody:
        "관세 협상이 타결되고 보조금은 고부가 친환경 라인으로 재편됩니다. 업계는 불확실성 해소를 긍정적으로 평가합니다.",
      severity: "LOW",
    },
  },
  uncertainty: {
    caveats: [
      "실시간 뉴스·외부 API 미연동 — 교육용 가상 시나리오",
      "확률 수치는 제공하지 않음 (what-if 토론용)",
      "회계 규칙·Step validator는 변경하지 않음",
    ],
    educationDisclaimer:
      "본 전망은 교육 토론을 위한 가상 분석이며, 실제 시장 예측 또는 투자 조언이 아닙니다.",
  },
  economyVariableChanges: {
    pessimistic: {
      effects: [
        { key: "demand", mode: "PERCENT", value: -15, rationale: "보조금·관세 복합", isEstimate: true },
        { key: "tariff", mode: "DELTA", value: 12, unit: "pct", rationale: "관세 인상", isEstimate: true },
        { key: "exchangeRate", mode: "PERCENT", value: 8, rationale: "달러 강세", isEstimate: true },
        { key: "logisticsCost", mode: "MULTIPLY", value: 1.12, rationale: "무역 장벽", isEstimate: true },
      ],
    },
    neutral: {
      effects: [
        { key: "demand", mode: "PERCENT", value: -6, rationale: "완만한 수요 조정", isEstimate: false },
        { key: "tariff", mode: "DELTA", value: 5, unit: "pct", rationale: "부분 관세", isEstimate: false },
        { key: "businessCycleIndex", mode: "PERCENT", value: -3, rationale: "경기 둔화", isEstimate: true },
      ],
    },
    optimistic: {
      effects: [
        { key: "demand", mode: "PERCENT", value: 2, rationale: "고부가 mix", isEstimate: true },
        { key: "governmentSupport", mode: "PERCENT", value: 5, rationale: "친환경 보조 재편", isEstimate: true },
        { key: "esgCost", mode: "PERCENT", value: -3, rationale: "그린 프리미엄", isEstimate: true },
      ],
    },
  },
};
