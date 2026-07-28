/** V3.0 — Probability model for event chains */

import type { ChainProbability, EventChainNodeV3 } from "./types";

export function seededRandom(seed: string, index: number): number {
  let h = 0;
  const s = `${seed}-${index}`;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function effectiveProbability(node: EventChainNodeV3 | ChainProbability): number {
  const base = "gmProbability" in node && node.gmProbability != null
    ? node.gmProbability
    : "gmOverride" in node && node.gmOverride != null
      ? node.gmOverride
      : node.probability;
  return Math.max(0, Math.min(1, base));
}

export function rollChainOutcome(
  nodes: EventChainNodeV3[],
  parentNodeId: string,
  seed: string,
  rollIndex: number
): EventChainNodeV3 | null {
  const children = nodes.filter((n) => n.parentNodeId === parentNodeId && n.status === "PLANNED");
  if (children.length === 0) return null;

  const roll = seededRandom(seed, rollIndex);
  let cumulative = 0;
  for (const child of children) {
    cumulative += effectiveProbability(child);
    if (roll <= cumulative) return child;
  }
  return children[children.length - 1] ?? null;
}

export function buildProbabilitiesFromNodes(nodes: EventChainNodeV3[]): ChainProbability[] {
  return nodes
    .filter((n) => n.parentNodeId)
    .map((n) => ({
      nodeId: n.nodeId,
      label: n.label,
      probability: n.probability,
      gmOverride: n.gmProbability,
      parentNodeId: n.parentNodeId,
    }));
}

export function updateNodeProbability(
  nodes: EventChainNodeV3[],
  nodeId: string,
  gmProbability: number
): EventChainNodeV3[] {
  return nodes.map((n) =>
    n.nodeId === nodeId ? { ...n, gmProbability: Math.max(0, Math.min(1, gmProbability)) } : n
  );
}

export function normalizeSiblingProbabilities(nodes: EventChainNodeV3[], parentNodeId: string): EventChainNodeV3[] {
  const siblings = nodes.filter((n) => n.parentNodeId === parentNodeId);
  if (siblings.length === 0) return nodes;
  const total = siblings.reduce((s, n) => s + effectiveProbability(n), 0);
  if (total === 0) return nodes;

  return nodes.map((n) => {
    if (n.parentNodeId !== parentNodeId) return n;
    return { ...n, probability: effectiveProbability(n) / total };
  });
}

export function formatProbabilityLabel(p: number): string {
  return `${Math.round(p * 100)}%`;
}
