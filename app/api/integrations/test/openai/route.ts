import { testOpenAiConnection } from "@/lib/integrations/openai-client";
import { getOpenAiConfig } from "@/lib/integrations/config";
import { integrationJson } from "@/lib/integrations/api-guard";

export async function POST(req: Request) {
  return integrationJson(req, async () => {
    const cfg = getOpenAiConfig();
    const result = await testOpenAiConnection();
    return {
      ok: result.ok,
      configured: cfg.configured,
      enabled: cfg.enabled,
      model: result.model,
      latencyMs: result.latencyMs,
      keyStatus: cfg.configured ? "configured" : "missing",
    };
  });
}
