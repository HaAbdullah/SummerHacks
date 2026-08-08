import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { BuildNodeData } from "@/lib/types";

/** Base circle diameter; actual size scales with heat in the node component. */
export const NODE_SIZE = 72;

export function layoutGraph(
  buildNodes: BuildNodeData[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 56,
    ranksep: 100,
    marginx: 60,
    marginy: 60,
  });

  for (const n of buildNodes) {
    const size = NODE_SIZE * (0.85 + n.stats.heat * 0.45);
    g.setNode(n.id, { width: size, height: size });
  }
  for (const n of buildNodes) {
    for (const p of n.parentIds) {
      if (buildNodes.some((x) => x.id === p)) {
        g.setEdge(p, n.id);
      }
    }
  }

  dagre.layout(g);

  const nodes: Node[] = buildNodes.map((n) => {
    const pos = g.node(n.id);
    const size = NODE_SIZE * (0.85 + n.stats.heat * 0.45);
    return {
      id: n.id,
      type: "build" as const,
      position: {
        x: (pos?.x ?? 0) - size / 2,
        y: (pos?.y ?? 0) - size / 2,
      },
      data: { build: n },
      draggable: false,
      selectable: true,
    };
  });

  const edges: Edge[] = [];
  for (const n of buildNodes) {
    for (const p of n.parentIds) {
      if (!buildNodes.some((x) => x.id === p)) continue;
      const isFusion = n.parentIds.length > 1;
      edges.push({
        id: `e-${p}-${n.id}`,
        source: p,
        target: n.id,
        type: "branch",
        data: { isFusionEdge: isFusion },
      });
    }
  }

  return { nodes, edges };
}
