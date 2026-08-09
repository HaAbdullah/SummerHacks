"use client";

import { AlertTriangle, BookOpen, Check, LoaderCircle, X } from "lucide-react";
import type { BuildNodeData, CompareResult } from "@/lib/types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function CompareResultPanel({
  base,
  target,
  result,
  onClose,
  onGenerateGuide,
  guideBusy = false,
}: {
  base: BuildNodeData;
  target: BuildNodeData;
  result: CompareResult;
  onClose: () => void;
  onGenerateGuide?: () => void;
  guideBusy?: boolean;
}) {
  const changes = result.changes.filter(
    (change) => change.operation !== "unchanged",
  );
  const unresolved = [
    ...result.pricing.unresolved_added_parts,
    ...result.pricing.unresolved_removed_parts,
  ];

  return (
    <aside className="floating-modal absolute right-4 top-20 z-40 max-h-[calc(100%-6rem)] w-[390px] overflow-y-auto rounded-[22px] p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-accent-blue">
            Build comparison
          </div>
          <h2 className="heading-font mt-1 text-[17px] font-bold text-ink">
            {base.title} → {target.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted hover:bg-white/10 hover:text-ink"
          aria-label="Close comparison"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric
          label="New parts"
          value={money.format(result.pricing.new_parts_cost)}
        />
        <Metric
          label="Removed value"
          value={money.format(result.pricing.removed_parts_value)}
        />
        <Metric
          label="Value delta"
          value={money.format(result.pricing.build_value_difference)}
        />
      </div>

      <div className="mt-5">
        <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted">
          Required changes
        </h3>
        <div className="mt-2 space-y-2">
          {changes.length === 0 ? (
            <p className="rounded-xl border border-line bg-white/[0.025] p-3 text-[12px] text-muted">
              The mechanical configurations already match.
            </p>
          ) : (
            changes.map((change) => (
              <div
                key={change.mod_key}
                className="rounded-xl border border-line bg-white/[0.025] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold capitalize text-ink">
                    {change.mod_key}
                  </span>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-accent">
                    {change.operation}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  {change.current ?? "Stock"} → {change.target ?? "Stock"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {unresolved.length > 0 && (
        <div className="mt-4 flex gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-[11px] text-yellow-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Catalogue pricing is incomplete for {unresolved.join(", ")}.
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[10px] text-muted">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full ${
            result.matches_target
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {result.matches_target ? (
            <Check className="h-3 w-3" />
          ) : (
            <X className="h-3 w-3" />
          )}
        </span>
        Deterministic validation{" "}
        {result.matches_target ? "matched the target" : "did not match"}
      </div>

      {onGenerateGuide && (
        <button
          type="button"
          onClick={onGenerateGuide}
          disabled={guideBusy}
          className="btn btn-primary focus-ring mt-4 w-full gap-1.5 disabled:opacity-50"
        >
          {guideBusy ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <BookOpen className="h-3.5 w-3.5" />
          )}
          {guideBusy ? "Generating guide" : "Generate build guide"}
        </button>
      )}
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.025] p-2.5">
      <div className="text-[8px] font-black uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-1 text-[12px] font-bold text-ink">{value}</div>
    </div>
  );
}
