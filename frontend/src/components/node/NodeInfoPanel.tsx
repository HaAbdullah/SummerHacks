"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, BookmarkCheck, ImageOff } from "lucide-react";
import type { BuildNodeData, Car, CarParts, Mods } from "@/lib/types";
import { getAttributeGroups, getCar, getCarParts } from "@/lib/api";
import {
  isInLibrary,
  LIBRARY_CHANGED_EVENT,
  toggleLibrary,
} from "@/lib/library";

const SLOT_LABELS: Record<keyof Mods, string> = {
  engine: "Engine",
  exhaust: "Exhaust",
  wheels: "Wheels",
  brakes: "Brakes",
};
const SLOT_ORDER: (keyof Mods)[] = ["engine", "exhaust", "wheels", "brakes"];

export function NodeInfoPanel({
  carId,
  node,
}: {
  carId: string;
  node: BuildNodeData;
}) {
  const [saved, setSaved] = useState(false);
  const [labelMap, setLabelMap] = useState<Map<string, string>>(new Map());
  const [parts, setParts] = useState<CarParts | null>(null);
  const [car, setCar] = useState<Car | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await getCar(carId).catch(() => null);
      if (!cancelled) setCar(c);
    })();
    return () => {
      cancelled = true;
    };
  }, [carId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const groups = await getAttributeGroups(carId).catch(() => []);
      if (cancelled) return;
      const map = new Map<string, string>();
      for (const g of groups) for (const o of g.options) map.set(o.id, o.label);
      setLabelMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [carId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getCarParts(carId).catch(() => null);
      if (!cancelled) setParts(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [carId]);

  const filledSlots = SLOT_ORDER.filter((slot) => node.mods[slot]?.trim());

  const sync = useCallback(() => {
    setSaved(isInLibrary(node.id));
  }, [node.id]);

  useEffect(() => {
    sync();
    window.addEventListener(LIBRARY_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LIBRARY_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  const onToggle = () => {
    const nowSaved = toggleLibrary(node);
    setSaved(nowSaved);
  };

  return (
    <aside className="glass-sidebar flex h-full w-[300px] shrink-0 flex-col border-r border-line">
      <div className="border-b border-line p-6">
        <Link
          href={`/garage/${carId}`}
          className="group mb-6 flex items-center gap-2 text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft
            size={14}
            className="transition-transform group-hover:-translate-x-1"
          />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Back to Tree
          </span>
        </Link>

        <div className="space-y-4">
          <div className="aspect-square w-full overflow-hidden rounded-2xl border border-line bg-surface">
            {node.heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={node.heroImage}
                alt={node.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-2">
                <ImageOff size={28} />
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              Current Node
            </h2>
            <h1 className="heading-font text-xl leading-tight font-bold text-ink">
              {node.title}
            </h1>
          </div>

          {node.attributes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {node.attributes.slice(0, 5).map((a) => (
                <span key={a} className="chip !h-6 !px-2">
                  {labelMap.get(a) ?? a}
                </span>
              ))}
              {node.parentIds.length > 1 && (
                <span className="chip chip-active !h-6 !px-2">Fusion</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="scroll-soft flex-1 overflow-y-auto p-6">
        {car && (
          <div className="mb-6 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">
              Vehicle
            </h3>
            <div className="rounded-xl border border-line bg-white/5 p-3">
              <p className="heading-font text-[13px] font-bold text-ink">
                {car.make} {car.model}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {car.generation ? `${car.generation} · ` : ""}
                {car.yearRange}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">
            Stats
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line bg-white/5 p-3">
              <span className="block text-xs text-muted">Contributions</span>
              <span className="font-bold text-ink">{node.stats.notes}</span>
            </div>
            <div className="rounded-xl border border-line bg-white/5 p-3">
              <span className="block text-xs text-muted">Contributors</span>
              <span className="font-bold text-ink">
                {node.stats.contributors}
              </span>
            </div>
          </div>
        </div>

        {filledSlots.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">
              Mods
            </h3>
            <div className="space-y-2.5">
              {filledSlots.map((slot) => {
                const slotParts = parts?.slots[slot] ?? [];
                return (
                  <div
                    key={slot}
                    className="rounded-xl border border-line bg-white/5 p-3"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-accent">
                      {SLOT_LABELS[slot]}
                    </p>
                    <p className="mt-1 text-ui leading-relaxed text-ink-soft">
                      {node.mods[slot]}
                    </p>
                    {slotParts.length > 0 && (
                      <ul className="mt-2 space-y-1 border-t border-line pt-2">
                        {slotParts.slice(0, 3).map((p) => (
                          <li
                            key={p.name}
                            className="flex items-center justify-between gap-2 text-[11px]"
                          >
                            <span className="min-w-0 truncate text-muted-2">
                              {p.brand} · {p.name}
                            </span>
                            <span className="shrink-0 tabular-nums font-medium text-ink-soft">
                              ${p.price.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {node.summary && (
          <div className="mt-6 space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">
              Summary
            </h3>
            <p className="text-ui leading-relaxed text-ink-soft">
              {node.summary}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-line p-6">
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-4 text-[11px] font-bold uppercase tracking-widest transition-all ${
            saved
              ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/15"
              : "border-line-strong bg-white/5 text-ink-soft hover:bg-white/10"
          }`}
        >
          {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          {saved ? "Saved to Library" : "Save to Library"}
        </button>
      </div>
    </aside>
  );
}
