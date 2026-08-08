"use client";

import type { AttributeGroup } from "@/lib/types";
import { useAppStore } from "@/lib/store";

export function AttributePanel({
  groups,
  matchCount,
}: {
  groups: AttributeGroup[];
  matchCount: number | null;
}) {
  const { activeFilters, toggleFilter, clearFilters } = useAppStore();
  const hasFilters = Object.values(activeFilters).some((a) => a.length > 0);

  return (
    <section className="space-y-4">
      <div className="flex h-5 items-center justify-between">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
          Attribute Navigator
        </h4>
        {hasFilters && matchCount !== null && (
          <button
            type="button"
            onClick={clearFilters}
            className="focus-ring text-[11px] font-bold text-accent hover:underline"
          >
            Clear · {matchCount}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {groups.map((g) => {
          const selected = activeFilters[g.id] ?? [];
          return (
            <div key={g.id} className="group">
              <p className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-ink-soft">
                {g.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {g.options.map((o) => {
                  const on = selected.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleFilter(g.id, o.id)}
                      className={`chip focus-ring ${on ? "chip-active" : ""}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
