import Link from "next/link";
import { existsSync } from "fs";
import {
  getManualDownloadApiUrl,
  getManualPdfPublicUrl,
  getManualPdfPath,
  OPERATION_MANUALS,
} from "@/lib/docs/operation-manuals";

export const metadata = {
  title: "운영 설명서 다운로드",
  description: "제조 경영 시뮬레이션 참가자·강사 운영 설명서 PDF/Markdown 다운로드",
};

export default function ManualsDownloadPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">운영 설명서</h1>
            <p className="mt-1 text-sm text-slate-500">전체 내용 PDF · Markdown 다운로드</p>
          </div>
          <Link href="/join" className="text-sm text-indigo-600 hover:text-indigo-500">
            참가하기 →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {OPERATION_MANUALS.map((manual) => {
          const pdfReady = existsSync(getManualPdfPath(manual));
          const pdfHref = pdfReady
            ? getManualPdfPublicUrl(manual)
            : getManualDownloadApiUrl(manual, "pdf");

          return (
            <section
              key={manual.slug}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {manual.audience === "participant" ? "참가자용" : "강사용"}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{manual.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">{manual.subtitle}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={pdfHref}
                  download={`${manual.downloadBaseName}.pdf`}
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  PDF 다운로드
                </a>
                <a
                  href={getManualDownloadApiUrl(manual, "md")}
                  download={`${manual.downloadBaseName}.md`}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Markdown 다운로드
                </a>
              </div>

              {!pdfReady && (
                <p className="mt-3 text-xs text-amber-700">
                  PDF 파일이 아직 생성되지 않았습니다. 관리자에게 문의하거나 `npm run docs:manuals` 실행 후
                  다시 시도하세요.
                </p>
              )}
            </section>
          );
        })}

        <p className="text-xs text-slate-400">
          PDF는 Markdown 원문 전체를 변환합니다. 내용이 잘리거나 요약되지 않습니다.
        </p>
      </main>
    </div>
  );
}
