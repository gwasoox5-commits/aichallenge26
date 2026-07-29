"use client";

import type { ReactNode } from "react";
import type { FinancialsView } from "./FinancialSummaryPanel";

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-1 ${bold ? "font-semibold text-slate-900" : "text-slate-700"}`}>
      <span className="min-w-0 shrink">{label}</span>
      <span className="shrink-0 text-right tabular-nums">{value}</span>
    </div>
  );
}

function PanelShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <h3 className="mb-3 font-semibold text-slate-900">{title}</h3>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

export function ProfitLossPanel({ financials }: { financials: FinancialsView | null }) {
  if (!financials) {
    return (
      <PanelShell title="손익계산서 (P/L)">
        <p className="text-slate-500">데이터 없음</p>
      </PanelShell>
    );
  }

  const pl = financials.profitAndLoss;
  const bd = pl.cogsBreakdown;
  const sga = pl.sga;

  return (
    <PanelShell title="손익계산서 (P/L)">
      {(financials.balanceSheetValidation || financials.trialBalanceValidation) && (
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {financials.balanceSheetValidation && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                financials.balanceSheetValidation.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}
            >
              B/S {financials.balanceSheetValidation.ok ? "균형 OK" : `불균형 ${financials.balanceSheetValidation.deltaManwon}`}
            </span>
          )}
          {financials.trialBalanceValidation && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                financials.trialBalanceValidation.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}
            >
              TB {financials.trialBalanceValidation.ok ? "대차 OK" : `차이 ${financials.trialBalanceValidation.deltaManwon}`}
            </span>
          )}
        </div>
      )}

      {financials.periodChanges && financials.periodChanges.length > 0 && (
        <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <h4 className="mb-2 text-xs font-medium text-indigo-900">이번 반기 변화</h4>
          <div className="space-y-1 text-xs">
            {financials.periodChanges.map((c) => (
              <div key={c.line} className="flex justify-between gap-2 text-indigo-950">
                <span>{c.line}</span>
                <span className="font-mono tabular-nums">
                  {c.deltaManwon >= 0 ? "+" : ""}
                  {c.deltaManwon.toLocaleString("ko-KR")} 만원
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Row label="매출" value={fmt(pl.revenue)} />
      <Row label="매출원가" value={fmt(pl.cogs)} />
      {bd && (
        <div className="ml-2 space-y-0.5 text-xs text-slate-500">
          <Row label="· 재료비" value={fmt(bd.materialCost)} />
          <Row label="· 물류(재료)" value={fmt(bd.logisticsMaterial)} />
          <Row label="· 기계가동비" value={fmt(bd.machineOperating)} />
          <Row label="· 인건비(구매·생산)" value={fmt(bd.payrollPurchaseProduction)} />
          <Row label="· 감가상각" value={fmt(bd.depreciation)} />
        </div>
      )}
      <Row label="매출총이익" value={fmt(pl.grossProfit)} bold />
      {sga && (
        <>
          <Row label="판매관리비" value={fmt(sga.total)} />
          <div className="ml-2 space-y-0.5 text-xs text-slate-500">
            <Row label="· 브랜치" value={fmt(sga.branchSetup)} />
            <Row label="· 인건비(영업)" value={fmt(sga.payrollSales)} />
            <Row label="· 복리후생" value={fmt(sga.welfare)} />
            <Row label="· 물류(제품)" value={fmt(sga.logisticsProduct)} />
          </div>
        </>
      )}
      <Row label="영업이익" value={fmt(pl.operatingIncome)} bold />
      <Row label="금융수익" value={fmt(pl.financialIncome)} />
      <Row label="금융비용" value={fmt(pl.financialExpense)} />
      <Row label="법인세" value={fmt(pl.corporateTax)} />
      <Row label="당기순이익" value={fmt(pl.netIncome)} bold />
      {pl.payrollForecastNote && <p className="mt-2 text-xs text-amber-600">{pl.payrollForecastNote}</p>}
    </PanelShell>
  );
}

export function BalanceSheetPanel({ financials }: { financials: FinancialsView | null }) {
  if (!financials) {
    return (
      <PanelShell title="재무상태표 (B/S)">
        <p className="text-slate-500">데이터 없음</p>
      </PanelShell>
    );
  }

  const bs = financials.balanceSheet;

  return (
    <PanelShell title="재무상태표 (B/S)">
      <Row label="현금" value={fmt(bs.assets.cash)} />
      <Row label="예금" value={fmt(bs.assets.deposits)} />
      <Row label="재고(원재료)" value={fmt(bs.assets.rawMaterials ?? 0)} />
      <Row label="재고(완제품)" value={fmt(bs.assets.finishedGoods ?? 0)} />
      <Row label="토지" value={fmt(bs.assets.land)} />
      <Row label="기계(순)" value={fmt(bs.assets.machinery)} />
      <Row label="자산 합계" value={fmt(bs.assets.total)} bold />
      <Row label="차입금" value={fmt(bs.liabilities.longTermDebt)} />
      <Row label="자본" value={fmt(bs.equity.capital)} />
      <Row label="이익잉여금" value={fmt(bs.equity.retainedEarnings)} />
      <Row label="자본 합계" value={fmt(bs.equity.total)} bold />
    </PanelShell>
  );
}

/** @deprecated Use ProfitLossPanel + BalanceSheetPanel in horizontal layout */
export function FinancialStatementsPanel({ financials }: { financials: FinancialsView | null }) {
  if (!financials) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold">재무제표</h3>
        <p className="mt-2 text-sm text-slate-500">데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProfitLossPanel financials={financials} />
      <BalanceSheetPanel financials={financials} />
    </div>
  );
}
