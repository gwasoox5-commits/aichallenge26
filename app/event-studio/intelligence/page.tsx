import { IntelligenceWorkflow } from "@/components/v2/intelligence/IntelligenceWorkflow";

export const metadata = {
  title: "Real-world Intelligence — V2.3",
  description: "실뉴스 기반 AI 시나리오 GM Preview (V1 RC 분리)",
};

export default function IntelligencePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Real-world Intelligence</h1>
            <p className="text-sm text-slate-600">V2.3 · 실뉴스 → AI 분석 → GM Preview (Publish 없음)</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/event-studio" className="text-violet-700 hover:underline">
              V2.1a Studio
            </a>
            <a href="/gm" className="text-slate-600 hover:underline">
              GM Desk (V1 RC)
            </a>
          </nav>
        </div>
      </header>
      <IntelligenceWorkflow />
    </div>
  );
}
