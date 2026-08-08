"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { getPulse, getNode } from "@/lib/api";
import type { PulseData } from "@/lib/types";

function useCountUp(target: number, ms = 650) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function PulseStrip({ carId }: { carId: string }) {
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [hotTitle, setHotTitle] = useState("—");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getPulse(carId);
      if (cancelled) return;
      setPulse(p);
      if (p.hottestNodeId) {
        try {
          const n = await getNode(p.hottestNodeId);
          if (!cancelled) setHotTitle(n.title);
        } catch {
          /* empty */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [carId]);

  const total = useCountUp(pulse?.totalNodes ?? 0);
  const contrib = useCountUp(pulse?.contributions24h ?? 0);
  const people = useCountUp(pulse?.contributors ?? 0);

  const flyHot = () => {
    if (!pulse?.hottestNodeId) return;
    window.dispatchEvent(
      new CustomEvent("buildamod:fly-node", { detail: pulse.hottestNodeId }),
    );
  };

  /* Glass metric strip, tuned to sit inside the floating panel */
  return (
    <section className="rounded-2xl border border-white/5 bg-white/5 p-3">
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["Builds", total],
            ["24h", contrib],
            ["People", people],
          ] as const
        ).map(([label, val]) => (
          <div key={label}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted">
              {label}
            </p>
            <p className="mt-0.5 text-[17px] font-semibold tracking-tight text-ink tabular-nums">
              {val}
            </p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={flyHot}
        className="focus-ring mt-2.5 flex w-full items-center gap-1.5 truncate rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-left text-[11px] font-medium text-ink-soft transition-colors hover:bg-black/30 hover:text-ink"
      >
        <Flame className="h-3 w-3 shrink-0 text-accent" /> Hottest · {hotTitle}
      </button>
    </section>
  );
}
