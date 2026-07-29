import type { CompanyAggregate, SessionAggregate } from "./ports/repositories";
import type { BspGameStep, BspStepPhase, DashboardDto } from "../domain/types";
import { ALL_GAME_STEPS, PHASE_TO_STEP, STEP_TO_PHASE } from "../domain/types";
import { buildFinancialStatements } from "../domain/accounting/financial-statements";

export class DashboardService {
  build(company: CompanyAggregate, session: SessionAggregate): DashboardDto {
    const op = company.operational;
    const completedSteps = company.decisions
      .filter((d) => d.periodId === company.periodId && d.status === "POSTED")
      .map((d) => d.step as BspGameStep);

    const inventoryTotalUnits = op.inventory.A + op.inventory.B + op.inventory.C + op.inventory.D;
    const fs = buildFinancialStatements(
      company.ledger,
      company.periodLabel,
      company.id,
      op,
      session.economy
    );
    const totalAssets = fs.balanceSheet.assets.total;
    const equity = fs.balanceSheet.equity.total;
    const debt = fs.balanceSheet.liabilities.longTermDebt;
    const netIncome = fs.profitAndLoss.netIncome;
    const roePercent = equity > 0 ? Math.round((netIncome / equity) * 1000) / 10 : 0;
    const roaPercent = totalAssets > 0 ? Math.round((netIncome / totalAssets) * 1000) / 10 : 0;
    const debtRatioPercent = equity > 0 ? Math.round((debt / equity) * 1000) / 10 : 0;

    const currentStep = PHASE_TO_STEP[session.stepPhase];
    const currentStepSubmitted = currentStep ? completedSteps.includes(currentStep) : true;
    const elapsedSec = Math.floor((Date.now() - session.stepStartedAt.getTime()) / 1000);
    const remainingTimeSec = Math.max(0, session.stepDurationSec - elapsedSec);
    const economyLabel = `수요 ${session.economy.marketDemandIndex} · 공급 ${session.economy.marketSupplyIndex} · 금리 ${session.economy.interestRateLoan}%`;

    return {
      companyId: company.id,
      teamName: company.teamName,
      periodIndex: session.periodIndex,
      year: session.year,
      half: session.half,
      periodLabel: session.periodLabel,
      sessionPhase: session.sessionPhase,
      stepPhase: session.stepPhase,
      cashManwon: op.cashManwon,
      debtManwon: op.debtManwon,
      depositManwon: op.depositManwon,
      equityManwon: op.equityManwon,
      landPlots: op.landPlots,
      machineBig: op.machineBig,
      machineSmall: op.machineSmall,
      capacityMachine: op.capacityMachine,
      maxMaterials: op.maxMaterials,
      headPurchase: op.headPurchase,
      headProduction: op.headProduction,
      headSales: op.headSales,
      purchaseCapacity: op.purchaseCapacity,
      productionCapacity: op.productionCapacity,
      salesCapacity: op.salesCapacity,
      payrollForecastHalfManwon: op.payrollForecastHalfManwon,
      inventoryTotalUnits,
      openBranches: op.openBranches,
      finishedGoodsQty: op.finishedGoodsQty,
      halfYearProductionQty: op.halfYearProductionQty,
      halfYearSalesQty: op.halfYearSalesQty,
      halfYearRevenueManwon: op.halfYearRevenueManwon,
      netIncomeManwon: netIncome,
      debtRatioPercent,
      roePercent,
      roaPercent,
      economy: session.economy,
      recentEvents: [],
      journalsLocked: op.journalsLocked,
      settlementComplete: op.settlementComplete,
      statusVersion: company.statusVersion,
      completedSteps,
      stepStartedAt: session.stepStartedAt.toISOString(),
      remainingTimeSec,
      stepLocked: session.stepLocked,
      currentStepSubmitted,
      stepDurationSec: session.stepDurationSec,
      economyLabel,
    };
  }

  buildStepProgress(stepPhase: BspStepPhase, completedSteps: BspGameStep[]) {
    return ALL_GAME_STEPS.map((step, index) => {
      const phase = STEP_TO_PHASE[step];
      const isCompleted = completedSteps.includes(step);
      const isCurrent = phase === stepPhase;
      return {
        step,
        phase,
        order: index + 1,
        label: this.stepLabel(step),
        status: isCompleted ? "completed" : isCurrent ? "current" : "pending",
      };
    });
  }

  private stepLabel(step: BspGameStep): string {
    const labels: Record<BspGameStep, string> = {
      LOAN: "자금 조달",
      FACILITY: "설비 투자",
      HIRING: "인력 채용",
      MATERIAL: "원재료 구매",
      PRODUCTION: "생산",
      SALES: "판매",
      SETTLEMENT: "반기 결산",
    };
    return labels[step];
  }
}

export const dashboardService = new DashboardService();
