"use client";

import type { TopBuilder } from "@/lib/types";

const ringClass: Record<TopBuilder["ring"], string> = {
  red: "border-accent",
  blue: "border-accent-blue",
  neutral: "border-white/20",
};

function formatContributions(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k Contributions`;
  return `${n} Contributions`;
}

export function TopBuilders({ builders }: { builders: TopBuilder[] }) {
  return (
    <div className="rounded-[24px] border border-white/5 bg-[rgba(18,18,18,0.7)] p-8 backdrop-blur-xl">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="heading-font text-xl font-bold text-ink">
          Top Branch Builders
        </h2>
        <button
          type="button"
          className="text-[10px] font-black uppercase text-muted transition-colors hover:text-ink"
        >
          Leaderboard
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {builders.map((b) => (
          <div
            key={b.handle}
            className="flex cursor-default items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.pravatar.cc/150?u=${b.avatarSeed}`}
              alt=""
              className={`h-12 w-12 rounded-full border-2 ${ringClass[b.ring]}`}
            />
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-bold text-ink">{b.handle}</h4>
              <p className="text-[10px] text-muted">
                {formatContributions(b.contributions)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
