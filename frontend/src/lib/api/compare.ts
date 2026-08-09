/** Client for the agent-orchestrated, deterministically validated node comparison. */

import type { BuildNodeData, CompareMods, CompareNode, CompareResult } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class CompareError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CompareError";
  }
}

const EMPTY_MODS: CompareMods = {
  engine: null,
  exhaust: null,
  wheels: null,
  brakes: null,
};

/** Translate the graph's camelCase node into the comparison contract. */
export function toCompareNode(node: BuildNodeData): CompareNode {
  const mods = node.mods ?? EMPTY_MODS;
  return {
    id: node.id,
    car_id: node.carId,
    title: node.title,
    parent_ids: node.parentIds,
    attributes: node.attributes,
    mods: {
      engine: mods.engine || null,
      exhaust: mods.exhaust || null,
      wheels: mods.wheels || null,
      brakes: mods.brakes || null,
    },
    summary: node.summary,
    hero_image: node.heroImage ?? null,
    stats: node.stats,
    created_by: node.createdBy,
    created_at: node.createdAt,
    is_root: node.isRoot ?? false,
    slot: node.slot ?? null,
    level: node.level ?? 0,
  };
}

/**
 * Send the complete nodes already held by the caller. The endpoint does not retrieve
 * them again and loads only the parts catalogue server-side.
 */
export async function compareNodes(
  nodeA: CompareNode,
  nodeB: CompareNode,
  signal?: AbortSignal,
): Promise<CompareResult> {
  const response = await fetch(`${API_URL}/api/ai/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ node_a: nodeA, node_b: nodeB }),
    signal,
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body?.detail)
      .catch(() => null);
    throw new CompareError(
      detail ?? `Node comparison failed (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as CompareResult;
}
