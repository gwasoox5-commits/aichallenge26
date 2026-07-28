"use client";

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export type JournalView = {
  id: string;
  transactionType: string;
  description: string;
  postedAt: string;
  step?: string;
  lines: Array<{
    accountCode: string;
    debitManwon: number;
    creditManwon: number;
    memo?: string;
  }>;
};

export function JournalSummaryPanel({ journals }: { journals: JournalView[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 font-semibold">Journal (의사결정 분개)</h3>
      {journals.length === 0 ? (
        <p className="text-sm text-slate-500">아직 분개된 Journal이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {journals.map((j) => (
            <div key={j.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-800">
                {j.description}{" "}
                <span className="text-slate-500">
                  ({j.step ?? j.transactionType})
                </span>
              </p>
              <p className="text-xs text-slate-500">{new Date(j.postedAt).toLocaleString("ko-KR")}</p>
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
                    <tr key={i} className="text-slate-700">
                      <td>{l.memo ?? l.accountCode}</td>
                      <td className="text-right">{l.debitManwon ? fmt(l.debitManwon) : "—"}</td>
                      <td className="text-right">{l.creditManwon ? fmt(l.creditManwon) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
