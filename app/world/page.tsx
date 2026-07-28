import { WorldDashboard } from "@/components/v3/world/WorldDashboard";
import Link from "next/link";

export default function WorldPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white px-6 py-3 flex gap-4 text-sm">
        <Link href="/gm" className="text-slate-600 hover:text-slate-900">GM Desk</Link>
        <Link href="/event-studio" className="text-slate-600 hover:text-slate-900">Event Studio</Link>
        <Link href="/event-studio/intelligence" className="text-slate-600 hover:text-slate-900">Intelligence</Link>
        <Link href="/world" className="font-semibold text-indigo-700">World Dashboard</Link>
      </nav>
      <WorldDashboard />
    </div>
  );
}
