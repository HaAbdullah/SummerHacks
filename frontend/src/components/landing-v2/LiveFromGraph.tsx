"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { EcosystemAnalytics } from "@/lib/types";
import { useReveal } from "./use-reveal";
import styles from "./landing-v2.module.css";

const ACCENTS: Record<string, string> = {
  red: "#ff3c3c",
  blue: "#3c7eff",
  yellow: "#f2c94c",
  neutral: "#666666",
};

/**
 * Everything in this section is read from GET /api/ecosystem/analytics at
 * runtime. Nothing here is a placeholder number — if the fetch fails the
 * section renders nothing rather than showing invented figures.
 *
 * Mounted only once analytics have arrived — the reveal observer attaches on
 * first render, so an early `return null` here would leave the section stuck
 * invisible after the data landed.
 */
export function LiveFromGraph({ data }: { data: EcosystemAnalytics }) {
  const { ref, shown } = useReveal<HTMLDivElement>(0.15);
  const { kpis, network, trending, builders } = data;

  return (
    <section className="relative z-10 border-t border-line px-6 py-24 md:px-12">
      <div
        ref={ref}
        className={`${styles.reveal} ${shown ? styles.revealShown : ""} mx-auto max-w-6xl`}
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.32em] text-muted-2">
              <span className={`${styles.livePip} h-1.5 w-1.5 rounded-full bg-accent`} />
              Live from the graph
            </p>
            <h2 className="heading-font mt-4 text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-5xl">
              NOT A MOCKUP.
            </h2>
          </div>
          <Link
            href="/ecosystem"
            className="group flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
          >
            Full analytics
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* KPI strip */}
        <div className="mt-12 grid grid-cols-2 border-l border-t border-line md:grid-cols-4">
          {[
            { label: "Forks", value: kpis.totalForks.value },
            { label: "Active builders", value: kpis.activeBuilders.value },
            { label: "Merges", value: kpis.totalMerges.value },
            { label: "Branch depth", value: network.avgBranchDepth },
          ].map((kpi) => (
            <div key={kpi.label} className="border-b border-r border-line px-5 py-7">
              <div className="heading-font text-4xl font-bold tracking-tight md:text-5xl">
                {kpi.value}
              </div>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-2">
                {kpi.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-14 lg:grid-cols-[1.4fr_1fr]">
          {/* trending branches */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-2">
              Hottest branches · network {network.status.toLowerCase()}
            </h3>
            <ul className="mt-6">
              {trending.map((branch) => (
                <li key={branch.carId} className="border-t border-line last:border-b">
                  <Link
                    href={`/garage/${branch.carId}`}
                    className="group flex items-center gap-5 py-5 transition-colors hover:bg-white/[0.03]"
                  >
                    <span className="heading-font w-8 shrink-0 text-2xl font-bold text-muted-2">
                      {branch.rank}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium text-ink transition-colors group-hover:text-accent md:text-lg">
                        {branch.label}
                      </span>
                      <span className="mt-2 block h-[3px] w-full bg-white/10">
                        <span
                          className="block h-full transition-[width] duration-700"
                          style={{
                            width: shown ? `${branch.heatPct}%` : "0%",
                            background: ACCENTS[branch.accent] ?? ACCENTS.neutral,
                          }}
                        />
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold text-ink">
                        {branch.heatPct.toFixed(0)}
                        <span className="text-muted-2">%</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-2">
                        heat
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* top builders */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-2">
              Top contributors
            </h3>
            <ul className="mt-6 space-y-px">
              {builders.slice(0, 6).map((builder) => (
                <li
                  key={builder.handle}
                  className="flex items-center gap-3 border-b border-line py-3"
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded-full border-2"
                    style={{
                      borderColor: ACCENTS[builder.ring] ?? ACCENTS.neutral,
                      background: "var(--surface)",
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                    {builder.handle}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-muted">
                    {builder.contributions}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-muted-2">
              Handles, counts and heat are read from the live database on every
              page load — no seeded numbers on this page.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
