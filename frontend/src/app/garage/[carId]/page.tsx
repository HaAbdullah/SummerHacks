"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, GitBranch, Car as CarIcon } from "lucide-react";
import {
  getAttributeGroups,
  getCar,
  getGraph,
  createBranch,
} from "@/lib/api/backend";
import type { AttributeGroup, BuildNodeData, Car } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { filterMatchingIds } from "@/lib/graph-utils";
import { TreeCanvas, EmptyGarage } from "@/components/graph/TreeCanvas";
import { AttributePanel } from "@/components/navigator/AttributePanel";
import { AiSearchBar } from "@/components/navigator/AiSearchBar";
import { PulseStrip } from "@/components/navigator/PulseStrip";

export default function GaragePage({
  params,
}: {
  params: Promise<{ carId: string }>;
}) {
  const { carId } = use(params);
  const [car, setCar] = useState<Car | null>(null);
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [graph, setGraph] = useState<BuildNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeFilters, setFlashNodeId, openAddBranchModal } = useAppStore();

  const load = async () => {
    const [c, g, gr] = await Promise.all([
      getCar(carId),
      getAttributeGroups(carId),
      getGraph(carId),
    ]);
    setCar(c);
    setGroups(g);
    setGraph(gr);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getCar(carId),
      getAttributeGroups(carId),
      getGraph(carId),
    ]).then(([c, g, gr]) => {
      if (cancelled) return;
      setCar(c);
      setGroups(g);
      setGraph(gr);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [carId]);

  const matchSet = useMemo(
    () => filterMatchingIds(graph, activeFilters),
    [graph, activeFilters],
  );
  const hasActiveFilters = Object.values(activeFilters).some(
    (a) => a.length > 0,
  );
  const noMatches = hasActiveFilters && matchSet !== null && matchSet.size === 0;
  const rootId = useMemo(
    () => graph.find((n) => n.parentIds.length === 0)?.id ?? null,
    [graph],
  );

  const handlePlant = async () => {
    const root = await createBranch([], {
      carId,
      title: "Stock",
      attributes: ["stock", "stock-height", "none"],
      summary: "Factory baseline. The trunk everything grows from.",
    });
    setFlashNodeId(root.id);
    await load();
    setTimeout(() => setFlashNodeId(null), 1000);
  };

  const handleStartBranch = () => {
    if (rootId) openAddBranchModal(rootId);
  };

  const handleAddFromFilters = () => {
    if (!rootId) return;
    const presetAttributes = Object.values(activeFilters).flat();
    openAddBranchModal(rootId, presetAttributes);
  };

  const empty = !loading && graph.length === 0;

  return (
    <div className="relative h-screen w-full min-w-[1080px] overflow-hidden bg-bg">
      {/* Full-bleed graph canvas — the floating panel below sits on top of this. */}
      <main className="dot-grid absolute inset-0 bg-bg">
        {loading ? (
          <div className="flex h-full items-center justify-center text-ui text-muted">
            Opening garage…
          </div>
        ) : empty ? (
          <EmptyGarage onPlant={() => void handlePlant()} />
        ) : (
          <TreeCanvas carId={carId} onGraphChange={setGraph} />
        )}
      </main>

      {/* Floating left panel — a modal-like card resting on the dotted canvas. */}
      {!loading && !empty && (
        <aside className="floating-modal absolute bottom-8 left-8 top-8 z-40 flex w-[23vw] min-w-[380px] max-w-[500px] flex-col overflow-hidden rounded-[32px]">
          <div className="border-b border-line p-6">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <GitBranch className="h-4 w-4 text-white" />
              </div>
              <Link
                href="/"
                className="focus-ring heading-font rounded-[var(--radius-xs)] text-xl font-bold tracking-tighter text-ink"
              >
                Builda<span className="text-accent">Mod</span>
              </Link>
            </div>

            <AiSearchBar carId={carId} />

            {car && (
              <div className="mt-4 flex cursor-default items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <CarIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted">
                    Active Project
                  </h3>
                  <p className="heading-font truncate text-xs font-bold text-ink">
                    {car.make.toUpperCase()} {car.model.toUpperCase()}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
              </div>
            )}
          </div>

          <div className="scroll-soft flex-1 space-y-6 overflow-y-auto p-6">
            <PulseStrip carId={carId} />

            <div className="h-px bg-line" />

            <AttributePanel
              groups={groups}
              matchCount={matchSet ? matchSet.size : null}
            />

            {noMatches && (
              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 text-center">
                <p className="text-[13px] font-semibold text-ink">
                  No branches match yet
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">
                  Nobody has built this combo. Be the first to plant it.
                </p>
                <button
                  type="button"
                  onClick={handleAddFromFilters}
                  disabled={!rootId}
                  className="btn btn-accent btn-lg focus-ring mt-3 w-full disabled:opacity-50"
                >
                  + Add a branch with these attributes
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-line p-6">
            <button
              type="button"
              onClick={handleStartBranch}
              disabled={!rootId}
              className="btn btn-primary btn-xl heading-font focus-ring w-full font-black uppercase tracking-wide disabled:opacity-50"
            >
              Start New Branch
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
