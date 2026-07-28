import { getUsageSummary, listRecentAiCalls } from "@/lib/integrations/usage-store";
import { integrationJson } from "@/lib/integrations/api-guard";

export async function GET(req: Request) {
  return integrationJson(req, async () => ({
    summary: getUsageSummary(),
    recent: listRecentAiCalls(30),
  }));
}
