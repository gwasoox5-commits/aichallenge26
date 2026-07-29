/** Client-side step timer helpers — mirror server remainingTimeSec logic. */

export function computeStepRemainingSec(
  stepStartedAt: string | Date,
  stepDurationSec: number,
  nowMs = Date.now()
): number {
  const startedMs =
    typeof stepStartedAt === "string" ? new Date(stepStartedAt).getTime() : stepStartedAt.getTime();
  if (!Number.isFinite(startedMs)) return Math.max(0, stepDurationSec);
  const elapsedSec = Math.floor((nowMs - startedMs) / 1000);
  return Math.max(0, stepDurationSec - elapsedSec);
}

export function formatStepTime(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
