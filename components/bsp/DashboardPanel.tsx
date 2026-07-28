"use client";

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

export type DashboardView = {
  teamName: string;
  periodLabel: string;
  stepPhase?: string;
  cashManwon: number;
  debtManwon: number;
  depositManwon: number;
  equityManwon: number;
  landPlots: number;
  machineBig: number;
  machineSmall: number;
  capacityMachine: number;
  maxMaterials: number;
  headPurchase?: number;
  headProduction?: number;
  headSales?: number;
  purchaseCapacity?: number;
  productionCapacity?: number;
  salesCapacity?: number;
  payrollForecastHalfManwon?: number;
  inventoryTotalUnits?: number;
  finishedGoodsQty?: number;
  halfYearProductionQty?: number;
  halfYearSalesQty?: number;
  halfYearRevenueManwon?: number;
  netIncomeManwon?: number;
  debtRatioPercent?: number;
  roePercent?: number;
  roaPercent?: number;
  openBranches?: string[];
  economy?: {
    rawMaterialIndex: number;
    marketDemandIndex: number;
    businessCycleIndex: number;
  };
  recentEvents?: string[];
  journalsLocked?: boolean;
  settlementComplete?: boolean;
};

const STEP_LABELS: Record<string, string> = {
  STEP1_FINANCE: "Step 1 — 자금",
  STEP2_INVESTMENT: "Step 2 — 설비",
  STEP3_HR: "Step 3 — 인력",
  STEP4_PURCHASE: "Step 4 — 구매",
  STEP5_PRODUCTION: "Step 5 — 생산",
  STEP6_SALES: "Step 6 — 판매",
  STEP7_SETTLEMENT: "Step 7 — 결산",
};

export function DashboardPanel({ dashboard }: { dashboard: DashboardView | null }) {
  if (!dashboard) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">Dashboard</h3>
        <p className="text-sm text-slate-500">회사 생성 후 표시됩니다.</p>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["팀", dashboard.teamName],
    ["반기", dashboard.periodLabel],
    ["현재 Step", STEP_LABELS[dashboard.stepPhase ?? ""] ?? dashboard.stepPhase ?? "-"],
    ["현금", fmt(dashboard.cashManwon)],
    ["재고(원재료)", String(dashboard.inventoryTotalUnits ?? 0) + " 단위"],
    ["완제품", String(dashboard.finishedGoodsQty ?? 0) + " 개"],
    ["생산능력", String(dashboard.capacityMachine)],
    ["생산량(반기)", String(dashboard.halfYearProductionQty ?? 0)],
    ["판매량(반기)", String(dashboard.halfYearSalesQty ?? 0)],
    ["매출(반기)", fmt(dashboard.halfYearRevenueManwon ?? 0)],
    ["순이익", fmt(dashboard.netIncomeManwon ?? 0)],
    ["부채비율", pct(dashboard.debtRatioPercent ?? 0)],
    ["ROE", pct(dashboard.roePercent ?? 0)],
    ["ROA", pct(dashboard.roaPercent ?? 0)],
    ["자기자본", fmt(dashboard.equityManwon)],
    ["부채", fmt(dashboard.debtManwon)],
  ];

  if (dashboard.economy) {
    rows.push(
      ["경제환경(원자재)", String(dashboard.economy.rawMaterialIndex)],
      ["경제환경(수요)", String(dashboard.economy.marketDemandIndex)],
      ["경제환경(경기)", String(dashboard.economy.businessCycleIndex)]
    );
  }

  if (dashboard.settlementComplete) {
    rows.push(["결산", "완료 · Journal Locked"]);
  } else if (dashboard.journalsLocked) {
    rows.push(["Journal", "Locked"]);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 font-semibold">Dashboard</h3>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-slate-600">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
      {dashboard.recentEvents && dashboard.recentEvents.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="mb-1 text-xs font-medium text-slate-600">최근 이벤트</p>
          <ul className="text-xs text-slate-500">
            {dashboard.recentEvents.map((e, i) => (
              <li key={i}>· {e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
