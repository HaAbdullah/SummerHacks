"use client";

import Link from "next/link";
import { ArrowLeft, Bookmark, ImageOff } from "lucide-react";
import type { BuildNodeData } from "@/lib/types";
import { attributeGroups } from "@/lib/api/seed";

const labelMap = new Map<string, string>();
for (const g of attributeGroups) {
  for (const o of g.options) labelMap.set(o.id, o.label);
}

export function NodeInfoPanel({
  carId,
  node,
}: {
  carId: string;
  node: BuildNodeData;
}) {
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
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">
            Stats
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line bg-white/5 p-3">
              <span className="block text-xs text-muted">Notes</span>
              <span className="font-bold text-ink">{node.stats.notes}</span>
            </div>
            <div className="rounded-xl border border-line bg-white/5 p-3">
              <span className="block text-xs text-muted">Forks</span>
              <span className="font-bold text-ink">{node.stats.forks}</span>
            </div>
            <div className="rounded-xl border border-line bg-white/5 p-3">
              <span className="block text-xs text-muted">Contributors</span>
              <span className="font-bold text-ink">
                {node.stats.contributors}
              </span>
            </div>
            <div className="rounded-xl border border-line bg-white/5 p-3">
              <span className="block text-xs text-muted">Heat</span>
              <span className="font-bold text-ink">
                {Math.round(node.stats.heat * 100)}
              </span>
            </div>
          </div>
        </div>

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
          title="Coming soon"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-white/5 py-4 text-[11px] font-bold uppercase tracking-widest text-ink-soft transition-all hover:bg-white/10"
        >
          <Bookmark size={14} />
          Save to Library
        </button>
      </div>
    </aside>
  );
}
