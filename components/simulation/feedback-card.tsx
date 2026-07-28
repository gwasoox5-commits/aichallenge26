import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FeedbackCardProps = {
  feedback: string[];
};

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  return (
    <Card className="border-brand-200 bg-brand-50/50">
      <CardHeader>
        <CardTitle className="text-brand-900">교육 피드백</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {feedback.map((msg, i) => (
          <p
            key={i}
            className="leading-relaxed text-slate-700 before:mr-2 before:font-bold before:text-brand-600 before:content-['•']"
          >
            {msg}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
