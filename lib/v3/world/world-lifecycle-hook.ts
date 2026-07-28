/** V3.0 — Lightweight lifecycle hook (no circular deps with game-engine) */

import { getWorldStore } from "./world-store";

export async function onWorldHalfEnd(sessionId: string, periodLabel: string, periodIndex: number) {
  try {
    const { getV3WorldSimulation } = await import("../v3-service");
    await getV3WorldSimulation().onHalfEnd(sessionId, periodLabel, periodIndex);
  } catch {
    /* V3 optional */
  }
}

export async function onWorldPeriodStart(sessionId: string, periodLabel: string, periodIndex: number) {
  try {
    const { getV3WorldSimulation } = await import("../v3-service");
    await getV3WorldSimulation().onPeriodStart(sessionId, periodLabel, periodIndex);
  } catch {
    /* V3 optional */
  }
}

export function hasWorldSession(sessionId: string): boolean {
  return Boolean(getWorldStore().getSession(sessionId));
}
