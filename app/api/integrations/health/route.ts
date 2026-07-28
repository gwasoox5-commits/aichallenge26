import { getIntegrationHealth } from "@/lib/integrations/health-service";
import { integrationJson } from "@/lib/integrations/api-guard";

export async function GET(req: Request) {
  const live = new URL(req.url).searchParams.get("live") === "1";
  return integrationJson(req, async () => getIntegrationHealth(live), { roles: ["GM", "PLATFORM_ADMIN"] });
}
