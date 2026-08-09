"use client";

import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  deltaPct,
  icon: Icon,
  iconClass,
  iconBg,
  glow,
}: {
  label: string;
  value: number;
  deltaPct: number;
  icon: LucideIcon;
  iconClass: string;
  iconBg: string;
  glow?: "red" | "blue";
}) {
  const positive = deltaPct >= 0;
  const formatted = value.toLocaleString("en-US");

  return (
    <div
      className={`rounded-[24px] border border-white/5 bg-[rgba(18,18,18,0.7)] p-6 backdrop-blur-xl ${
        glow === "red"
          ? "shadow-[0_0_40px_-10px_rgba(255,60,60,0.15)]"
          : glow === "blue"
            ? "shadow-[0_0_40px_-10px_rgba(60,126,255,0.15)]"
            : ""
      }`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconClass}`} strokeWidth={1.75} />
        </div>
        {deltaPct !== 0 ? (
          <span
            className={`text-[10px] font-bold ${
              positive ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {positive ? "+" : ""}
            {deltaPct.toFixed(1)}%
          </span>
        ) : (
          <span className="text-[10px] font-bold text-muted-2">—</span>
        )}
      </div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
        {label}
      </h3>
      <p className="heading-font mt-1 text-4xl font-bold text-ink">{formatted}</p>
    </div>
  );
}
