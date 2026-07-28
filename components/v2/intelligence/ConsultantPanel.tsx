"use client";

import type { ConsultantOutput } from "@/lib/v2/intelligence/types";

export function ConsultantPanel({ consultant }: { consultant: ConsultantOutput }) {
  return (
    <section className="rounded-xl border border-orange-200 bg-orange-50/50 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-orange-900">AI 경영 컨설턴트 (GM 전용)</h2>
        <span className="rounded bg-orange-200 px-2 py-0.5 text-xs font-medium text-orange-900">학생 비노출</span>
        <span className="text-xs text-slate-500">프롬프트 {consultant.promptVersion}</span>
      </div>
      <p className="mt-2 text-sm text-slate-700">{consultant.instructorComments}</p>
      <p className="mt-2 text-sm italic text-slate-600">{consultant.educationalCommentary}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <List title="핵심 리스크" items={consultant.coreRisks} />
        <List title="핵심 기회" items={consultant.coreOpportunities} />
        <List title="CEO 검토 우선순위" items={consultant.ceoReviewPriorities} />
        <List title="학생 흔한 실수" items={consultant.commonStudentMistakes} />
        <List title="토론 질문" items={consultant.instructorDiscussionQuestions} />
        <List title="디브리핑 질문" items={consultant.debriefQuestions} />
        <List title="학습 목표" items={consultant.learningObjectives} />
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Impact label="가장 영향 받는 부문" text={consultant.mostAffectedDivision} />
        <Impact label="생산 영향" text={consultant.productionImpact} />
        <Impact label="공급망 영향" text={consultant.supplyChainImpact} />
        <Impact label="재무 영향" text={consultant.financialImpact} />
        <Impact label="현금흐름 영향" text={consultant.cashflowImpact} />
      </div>
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-700">{title}</h3>
      <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Impact({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm">{text}</p>
    </div>
  );
}
