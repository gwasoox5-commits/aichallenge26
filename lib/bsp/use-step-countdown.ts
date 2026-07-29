"use client";

import { useEffect, useState } from "react";
import { computeStepRemainingSec } from "./step-timer";

type StepCountdownInput = {
  stepStartedAt?: string | null;
  stepDurationSec?: number;
  /** Server snapshot — used on sync and when stepStartedAt is unavailable. */
  remainingTimeSec?: number;
  enabled?: boolean;
};

/**
 * Live step timer that ticks every second on the client.
 * Resyncs when stepStartedAt / stepDurationSec change (step advance, reconnect).
 */
export function useStepCountdown({
  stepStartedAt,
  stepDurationSec,
  remainingTimeSec = 0,
  enabled = true,
}: StepCountdownInput): number {
  const canCompute = Boolean(stepStartedAt && stepDurationSec != null && stepDurationSec > 0);

  const [remaining, setRemaining] = useState(() => {
    if (canCompute) return computeStepRemainingSec(stepStartedAt!, stepDurationSec!);
    return remainingTimeSec;
  });

  useEffect(() => {
    if (!enabled) return;
    if (canCompute) {
      setRemaining(computeStepRemainingSec(stepStartedAt!, stepDurationSec!));
    } else {
      setRemaining(remainingTimeSec);
    }
  }, [enabled, canCompute, stepStartedAt, stepDurationSec, remainingTimeSec]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (canCompute) {
        setRemaining(computeStepRemainingSec(stepStartedAt!, stepDurationSec!));
        return;
      }
      setRemaining((prev) => Math.max(0, prev - 1));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [enabled, canCompute, stepStartedAt, stepDurationSec]);

  return remaining;
}
