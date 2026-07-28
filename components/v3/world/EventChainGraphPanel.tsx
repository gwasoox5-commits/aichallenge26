"use client";

import type { WorldEventChain } from "@/lib/v3/world/types";
import { formatProbabilityLabel } from "@/lib/v3/world/probability-model";

interface Props {
  chains: WorldEventChain[];
}

export function EventChainGraphPanel({ chains }: Props) {
  if (chains.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-800">Event Chains</h3>
      {chains.map((chain) => (
        <div key={chain.chainId} className="mt-3">
          <p className="text-sm font-medium text-slate-700">{chain.label}</p>
          <ol className="mt-2 flex flex-wrap gap-2">
            {chain.nodes.map((n, i) => (
              <li
                key={n.nodeId}
                className={`rounded border px-2 py-1 text-xs ${
                  n.status === "PUBLISHED"
                    ? "border-emerald-300 bg-emerald-50"
                    : n.status === "PROPOSED"
                      ? "border-amber-300 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                {i > 0 && "→ "}
                {n.label}
                {n.parentNodeId && ` (${formatProbabilityLabel(n.gmProbability ?? n.probability)})`}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
