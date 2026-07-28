"use client";

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

export type FinancialsView = {
  balanceSheet: {
    assets: {
      cash: number;
      deposits: number;
      rawMaterials: number;
      finishedGoods: number;
      land: number;
      machinery: number;
      total: number;
    };
    liabilities: { longTermDebt: number; total: number };
    equity: { capital: number; retainedEarnings: number; total: number };
  };
  profitAndLoss: {
    revenue: number;
    cogs: number;
    cogsBreakdown?: {
      materialCost: number;
      logisticsMaterial: number;
      payrollPurchaseProduction: number;
      machineOperating: number;
      depreciation: number;
    };
    grossProfit: number;
    sga?: {
      branchSetup: number;
      payrollSales: number;
      logisticsProduct: number;
      welfare: number;
      total: number;
    };
    operatingIncome: number;
    financialIncome: number;
    financialExpense: number;
    pretaxIncome: number;
    corporateTax: number;
    netIncome: number;
    payrollForecastNote?: string;
  };
  balanceSheetValidation?: { ok: boolean; deltaManwon: number };
  trialBalanceValidation?: { ok: boolean; deltaManwon: number };
  periodChanges?: Array<{ line: string; openManwon: number; currentManwon: number; deltaManwon: number }>;
};

export function FinancialSummaryPanel({ financials }: { financials: FinancialsView | null }) {
  if (!financials) return null;
  const bs = financials.balanceSheet;
  const pl = financials.profitAndLoss;
  const bd = pl.cogsBreakdown;
  const sga = pl.sga;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <h3 className="mb-3 font-semibold">재무제표 (Sheet1 구조)</h3>
      <div className="space-y-3">
        <section>
          <p className="mb-1 font-medium text-slate-700">재무상태표 (B/S)</p>
          <p className="text-slate-600">
            현금 {fmt(bs.assets.cash)} · 예금 {fmt(bs.assets.deposits)} · 재고 {fmt(bs.assets.rawMaterials ?? 0)}
          </p>
          <p className="text-slate-600">
            토지 {fmt(bs.assets.land)} · 기계 {fmt(bs.assets.machinery)}
          </p>
          <p className="mt-1 text-slate-800">자산 합계 {fmt(bs.assets.total)}</p>
          <p className="text-slate-600">부채 {fmt(bs.liabilities.total)} · 자본 {fmt(bs.equity.total)}</p>
        </section>
        <section>
          <p className="mb-1 font-medium text-slate-700">손익계산서 (P/L)</p>
          <p className="text-slate-600">매출 {fmt(pl.revenue)}</p>
          <p className="text-slate-600">매출원가 {fmt(pl.cogs)}</p>
          {bd && (
            <ul className="ml-3 text-xs text-slate-500">
              <li>· 재료비 {fmt(bd.materialCost)} · 물류(재료) {fmt(bd.logisticsMaterial)}</li>
              <li>· 인건비(구매·생산) {fmt(bd.payrollPurchaseProduction)} · 감가 {fmt(bd.depreciation)}</li>
            </ul>
          )}
          <p className="text-slate-600">매출총이익 {fmt(pl.grossProfit)}</p>
          {sga && (
            <ul className="ml-3 text-xs text-slate-500">
              <li>· 브랜치 {fmt(sga.branchSetup)} · 인건비(영업) {fmt(sga.payrollSales)}</li>
              <li>· 복리후생 {fmt(sga.welfare)} · 물류(제품) {fmt(sga.logisticsProduct)}</li>
            </ul>
          )}
          <p className="text-slate-600">영업이익 {fmt(pl.operatingIncome)}</p>
          <p className="text-slate-600">
            금융수익 {fmt(pl.financialIncome)} · 금융비용 {fmt(pl.financialExpense)}
          </p>
          <p className="text-slate-600">법인세 {fmt(pl.corporateTax)}</p>
          <p className="text-slate-800">당기순이익 {fmt(pl.netIncome)}</p>
          {pl.payrollForecastNote && (
            <p className="mt-1 text-xs text-amber-500/90">{pl.payrollForecastNote}</p>
          )}
        </section>
      </div>
    </div>
  );
}
