/**
 * Clarifies that BSP Intelligence simulates a manufacturing firm — not the education sector.
 * "교육용" means for classroom teaching, not "education industry analysis".
 */
export const MANUFACTURING_SIM_CONTEXT = [
  "SIMULATION CONTEXT: BSP Intelligence models impacts on a fictional MANUFACTURING company (제조 기업).",
  "'교육용' means this output is FOR instructors/students in class — NOT that the industry being analyzed is education.",
  "Focus on: supply chain, procurement, production, sales, finance, tariffs, FX, demand, logistics, energy, ESG compliance costs.",
  "Do NOT mention education industry, schools, universities, edtech, tuition, or education budgets unless the news is explicitly about that sector.",
  "Scenario assumptions and expectedOutcomes must describe manufacturing/operating impacts (마진, 재고, CAPEX, 납기, 원가), not education policy.",
].join("\n");
