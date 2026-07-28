/**
 * Lightweight hook for scheduled event activation — avoids circular imports
 * between scenario-studio-service and publish-service.
 */
import { getIntelligencePublishStore } from "./publish-store";

export function onIntelligenceEventActivated(simulationEventId: string) {
  const store = getIntelligencePublishStore();
  const record = store.getSnapshot().records.find((r) => r.simulationEventId === simulationEventId);
  if (!record) return;

  record.status = "ACTIVE";
  record.updatedAt = new Date().toISOString();
  store.saveRecord(record);

  store.saveAudit({
    id: crypto.randomUUID(),
    publishId: record.publishId,
    action: "ACTIVATED",
    actorUserId: "system",
    actorRole: "GM",
    timestamp: record.updatedAt,
  });

  store.saveTimelineEntry({
    id: crypto.randomUUID(),
    publishId: record.publishId,
    phase: "ACTIVATED",
    label: "활성화",
    timestamp: record.updatedAt,
    actorUserId: "system",
  });
}
