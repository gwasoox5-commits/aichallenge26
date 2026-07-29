"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useAdminSession } from "@/lib/bsp/admin-session-context";
import type { AccountingAuditPayload } from "@/src/bsp/domain/accounting/accounting-audit";
import { formatPeriodLabel } from "@/src/bsp/domain/period/display-labels";

type Tab = "journals" | "trialBalance" | "balanceSheet" | "incomeStatement" | "diffReport";

const TABS: { id: Tab; label: string }[] = [
  { id: "journals", label: "Journal" },
  { id: "trialBalance", label: "Trial Balance" },
  { id: "balanceSheet", label: "Balance Sheet" },
  { id: "incomeStatement", label: "Income Statement" },
  { id: "diffReport", label: "Diff Report" },
];

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + " 만원";
}

export function AccountingAuditPanel() {
  const { sessionId } = useAdminSession();
  const [teams, setTeams] = useState<Array<{ companyId: string; teamName: string }>>([]);
  const [companyId, setCompanyId] = useState("");
  const [tab, setTab] = useState<Tab>("journals");
  const [audit, setAudit] = useState<AccountingAuditPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    authFetch(`/api/v1/gm/sessions/${sessionId}/desk`)
      .then((r) => (r.ok ? r.json() : null))
      .then((desk) => {
        const list = (desk?.teams ?? []).map((t: { companyId: string; teamName: string }) => ({
          companyId: t.companyId,
          teamName: t.teamName,
        }));
        setTeams(list);
        if (list.length > 0 && !companyId) setCompanyId(list[0].companyId);
      })
      .catch(() => undefined);
  }, [sessionId, companyId]);

  const loadAudit = useCallback(async () => {
    if (!sessionId || !companyId) return;
    setLoading(true);
    setError("");
    const res = await authFetch(`/api/v1/gm/sessions/${sessionId}/companies/${companyId}/accounting-audit`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "조회 실패");
      setAudit(null);
    } else {
      setAudit(data);
    }
    setLoading(false);
  }, [sessionId, companyId]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  if (!sessionId) {
    return <p className="text-sm text-slate-500">세션을 선택하세요.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm">
          <span className="text-slate-600">팀</span>
          <select
            className="mt-1 block min-w-[200px] rounded-lg border border-slate-300 px-3 py-2"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.companyId} value={t.companyId}>
                {t.teamName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={loadAudit}
          disabled={loading || !companyId}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "조회 중…" : "새로고침"}
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {audit && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusCard
              title="Balance Sheet"
              ok={audit.balanceSheetValidation.ok}
              detail={`A=${fmt(audit.balanceSheetValidation.assetsManwon)} · L+E=${fmt(audit.balanceSheetValidation.liabilitiesAndEquityManwon)}`}
            />
            <StatusCard
              title="Trial Balance"
              ok={audit.trialBalanceValidation.ok}
              detail={`차변 ${fmt(audit.trialBalanceValidation.totalDebitManwon)} · 대변 ${fmt(audit.trialBalanceValidation.totalCreditManwon)}`}
            />
            <StatusCard
              title="Excel Diff"
              ok={audit.diffReport.pass}
              detail={audit.diffReport.note}
            />
          </div>

          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  tab === t.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            {tab === "journals" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  {formatPeriodLabel(audit.periodLabel)} · 의사결정 {audit.decisions.length}건 · Journal {audit.journals.length}건
                </p>
                {audit.journals.map((j) => (
                  <div key={j.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-medium">
                      {j.description}{" "}
                      <span className="text-slate-500">({j.step ?? j.source ?? j.transactionType})</span>
                    </p>
                    <table className="mt-2 w-full text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left">계정</th>
                          <th className="text-right">차변</th>
                          <th className="text-right">대변</th>
                        </tr>
                      </thead>
                      <tbody>
                        {j.lines.map((l, i) => (
                          <tr key={i}>
                            <td>{l.memo ?? l.accountCode}</td>
                            <td className="text-right">{l.debitManwon || "—"}</td>
                            <td className="text-right">{l.creditManwon || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {tab === "trialBalance" && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2">계정</th>
                    <th className="py-2 text-right">차변</th>
                    <th className="py-2 text-right">대변</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.trialBalance.map((l) => (
                    <tr key={l.accountCode} className="border-b border-slate-100">
                      <td className="py-1.5">{l.accountName}</td>
                      <td className="py-1.5 text-right font-mono">{l.debitManwon || "—"}</td>
                      <td className="py-1.5 text-right font-mono">{l.creditManwon || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "balanceSheet" && (
              <div className="space-y-1">
                <Row label="현금" value={fmt(audit.financialStatements.balanceSheet.assets.cash)} />
                <Row label="예금" value={fmt(audit.financialStatements.balanceSheet.assets.deposits)} />
                <Row label="재고(원재료)" value={fmt(audit.financialStatements.balanceSheet.assets.rawMaterials)} />
                <Row label="재고(완제품)" value={fmt(audit.financialStatements.balanceSheet.assets.finishedGoods)} />
                <Row label="자산 합계" value={fmt(audit.financialStatements.balanceSheet.assets.total)} bold />
                <Row label="부채 합계" value={fmt(audit.financialStatements.balanceSheet.liabilities.total)} />
                <Row label="자본 합계" value={fmt(audit.financialStatements.balanceSheet.equity.total)} bold />
              </div>
            )}

            {tab === "incomeStatement" && (
              <div className="space-y-1">
                <Row label="매출" value={fmt(audit.financialStatements.profitAndLoss.revenue)} />
                <Row label="매출원가" value={fmt(audit.financialStatements.profitAndLoss.cogs)} />
                <Row label="매출총이익" value={fmt(audit.financialStatements.profitAndLoss.grossProfit)} bold />
                <Row label="영업이익" value={fmt(audit.financialStatements.profitAndLoss.operatingIncome)} bold />
                <Row label="당기순이익" value={fmt(audit.financialStatements.profitAndLoss.netIncome)} bold />
              </div>
            )}

            {tab === "diffReport" && (
              <div>
                <p className="mb-3 text-xs text-slate-600">{audit.diffReport.note}</p>
                {audit.diffReport.deltas.length === 0 ? (
                  <p className="text-emerald-700">Diff 없음 — Excel parity 통과</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-slate-500">
                        <th className="py-2">항목</th>
                        <th className="py-2 text-right">Expected</th>
                        <th className="py-2 text-right">Actual</th>
                        <th className="py-2 text-right">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.diffReport.deltas.map((d) => (
                        <tr key={d.field} className="border-b border-slate-100">
                          <td className="py-1.5 font-mono">{d.field}</td>
                          <td className="py-1.5 text-right font-mono">{d.expected}</td>
                          <td className="py-1.5 text-right font-mono">{d.actual}</td>
                          <td className="py-1.5 text-right font-mono text-rose-600">{d.delta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({ title, ok, detail }: { title: string; ok: boolean; detail: string }) {
  return (
    <div className={`rounded-xl border p-4 ${ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
      <p className="text-xs font-medium text-slate-600">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${ok ? "text-emerald-800" : "text-rose-800"}`}>{ok ? "PASS" : "FAIL"}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
