"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bell,
  Box,
  Calendar,
  ChevronDown,
  GitBranch,
  GitFork,
  Share2,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, viewportStagger } from "@/lib/motion";
import { getEcosystemAnalytics } from "@/lib/api";
import type { EcosystemAnalytics } from "@/lib/types";
import { StatCard } from "./StatCard";
import { ActivityChart } from "./ActivityChart";
import { NetworkHealth } from "./NetworkHealth";
import { TrendingBranches } from "./TrendingBranches";
import { TopBuilders } from "./TopBuilders";
import { AnalyticsCta } from "./AnalyticsCta";

export function AnalyticsDashboard() {
  const [data, setData] = useState<EcosystemAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getEcosystemAnalytics("30d");
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load analytics");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-bg">
      {/* Dot grid like the design */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-100"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-white/5 bg-black/50 px-8 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <GitBranch className="h-5 w-5 text-white" />
            </div>
            <span className="heading-font text-2xl font-bold tracking-tighter text-ink">
              Builda<span className="text-accent">Mod</span>
            </span>
          </Link>
          <div className="hidden h-6 w-px bg-white/10 sm:block" />
          <div className="hidden items-center gap-2 sm:flex">
            <Activity className="h-4 w-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted">
              Ecosystem Pulse
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold text-ink-soft md:flex"
          >
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted" />
              LAST 30 DAYS
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted" />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink transition-colors hover:bg-white/10"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://i.pravatar.cc/150?u=admin"
              alt=""
              className="h-8 w-8 rounded-full"
            />
            <span className="hidden text-xs font-bold text-ink sm:inline">
              Alex Rivers
            </span>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 mx-auto w-full max-w-[1600px] flex-1 space-y-8 p-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted">
            Loading ecosystem pulse…
          </div>
        ) : error || !data ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted">
            <p className="text-ink-soft">Couldn’t load live analytics.</p>
            <p className="max-w-md text-center text-[12px] text-muted-2">
              {error ?? "No data"} · Is the API running on :8000?
            </p>
          </div>
        ) : (
          <>
            <motion.section
              initial="hidden"
              animate="show"
              variants={staggerContainer(0.08)}
              className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
            >
              <StatCard
                label="Total Forks"
                value={data.kpis.totalForks.value}
                deltaPct={data.kpis.totalForks.deltaPct}
                icon={GitFork}
                iconClass="text-accent"
                iconBg="bg-accent/10"
                glow="red"
              />
              <StatCard
                label="Active Builders"
                value={data.kpis.activeBuilders.value}
                deltaPct={data.kpis.activeBuilders.deltaPct}
                icon={Users}
                iconClass="text-accent-blue"
                iconBg="bg-accent-blue/10"
              />
              <StatCard
                label="New Seeds"
                value={data.kpis.newSeeds.value}
                deltaPct={data.kpis.newSeeds.deltaPct}
                icon={Box}
                iconClass="text-yellow-500"
                iconBg="bg-yellow-500/10"
              />
              <StatCard
                label="Total Merges"
                value={data.kpis.totalMerges.value}
                deltaPct={data.kpis.totalMerges.deltaPct}
                icon={Share2}
                iconClass="text-accent-blue"
                iconBg="bg-accent-blue/10"
                glow="blue"
              />
            </motion.section>

            <motion.section
              {...viewportStagger}
              variants={fadeUp}
              className="grid grid-cols-1 gap-8 lg:grid-cols-3"
            >
              <ActivityChart days={data.activity} />
              <NetworkHealth network={data.network} />
            </motion.section>

            <motion.section
              {...viewportStagger}
              variants={fadeUp}
              className="grid grid-cols-1 gap-8 md:grid-cols-2"
            >
              <TrendingBranches items={data.trending} />
              <TopBuilders builders={data.builders} />
            </motion.section>

            <motion.div {...viewportStagger} variants={fadeUp}>
              <AnalyticsCta />
            </motion.div>
          </>
        )}
      </main>

      <footer className="relative z-10 mt-auto border-t border-white/5 px-8 py-12 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
            <GitBranch className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="heading-font text-xl font-bold tracking-tighter text-ink">
            BuildaMod
          </span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-2">
          Experimental Ecosystem Dashboard · Live data from API
        </p>
      </footer>
    </div>
  );
}
