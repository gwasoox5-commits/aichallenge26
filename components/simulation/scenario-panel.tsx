import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RoundScenario } from "@/types/simulation";

type ScenarioPanelProps = {
  scenario: RoundScenario;
};

export function ScenarioPanel({ scenario }: ScenarioPanelProps) {
  return (
    <Card className="h-full border-slate-200 shadow-md">
      <CardHeader className="border-b border-slate-100 bg-slate-50/60">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          라운드 시나리오
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <section>
          <h4 className="mb-3 text-sm font-bold text-slate-800">산업 환경</h4>
          <p className="leading-relaxed text-slate-700">{scenario.environment}</p>
        </section>

        <section>
          <h4 className="mb-3 text-sm font-bold text-slate-800">
            외부 충격 · 기회
          </h4>
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            {scenario.shockOrOpportunity}
          </p>
        </section>

        <section>
          <h4 className="mb-3 text-sm font-bold text-slate-800">
            외부환경 키워드
          </h4>
          <div className="flex flex-wrap gap-2">
            {scenario.keywords.map((keyword) => (
              <Badge key={keyword} variant="info" className="text-sm">
                {keyword}
              </Badge>
            ))}
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-sm font-bold text-slate-800">토론 질문</h4>
          <ul className="space-y-2">
            {scenario.discussionQuestions.map((q, i) => (
              <li
                key={i}
                className="flex gap-2 rounded-lg bg-brand-50/50 px-3 py-2.5 text-sm leading-relaxed text-slate-700"
              >
                <span className="shrink-0 font-bold text-brand-600">
                  Q{i + 1}
                </span>
                {q}
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}
