"use client";

import Link from "next/link";
import type { TrendingBranch } from "@/lib/types";

const barGradient: Record<TrendingBranch["accent"], string> = {
  red: "from-accent to-red-500",
  blue: "from-accent-blue to-blue-500",
  yellow: "from-yellow-500 to-orange-500",
};

const hoverBorder: Record<TrendingBranch["accent"], string> = {
  red: "group-hover:border-accent",
  blue: "group-hover:border-accent-blue",
  yellow: "group-hover:border-yellow-500",
};

export function TrendingBranches({ items }: { items: TrendingBranch[] }) {
  return (
    <div className="rounded-[24px] border border-white/5 bg-[rgba(18,18,18,0.7)] p-8 backdrop-blur-xl">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="heading-font text-xl font-bold text-ink">
          Trending Branches
        </h2>
        <Link
          href="/"
          className="text-[10px] font-black uppercase text-muted transition-colors hover:text-ink"
        >
          View All Models
        </Link>
      </div>

      <div className="space-y-6">
        {items.map((t) => (
          <Link
            key={t.carId}
            href={`/garage/${t.carId}`}
            className="group flex cursor-pointer items-center gap-4"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-ink transition-all ${hoverBorder[t.accent]}`}
            >
              {String(t.rank).padStart(2, "0")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h4 className="truncate text-sm font-bold text-ink">
                  {t.label}
                </h4>
                <span className="shrink-0 text-[10px] font-black tracking-tighter text-emerald-500">
                  +{t.growthPct}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full bg-gradient-to-r ${barGradient[t.accent]}`}
                  style={{ width: `${t.heatPct}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
