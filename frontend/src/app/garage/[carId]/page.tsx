"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, GitBranch, Car as CarIcon } from "lucide-react";
import { getAttributeGroups, getCar, getGraph } from "@/lib/api";
import type { AttributeGroup, BuildNodeData, Car } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { filterMatchingIds } from "@/lib/graph-utils";
import { TreeCanvas, EmptyGarage } from "@/components/graph/TreeCanvas";
import { AttributePanel } from "@/components/navigator/AttributePanel";
import { AiSearchBar } from "@/components/navigator/AiSearchBar";
import { PulseStrip } from "@/components/navigator/PulseStrip";
import { SavedMods } from "@/components/navigator/SavedMods";

export default function GaragePage({
  params,
}: {
  params: Promise<{ carId: string }>;
}) {
  const { carId } = use(params);
  const searchParams = useSearchParams();
  // Cars with no curated generation data can't be resolved from a bare
  // carId server-side, so the search flow passes make/model/generation
  // through as a fallback for the create-on-first-visit path.
  const fallbackMake = searchParams.get("make");
  const fallbackModel = searchParams.get("model");
  const fallback =
    fallbackMake && fallbackModel
      ? {
          make: fallbackMake,
          model: fallbackModel,
          generation: searchParams.get("generation") ?? undefined,
        }
      : undefined;
  const [car, setCar] = useState<Car | null>(null);
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [graph, setGraph] = useState<BuildNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const {
    activeFilters,
    focusedBranchId,
    openAddBranchModal,
    setFocusedBranchId,
  } = useAppStore();

  const load = async () => {
    setLoading(true);
    try {
      // Graph resolves (and creates, if needed) the car first — attributes
      // 404 until the car exists, so it can't run in parallel with this.
      const gr = await getGraph(carId, fallback);
      const [c, g] = await Promise.all([getCar(carId), getAttributeGroups(carId)]);
      setCar(c);
      setGroups(g);
      setGraph(gr);
    } catch {
      setCar(null);
      setGroups([]);
      setGraph([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const rootChildren = useMemo(
    () => (rootId ? graph.filter((n) => n.parentIds.includes(rootId)) : []),
    [graph, rootId],
  );

  useEffect(() => {
    if (!projectMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!projectMenuRef.current?.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [projectMenuOpen]);

  // Every valid carId auto-creates its stock root on the first `getGraph`
  // call — there's no separate "plant" step anymore. If we land here it's
  // because the car couldn't be resolved at all; retry the load.
  const handlePlant = () => {
    void load();
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
              </div>
            )}

            {rootChildren.length > 0 && (
              <div ref={projectMenuRef} className="relative mt-3">
                <button
                  type="button"
                  onClick={() => setProjectMenuOpen((o) => !o)}
                  className="focus-ring flex w-full items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted">
                      Select Modification
                    </h3>
                    <p className="heading-font truncate text-xs font-bold text-ink">
                      {focusedBranchId
                        ? (rootChildren.find((b) => b.id === focusedBranchId)?.title ??
                          "Choose a branch")
                        : "Choose a branch"}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                      projectMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {projectMenuOpen && (
                  <div className="floating-modal absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl">
                    <p className="px-4 pb-2 pt-3 text-[9px] font-bold uppercase tracking-widest text-muted">
                      Jump into a branch
                    </p>
                    <div className="divide-y divide-line">
                      {rootChildren.map((b) => {
                        const active = focusedBranchId === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setFocusedBranchId(b.id);
                              setProjectMenuOpen(false);
                            }}
                            className={`focus-ring flex w-full items-center justify-between px-4 py-3 text-left text-[12px] font-semibold transition-colors hover:bg-white/5 ${
                              active ? "text-accent" : "text-ink-soft"
                            }`}
                          >
                            {b.title}
                            {active && <span className="text-[10px]">● shown</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="scroll-soft flex-1 space-y-6 overflow-y-auto p-6">
            <PulseStrip carId={carId} />

            <div className="h-px bg-line" />

            <SavedMods carId={carId} />

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
