import { getGameEngine } from "@/src/bsp/application/bsp-service";
import { buildEvolutionProposal } from "@/lib/v3/world/evolution-engine";
import { evaluateGameDirector } from "@/lib/v3/world/game-director";
import { getV3WorldSimulation } from "@/lib/v3/v3-service";
import { getOpenAiConfig } from "@/lib/integrations/config";
import { callOpenAiStructured } from "@/lib/integrations/openai-client";
import { integrationJson } from "@/lib/integrations/api-guard";
import { IntegrationError } from "@/lib/integrations/errors";
import type { EvolutionContext } from "@/lib/v3/world/types";

const proposalSchema = {
  type: "object",
  required: ["title", "rationale", "confidence", "assumptions"],
  properties: {
    title: { type: "string" },
    rationale: { type: "string" },
    confidence: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
    assumptions: { type: "array", items: { type: "string" } },
    evidenceType: { type: "string", enum: ["SOURCE_FACT", "MODEL_INFERENCE", "ASSUMPTION", "SIMULATION_DESIGN"] },
  },
};

async function buildCtx(sessionId: string): Promise<EvolutionContext> {
  const desk = await getGameEngine().getGmDesk(sessionId);
  const struggling = desk.teams.filter((t) => (t.cashManwon ?? 0) < 5000 || t.warningStatus === "BEHIND").length;
  const avgCash = desk.teams.length
    ? desk.teams.reduce((s, t) => s + (t.cashManwon ?? 0), 0) / desk.teams.length
    : 0;
  return {
    sessionId,
    periodLabel: desk.periodLabel,
    periodIndex: desk.periodIndex,
    economy: desk.economy as unknown as Record<string, number>,
    teamSummary: {
      avgCash,
      avgNetIncome: desk.teams.reduce((s, t) => s + (t.halfYearSalesQty ?? 0), 0) / Math.max(desk.teams.length, 1),
      submitRate: desk.submitRatePercent ?? 0,
      strugglingTeams: struggling,
      totalTeams: desk.totalTeamCount,
    },
    activeEventCount: desk.recentEvents?.length ?? 0,
    recentProposalCount: 0,
  };
}

export async function POST(req: Request) {
  return integrationJson(req, async (ctx) => {
    const body = (await req.json()) as { sessionId: string; idempotencyKey?: string };
    if (!body.sessionId) return { error: "sessionId required" };

    const world = getV3WorldSimulation().requireWorld(body.sessionId);
    const evolutionCtx = await buildCtx(body.sessionId);
    const director = evaluateGameDirector(evolutionCtx);
    const ruleBased = buildEvolutionProposal(world.currentState, evolutionCtx, director);

    const cfg = getOpenAiConfig();
    if (!cfg.configured || !cfg.enabled) {
      return {
        proposal: ruleBased,
        meta: { usedFixture: true, resultStatus: "fixture", source: "rule_engine" },
      };
    }

    try {
      const { data, meta } = await callOpenAiStructured<{
        title: string;
        rationale: string;
        confidence: string;
        assumptions: string[];
        evidenceType?: string;
      }>({
        feature: "world_evolution",
        input: `Propose world evolution. Dimensions: ${JSON.stringify(world.currentState.dimensions)}. Period: ${evolutionCtx.periodLabel}`,
        schema: proposalSchema,
        schemaName: "WorldEvolutionProposal",
        sessionId: body.sessionId,
        userRole: ctx.role,
        idempotencyKey: body.idempotencyKey ?? ctx.correlationId,
      });

      return {
        proposal: {
          ...ruleBased,
          title: data.title || ruleBased.title,
          summary: data.rationale,
          narrative: [data.rationale, ...ruleBased.narrative.split("\n").slice(1)].join("\n"),
        },
        meta: { ...meta, usedFixture: false, resultStatus: "success", source: "openai+rule_engine" },
      };
    } catch (e) {
      if (e instanceof IntegrationError) {
        return {
          proposal: ruleBased,
          meta: { usedFixture: true, resultStatus: "fallback", source: "rule_engine", error: e.code },
          fallbackUsed: true,
        };
      }
      throw e;
    }
  });
}
