"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { getGraph, createBranch } from "@/lib/api";
import type { BuildNodeData } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import {
  filterMatchingIds,
  getAncestorPath,
  highlightSetFromMatches,
} from "@/lib/graph-utils";
import { layoutGraph } from "./layout";
import { BuildNode, type BuildFlowNode } from "./BuildNode";
import { BranchEdge, type BranchFlowEdge } from "./BranchEdge";
import { AddBranchModal } from "./AddBranchModal";

const nodeTypes = { build: BuildNode };
const edgeTypes = { branch: BranchEdge };

function CanvasInner({
  carId,
  onGraphChange,
}: {
  carId: string;
  onGraphChange?: (nodes: BuildNodeData[]) => void;
}) {
  const router = useRouter();
  const [buildNodes, setBuildNodes] = useState<BuildNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomPct, setZoomPct] = useState(75);
  const entered = useRef(false);
  const navigating = useRef(false);
  const { fitView, setCenter, getZoom, zoomIn, zoomOut } = useReactFlow();

  const {
    hoverNodeId,
    activeFilters,
    searchResult,
    mergeMode,
    mergeSelection,
    flashNodeId,
    setHoverNodeId,
    toggleMergeSelection,
    clearMergeSelection,
    setMergeMode,
    addBranchRequest,
    openAddBranchModal,
    closeAddBranchModal,
    setFlashNodeId,
    setGraphZoom,
    setSearchResult,
  } = useAppStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<BuildFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<BranchFlowEdge>([]);

  const reload = useCallback(async () => {
    const graph = await getGraph(carId);
    setBuildNodes(graph);
    onGraphChange?.(graph);
    return graph;
  }, [carId, onGraphChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const graph = await getGraph(carId);
      if (cancelled) return;
      setBuildNodes(graph);
      setLoading(false);
      onGraphChange?.(graph);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carId]);

  const matchIds = useMemo(
    () => filterMatchingIds(buildNodes, activeFilters),
    [buildNodes, activeFilters],
  );

  const filterHighlight = useMemo(
    () => (matchIds ? highlightSetFromMatches(buildNodes, matchIds) : null),
    [buildNodes, matchIds],
  );

  const hoverPath = useMemo(
    () => (hoverNodeId ? getAncestorPath(hoverNodeId, buildNodes) : null),
    [hoverNodeId, buildNodes],
  );

  const searchSet = useMemo(
    () => (searchResult ? new Set(searchResult.nodeIds) : null),
    [searchResult],
  );

  const searchPath = useMemo(() => {
    if (!searchSet) return null;
    return highlightSetFromMatches(buildNodes, searchSet);
  }, [searchSet, buildNodes]);

  useEffect(() => {
    if (buildNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const laid = layoutGraph(buildNodes);

    const isDimmed = (id: string) => {
      if (searchPath) return !searchPath.has(id);
      if (filterHighlight) return !filterHighlight.has(id);
      return false;
    };
    const isHighlighted = (id: string) => {
      if (hoverPath?.has(id)) return true;
      if (searchSet?.has(id)) return true;
      return false;
    };

    setNodes(
      laid.nodes.map((n) => {
        const id = n.id;
        return {
          ...n,
          type: "build" as const,
          data: {
            build: (n.data as { build: BuildNodeData }).build,
            dimmed: isDimmed(id),
            highlighted: isHighlighted(id) && !isDimmed(id),
            selected: false,
            mergeSelected: mergeSelection.includes(id),
            flash: flashNodeId === id,
          },
        };
      }) as BuildFlowNode[],
    );

    setEdges(
      laid.edges.map((e) => {
        const edgeLit =
          (hoverPath?.has(e.source) && hoverPath?.has(e.target)) ||
          (searchPath?.has(e.source) && searchPath?.has(e.target)) ||
          (filterHighlight?.has(e.source) &&
            filterHighlight?.has(e.target) &&
            !searchPath);
        const dimmed =
          (searchPath && !(searchPath.has(e.source) && searchPath.has(e.target))) ||
          (filterHighlight &&
            !searchPath &&
            !(filterHighlight.has(e.source) && filterHighlight.has(e.target)));
        return {
          ...e,
          data: {
            ...(e.data as object),
            highlighted: !!edgeLit && !dimmed,
            dimmed: !!dimmed,
          },
        };
      }),
    );

    if (!entered.current && buildNodes.length > 0) {
      entered.current = true;
      requestAnimationFrame(() => {
        fitView({ padding: 0.28, duration: 700 });
      });
    }
  }, [
    buildNodes,
    hoverPath,
    filterHighlight,
    searchPath,
    searchSet,
    mergeSelection,
    flashNodeId,
    fitView,
    setNodes,
    setEdges,
  ]);

  useEffect(() => {
    if (searchResult?.nodeIds[0]) {
      const id = searchResult.nodeIds[0];
      const n = nodes.find((x) => x.id === id);
      if (n) {
        setCenter(n.position.x + 36, n.position.y + 36, {
          zoom: 1.35,
          duration: 600,
        });
      }
    }
  }, [searchResult, nodes, setCenter]);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const n = nodes.find((x) => x.id === id);
      if (n) {
        setCenter(n.position.x + 36, n.position.y + 36, {
          zoom: 1.35,
          duration: 600,
        });
      }
    };
    window.addEventListener("buildamod:fly-node", handler);
    return () => window.removeEventListener("buildamod:fly-node", handler);
  }, [nodes, setCenter]);

  const openNode = useCallback(
    async (nodeId: string) => {
      if (navigating.current) return;
      navigating.current = true;
      const n = nodes.find((x) => x.id === nodeId);
      if (n) {
        await setCenter(n.position.x + 36, n.position.y + 36, {
          zoom: 1.6,
          duration: 450,
        });
      }
      router.push(`/garage/${carId}/node/${nodeId}`);
    },
    [nodes, setCenter, router, carId],
  );

  const onNodeClick: NodeMouseHandler<BuildFlowNode> = useCallback(
    (_e, node) => {
      if (mergeMode) {
        toggleMergeSelection(node.id);
        return;
      }
      void openNode(node.id);
    },
    [mergeMode, toggleMergeSelection, openNode],
  );

  const onNodeMouseEnter: NodeMouseHandler<BuildFlowNode> = useCallback(
    (_e, node) => setHoverNodeId(node.id),
    [setHoverNodeId],
  );

  const onNodeMouseLeave = useCallback(
    () => setHoverNodeId(null),
    [setHoverNodeId],
  );

  const onNodeContextMenu: NodeMouseHandler<BuildFlowNode> = useCallback(
    (e, node) => {
      e.preventDefault();
      if (mergeMode) return;
      openAddBranchModal(node.id);
    },
    [mergeMode, openAddBranchModal],
  );

  const fuse = async () => {
    if (mergeSelection.length !== 2) return;
    const [a, b] = mergeSelection;
    const na = buildNodes.find((n) => n.id === a);
    const nb = buildNodes.find((n) => n.id === b);
    const attrs = Array.from(
      new Set([...(na?.attributes ?? []), ...(nb?.attributes ?? [])]),
    );
    const created = await createBranch([a, b], {
      title: `${na?.title.split(" ")[0] ?? "A"} × ${nb?.title.split(" ")[0] ?? "B"}`,
      attributes: attrs.slice(0, 6),
      summary: `Fusion of ${na?.title} + ${nb?.title}`,
    });
    clearMergeSelection();
    setMergeMode(false);
    setFlashNodeId(created.id);
    await reload();
    setTimeout(() => {
      setFlashNodeId(null);
      void openNode(created.id);
    }, 400);
  };

  const onCreatedFork = async (n: BuildNodeData) => {
    closeAddBranchModal();
    setFlashNodeId(n.id);
    await reload();
    setTimeout(() => {
      setFlashNodeId(null);
      void openNode(n.id);
    }, 400);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Loading graph…
      </div>
    );
  }

  if (buildNodes.length === 0) return null;

  return (
    <motion.div
      className="relative h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      {/* top-right, clear of the floating left panel */}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setMergeMode(!mergeMode);
            clearMergeSelection();
          }}
          className={`btn focus-ring ${
            mergeMode ? "btn-accent" : "btn-secondary"
          }`}
        >
          Merge
        </button>
        {mergeMode && mergeSelection.length === 2 && (
          <button
            type="button"
            onClick={fuse}
            className="btn btn-primary focus-ring"
          >
            Fuse builds
          </button>
        )}
        {mergeMode && mergeSelection.length < 2 && (
          <span className="rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1.5 text-[12px] text-muted">
            Select {2 - mergeSelection.length} more
          </span>
        )}
      </div>

      {addBranchRequest && (
        <AddBranchModal
          parentId={addBranchRequest.parentId}
          presetAttributes={addBranchRequest.presetAttributes}
          nodes={buildNodes}
          onClose={closeAddBranchModal}
          onCreated={onCreatedFork}
        />
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeContextMenu={onNodeContextMenu}
        onMove={(_, v) => {
          setZoomPct(Math.round(v.zoom * 100));
          setGraphZoom(v.zoom);
        }}
        onPaneClick={() => {
          setSearchResult(null);
          if (!mergeMode) closeAddBranchModal();
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        minZoom={0.2}
        maxZoom={2.2}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
      />

      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-0.5 rounded-[var(--radius)] border border-line bg-surface p-0.5 shadow-[var(--shadow-sm)]">
        <button
          type="button"
          className="btn btn-ghost focus-ring !h-7 !w-7 !px-0"
          onClick={() => {
            zoomOut({ duration: 180 });
            setZoomPct(Math.round(getZoom() * 100));
          }}
        >
          −
        </button>
        <span className="min-w-[2.75rem] text-center text-[11px] font-medium tabular-nums text-muted">
          {zoomPct}%
        </span>
        <button
          type="button"
          className="btn btn-ghost focus-ring !h-7 !w-7 !px-0"
          onClick={() => {
            zoomIn({ duration: 180 });
            setZoomPct(Math.round(getZoom() * 100));
          }}
        >
          +
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 text-[11px] text-muted-2">
        Click a node to open it · Right-click to fork
      </p>
    </motion.div>
  );
}

export function TreeCanvas({
  carId,
  onGraphChange,
}: {
  carId: string;
  onGraphChange?: (nodes: BuildNodeData[]) => void;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner carId={carId} onGraphChange={onGraphChange} />
    </ReactFlowProvider>
  );
}

export function EmptyGarage({ onPlant }: { onPlant?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
      <div className="h-16 w-16 rounded-full border border-dashed border-line-strong bg-surface" />
      <div className="h-8 w-px bg-line" />
      <h2 className="font-display text-[22px] text-ink">No builds yet</h2>
      <p className="max-w-xs text-center text-ui text-muted">
        Be the first to plant this tree.
      </p>
      <button type="button" onClick={onPlant} className="btn btn-primary btn-lg focus-ring">
        Plant the root
      </button>
    </div>
  );
}
