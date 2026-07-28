/** V3 Event Chain — extensible data model (not executed in V2.4) */

import type { EventChainGraph, EventChainNode } from "./publish-types";

export function createEventChainStub(
  sessionId: string,
  rootPublishId: string,
  label: string
): EventChainGraph {
  const rootNode: EventChainNode = {
    nodeId: `node-${rootPublishId}`,
    publishId: rootPublishId,
    label,
    description: "Root event — V3 chain expansion point",
    childNodeIds: [],
    status: "PLANNED",
  };

  return {
    chainId: `chain-${rootPublishId}`,
    sessionId,
    rootPublishId,
    nodes: [rootNode],
    createdAt: new Date().toISOString(),
  };
}

export function linkChainNode(
  chain: EventChainGraph,
  parentNodeId: string,
  child: Omit<EventChainNode, "nodeId" | "childNodeIds" | "status">
): EventChainGraph {
  const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newNode: EventChainNode = {
    ...child,
    nodeId,
    childNodeIds: [],
    status: "PLANNED",
  };

  const nodes = chain.nodes.map((n) =>
    n.nodeId === parentNodeId ? { ...n, childNodeIds: [...n.childNodeIds, nodeId] } : n
  );
  nodes.push(newNode);

  return { ...chain, nodes };
}

export function serializeChainForV3(chain: EventChainGraph): string {
  return JSON.stringify(chain, null, 2);
}

export interface EventChainTemplate {
  id: string;
  label: string;
  nodes: Array<{ label: string; triggerCondition: string; description: string }>;
}

/** Example chain template for V3 documentation */
export const EXAMPLE_CHAIN_TEMPLATES: EventChainTemplate[] = [
  {
    id: "tariff-supply-cost",
    label: "관세 → 공급망 → 원가 → 가격 → 수요 → 현금 → 금리",
    nodes: [
      { label: "관세 인상", triggerCondition: "publish", description: "수입 관세 상승" },
      { label: "공급망 차질", triggerCondition: "demand_drop_10pct", description: "부품 조달 지연" },
      { label: "원가 상승", triggerCondition: "supply_delay_2periods", description: "생산 원가 증가" },
      { label: "가격 인상", triggerCondition: "cost_up_15pct", description: "판매가 조정 압력" },
      { label: "수요 감소", triggerCondition: "price_up_10pct", description: "시장 수요 위축" },
      { label: "현금 부족", triggerCondition: "revenue_down_20pct", description: "운영자금 압박" },
      { label: "금리 인상", triggerCondition: "cash_ratio_below_0.2", description: "금융 환경 악화" },
    ],
  },
];
