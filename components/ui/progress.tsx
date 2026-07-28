import { cn } from "@/lib/utils/cn";

type ProgressProps = {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
};

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
    >
      <div
        className={cn("h-full rounded-full bg-brand-600 transition-all", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
