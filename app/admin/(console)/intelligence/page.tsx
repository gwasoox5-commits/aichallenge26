import { IntelligenceWorkflow } from "@/components/v2/intelligence/IntelligenceWorkflow";

export default function AdminIntelligencePage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">뉴스 Intelligence</h2>
        <p className="text-sm text-slate-500">V2.3 · 실뉴스 → AI 분석 → GM Preview → Publish</p>
      </div>
      <IntelligenceWorkflow />
    </div>
  );
}
