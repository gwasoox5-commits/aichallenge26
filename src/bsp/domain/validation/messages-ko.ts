export const VALIDATION_MESSAGES_KO: Record<string, { pass: string; fail: string }> = {
  L01: {
    pass: "연초 차입금이 자기자본 한도 이내입니다.",
    fail: "연초 차입금이 자기자본을 초과합니다. (L01)",
  },
  L02: {
    pass: "연중 차입금이 1억원 한도 이내입니다.",
    fail: "연중 차입금이 1억원 한도를 초과합니다. (L02)",
  },
  L03: {
    pass: "제출 후에도 현금 잔액이 0 이상입니다.",
    fail: "현금 잔액이 마이너스가 됩니다. 상환·예금 입력을 확인하세요. (L03)",
  },
  L04: {
    pass: "입력값이 0 이상의 정수입니다.",
    fail: "음수 또는 정수가 아닌 값은 입력할 수 없습니다. (L04)",
  },
  L05: {
    pass: "연초 차입 단위(천만원)가 올바릅니다.",
    fail: "연초 차입 단위가 올바르지 않습니다. (L05)",
  },
  L06: {
    pass: "상환액이 차입 잔액 이내입니다.",
    fail: "상환액이 차입 잔액을 초과합니다. (L06)",
  },
  F01: {
    pass: "토지 보유 필지가 최대 4필지 이내입니다.",
    fail: "토지 보유 필지가 최대 4필지를 초과합니다. (F01)",
  },
  F02: {
    pass: "Big 기계 대수가 필지 용량 이내입니다.",
    fail: "Big 기계 대수가 필지당 허용 대수를 초과합니다. (F02)",
  },
  F03: {
    pass: "Small 기계 대수가 필지 용량 이내입니다.",
    fail: "Small 기계 대수가 필지당 허용 대수를 초과합니다. (F03)",
  },
  F04: {
    pass: "기계·필지 조합이 Rule Book 기준을 만족합니다.",
    fail: "필지당 기계 배치 규칙을 위반합니다. (F04)",
  },
  F05: {
    pass: "설비투자 CAPEX가 현금 잔액 이내입니다.",
    fail: "설비투자 금액이 현금 잔액을 초과합니다. (F05)",
  },
  F06: {
    pass: "신규 필지 구매 수량이 유효합니다.",
    fail: "신규 필지 구매 수량이 유효하지 않습니다. (F06)",
  },
  H01: {
    pass: "인원 입력값이 0 이상의 정수입니다.",
    fail: "인원은 0 이상의 정수만 입력할 수 있습니다. (H01)",
  },
  H02: {
    pass: "구조조정 전환 규칙을 만족합니다.",
    fail: "구조조정 전환 규칙을 위반합니다. (H02)",
  },
  H03: {
    pass: "퇴사 인원이 현재 인원 이내입니다.",
    fail: "퇴사 인원이 현재 인원을 초과합니다. (H03)",
  },
  H04: {
    pass: "1년차 구조조정 필드 없음.",
    fail: "1년차에는 구조조정(전환·퇴사)을 입력할 수 없습니다. (H04)",
  },
  M01: {
    pass: "지역 단가가 Economy 반영 후 유효합니다.",
    fail: "지역 단가가 최소가 미만입니다. (M01)",
  },
  M02: {
    pass: "지역별 구매 수량이 한도 이내입니다.",
    fail: "지역별 구매 수량이 한도를 초과합니다. (M02)",
  },
  M03: {
    pass: "구매 처리량(인력×30) 이내입니다.",
    fail: "총 구매량이 구매 인력 처리량을 초과합니다. (M03)",
  },
  M04: {
    pass: "원재료 구매 후 현금이 0 이상입니다.",
    fail: "원재료 구매에 필요한 현금이 부족합니다. (M04)",
  },
  M05: {
    pass: "브랜치 개설비가 반영되었습니다.",
    fail: "브랜치 개설 조건을 확인하세요. (M05)",
  },
  G01: { pass: "세션이 진행 중입니다.", fail: "세션이 RUNNING 상태가 아닙니다. (G01)" },
  G02: { pass: "현재 Step과 일치합니다.", fail: "현재 Step이 아닙니다. (G02)" },
  G05: { pass: "중복 제출 없음.", fail: "이미 제출된 Step입니다. (G05)" },
  G06: { pass: "버전 일치.", fail: "다른 기기에서 변경되었습니다. 새로고침하세요. (G06)" },
  P01: {
    pass: "생산량이 원재료·기계·인력 Capacity 이내입니다.",
    fail: "생산량이 Capacity를 초과합니다. (P01)",
  },
  P02: {
    pass: "Big Machine 가동 대수가 유효합니다.",
    fail: "Big Machine 가동 대수가 보유 대수를 초과합니다. (P02)",
  },
  P03: {
    pass: "Small Machine 가동 대수가 유효합니다.",
    fail: "Small Machine 가동 대수가 보유 대수를 초과합니다. (P03)",
  },
  P04: {
    pass: "생산량 입력값이 유효합니다.",
    fail: "생산량은 0 이상의 정수여야 합니다. (P04)",
  },
  S01: {
    pass: "판매가가 지역 한도 이내입니다.",
    fail: "판매가가 지역 최대가를 초과합니다. (S01)",
  },
  S02: {
    pass: "지역별 판매량이 수요 한도 이내입니다.",
    fail: "판매량이 지역 수요를 초과합니다. (S02)",
  },
  S03: {
    pass: "총 판매량이 영업 인력 Capacity 이내입니다.",
    fail: "총 판매량이 영업 인력 Capacity를 초과합니다. (S03)",
  },
  S04: {
    pass: "완제품 재고가 충분합니다.",
    fail: "판매량이 완제품 재고를 초과합니다. (S04)",
  },
  S05: {
    pass: "판매 후 현금이 0 이상입니다.",
    fail: "판매 후 현금이 부족합니다. (S05)",
  },
};

export function localizeValidationMessage(ruleId: string, passed: boolean, fallback: string): string {
  const entry = VALIDATION_MESSAGES_KO[ruleId];
  if (!entry) return fallback;
  return passed ? entry.pass : entry.fail;
}

export function localizeValidationResult<T extends { ruleId: string; passed: boolean; message: string }>(
  rules: T[]
): T[] {
  return rules.map((r) => ({
    ...r,
    message: localizeValidationMessage(r.ruleId, r.passed, r.message),
  }));
}
