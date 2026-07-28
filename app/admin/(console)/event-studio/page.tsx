import { EventStudioWorkflow } from "@/components/v2/event-studio/EventStudioWorkflow";

export default function AdminEventStudioPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">이벤트 스튜디오</h2>
        <p className="text-sm text-slate-500">
          V2.1a · AI 생성 → GM 승인 → 학습자 뉴스 + Economy Patch
        </p>
      </div>
      <EventStudioWorkflow />
    </div>
  );
}
