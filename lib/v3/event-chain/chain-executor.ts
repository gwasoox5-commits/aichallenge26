/** V3.0 — Event chain execution (proposals only, no auto-publish) */

import type { EventChainNodeV3, WorldEventChain, WorldEvolutionProposal } from "../world/types";
import { rollChainOutcome } from "../world/probability-model";
import { buildChainProposal } from "../world/evolution-engine";

export function findActiveChainNode(chain: WorldEventChain): EventChainNodeV3 | null {
  const published = chain.nodes.filter((n) => n.status === "PUBLISHED");
  if (published.length === 0) {
    return chain.nodes.find((n) => n.nodeId === chain.rootNodeId) ?? null;
  }
  const last = published[published.length - 1];
  const next = chain.nodes.find(
    (n) => n.parentNodeId === last.nodeId && n.status === "PLANNED"
  );
  return next ?? null;
}

export function evaluateChainAtHalfEnd(
  chain: WorldEventChain,
  periodLabel: string,
  periodIndex: number,
  rollIndex: number
): { chain: WorldEventChain; proposal: WorldEvolutionProposal | null } {
  const lastPublished = [...chain.nodes].reverse().find((n) => n.status === "PUBLISHED");
  const parentId = lastPublished?.nodeId ?? chain.rootNodeId;

  const winner = rollChainOutcome(chain.nodes, parentId, chain.randomSeed, rollIndex);
  if (!winner) {
    return { chain, proposal: null };
  }

  const updatedNodes = chain.nodes.map((n) =>
    n.nodeId === winner.nodeId ? { ...n, status: "PROPOSED" as const } : n
  );

  const proposal = buildChainProposal(
    chain.sessionId,
    periodLabel,
    periodIndex,
    winner.label,
    winner.description,
    winner.nodeId,
    winner.economyEffects
  );

  const updatedChain: WorldEventChain = {
    ...chain,
    nodes: updatedNodes.map((n) =>
      n.nodeId === winner.nodeId ? { ...n, proposalId: proposal.proposalId, status: "PROPOSED" } : n
    ),
  };

  return { chain: updatedChain, proposal };
}

export function markChainNodePublished(
  chain: WorldEventChain,
  nodeId: string,
  publishId: string
): WorldEventChain {
  return {
    ...chain,
    nodes: chain.nodes.map((n) =>
      n.nodeId === nodeId ? { ...n, status: "PUBLISHED", publishId } : n
    ),
  };
}

export function getUpcomingChainEvents(chain: WorldEventChain): EventChainNodeV3[] {
  return chain.nodes.filter((n) => n.status === "PLANNED" || n.status === "PROPOSED");
}
