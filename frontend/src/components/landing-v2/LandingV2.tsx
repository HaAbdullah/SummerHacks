"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Activity, ArrowRight, GitBranch, ScanLine } from "lucide-react";
import { FaDiscord, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { getEcosystemAnalytics } from "@/lib/api";
import type { EcosystemAnalytics } from "@/lib/types";
import { STAGES, clamp, scrollState } from "./stages";
import { AuthModal, type AuthMode } from "./AuthModal";
import { BranchDiagram } from "./BranchDiagram";
import { CarSearch } from "./CarSearch";
import { FeaturedGrid } from "./FeaturedGrid";
import { LiveFromGraph } from "./LiveFromGraph";
import { useReveal } from "./use-reveal";
import styles from "./landing-v2.module.css";

// WebGL has no server-side equivalent — three.js reaches for browser-only APIs
// that crash Next's SSR pass, so the scene is client-only and lazy.
const ScrollCarScene = dynamic(
  () => import("./ScrollCarScene").then((m) => m.ScrollCarScene),
  { ssr: false },
);

/** Seeded graphs, keyed exactly as the backend stores them. */
const SEEDED = [
  { id: "honda-civic-fc-fk-10th-gen", label: "Honda Civic", gen: "FC/FK", years: "2016–2021" },
  { id: "toyota-corolla-e170", label: "Toyota Corolla", gen: "E170", years: "2014–2019" },
  { id: "subaru-wrx-va", label: "Subaru WRX", gen: "VA", years: "2015–2021" },
];

export function LandingV2() {
  const driveRef = useRef<HTMLElement>(null);
  const railFillRef = useRef<HTMLDivElement>(null);
  const heroSearchRef = useRef<HTMLInputElement>(null);

  const [active, setActive] = useState(0);
  const [sceneOn, setSceneOn] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [analytics, setAnalytics] = useState<EcosystemAnalytics | null>(null);

  const graph = useReveal<HTMLDivElement>(0.2);
  const finale = useReveal<HTMLDivElement>(0.15);

  // Mount WebGL only in the browser, and only for visitors who haven't asked
  // for reduced motion — a scroll-driven camera is exactly what that setting
  // is about.
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSceneOn(true);
    }
  }, []);

  // Real numbers or none. Anything shown on this page comes from here.
  useEffect(() => {
    let cancelled = false;
    getEcosystemAnalytics("30d")
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        // Leave `analytics` null — the live sections hide rather than invent.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Scroll → camera. `scrollState` is written directly (not React state) so the
  // 60fps path never re-renders; only the integer stage, which changes six
  // times across the whole section, goes through React.
  useEffect(() => {
    const section = driveRef.current;
    if (!section) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const span = section.offsetHeight - window.innerHeight;
      const travelled = -section.getBoundingClientRect().top;
      const progress = span > 0 ? clamp(travelled / span, 0, 1) : 0;

      scrollState.progress = progress;
      if (railFillRef.current) {
        railFillRef.current.style.transform = `translateX(-50%) scaleY(${progress})`;
      }
      const index = Math.round(progress * (STAGES.length - 1));
      setActive((prev) => (prev === index ? prev : index));
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /** Same behaviour as the original landing page's "seed a new branch": go back
   *  to the top and put the cursor in the search field. */
  const jumpToSearch = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => heroSearchRef.current?.focus(), 650);
  };

  return (
    <div className="relative min-h-screen bg-bg text-ink">
      <div className="noise pointer-events-none fixed inset-0 z-0" />

      {/* ——— nav ——— */}
      <nav className="glass-nav sticky top-0 z-[60] flex items-center gap-4 px-5 py-3 md:gap-6 md:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center bg-accent">
            <GitBranch size={17} className="text-white" />
          </div>
          <span className="heading-font text-lg font-bold tracking-tighter">
            BuildaMod
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center lg:flex">
          <div className="w-full max-w-sm">
            <CarSearch variant="compact" />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <Link
            href="/ecosystem"
            className="hidden items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:text-ink sm:flex"
          >
            <Activity size={14} className="text-accent" />
            Analytics
          </Link>
          <Link
            href="/blueprints/engine"
            className="hidden items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:text-ink md:flex"
          >
            <ScanLine size={14} className="text-accent" />
            Engine Analysis
          </Link>
          {/* Carried over from the original landing nav — still placeholders
              there, kept here so nothing silently disappears in the swap. */}
          <a
            href="#featured"
            className="hidden px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:text-ink xl:block"
          >
            Build Logs
          </a>
          <a
            href="#featured"
            className="hidden px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:text-ink xl:block"
          >
            Showcase
          </a>

          <span className="mx-1 hidden h-5 w-px bg-line-strong sm:block" />

          <button
            type="button"
            onClick={() => setAuthMode("signin")}
            className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:text-ink"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("join")}
            className="bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-fg transition-all hover:bg-[var(--primary-hover)]"
          >
            Join Club
          </button>
        </div>
      </nav>

      {/* ——— scroll-driven 3D block ——— */}
      <section
        ref={driveRef}
        className="relative z-10"
        style={{ height: `${STAGES.length * 100}vh` }}
      >
        {/* No overflow clipping: the hero search dropdown has to escape this
            box. Nothing else here overflows — the canvas is inset-0. */}
        <div className="sticky top-0 h-screen w-full">
          <div className="absolute inset-0">
            {sceneOn ? (
              <ScrollCarScene />
            ) : (
              <div className="hero-gradient h-full w-full" />
            )}
          </div>

          <div className={styles.vignette} />

          {/* stage copy — all six mounted, cross-faded by `active` */}
          {/* pb-14 clears the telemetry strip pinned to the bottom edge */}
          <div className="relative mx-auto flex h-full max-w-7xl items-center px-6 pb-14 md:px-12">
            <div className="relative h-[540px] w-full max-w-xl">
              {STAGES.map((stage, i) => (
                <article
                  key={stage.key}
                  aria-hidden={active !== i}
                  className={`${styles.stage} ${active === i ? styles.stageActive : ""}`}
                >
                  <div className="flex items-baseline gap-4">
                    <span
                      className="heading-font text-5xl font-bold leading-none tracking-tighter"
                      style={{ color: stage.accent }}
                    >
                      {stage.index}
                    </span>
                    <span className="h-px flex-1 bg-line-strong" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">
                      {stage.eyebrow}
                    </span>
                  </div>

                  <h2 className="heading-font mt-7 whitespace-pre-line text-[2.6rem] font-extrabold leading-[0.92] tracking-tighter sm:text-6xl">
                    {stage.title}
                  </h2>

                  <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">
                    {stage.blurb}
                  </p>

                  {stage.specs ? (
                    <dl className="mt-9 max-w-sm">
                      {stage.specs.map((spec) => (
                        <div
                          key={spec.k}
                          className="flex items-baseline justify-between gap-4 border-t border-line py-2.5 last:border-b"
                        >
                          <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-2">
                            {spec.k}
                          </dt>
                          <dd className="text-sm text-ink-soft">{spec.v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    // The hero: searching for your car is the one thing this
                    // page exists to start, so it sits above the fold.
                    <div className="mt-9">
                      <CarSearch variant="hero" autoFocusRef={heroSearchRef} />
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-2">
                          Seeded
                        </span>
                        {SEEDED.map((car) => (
                          <Link
                            key={car.id}
                            href={`/garage/${car.id}`}
                            className="border border-line bg-black/30 px-2.5 py-1 text-xs text-ink-soft backdrop-blur-sm transition-colors hover:border-line-strong hover:bg-black/50"
                          >
                            {car.label}{" "}
                            <span className="text-muted-2">{car.gen}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>

          {/* branch rail — scroll position rendered as the graph level */}
          <div className="pointer-events-none absolute right-10 top-1/2 hidden -translate-y-1/2 lg:block">
            <div className="relative flex flex-col items-center gap-9">
              <div className="absolute left-1/2 top-1 h-[calc(100%-8px)] w-px -translate-x-1/2 bg-white/15" />
              <div
                ref={railFillRef}
                className="absolute left-1/2 top-1 h-[calc(100%-8px)] w-px origin-top bg-accent"
                style={{ transform: "translateX(-50%) scaleY(0)" }}
              />
              {STAGES.map((stage, i) => (
                <div key={stage.key} className="relative z-10 h-2.5 w-2.5">
                  <span
                    className="absolute right-full top-1/2 mr-4 -translate-y-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] transition-colors duration-300"
                    style={{ color: active === i ? stage.accent : "var(--muted-2)" }}
                  >
                    {stage.index} {stage.eyebrow}
                  </span>
                  <span
                    className="block h-2.5 w-2.5 rounded-full border-2 transition-all duration-300"
                    style={{
                      borderColor: i <= active ? stage.accent : "var(--muted-2)",
                      background: active === i ? stage.accent : "transparent",
                      boxShadow: active === i ? `0 0 14px ${stage.accent}` : "none",
                      transform: active === i ? "scale(1.4)" : "scale(1)",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* telemetry strip — real KPIs, pinned under the car */}
          <div className="absolute inset-x-0 bottom-0 border-t border-line bg-bg/70 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-6 py-3 md:gap-10 md:px-12">
              <span className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-2">
                <span className={`${styles.livePip} h-1.5 w-1.5 rounded-full bg-accent`} />
                Live
              </span>
              {analytics ? (
                [
                  { k: "Forks", v: analytics.kpis.totalForks.value },
                  { k: "Builders", v: analytics.kpis.activeBuilders.value },
                  { k: "Merges", v: analytics.kpis.totalMerges.value },
                  { k: "Depth", v: analytics.network.avgBranchDepth },
                  { k: "Network", v: analytics.network.status },
                ].map((item) => (
                  <span key={item.k} className="flex shrink-0 items-baseline gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-2">
                      {item.k}
                    </span>
                    <span className="heading-font text-sm font-bold text-ink">
                      {item.v}
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-2">
                  Connecting to graph…
                </span>
              )}
              <button
                type="button"
                onClick={jumpToSearch}
                className={`${styles.scrollCue} ml-auto hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.24em] text-muted transition-colors hover:text-ink md:block`}
              >
                Scroll to build ↓
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ——— featured branches ——— */}
      {analytics && (
        <section
          id="featured"
          className="relative z-10 scroll-mt-20 border-t border-line bg-bg px-6 py-24 md:px-12"
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-accent">
                  Trending now
                </p>
                <h2 className="heading-font mt-4 text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-5xl">
                  POPULAR BRANCHES
                </h2>
              </div>
              <Link
                href="/ecosystem"
                className="group flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
              >
                View all showcase
                <ArrowRight
                  size={15}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>

            <div className="mt-10">
              <FeaturedGrid data={analytics} />
            </div>
          </div>
        </section>
      )}

      {/* ——— the graph ——— */}
      <section className="relative z-10 border-t border-line bg-bg px-6 py-24 md:px-12">
        <div
          ref={graph.ref}
          className={`${styles.reveal} ${graph.shown ? styles.revealShown : ""} mx-auto max-w-6xl`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-accent">
            Not a thread — a graph
          </p>
          <h2 className="heading-font mt-4 max-w-3xl text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">
            FORKS ARE EASY.
            <br />
            <span className="gradient-text">MERGES ARE THE POINT.</span>
          </h2>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted md:text-base">
            Forum threads are linear, so the good builds get buried on page 14.
            Here every change is a node, every node is forkable, and a build
            that borrows from two others keeps both parents on the record.
          </p>

          <div className="mt-16">
            <BranchDiagram />
          </div>

          <div className="mt-16 grid gap-px border border-line bg-line md:grid-cols-3">
            {[
              {
                title: "Four slots, nothing else",
                body: "Engine, exhaust, wheels, brakes. Each level of the graph adds exactly one, so any two builds can be diffed without arguing about schema.",
              },
              {
                title: "Deterministic diffs",
                body: "What changed between two nodes is computed in code, not asked of a model. The AI only writes the explanation on top of it.",
              },
              {
                title: "Evidence attached",
                body: "Photos, sketches and exhaust recordings hang off the node they belong to, so a claim about a mod arrives with proof.",
              },
            ].map((card) => (
              <div key={card.title} className="bg-bg p-7">
                <h3 className="heading-font text-lg font-bold tracking-tight">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— live data from the database ——— */}
      {analytics && <LiveFromGraph data={analytics} />}

      {/* ——— search / tools ——— */}
      <section id="start" className="relative z-10 border-t border-line px-6 py-24 md:px-12">
        <div
          ref={finale.ref}
          className={`${styles.reveal} ${finale.shown ? styles.revealShown : ""} mx-auto max-w-3xl`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-muted-2">
            Start here
          </p>
          <h2 className="heading-font mt-4 text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-6xl">
            FIND YOUR
            <br />
            <span className="gradient-text">GENERATION.</span>
          </h2>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted md:text-base">
            Mods are generation-specific, so the graph is too. Search a car and
            you land on the exact chassis code — with its own branches, its own
            parts list and its own history.
          </p>

          {/* Deliberately no `autoFocusRef` — that ref belongs to the hero
              field, and pointing it at two inputs would leave it holding
              whichever mounted last. */}
          <div className="mt-10">
            <CarSearch variant="hero" />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-2">
              Seeded graphs
            </span>
            {SEEDED.map((car) => (
              <Link
                key={car.id}
                href={`/garage/${car.id}`}
                className="group flex items-baseline gap-2 border border-line px-3 py-2 text-xs transition-colors hover:border-line-strong hover:bg-white/5"
              >
                <span className="text-ink-soft group-hover:text-ink">{car.label}</span>
                <span className="text-muted-2">{car.gen}</span>
                <span className="text-muted-2">·</span>
                <span className="text-muted-2">{car.years}</span>
              </Link>
            ))}
          </div>

          <div className="mt-16 grid gap-px border border-line bg-line sm:grid-cols-2">
            <Link
              href="/ecosystem"
              className="group flex items-center justify-between gap-4 bg-bg p-7 transition-colors hover:bg-surface"
            >
              <span>
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-accent">
                  <Activity size={13} />
                  Analytics
                </span>
                <span className="heading-font mt-3 block text-xl font-bold tracking-tight">
                  Ecosystem Pulse
                </span>
                <span className="mt-2 block text-sm text-muted">
                  Forks, merges, branch depth and who&apos;s actually building.
                </span>
              </span>
              <ArrowRight
                size={18}
                className="shrink-0 text-muted-2 transition-transform group-hover:translate-x-1 group-hover:text-ink"
              />
            </Link>

            <Link
              href="/blueprints/engine"
              className="group flex items-center justify-between gap-4 bg-bg p-7 transition-colors hover:bg-surface"
            >
              <span>
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-accent">
                  <ScanLine size={13} />
                  Vision
                </span>
                <span className="heading-font mt-3 block text-xl font-bold tracking-tight">
                  Engine Analysis
                </span>
                <span className="mt-2 block text-sm text-muted">
                  Upload an engine bay, get its components identified and mapped.
                </span>
              </span>
              <ArrowRight
                size={18}
                className="shrink-0 text-muted-2 transition-transform group-hover:translate-x-1 group-hover:text-ink"
              />
            </Link>
          </div>

          <div className="mt-16 flex flex-wrap items-center gap-4 border-t border-line pt-10">
            <p className="flex-1 text-sm text-muted">
              Reading the graph is open to everyone. An account is what lets you
              fork a build and push it back.
            </p>
            <button
              type="button"
              onClick={() => setAuthMode("join")}
              className="bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-primary-fg transition-all hover:bg-[var(--primary-hover)]"
            >
              Join Club
            </button>
          </div>
        </div>
      </section>

      {/* ——— seed a new branch ——— */}
      <section className="relative z-10 border-t border-line px-6 py-24 md:px-12">
        <div className="relative mx-auto max-w-4xl overflow-hidden border border-line bg-surface p-10 text-center md:p-16">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 bg-accent opacity-[0.18] blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 bg-accent-blue opacity-[0.18] blur-[110px]" />
          <h2 className="heading-font relative text-4xl font-extrabold leading-[0.95] tracking-tighter md:text-5xl">
            CAN&apos;T FIND YOUR CAR?
          </h2>
          <p className="relative mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-muted">
            Every graph starts empty. Plant the root node for any generation and
            the community grows the branches from there.
          </p>
          <button
            type="button"
            onClick={jumpToSearch}
            className="heading-font relative mt-9 bg-primary px-9 py-4 text-sm font-bold uppercase tracking-wider text-primary-fg transition-transform hover:scale-[1.03] active:scale-100"
          >
            Seed a new branch
          </button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-line px-6 pb-10 pt-14 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center bg-accent">
                <GitBranch size={15} className="text-white" />
              </div>
              <span className="heading-font text-lg font-bold tracking-tighter">
                BuildaMod
              </span>
            </Link>

            <nav className="flex flex-wrap justify-center gap-7 text-sm text-muted-2">
              <Link href="/ecosystem" className="transition-colors hover:text-ink">
                Ecosystem
              </Link>
              <Link href="/blueprints/engine" className="transition-colors hover:text-ink">
                Engine Analysis
              </Link>
              <a href="#featured" className="transition-colors hover:text-ink">
                Showcase
              </a>
              <Link href="/" className="transition-colors hover:text-ink">
                Classic landing
              </Link>
            </nav>

            <div className="flex gap-5 text-muted-2">
              {/* Placeholders on the original landing too — no accounts exist
                  to link to yet, so these stay inert rather than 404. */}
              <FaInstagram size={18} aria-label="Instagram" />
              <FaXTwitter size={18} aria-label="X" />
              <FaDiscord size={18} aria-label="Discord" />
            </div>
          </div>

          <div className="mt-12 space-y-2 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-2">
              © 2026 BuildaMod · SummerHacks project
            </p>
            <p className="text-[10px] tracking-wide text-muted-2">
              3D model &quot;CarConcept&quot; by Eric Chadwick / Khronos Group ·
              CC BY 4.0
            </p>
          </div>
        </div>
      </footer>

      <AuthModal
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onModeChange={setAuthMode}
      />
    </div>
  );
}
