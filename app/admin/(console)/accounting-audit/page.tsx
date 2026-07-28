import { AccountingAuditPanel } from "@/components/admin/AccountingAuditPanel";

export default function AccountingAuditPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Accounting Audit</h1>
        <p className="mt-1 text-sm text-slate-600">
          Journal · Trial Balance · 재무제표 · Excel Diff Report — 팀별 회계 검증
        </p>
      </div>
      <AccountingAuditPanel />
    </div>
  );
}
