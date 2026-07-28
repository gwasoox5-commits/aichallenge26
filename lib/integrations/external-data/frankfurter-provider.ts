import { getExternalDataConfig } from "../config";
import { IntegrationError } from "../errors";
import { recordProviderCall } from "../usage-store";

export interface FxRateSnapshot {
  provider: string;
  base: string;
  date: string;
  rates: Record<string, number>;
  fetchedAt: string;
  referenceOnly: true;
}

export interface ExternalDataProvider {
  readonly name: string;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
  getFxRates(base?: string): Promise<FxRateSnapshot>;
}

/** Frankfurter — free ECB reference rates, no API key */
export class FrankfurterProvider implements ExternalDataProvider {
  readonly name = "frankfurter";

  async healthCheck() {
    const t = await this.getFxRates("USD");
    return { ok: !!t.rates.EUR, latencyMs: 0 };
  }

  async getFxRates(base = "USD"): Promise<FxRateSnapshot> {
    const cfg = getExternalDataConfig();
    const started = Date.now();
    const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(cfg.timeoutMs) });
      if (!res.ok) throw new IntegrationError("PROVIDER_UNAVAILABLE", { status: res.status });
      const body = (await res.json()) as { base: string; date: string; rates: Record<string, number> };
      recordProviderCall(this.name, true, Date.now() - started);
      return {
        provider: this.name,
        base: body.base,
        date: body.date,
        rates: body.rates,
        fetchedAt: new Date().toISOString(),
        referenceOnly: true,
      };
    } catch (e) {
      recordProviderCall(this.name, false, Date.now() - started);
      if (e instanceof IntegrationError) throw e;
      throw new IntegrationError("NETWORK_ERROR", { cause: e });
    }
  }
}

export function createFxProvider(): ExternalDataProvider | null {
  const cfg = getExternalDataConfig();
  if (!cfg.fxEnabled) return null;
  if (cfg.fxProvider === "frankfurter") return new FrankfurterProvider();
  return null;
}

export async function testFrankfurterProvider() {
  const p = new FrankfurterProvider();
  const started = Date.now();
  const snap = await p.getFxRates("USD");
  return { ok: Object.keys(snap.rates).length > 0, latencyMs: Date.now() - started };
}
