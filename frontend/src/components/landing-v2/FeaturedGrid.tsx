"use client";

import Link from "next/link";
import { GitFork } from "lucide-react";
import type { EcosystemAnalytics } from "@/lib/types";
import styles from "./landing-v2.module.css";

/** Photos that actually exist in `public/cars`. A car without one gets a
 *  designed tile rather than a broken image or a stock photo of a different car. */
const PHOTOS: Record<string, string> = {
  "honda-civic-fc-fk-10th-gen": "/cars/civic-03.jpg",
  "toyota-corolla-e170": "/cars/corolla-01.jpg",
};

const ACCENTS: Record<string, string> = {
  red: "#ff3c3c",
  blue: "#3c7eff",
  yellow: "#f2c94c",
};

/** "Toyota Corolla (Naturally Aspirated)" → name + parenthetical descriptor. */
function split(label: string): { name: string; note: string | null } {
  const match = label.match(/^(.*?)\s*\((.+)\)\s*$/);
  return match
    ? { name: match[1], note: match[2] }
    : { name: label, note: null };
}

/**
 * The featured row from the original landing page, with the invented figures
 * ("2.4K NODES") replaced by the live trending rollup. Same destination as
 * before: the car's garage.
 */
export function FeaturedGrid({ data }: { data: EcosystemAnalytics }) {
  const contributors = data.builders.slice(0, 3);

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {data.trending.map((branch) => {
        const { name, note } = split(branch.label);
        const photo = PHOTOS[branch.carId];
        const accent = ACCENTS[branch.accent] ?? "#ff3c3c";

        return (
          <Link
            key={branch.carId}
            href={`/garage/${branch.carId}`}
            className={`${styles.card} group relative block overflow-hidden border border-line bg-surface`}
          >
            <div className="aspect-[4/5] overflow-hidden bg-bg-muted">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={`${name} community build`}
                  className={`${styles.cardImg} h-full w-full object-cover grayscale-[0.45]`}
                />
              ) : (
                // No photo on file for this generation — a drawn tile beats a
                // stock image of the wrong car.
                <div
                  className={`${styles.cardImg} flex h-full w-full items-center justify-center`}
                  style={{
                    background: `radial-gradient(ellipse at 50% 30%, ${accent}22 0%, transparent 62%), var(--bg-muted)`,
                  }}
                >
                  <svg width="76" height="76" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M6 3v12M18 9a9 9 0 0 1-9 9"
                      stroke={accent}
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      opacity="0.75"
                    />
                    <circle cx="18" cy="6" r="2.6" stroke={accent} strokeWidth="1.4" />
                    <circle cx="6" cy="18" r="2.6" stroke={accent} strokeWidth="1.4" />
                  </svg>
                </div>
              )}
            </div>

            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/55 to-transparent p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                  style={{ background: accent }}
                >
                  Rank {branch.rank}
                </span>
                <span className="border border-line-strong px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                  {branch.heatPct.toFixed(0)}% heat
                </span>
              </div>

              <h3 className="heading-font text-2xl font-bold leading-tight tracking-tight">
                {name}
              </h3>
              {note && <p className="mt-1.5 text-sm text-muted">{note}</p>}

              <div className="mt-6 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {contributors.map((builder) => (
                    <span
                      key={builder.handle}
                      title={builder.handle}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-surface-active text-[10px] font-bold uppercase text-ink-soft"
                    >
                      {builder.handle.replace("@", "").slice(0, 2)}
                    </span>
                  ))}
                </div>
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-fg transition-transform group-hover:scale-110"
                >
                  <GitFork size={18} />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
