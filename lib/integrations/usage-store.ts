import { randomUUID } from "crypto";
import type { AiCallRecord, AiFeature, AiResultStatus, ProviderHealthSnapshot } from "./types";
import { getModelPricing } from "./config";

const MAX_RECORDS = 5000;
const records: AiCallRecord[] = [];
const providerStats = new Map<string, { successes: number; failures: number; latencies: number[]; lastSuccess?: string; lastFailure?: string; lastError?: string }>();

export function recordAiUsage(input: Omit<AiCallRecord, "id" | "createdAt">): AiCallRecord {
  const rec: AiCallRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  records.unshift(rec);
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
  return rec;
}

export function recordProviderCall(provider: string, ok: boolean, latencyMs: number, errorCode?: string) {
  const s = providerStats.get(provider) ?? { successes: 0, failures: 0, latencies: [] };
  if (ok) {
    s.successes += 1;
    s.lastSuccess = new Date().toISOString();
    s.lastError = undefined;
    s.latencies.push(latencyMs);
    if (s.latencies.length > 100) s.latencies.shift();
  } else {
    s.failures += 1;
    s.lastFailure = new Date().toISOString();
    s.lastError = errorCode;
  }
  providerStats.set(provider, s);
}

export function getProviderSnapshot(
  name: string,
  configured: boolean,
  enabled: boolean,
  mode: ProviderHealthSnapshot["mode"]
): ProviderHealthSnapshot {
  const s = providerStats.get(name);
  const avg = s?.latencies.length ? s.latencies.reduce((a, b) => a + b, 0) / s.latencies.length : undefined;
  return {
    name,
    configured,
    enabled,
    mode,
    lastSuccessAt: s?.lastSuccess,
    lastFailureAt: s?.lastFailure,
    lastErrorCode: s?.lastError,
    avgLatencyMs: avg ? Math.round(avg) : undefined,
    recentFailures: s?.failures ?? 0,
  };
}

export function getUsageSummary(): {
  todayCalls: number;
  todayTokens: number;
  todayFailures: number;
  avgLatencyMs: number;
  byFeature: Record<string, { calls: number; tokens: number; failures: number }>;
  bySession: Record<string, number>;
  estimatedCostUsd?: number;
} {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.createdAt.startsWith(today));
  const byFeature: Record<string, { calls: number; tokens: number; failures: number }> = {};
  const bySession: Record<string, number> = {};
  let totalLatency = 0;
  let totalTokens = 0;
  let failures = 0;
  const pricing = getModelPricing();

  for (const r of todayRecords) {
    totalLatency += r.latencyMs;
    totalTokens += r.totalTokens;
    if (!r.success) failures += 1;
    byFeature[r.feature] ??= { calls: 0, tokens: 0, failures: 0 };
    byFeature[r.feature].calls += 1;
    byFeature[r.feature].tokens += r.totalTokens;
    if (!r.success) byFeature[r.feature].failures += 1;
    if (r.sessionId) bySession[r.sessionId] = (bySession[r.sessionId] ?? 0) + 1;
  }

  let estimatedCostUsd = 0;
  for (const r of todayRecords) {
    const p = pricing[r.model];
    if (!p) continue;
    estimatedCostUsd += (r.inputTokens / 1_000_000) * p.inputPer1M + (r.outputTokens / 1_000_000) * p.outputPer1M;
  }

  return {
    todayCalls: todayRecords.length,
    todayTokens: totalTokens,
    todayFailures: failures,
    avgLatencyMs: todayRecords.length ? Math.round(totalLatency / todayRecords.length) : 0,
    byFeature,
    bySession,
    estimatedCostUsd: estimatedCostUsd > 0 ? Math.round(estimatedCostUsd * 10000) / 10000 : undefined,
  };
}

export function listRecentAiCalls(limit = 50): AiCallRecord[] {
  return records.slice(0, limit);
}

export function makeAiMeta(
  feature: AiFeature,
  partial: Partial<AiCallRecord> & {
    model: string;
    latencyMs: number;
    success: boolean;
    resultStatus: AiResultStatus;
    requestId: string;
    correlationId: string;
  }
): AiCallRecord {
  return recordAiUsage({
    feature,
    sessionId: partial.sessionId,
    userRole: partial.userRole,
    model: partial.model,
    promptVersion: partial.promptVersion,
    inputTokens: partial.inputTokens ?? 0,
    outputTokens: partial.outputTokens ?? 0,
    totalTokens: partial.totalTokens ?? 0,
    latencyMs: partial.latencyMs,
    success: partial.success,
    resultStatus: partial.resultStatus,
    retryCount: partial.retryCount ?? 0,
    cacheHit: partial.cacheHit ?? false,
    idempotencyKey: partial.idempotencyKey,
    errorCode: partial.errorCode,
    requestId: partial.requestId,
    correlationId: partial.correlationId,
  });
}
