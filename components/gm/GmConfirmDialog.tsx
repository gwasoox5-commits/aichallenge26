"use client";

type GmConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone?: "default" | "danger" | "warning";
  requireReason?: boolean;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function GmConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmTone = "default",
  requireReason = true,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  loading,
}: GmConfirmDialogProps) {
  if (!open) return null;

  const toneClass =
    confirmTone === "danger"
      ? "bg-rose-600 hover:bg-rose-500"
      : confirmTone === "warning"
        ? "bg-amber-600 hover:bg-amber-500"
        : "bg-violet-600 hover:bg-violet-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        <label className="mt-4 block text-sm">
          <span className="text-slate-600">사유 {requireReason ? "(필수)" : "(선택)"}</span>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="운영 사유를 입력하세요"
            rows={2}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || (requireReason && !reason.trim())}
            className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 ${toneClass}`}
          >
            {loading ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
