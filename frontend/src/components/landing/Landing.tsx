"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  GitBranch,
  Menu,
  ScanLine,
  Search,
  X,
} from "lucide-react";
import { FaDiscord, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { AnimatePresence, motion } from "framer-motion";
import { searchCars } from "@/lib/api";
import type { Car } from "@/lib/types";
import { CarCard, type FeaturedCar } from "./CarCard";
import { ParallaxCarHero } from "./ParallaxCarHero";
import {
  dropdownVariants,
  fadeUp,
  staggerContainer,
  viewportStagger,
} from "@/lib/motion";

const FEATURED_CARS: FeaturedCar[] = [
  {
    id: "toyota-corolla-e170",
    make: "Toyota",
    model: "Corolla",
    badgeLabel: "HOT BRANCH",
    badgeClassName: "bg-accent",
    nodeCount: "2.4K NODES",
    tagline:
      "The ultimate sandbox for street, track, and off-road builds.",
    imageUrl: "/cars/corolla-01.jpg",
    avatarSeeds: ["a", "b", "c"],
    extraCount: 12,
  },
  {
    id: "honda-civic-fc-fk-10th-gen",
    make: "Honda",
    model: "Civic",
    badgeLabel: "PRO BUILDS",
    badgeClassName: "bg-accent-blue",
    nodeCount: "1.6K NODES",
    tagline:
      "Performance-first branch built around VTEC tuning and track days.",
    imageUrl: "/cars/civic-03.jpg",
    avatarSeeds: ["d", "e"],
    extraCount: 5,
  },
  {
    id: "mazda-mx-5-nd",
    make: "Mazda",
    model: "Miata",
    badgeLabel: "WILD BRANCH",
    badgeClassName: "bg-yellow-500",
    nodeCount: "980 NODES",
    tagline:
      "Lightweight chassis mods, drift setups, and weekend track builds.",
    imageUrl:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1200&auto=format&fit=crop",
    avatarSeeds: ["f", "g", "h"],
  },
];

// Real counts pulled from backend/data/db.json — not marketing placeholders.
const STATS = [
  { value: "94", label: "PARTS CATALOGED" },
  { value: "3", label: "CAR MODELS" },
  { value: "45", label: "COMMUNITY NODES" },
  { value: "AI", label: "POWERED GUIDES" },
];

export function Landing() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Car[]>([]);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const cars = await searchCars(query);
      if (!cancelled) {
        setResults(cars);
        setOpen(true);
      }
    }, 130);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const go = (car: { id: string; make: string; model: string; generation?: string }) => {
    const params = new URLSearchParams({ make: car.make, model: car.model });
    if (car.generation) params.set("generation", car.generation);
    router.push(`/garage/${car.id}?${params.toString()}`);
  };

  const seedNewBranch = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => searchInputRef.current?.focus(), 450);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-bg">
      <div className="noise fixed inset-0 z-0" />
      <div className="hero-gradient fixed inset-0 z-0" />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-nav sticky top-0 z-50 safe-pt"
      >
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 md:px-8 md:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <GitBranch size={20} className="text-white" />
            </div>
            <span className="heading-font text-xl font-bold tracking-tighter sm:text-2xl">
              BuildaMod
            </span>
          </div>
          <div className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            <Link href="/ecosystem" className="transition-colors hover:text-ink">
              Ecosystem Pulse
            </Link>
            <Link
              href="/blueprints/engine"
              className="transition-colors hover:text-ink"
            >
              Engine Blueprint
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/blueprints/engine"
              className="hidden items-center gap-2 rounded-full border border-line bg-white/5 px-4 py-2 text-xs font-semibold transition-all hover:bg-white/10 lg:flex"
            >
              <ScanLine size={14} className="text-accent" />
              AI BLUEPRINT
            </Link>
            <button
              type="button"
              className="hidden px-5 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink sm:inline"
            >
              Sign In
            </button>
            <button
              type="button"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-all hover:bg-[var(--primary-hover)] sm:px-5"
            >
              Join Club
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white/5 text-ink md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-line md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3 text-sm font-medium text-muted">
                <Link
                  href="/ecosystem"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 hover:text-ink"
                >
                  Ecosystem Pulse
                </Link>
                <Link
                  href="/blueprints/engine"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 hover:text-ink"
                >
                  Engine Blueprint
                </Link>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 hover:text-ink sm:hidden"
                >
                  Sign In
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-1 flex-col items-center px-4 pb-20 pt-0 sm:px-6 sm:pb-28 md:px-8 md:pb-32">
        {/* Diagonal parallax Porsche hero — two overlapping lines of cars that
            slide to opposite sides as the page scrolls. Search and the two
            CTA buttons live inside it now, not as a separate block below. */}
        <ParallaxCarHero>
          <motion.div
            initial="hidden"
            animate="show"
            variants={staggerContainer(0.12, 0.15)}
            className="w-full max-w-2xl"
          >
            <motion.p
              variants={fadeUp}
              className="mx-auto mb-8 max-w-2xl text-base font-light text-ink-soft [text-shadow:0_2px_16px_rgba(0,0,0,0.9)] sm:mb-10 sm:text-lg md:text-xl"
            >
              Every car is a branch of possibility. Explore community builds,
              start your own project, and let AI guide your modification
              journey.
            </motion.p>

            <motion.div variants={fadeUp} className="mx-auto w-full max-w-2xl">
              {/* Relative only around the input so results sit flush under it */}
              <div className="group relative">
                <div className="search-glow flex flex-col gap-2 rounded-2xl border border-line bg-surface-hover p-2 transition-all duration-300 sm:flex-row sm:items-center sm:gap-0">
                  <div className="flex min-w-0 flex-1 items-center">
                    <div className="pl-3 pr-2 sm:pl-4 sm:pr-3">
                      <Search size={20} className="text-muted-2" />
                    </div>
                    <input
                      ref={searchInputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => results.length && setOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && results[0]) go(results[0]);
                        if (e.key === "Escape") setOpen(false);
                      }}
                      placeholder="Search for your car…"
                      className="w-full min-w-0 border-none bg-transparent py-3 text-base text-ink placeholder:text-muted-2 outline-none sm:py-4 sm:text-lg"
                    />
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => results[0] && go(results[0])}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="w-full rounded-xl bg-accent px-6 py-3.5 font-bold text-white hover:brightness-110 sm:w-auto sm:px-8 sm:py-4"
                  >
                    START MODDING
                  </motion.button>
                </div>

                <AnimatePresence>
                  {open && results.length > 0 && (
                    <motion.ul
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lg)]"
                    >
                      {results.map((c) => (
                        <li key={c.id} className="border-b border-line last:border-0">
                          <button
                            type="button"
                            onClick={() => go(c)}
                            className="focus-ring flex w-full items-center justify-between px-5 py-3 text-left hover:bg-surface-hover"
                          >
                            <span className="text-base font-medium text-ink">
                              {c.make} {c.model}
                            </span>
                            <span className="text-label">{c.yearRange}</span>
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/ecosystem"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-4 py-2 text-xs font-semibold text-ink-soft backdrop-blur-md transition-all hover:border-line-strong hover:bg-white/10 hover:text-ink"
                >
                  <Activity size={14} className="text-accent" />
                  Analytics
                </Link>
                <Link
                  href="/blueprints/engine"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white/5 px-4 py-2 text-xs font-semibold text-ink-soft backdrop-blur-md transition-all hover:border-line-strong hover:bg-white/10 hover:text-ink"
                >
                  <ScanLine size={14} className="text-accent" />
                  Engine Analysis
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </ParallaxCarHero>

        {/* Featured Grid */}
        <motion.div
          {...viewportStagger}
          variants={staggerContainer(0.1)}
          className="mt-20 w-full max-w-7xl sm:mt-28 md:mt-40"
        >
          <motion.div
            variants={fadeUp}
            className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-accent">
                Trending Now
              </h2>
              <h3 className="heading-font text-3xl font-bold sm:text-4xl">
                POPULAR BRANCHES
              </h3>
            </div>
            <a
              href="#"
              className="group flex items-center gap-2 text-sm text-muted transition-all hover:text-ink"
            >
              View All Showcase{" "}
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </a>
          </motion.div>

          <motion.div
            variants={staggerContainer(0.1)}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {FEATURED_CARS.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </motion.div>
        </motion.div>

        {/* Stats / Social Proof */}
        <motion.div
          {...viewportStagger}
          variants={staggerContainer(0.08)}
          className="mt-16 grid w-full max-w-7xl grid-cols-2 gap-8 border-y border-line py-10 sm:mt-24 sm:gap-12 sm:py-14 md:mt-32 md:grid-cols-4 md:py-16"
        >
          {STATS.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center">
              <div className="heading-font mb-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl">
                {s.value}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-2">
                {s.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          {...viewportStagger}
          variants={fadeUp}
          className="relative mt-16 w-full max-w-5xl overflow-hidden rounded-[24px] border border-line bg-gradient-to-br from-surface to-black p-6 text-center sm:mt-24 sm:rounded-[32px] sm:p-10 md:mt-32 md:rounded-[40px] md:p-12"
        >
          <div className="absolute right-0 top-0 h-64 w-64 bg-accent opacity-20 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-64 w-64 bg-accent-blue opacity-20 blur-[120px]" />
          <h3 className="heading-font relative z-10 mb-4 text-3xl font-bold sm:mb-6 sm:text-4xl md:text-5xl">
            CAN&apos;T FIND YOUR CAR?
          </h3>
          <p className="relative z-10 mx-auto mb-8 max-w-xl text-sm text-muted sm:mb-10 sm:text-base">
            Be the first to plant the seed. Start a new branch for any
            vehicle and let the community help you build it from the ground
            up.
          </p>
          <motion.button
            type="button"
            onClick={seedNewBranch}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="heading-font relative z-10 rounded-full bg-primary px-8 py-4 font-black tracking-tight text-primary-fg sm:px-10 sm:py-5"
          >
            SEED A NEW BRANCH
          </motion.button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-line bg-bg px-4 py-10 sm:px-6 sm:py-12 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
              <GitBranch size={14} className="text-white" />
            </div>
            <span className="heading-font text-xl font-bold tracking-tighter">
              BuildaMod
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-2 sm:gap-8">
            <a href="#" className="transition-colors hover:text-ink">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-ink">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-ink">
              Contact
            </a>
            <a href="#" className="transition-colors hover:text-ink">
              Open Source
            </a>
          </div>
          <div className="flex gap-4">
            <FaInstagram
              size={20}
              className="cursor-pointer text-muted-2 transition-colors hover:text-ink"
            />
            <FaXTwitter
              size={20}
              className="cursor-pointer text-muted-2 transition-colors hover:text-ink"
            />
            <FaDiscord
              size={20}
              className="cursor-pointer text-muted-2 transition-colors hover:text-ink"
            />
          </div>
        </div>
        <div className="mt-10 text-center sm:mt-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-700">
            © 2024 BUILDAMOD CAR MODDING HACKATHON PROJECT. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
