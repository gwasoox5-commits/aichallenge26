/** Pilot Mode configuration — BSP_PILOT_MODE=1 or PILOT_MODE=true */

export function isPilotMode(): boolean {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_PILOT_MODE === "1" || process.env.NEXT_PUBLIC_PILOT_MODE === "true";
  }
  return process.env.BSP_PILOT_MODE === "1" || process.env.PILOT_MODE === "true" || process.env.BSP_PILOT_MODE === "true";
}

export const PILOT_DEFAULTS = {
  periods: 2,
  periodLabel: "1년 2반기",
  maxTeams: 5,
  stepDurationSec: 900,
  autoAdvance: false,
  worldEngine: false,
  aiIntelligence: true,
  aiAutoPublish: false,
  gmApprovalRequired: true,
  sampleTeams: ["Alpha", "Bravo", "Charlie", "Delta", "Echo"],
} as const;

export const PILOT_JOIN_BASE_URL =
  typeof window !== "undefined" ? `${window.location.origin}/join` : "/join";

export function formatJoinUrl(joinCode: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/join?code=${encodeURIComponent(joinCode)}`;
}
