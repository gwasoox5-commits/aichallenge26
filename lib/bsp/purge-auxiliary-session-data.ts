import { getDraftStore } from "@/lib/v2/event-studio/draft-store";
import { getIntelligencePublishStore } from "@/lib/v2/intelligence/publish-store";
import { getIntelligenceSessionStore } from "@/lib/v2/intelligence/session-store";
import { getWorldStore } from "@/lib/v3/world/world-store";
import { getRealtimeHub } from "@/src/bsp/infrastructure/realtime/realtime-hub";

/** Remove JSON-file / auxiliary data tied to a BSP session. */
export function purgeAuxiliarySessionData(sessionId: string): void {
  getWorldStore().deleteSession(sessionId);
  getIntelligenceSessionStore().purgeSession(sessionId);
  getIntelligencePublishStore().purgeSession(sessionId);
  getDraftStore().purgeSession(sessionId);
  getRealtimeHub()?.disconnectSession(sessionId);
}
