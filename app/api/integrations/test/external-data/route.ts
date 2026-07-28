import { createFxProvider } from "@/lib/integrations/external-data/frankfurter-provider";
import { integrationJson } from "@/lib/integrations/api-guard";
import { IntegrationError } from "@/lib/integrations/errors";

export async function POST(req: Request) {
  return integrationJson(req, async () => {
    const provider = createFxProvider();
    if (!provider) throw new IntegrationError("PROVIDER_DISABLED");
    const snap = await provider.getFxRates("USD");
    return {
      provider: snap.provider,
      date: snap.date,
      sampleRates: { EUR: snap.rates.EUR, KRW: snap.rates.KRW, JPY: snap.rates.JPY },
      referenceOnly: snap.referenceOnly,
    };
  });
}
