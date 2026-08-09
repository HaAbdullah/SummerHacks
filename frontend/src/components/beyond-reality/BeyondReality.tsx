"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Syncopate } from "next/font/google";
import { Activity, ArrowRight, GitBranch, Search, Sparkles } from "lucide-react";
import { searchCars } from "@/lib/api";
import styles from "./beyond-reality.module.css";

// WebGL has no server-side equivalent — three.js/GLTFLoader reach for
// browser-only APIs (ProgressEvent) that crash Next's SSR pass if this loads
// eagerly, so it's client-only and lazy.
const CarScene = dynamic(() => import("./CarScene").then((m) => m.CarScene), {
  ssr: false,
});

const syncopate = Syncopate({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-syncopate",
});

// Matches lucide's own "wrench" glyph — spawned imperatively (not React) so the
// fire-and-forget rise-and-fade animation doesn't fight React's render cycle.
const WRENCH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';

const STATS = [
  { label: "COMMITS", value: "42.9K", accent: "var(--accent-blue)" },
  { label: "FORKS", value: "1.2M", accent: "var(--accent)" },
  { label: "MERGES", value: "89.4K", accent: "#eab308" },
];

export function BeyondReality() {
  const router = useRouter();
  const particlesRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  // Falling neon wrench particles.
  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    const interval = window.setInterval(() => {
      const p = document.createElement("div");
      p.style.position = "absolute";
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = "-50px";
      p.style.color = Math.random() > 0.5 ? "var(--accent)" : "var(--accent-blue)";
      p.style.opacity = "0.3";
      p.style.fontSize = `${Math.random() * 20 + 10}px`;
      p.innerHTML = WRENCH_SVG;
      container.appendChild(p);
      const animation = p.animate(
        [
          { transform: "translateY(0) rotate(0deg)", opacity: 0.5 },
          {
            transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`,
            opacity: 0,
          },
        ],
        { duration: Math.random() * 3000 + 3000, easing: "linear" },
      );
      animation.onfinish = () => p.remove();
    }, 200);
    return () => window.clearInterval(interval);
  }, []);

  const initiate = async () => {
    if (!query.trim() || busy) return;
    setBusy(true);
    try {
      const results = await searchCars(query);
      const hit = results[0];
      if (hit) {
        const params = new URLSearchParams({ make: hit.make, model: hit.model });
        if (hit.generation) params.set("generation", hit.generation);
        router.push(`/garage/${hit.id}?${params.toString()}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${styles.page} ${syncopate.variable}`}>
      <div className="noise fixed inset-0 z-0" />
      <div className={styles.scanline} />
      <div className={styles.neonBg} />

      <header className="glass-nav sticky top-0 z-50 flex h-24 w-full items-center justify-between px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 -skew-x-12 items-center justify-center bg-white">
            <GitBranch className="text-black" size={22} />
          </div>
          <span className={`${styles.wordmark} text-3xl font-black italic tracking-tighter`}>
            Builda<span className="text-accent">Mod</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="#"
            className="text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:text-accent"
          >
            Terminal
          </a>
          <a
            href="#"
            className="text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:text-accent"
          >
            Nodes
          </a>
          <a
            href="/ecosystem"
            className={`${styles.cyberButton} flex -skew-x-12 items-center gap-2 px-6 py-2`}
          >
            <Activity size={16} />
            <span className="text-[10px] font-bold tracking-widest">ANALYTICS</span>
          </a>
        </div>
      </header>

      <main className="relative flex w-full flex-1 flex-col items-center px-8 pt-20">
        <div ref={particlesRef} className={styles.floatingParticles} />

        <div className="pointer-events-none z-20 text-center">
          <h1 className={`${styles.glitchWrapper} mb-4`}>
            <span
              className={`${styles.glitchText} text-7xl font-black italic leading-none tracking-tighter md:text-9xl`}
              data-text="EVOLUTION"
            >
              EVOLUTION
            </span>
          </h1>
          <h2 className="mb-20 text-2xl font-light uppercase tracking-[0.5em] text-gray-500 md:text-3xl">
            Community Engine Reborn
          </h2>
        </div>

        <div className={styles.carContainer}>
          <CarScene />
          <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] tracking-wide text-gray-600">
            3D model: &quot;CarConcept&quot; by Eric Chadwick / Khronos Group · CC BY 4.0 — drag to orbit
          </p>
        </div>

        <div className="z-20 mt-12 w-full max-w-3xl">
          <div
            className={`${styles.searchField} flex -skew-x-2 items-center border border-white/10 bg-white/5 p-2 backdrop-blur-xl`}
          >
            <div className="pl-6 pr-4">
              <Search className="text-gray-400" size={24} />
            </div>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void initiate();
              }}
              placeholder="IDENTIFY CAR MODEL..."
              className="w-full border-none bg-transparent py-6 text-xl font-bold uppercase tracking-widest text-white placeholder-gray-700 outline-none"
            />
            <button
              type="button"
              onClick={() => void initiate()}
              disabled={busy}
              className="group bg-accent px-12 py-6 font-black tracking-widest text-white transition-all hover:brightness-125 disabled:opacity-60"
            >
              {busy ? "SCANNING…" : "INITIATE"}
              {!busy && (
                <ArrowRight
                  className="ml-2 inline-block transition-transform group-hover:translate-x-2"
                  size={18}
                />
              )}
            </button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 opacity-60 transition-opacity hover:opacity-100">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="-skew-x-2 border border-white/5 bg-white/[0.02] p-6 transition-colors hover:bg-white/5"
              >
                <p
                  className="mb-2 text-[10px] font-black tracking-widest"
                  style={{ color: s.accent }}
                >
                  {s.label}
                </p>
                <p className="heading-font text-3xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <div className="fixed bottom-12 right-12 z-50 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => searchRef.current?.focus()}
          aria-label="Focus search"
          className={`${styles.fab} flex h-16 w-16 rotate-45 items-center justify-center bg-white text-black transition-transform hover:scale-110`}
        >
          <Sparkles className="-rotate-45" size={22} />
        </button>
      </div>
    </div>
  );
}
