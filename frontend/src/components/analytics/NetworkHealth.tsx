"use client";

import type { EcosystemAnalytics } from "@/lib/types";

export function NetworkHealth({
  network,
}: {
  network: EcosystemAnalytics["network"];
}) {
  const statusColor =
    network.status === "STABLE"
      ? "text-accent"
      : network.status === "HOT"
        ? "text-warning"
        : "text-danger";

  return (
    <div className="flex flex-col rounded-[24px] border border-white/5 bg-[rgba(18,18,18,0.7)] p-8 backdrop-blur-xl">
      <h2 className="heading-font mb-8 text-xl font-bold text-ink">
        Network Health
      </h2>

      <div className="relative flex-1 rounded-2xl border border-white/5 bg-black/40 p-4 min-h-[200px]">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
          <svg className="h-full w-full" aria-hidden>
            <circle
              cx="50%"
              cy="50%"
              r="20%"
              fill="none"
              stroke="white"
              strokeWidth="1"
              strokeDasharray="4"
            />
            <circle
              cx="50%"
              cy="50%"
              r="40%"
              fill="none"
              stroke="white"
              strokeWidth="1"
              strokeDasharray="4"
            />
          </svg>
        </div>

        <span className="network-dot absolute left-[20%] top-[30%] h-3 w-3 rounded-full bg-accent" />
        <span className="network-dot absolute left-[50%] top-[10%] h-2 w-2 rounded-full bg-accent-blue" />
        <span className="network-dot absolute left-[80%] top-[40%] h-4 w-4 rounded-full bg-white/40" />
        <span className="network-dot absolute left-[40%] top-[70%] h-3 w-3 rounded-full bg-accent" />
        <span className="network-dot absolute left-[70%] top-[80%] h-2 w-2 rounded-full bg-accent-blue" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted">
              Mainframe Status
            </p>
            <p className={`text-lg font-bold ${statusColor}`}>{network.status}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-ink">
          <span>Avg. Branch Depth</span>
          <span className="text-muted">{network.avgBranchDepth} Nodes</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700"
            style={{ width: `${network.depthPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-bold text-ink">
          <span>Ecosystem Diversity</span>
          <span className="text-muted">{network.diversityPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-accent-blue transition-[width] duration-700"
            style={{ width: `${network.diversityPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
