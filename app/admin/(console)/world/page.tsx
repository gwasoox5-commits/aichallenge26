import { WORLD_UI } from "@/lib/v3/world/world-ui-labels";
import { WorldDashboard } from "@/components/v3/world/WorldDashboard";

export default function AdminWorldPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{WORLD_UI.pageTitle}</h2>
        <p className="text-sm text-slate-500">
          V3.0 · 살아있는 경제 세계 — GM 설정 · {WORLD_UI.evolveButton} · Event Chain
        </p>
      </div>
      <WorldDashboard />
    </div>
  );
}
