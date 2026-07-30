import type { CompanyAggregate, SessionAggregate } from "./ports/repositories";
import type {
  BspGameStep,
  FacilityPayload,
  HiringPayload,
  LoanPayload,
  MaterialPayload,
  ProductionPayload,
  SalesPayload,
} from "../domain/types";
import { GAME_CONSTANTS } from "../domain/types";
import { GAME_STEP_LABELS } from "../domain/period/display-labels";
import { REGION_CATALOG } from "../domain/regions/region-catalog";

const ANALYSIS_STEPS: BspGameStep[] = ["LOAN", "FACILITY", "HIRING", "MATERIAL", "PRODUCTION", "SALES"];

export interface TeamDecisionInsight {
  companyId: string;
  teamName: string;
  cashManwon: number;
  submittedSteps: string[];
  highlights: string[];
  discussionPoints: string[];
  warnings: string[];
}

export interface SessionDebriefAnalysis {
  sessionId: string;
  periodLabel: string;
  stepPhase: string;
  generatedAt: string;
  sessionSummary: string[];
  crossTeamNotes: string[];
  teams: TeamDecisionInsight[];
}

function regionLabel(code: string): string {
  return REGION_CATALOG.find((r) => r.code === code)?.displayName ?? code;
}

function decisionForStep(company: CompanyAggregate, session: SessionAggregate, step: BspGameStep) {
  return company.decisions
    .filter(
      (d) =>
        d.periodId === session.periodId &&
        d.step === step &&
        (d.status === "POSTED" || d.status === "SUBMITTED")
    )
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];
}

function analyzeLoan(payload: LoanPayload): string[] {
  const notes: string[] = [];
  const borrowed =
    payload.loanEarly * GAME_CONSTANTS.loanUnitManwon + payload.loanMid * GAME_CONSTANTS.loanUnitManwon;
  const depositAmt = payload.deposit * GAME_CONSTANTS.loanUnitManwon;
  const repaymentAmt = payload.loanRepayment * GAME_CONSTANTS.loanUnitManwon;
  if (borrowed >= 5_000) notes.push(`공격적 차입 (${borrowed.toLocaleString()}만)`);
  else if (borrowed > 0) notes.push(`차입 ${borrowed.toLocaleString()}만`);
  if (depositAmt >= 3_000) notes.push(`예금 적립 ${depositAmt.toLocaleString()}만 — 보수적 현금 운용`);
  else if (depositAmt > 0) notes.push(`예금 ${depositAmt.toLocaleString()}만`);
  if (repaymentAmt > 0) notes.push(`차입금 상환 ${repaymentAmt.toLocaleString()}만`);
  if (notes.length === 0) notes.push("추가 차입·예금 없이 기존 현금 유지");
  return notes;
}

function analyzeFacility(payload: FacilityPayload): string[] {
  const notes: string[] = [];
  if (payload.landPlotsPurchased > 0) notes.push(`토지 ${payload.landPlotsPurchased}필지 매입`);
  if (payload.machineBigPurchased > 0) notes.push(`대형 설비 ${payload.machineBigPurchased}대`);
  if (payload.machineSmallPurchased > 0) notes.push(`소형 설비 ${payload.machineSmallPurchased}대`);
  if (notes.length === 0) notes.push("설비 추가 투자 없음");
  return notes;
}

function analyzeHiring(payload: HiringPayload): string[] {
  const total = payload.headPurchase + payload.headProduction + payload.headSales;
  const notes = [
    `인력 ${total}명 (구매 ${payload.headPurchase} · 생산 ${payload.headProduction} · 영업 ${payload.headSales})`,
  ];
  const resignTotal =
    (payload.resignations?.purchase ?? 0) +
    (payload.resignations?.production ?? 0) +
    (payload.resignations?.sales ?? 0);
  if (resignTotal > 0) notes.push(`퇴사 ${resignTotal}명`);
  if ((payload.transfers?.length ?? 0) > 0) notes.push(`부서 이동 ${payload.transfers!.length}건`);
  return notes;
}

function analyzeMaterial(payload: MaterialPayload): { highlights: string[]; warnings: string[] } {
  const highlights: string[] = [];
  const warnings: string[] = [];
  const active = (payload.lines ?? []).filter((line) => line.qty > 0);
  const totalQty = active.reduce((sum, line) => sum + line.qty, 0);
  if (active.length === 0) {
    highlights.push("원재료 구매 없음");
    return { highlights, warnings };
  }
  const regions = active.map((line) => regionLabel(line.regionCode)).join(", ");
  highlights.push(`${active.length}개 지역 · 총 ${totalQty}단위 (${regions})`);
  const branches = payload.branches ?? [];
  if (branches.length > 0) {
    highlights.push(`신규 구매 브랜치 ${branches.map((b) => regionLabel(b.regionCode)).join(", ")}`);
  }
  const avgBid =
    active.reduce((sum, line) => sum + (line.unitPriceBidManwon ?? 0), 0) / active.length;
  if (avgBid >= 20) highlights.push(`평균 입찰 단가 ${Math.round(avgBid)}만 — 높은 단가 전략`);
  else if (avgBid > 0 && avgBid <= 12) warnings.push(`평균 입찰 단가 ${Math.round(avgBid)}만 — 낮은 단가, 배분 불리 가능`);
  return { highlights, warnings };
}

function analyzeProduction(payload: ProductionPayload): string[] {
  return [
    `생산 ${payload.productionQty}개 (대형 가동 ${payload.machineBigRun} · 소형 ${payload.machineSmallRun})`,
  ];
}

function analyzeSales(payload: SalesPayload): { highlights: string[]; warnings: string[] } {
  const highlights: string[] = [];
  const warnings: string[] = [];
  const active = (payload.lines ?? []).filter((line) => line.qty > 0);
  const totalQty = active.reduce((sum, line) => sum + line.qty, 0);
  if (active.length === 0) {
    highlights.push("판매 입찰 없음");
    return { highlights, warnings };
  }
  const regions = active.map((line) => regionLabel(line.regionCode)).join(", ");
  highlights.push(`${active.length}개 지역 · 총 ${totalQty}개 (${regions})`);
  const branches = payload.branchesNew ?? [];
  if (branches.length > 0) {
    highlights.push(`신규 판매 브랜치 ${branches.map((b) => regionLabel(b.regionCode)).join(", ")}`);
  }
  const avgPrice =
    active.reduce((sum, line) => sum + line.unitPriceManwon, 0) / active.length;
  if (avgPrice <= 80) warnings.push(`평균 판매가 ${Math.round(avgPrice)}만 — 저가 입찰, 우선 판매 전략`);
  else if (avgPrice >= 120) highlights.push(`평균 판매가 ${Math.round(avgPrice)}만 — 고가·마진 우선`);
  return { highlights, warnings };
}

function buildTeamInsight(company: CompanyAggregate, session: SessionAggregate): TeamDecisionInsight {
  const highlights: string[] = [];
  const discussionPoints: string[] = [];
  const warnings: string[] = [];
  const submittedSteps: string[] = [];

  for (const step of ANALYSIS_STEPS) {
    const decision = decisionForStep(company, session, step);
    if (!decision) continue;
    submittedSteps.push(step);
    const stepLabel = GAME_STEP_LABELS[step];

    if (step === "LOAN") {
      const loanPayload = decision.payload as LoanPayload;
      const notes = analyzeLoan(loanPayload);
      highlights.push(`${stepLabel}: ${notes.join(" · ")}`);
      const borrowed =
        loanPayload.loanEarly * GAME_CONSTANTS.loanUnitManwon +
        loanPayload.loanMid * GAME_CONSTANTS.loanUnitManwon;
      if (borrowed >= 8_000) {
        discussionPoints.push(`${company.teamName} — 높은 차입 후 이자 부담을 감당할 현금흐름 계획은?`);
      }
    } else if (step === "FACILITY") {
      highlights.push(`${stepLabel}: ${analyzeFacility(decision.payload as FacilityPayload).join(" · ")}`);
    } else if (step === "HIRING") {
      highlights.push(`${stepLabel}: ${analyzeHiring(decision.payload as HiringPayload).join(" · ")}`);
    } else if (step === "MATERIAL") {
      const { highlights: matHighlights, warnings: matWarnings } = analyzeMaterial(decision.payload as MaterialPayload);
      highlights.push(`${stepLabel}: ${matHighlights.join(" · ")}`);
      warnings.push(...matWarnings);
      discussionPoints.push(`${company.teamName} — 원재료 지역·단가 선택의 근거는?`);
    } else if (step === "PRODUCTION") {
      highlights.push(`${stepLabel}: ${analyzeProduction(decision.payload as ProductionPayload).join(" · ")}`);
    } else if (step === "SALES") {
      const { highlights: salesHighlights, warnings: salesWarnings } = analyzeSales(decision.payload as SalesPayload);
      highlights.push(`${stepLabel}: ${salesHighlights.join(" · ")}`);
      warnings.push(...salesWarnings);
    }
  }

  if (submittedSteps.length === 0) {
    highlights.push("이번 반기 아직 제출된 의사결정이 없습니다.");
  }

  const missing = ANALYSIS_STEPS.filter((step) => !submittedSteps.includes(step));
  if (missing.length > 0 && missing.length < ANALYSIS_STEPS.length) {
    warnings.push(`미제출 Step: ${missing.map((s) => GAME_STEP_LABELS[s]).join(", ")}`);
  }

  return {
    companyId: company.id,
    teamName: company.teamName,
    cashManwon: company.operational.cashManwon,
    submittedSteps,
    highlights,
    discussionPoints,
    warnings,
  };
}

export function buildSessionDebriefAnalysis(
  session: SessionAggregate,
  companies: CompanyAggregate[]
): SessionDebriefAnalysis {
  const teams = companies.map((company) => buildTeamInsight(company, session));
  const sessionSummary: string[] = [];
  const crossTeamNotes: string[] = [];

  const submittedCounts = teams.map((t) => t.submittedSteps.length);
  const maxSteps = Math.max(0, ...submittedCounts);
  const minSteps = Math.min(...submittedCounts.length ? submittedCounts : [0]);
  sessionSummary.push(`참가 ${teams.length}팀 · 이번 반기 Step 제출 ${minSteps}~${maxSteps}/6`);

  if (teams.length >= 2) {
    const byCash = [...teams].sort((a, b) => b.cashManwon - a.cashManwon);
    crossTeamNotes.push(
      `현금 1위 ${byCash[0].teamName} (${byCash[0].cashManwon.toLocaleString()}만) · 꼴찌 ${byCash[byCash.length - 1].teamName} (${byCash[byCash.length - 1].cashManwon.toLocaleString()}만)`
    );
  }

  const materialRegions = new Map<string, string[]>();
  for (const company of companies) {
    const decision = decisionForStep(company, session, "MATERIAL");
    if (!decision) continue;
    const active = ((decision.payload as MaterialPayload).lines ?? []).filter((line) => line.qty > 0);
    if (active.length > 0) {
      materialRegions.set(
        company.teamName,
        active.map((line) => regionLabel(line.regionCode))
      );
    }
  }
  if (materialRegions.size >= 2) {
    const overlap = [...materialRegions.entries()]
      .map(([team, regions]) => `${team}: ${regions.join("/")}`)
      .join(" · ");
    crossTeamNotes.push(`원재료 구매 지역 — ${overlap}`);
  }

  const lagging = teams.filter((t) => t.submittedSteps.length < maxSteps);
  if (lagging.length > 0 && maxSteps > 0) {
    crossTeamNotes.push(`진행 지연: ${lagging.map((t) => t.teamName).join(", ")}`);
  }

  if (crossTeamNotes.length === 0) {
    crossTeamNotes.push("팀 간 비교할 의사결정이 아직 충분하지 않습니다.");
  }

  return {
    sessionId: session.id,
    periodLabel: session.periodLabel,
    stepPhase: session.stepPhase,
    generatedAt: new Date().toISOString(),
    sessionSummary,
    crossTeamNotes,
    teams,
  };
}
