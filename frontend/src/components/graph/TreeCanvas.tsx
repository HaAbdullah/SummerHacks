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
import { compareNodes, toCompareNode } from "@/lib/api/compare";
import type { BuildNodeData, CompareResult } from "@/lib/types";
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
import { CompareResultPanel } from "./CompareResultPanel";

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
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [compareBusy, setCompareBusy] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
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
    focusedBranchId,
    showFullTree,
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
    setShowFullTree,
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

  const rootId = useMemo(
    () => buildNodes.find((n) => n.parentIds.length === 0)?.id ?? null,
    [buildNodes],
  );

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

  const hasActiveFilters = Object.values(activeFilters).some((a) => a.length > 0);

  /** Default view is collapsed to root + first layer (+ the focused branch's
   * children, if any). Filters/search need the full tree so highlighting and
   * match counts stay accurate, so they bypass the collapse entirely. */
  const visibleBuildNodes = useMemo(() => {
    if (hasActiveFilters || searchResult || showFullTree || !rootId) return buildNodes;
    const visible = new Set<string>([rootId]);
    for (const n of buildNodes) {
      if (n.parentIds.includes(rootId)) visible.add(n.id);
    }
    if (focusedBranchId) {
      visible.add(focusedBranchId);
      for (const n of buildNodes) {
        if (n.parentIds.includes(focusedBranchId)) visible.add(n.id);
      }
    }
    return buildNodes.filter((n) => visible.has(n.id));
  }, [
    buildNodes,
    rootId,
    focusedBranchId,
    hasActiveFilters,
    searchResult,
    showFullTree,
  ]);

  useEffect(() => {
    if (buildNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const laid = layoutGraph(visibleBuildNodes);

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
            compareIndex: (() => {
              const i = compareSelection.indexOf(id);
              return i >= 0 ? i + 1 : 0;
            })(),
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
    visibleBuildNodes,
    hoverPath,
    filterHighlight,
    searchPath,
    searchSet,
    mergeSelection,
    compareSelection,
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

  const prevFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!entered.current) {
      prevFocusRef.current = focusedBranchId;
      return;
    }
    if (prevFocusRef.current === focusedBranchId) return;
    prevFocusRef.current = focusedBranchId;

    zoomOut({ duration: 260 });
    const t = window.setTimeout(() => {
      if (focusedBranchId) {
        const fitIds = [
          focusedBranchId,
          ...buildNodes
            .filter((n) => n.parentIds.includes(focusedBranchId))
            .map((n) => n.id),
        ];
        fitView({
          padding: 0.35,
          duration: 650,
          nodes: fitIds.map((id) => ({ id })),
        });
      } else {
        fitView({ padding: 0.28, duration: 650 });
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [focusedBranchId, buildNodes, zoomOut, fitView]);

  const prevShowFullRef = useRef(showFullTree);
  useEffect(() => {
    if (!entered.current) {
      prevShowFullRef.current = showFullTree;
      return;
    }
    if (prevShowFullRef.current === showFullTree) return;
    prevShowFullRef.current = showFullTree;

    const t = window.setTimeout(() => {
      fitView({ padding: showFullTree ? 0.15 : 0.28, duration: 650 });
    }, 20);
    return () => window.clearTimeout(t);
  }, [showFullTree, fitView]);

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
    (e, node) => {
      if (e.shiftKey && !mergeMode) {
        setCompareSelection((selected) => {
          if (selected.includes(node.id)) {
            return selected.filter((id) => id !== node.id);
          }
          return selected.length < 2 ? [...selected, node.id] : [selected[1], node.id];
        });
        setCompareResult(null);
        setCompareError(null);
        return;
      }
      if (mergeMode) {
        toggleMergeSelection(node.id);
        return;
      }
      setCompareSelection([]);
      setCompareResult(null);
      setCompareError(null);
      void openNode(node.id);
    },
    [mergeMode, toggleMergeSelection, openNode],
  );

  const runComparison = async () => {
    if (compareSelection.length !== 2 || compareBusy) return;
    const base = buildNodes.find((node) => node.id === compareSelection[0]);
    const target = buildNodes.find((node) => node.id === compareSelection[1]);
    if (!base || !target) return;

    setCompareBusy(true);
    setCompareError(null);
    setCompareResult(null);
    try {
      setCompareResult(
        await compareNodes(toCompareNode(base), toCompareNode(target)),
      );
    } catch (error) {
      setCompareError(
        error instanceof Error ? error.message : "Node comparison failed",
      );
    } finally {
      setCompareBusy(false);
    }
  };

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

  const clearCompare = useCallback(() => {
    setCompareSelection([]);
    setCompareResult(null);
    setCompareError(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearCompare();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearCompare]);

  const fuse = async () => {
    if (mergeSelection.length !== 2) return;
    const [a, b] = mergeSelection;
    const na = buildNodes.find((n) => n.id === a);
    const nb = buildNodes.find((n) => n.id === b);
    if (!na || !nb) return;
    const mergedMods = {
      engine: na.mods.engine || nb.mods.engine,
      exhaust: na.mods.exhaust || nb.mods.exhaust,
      wheels: na.mods.wheels || nb.mods.wheels,
      brakes: na.mods.brakes || nb.mods.brakes,
    };
    const created = await createBranch(na.carId, [a, b], {
      title: `${na.title.split(" ")[0]} × ${nb.title.split(" ")[0]}`,
      mods: mergedMods,
      summary: `Fusion of ${na.title} + ${nb.title}`,
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
      {/* top-right; shift left when compare panel is open so controls stay clickable */}
      <div
        className={`absolute top-3 z-20 flex flex-wrap items-center justify-end gap-1.5 transition-[right] duration-200 ${
          compareResult ? "right-[410px]" : "right-3"
        }`}
      >
        <button
          type="button"
          onClick={() => setShowFullTree(!showFullTree)}
          className={`btn focus-ring ${showFullTree ? "btn-accent" : "btn-secondary"}`}
        >
          {showFullTree ? "Collapse Tree" : "Show All Modifications"}
        </button>
        <button
          type="button"
          onClick={runComparison}
          disabled={compareSelection.length !== 2 || compareBusy}
          className="btn btn-primary focus-ring disabled:cursor-not-allowed disabled:opacity-45"
          title="Shift-click two nodes, then compare"
        >
          {compareBusy ? "Comparing…" : "Compare"}
        </button>
        {compareSelection.length < 2 && (
          <span className="rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1.5 text-[12px] text-muted">
            Shift-click {2 - compareSelection.length} node
            {compareSelection.length === 0 ? "s" : ""}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setMergeMode(!mergeMode);
            clearMergeSelection();
            clearCompare();
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

      {compareError && (
        <div className="absolute right-3 top-14 z-30 max-w-[390px] rounded-xl border border-red-500/25 bg-red-950/90 px-4 py-3 text-[12px] text-red-100 shadow-xl">
          {compareError}
        </div>
      )}

      {compareResult &&
        (() => {
          const base = buildNodes.find(
            (node) => node.id === compareResult.base_node_id,
          );
          const target = buildNodes.find(
            (node) => node.id === compareResult.target_node_id,
          );
          return base && target ? (
            <CompareResultPanel
              base={base}
              target={target}
              result={compareResult}
              onClose={() => setCompareResult(null)}
            />
          ) : null;
        })()}

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
          // Keep compare selection sticky until Escape / third shift-click / open node
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

      <div
        className={`absolute bottom-3 z-20 flex items-center gap-0.5 rounded-[var(--radius)] border border-line bg-surface p-0.5 shadow-[var(--shadow-sm)] transition-[right] duration-200 ${
          compareResult ? "right-[410px]" : "right-3"
        }`}
      >
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
        Click to open · Shift-click two nodes to compare · Right-click to fork
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

export function EmptyGarage({
  carLabel,
  onCreateFirst,
  onRetry,
  mode = "first",
}: {
  carLabel?: string;
  /** Open the create-first-node menu (empty garage, you're first). */
  onCreateFirst?: () => void;
  /** Retry load when the car couldn't be resolved at all. */
  onRetry?: () => void;
  mode?: "first" | "error";
}) {
  if (mode === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
        <div className="h-16 w-16 rounded-full border border-dashed border-line-strong bg-surface" />
        <div className="h-8 w-px bg-line" />
        <h2 className="font-display text-[22px] text-ink">
          Couldn&apos;t open this car
        </h2>
        <p className="max-w-xs text-center text-ui text-muted">
          This build tree failed to load — it may not exist yet.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-primary btn-lg focus-ring"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-accent/40 bg-accent/10">
        <span className="heading-font text-2xl font-bold text-accent">1st</span>
      </div>
      <div className="max-w-md text-center">
        <h2 className="font-display text-[26px] tracking-tight text-ink">
          You&apos;re the first one here
        </h2>
        <p className="mt-2 text-ui leading-relaxed text-muted">
          {carLabel ? (
            <>
              Nobody has planted a build tree for{" "}
              <span className="font-semibold text-ink-soft">{carLabel}</span>{" "}
              yet. Create the first node to open this garage.
            </>
          ) : (
            <>
              Nobody has planted a build tree for this car yet. Create the first
              node to open this garage.
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onCreateFirst}
        className="btn btn-primary btn-xl heading-font focus-ring font-black uppercase tracking-wide"
      >
        Create first node
      </button>
      <p className="text-[11px] text-muted-2">
        You&apos;ll set a title, optional mods, and a cover image.
      </p>
    </div>
  );
}
