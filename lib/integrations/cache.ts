import { createHash } from "crypto";

type CacheEntry<T> = { value: T; expiresAt: number; promptVersion?: string };

const store = new Map<string, CacheEntry<unknown>>();

export function cacheKey(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

export function getCache<T>(key: string): { hit: true; value: T } | { hit: false } {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return { hit: false };
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return { hit: false };
  }
  return { hit: true, value: entry.value };
}

export function setCache<T>(key: string, value: T, ttlMs: number, promptVersion?: string) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs, promptVersion });
}

export function invalidateCacheByPromptVersion(version: string) {
  for (const [k, v] of store) {
    if (v.promptVersion === version) store.delete(k);
  }
}

export function clearIntegrationCache() {
  store.clear();
}

export const CACHE_TTL = {
  newsSearchMs: 15 * 60 * 1000,
  articleMetaMs: 60 * 60 * 1000,
  aiOptionalMs: 30 * 60 * 1000,
};
