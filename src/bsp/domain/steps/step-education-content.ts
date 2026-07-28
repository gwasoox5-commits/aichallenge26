import type { BspGameStep } from "../types";

export type StepEducationContent = {
  step: BspGameStep;
  title: string;
  learningObjective: string;
  businessMeaning: string;
  checklist: string[];
  confirmPrompt: string;
};

export const STEP_EDUCATION: Record<
  Exclude<BspGameStep, "SETTLEMENT">,
  StepEducationContent
> = {
  LOAN: {
    step: "LOAN",
    title: "Step 1 — 자금 조달",
    learningObjective:
      "차입·예금 결정이 유동성, 이자비용, 부채비율에 미치는 영향을 이해합니다.",
    businessMeaning:
      "자금 조달은 이후 설비·구매·생산 투입의 전제입니다. 차입은 실행 여력을 늘리지만 이자 부담을, 예금은 금융수익을 주지만 운영 현금을 묶습니다.",
    checklist: [
      "연초·연중 차입 한도(자기자본 이하)를 확인했습니다",
      "예금은 중도 인출 불가 — 남은 현금으로 Step 2~4를 버틸 수 있는지 검토했습니다",
      "이자비용이 반기 결산에 반영됨을 인지했습니다",
    ],
    confirmPrompt: "자금 조달 의사결정을 제출합니다. 제출 후 GM이 다음 Step을 진행할 때까지 수정할 수 없습니다.",
  },
  FACILITY: {
    step: "FACILITY",
    title: "Step 2 — 설비 투자",
    learningObjective:
      "CAPEX(설비·토지) 투자가 생산능력과 재고 한도에 미치는 장기적 영향을 이해합니다.",
    businessMeaning:
      "설비는 생산·재고 처리량의 상한을 정합니다. 과도한 투자는 현금을 소진하고, 부족한 투자는 이후 생산·판매 병목을 만듭니다.",
    checklist: [
      "토지·기계 비용과 잔여 현금을 확인했습니다",
      "생산능력·Max 원재료 용량 변화를 Preview에서 확인했습니다",
      "감가상각이 반기 결산에 반영됨을 인지했습니다",
    ],
    confirmPrompt: "설비 투자 의사결정을 제출합니다. CAPEX는 즉시 현금에서 차감됩니다.",
  },
  HIRING: {
    step: "HIRING",
    title: "Step 3 — 인력 채용",
    learningObjective:
      "부서별 인력 배치가 구매·생산·판매 처리량과 인건비 구조에 미치는 영향을 이해합니다.",
    businessMeaning:
      "인력은 각 기능의 실행 능력을 결정합니다. 인건비는 반기 결산 시점에 비용으로 인식되므로, 처리량 대비 적정 인력을 배치하는 것이 경영의 핵심입니다.",
    checklist: [
      "구매·생산·영업 부서별 Capacity를 확인했습니다",
      "반기 인건비·복리후생 예상액을 검토했습니다",
      "이후 Step 4~6 처리량과 인력이 맞는지 점검했습니다",
    ],
    confirmPrompt: "인력 채용 의사결정을 제출합니다. 인건비는 결산 시 분개됩니다.",
  },
  MATERIAL: {
    step: "MATERIAL",
    title: "Step 4 — 원재료 구매",
    learningObjective:
      "조달 지역·수량·경제환경(환율·원자재·물류)이 원가와 재고에 미치는 영향을 이해합니다.",
    businessMeaning:
      "원재료는 생산의 투입입니다. 구매 시점의 경제환경과 물류·지사 설치 비용이 현금과 재고 원가에 직접 반영됩니다.",
    checklist: [
      "구매 Capacity 이내 수량인지 확인했습니다",
      "원자재·물류·지사 비용과 구매 후 잔여 현금을 확인했습니다",
      "활성 이벤트·경제환경 변화를 반영했습니다",
    ],
    confirmPrompt: "원재료 구매 의사결정을 제출합니다. 구매 비용은 즉시 현금에서 차감됩니다.",
  },
  PRODUCTION: {
    step: "PRODUCTION",
    title: "Step 5 — 생산",
    learningObjective:
      "생산량·기계 가동이 재료 소비, 기계운영비, 완제품 재고에 미치는 영향을 이해합니다.",
    businessMeaning:
      "생산은 원재료를 완제품으로 전환합니다. 재료·기계·인력 제약 중 최소값이 실제 생산량을 결정하며, 미생산 재료는 재고로 남습니다.",
    checklist: [
      "재료·기계·인력 제약 중 병목을 확인했습니다",
      "기계운영비·재료 소비 비용을 Preview에서 확인했습니다",
      "완제품 재고 증가량을 검토했습니다",
    ],
    confirmPrompt: "생산 계획을 제출합니다. 재료 소비와 기계운영비가 즉시 반영됩니다.",
  },
  SALES: {
    step: "SALES",
    title: "Step 6 — 판매",
    learningObjective:
      "가격·수량·지역·수요 환경이 매출, COGS, 물류비, 현금흐름에 미치는 영향을 이해합니다.",
    businessMeaning:
      "판매는 가치 실현 단계입니다. 단가와 판매량은 매출을, 완제품 출고는 COGS와 물류비를 발생시키며, 경제환경(수요·관세·물류)이 실현 가능한 판매량에 영향을 줍니다.",
    checklist: [
      "완제품 재고·영업 Capacity 이내인지 확인했습니다",
      "매출·COGS·물류·지사 비용 Preview를 검토했습니다",
      "판매 후 예상 현금 잔액을 확인했습니다",
    ],
    confirmPrompt: "판매 전략을 제출합니다. 매출·원가·물류비가 즉시 반영됩니다.",
  },
};

export function getStepEducation(step: BspGameStep): StepEducationContent | null {
  if (step === "SETTLEMENT") return null;
  return STEP_EDUCATION[step];
}
