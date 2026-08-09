"use client";

import type { ActivityDay } from "@/lib/types";

export function ActivityChart({ days }: { days: ActivityDay[] }) {
  // Bar height is relative to max real count this week — never pad zeros.
  const maxVal = Math.max(
    1,
    ...days.map((d) => Math.max(d.commits, d.merges)),
  );

  return (
    <div className="flex flex-col rounded-[24px] border border-white/5 bg-[rgba(18,18,18,0.7)] p-8 backdrop-blur-xl lg:col-span-2">
      <div className="mb-10 flex items-center justify-between gap-4">
        <div>
          <h2 className="heading-font text-xl font-bold text-ink">
            Community Activity Flow
          </h2>
          <p className="mt-1 text-xs text-muted">
            Real commits (nodes + posts) vs merges this week
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-accent" />
            <span className="text-[10px] font-bold text-ink-soft">Commits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-accent-blue" />
            <span className="text-[10px] font-bold text-ink-soft">Merges</span>
          </div>
        </div>
      </div>

      <div className="flex h-64 flex-1 items-end justify-between gap-2 border-b border-white/5 px-4 pb-2">
        {days.map((d) => {
          const muted = !!d.isFuture;
          const commitH =
            muted || d.commits <= 0 ? 0 : Math.max(4, (d.commits / maxVal) * 100);
          const mergeH =
            muted || d.merges <= 0 ? 0 : Math.max(4, (d.merges / maxVal) * 100);

          return (
            <div
              key={d.day}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <div className="flex h-48 w-full items-end justify-center gap-1">
                <div
                  className={`w-3 rounded-t-md transition-[height] duration-700 ease-out ${
                    muted || d.commits <= 0 ? "bg-white/5" : "bg-accent"
                  }`}
                  style={{ height: muted ? "8%" : `${commitH}%` }}
                  title={muted ? undefined : `${d.commits} commits`}
                />
                <div
                  className={`w-3 rounded-t-md transition-[height] duration-700 ease-out ${
                    muted || d.merges <= 0 ? "bg-white/5" : "bg-accent-blue"
                  }`}
                  style={{ height: muted ? "8%" : `${mergeH}%` }}
                  title={muted ? undefined : `${d.merges} merges`}
                />
              </div>
              {!muted && (d.commits > 0 || d.merges > 0) && (
                <span className="text-[8px] font-bold tabular-nums text-muted">
                  {d.commits}/{d.merges}
                </span>
              )}
              <span
                className={`text-[8px] font-bold ${
                  d.day.includes("NOW") ? "text-muted" : "text-muted-2"
                }`}
              >
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
