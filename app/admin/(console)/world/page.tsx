import { WorldDashboard } from "@/components/v3/world/WorldDashboard";

export default function AdminWorldPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">World Simulation</h2>
        <p className="text-sm text-slate-500">
          V3.0 · 살아있는 경제 세계 — GM 설정 · AI Evolution · Event Chain
        </p>
      </div>
      <WorldDashboard />
    </div>
  );
}
