import type { BuildNodeData } from "./types";

/** Ancestors of nodeId including itself, walking all parents (DAG). */
export function getAncestorPath(
  nodeId: string,
  nodes: BuildNodeData[],
): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path = new Set<string>();
  const stack = [nodeId];
  while (stack.length) {
    const id = stack.pop()!;
    if (path.has(id)) continue;
    path.add(id);
    const n = byId.get(id);
    if (n) for (const p of n.parentIds) stack.push(p);
  }
  return path;
}

/** Nodes matching filters: within group = OR, across groups = AND. */
export function filterMatchingIds(
  nodes: BuildNodeData[],
  activeFilters: Record<string, string[]>,
): Set<string> | null {
  const groups = Object.entries(activeFilters).filter(
    ([, opts]) => opts.length > 0,
  );
  if (groups.length === 0) return null;

  const matching = new Set<string>();
  for (const n of nodes) {
    const ok = groups.every(([, opts]) =>
      opts.some((o) => n.attributes.includes(o)),
    );
    if (ok) matching.add(n.id);
  }
  return matching;
}

/** Match set + all ancestors of matches (paths stay lit to root). */
export function highlightSetFromMatches(
  nodes: BuildNodeData[],
  matchIds: Set<string>,
): Set<string> {
  const lit = new Set<string>();
  for (const id of matchIds) {
    for (const a of getAncestorPath(id, nodes)) lit.add(a);
  }
  return lit;
}

export function lineageBreadcrumb(
  nodeId: string,
  nodes: BuildNodeData[],
): BuildNodeData[][] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const node = byId.get(nodeId);
  if (!node) return [];

  function pathToRoot(id: string): BuildNodeData[] {
    const chain: BuildNodeData[] = [];
    let cur = byId.get(id);
    const guard = new Set<string>();
    while (cur && !guard.has(cur.id)) {
      guard.add(cur.id);
      chain.unshift(cur);
      if (cur.parentIds.length === 0) break;
      // single-parent path for breadcrumb; fusion handled separately
      cur = byId.get(cur.parentIds[0]);
    }
    return chain;
  }

  if (node.parentIds.length > 1) {
    return node.parentIds.map((pid) => {
      const p = pathToRoot(pid);
      return [...p, node];
    });
  }
  return [pathToRoot(nodeId)];
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}M AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}H AGO`;
  const days = Math.floor(hrs / 24);
  return `${days}D AGO`;
}
