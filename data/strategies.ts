import type { StrategyDefinition } from "@/types/strategy";

export const STRATEGIES: StrategyDefinition[] = [
  {
    id: "aiAutomation",
    label: "AI 자동화 투자",
    shortDescription: "스마트팩토리·품질 AI — 후반 생산성↑",
    description:
      "스마트팩토리·품질 AI 도입. 초기 비용 부담, 후반 생산성·미래경쟁력 상승",
  },
  {
    id: "esg",
    label: "친환경/탄소감축 투자",
    shortDescription: "탄소 저감·RE100 — 규제 대응",
    description:
      "탄소 저감·RE100·공급망 ESG. 단기 비용, 탄소 리스크 감소·후반 수출 유리",
  },
  {
    id: "supplyChain",
    label: "글로벌 공급망 다변화",
    shortDescription: "2차 공급처·재고 — 충격기 방어",
    description:
      "2차 공급처·재고·near-shoring. 충격기(R2)에 특히 효과적",
  },
  {
    id: "talent",
    label: "인재 육성 투자",
    shortDescription: "교육·채용 — AI·R&D 효과 증폭",
    description: "교육·채용·Retention. AI·R&D 투자 효과를 누적 증폭",
  },
  {
    id: "costReduction",
    label: "원가절감 투자",
    shortDescription: "단기 이익↑ — 과투자 시 리스크",
    description:
      "단기 영업이익에 강력. 과투자 시 조직역량·미래경쟁력 하락",
  },
  {
    id: "rnd",
    label: "신사업/R&D 투자",
    shortDescription: "신제품·신공정 — 미래경쟁력",
    description:
      "신제품·신공정 개발. 불확실하나 최종 미래경쟁력에 큰 영향",
  },
];
