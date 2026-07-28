import { EventStudioWorkflow } from "@/components/v2/event-studio/EventStudioWorkflow";

export const metadata = {
  title: "Event Scenario Studio — V2.1",
  description: "AI-assisted event scenario draft for instructors (separate from V1 GA game ops)",
};

export default function EventStudioPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Event Scenario Studio</h1>
            <p className="text-sm text-slate-600">V2.1a · AI 생성 → GM 승인 → 학습자 뉴스 + Economy Patch</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/event-studio/intelligence" className="text-sky-700 hover:underline">
              V2.3 Intelligence
            </a>
            <a href="/gm" className="text-violet-700 hover:underline">
              GM Desk (V1 RC)
            </a>
            <a href="/join" className="text-emerald-700 hover:underline">
              Join
            </a>
          </nav>
        </div>
      </header>
      <EventStudioWorkflow />
    </div>
  );
}
