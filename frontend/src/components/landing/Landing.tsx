"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GitBranch, Search, Sparkles } from "lucide-react";
import { FaDiscord, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { searchCars } from "@/lib/api/backend";
import type { Car } from "@/lib/types";
import { CarCard, type FeaturedCar } from "./CarCard";

const RECENT_CARS = [
  { id: "toyota-corolla-e170", label: "Toyota Corolla E170" },
  { id: "honda-civic-fc-fk-10th-gen", label: "Honda Civic 10th Gen" },
  { id: "subaru-wrx-va", label: "Subaru WRX VA" },
];

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
    imageUrl:
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1200&auto=format&fit=crop",
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
    imageUrl:
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1200&auto=format&fit=crop",
    avatarSeeds: ["d", "e"],
    extraCount: 5,
  },
  {
    id: "subaru-wrx-va",
    make: "Subaru",
    model: "WRX",
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

const STATS = [
  { value: "45K+", label: "MODS COMMITTED" },
  { value: "128", label: "CAR MODELS" },
  { value: "8.2K", label: "COMMUNITY NODES" },
  { value: "AI", label: "POWERED GUIDES" },
];

export function Landing() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Car[]>([]);
  const [open, setOpen] = useState(false);
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

  const go = (carId: string) => router.push(`/garage/${carId}`);

  const seedNewBranch = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => searchInputRef.current?.focus(), 450);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-bg">
      <div className="noise fixed inset-0 z-0" />
      <div className="hero-gradient fixed inset-0 z-0" />

      {/* Navigation */}
      <nav className="glass-nav sticky top-0 z-50 flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <GitBranch size={20} className="text-white" />
          </div>
          <span className="heading-font text-2xl font-bold tracking-tighter">
            BuildaMod
          </span>
        </div>
        <div className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
          <a href="#" className="transition-colors hover:text-ink">
            Explore Branches
          </a>
          <a href="#" className="transition-colors hover:text-ink">
            Community Build Logs
          </a>
          <a href="#" className="transition-colors hover:text-ink">
            Daily Showcase
          </a>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="hidden items-center gap-2 rounded-full border border-line bg-white/5 px-4 py-2 text-xs font-semibold transition-all hover:bg-white/10 lg:flex"
          >
            <Sparkles size={14} className="text-accent" />
            AI BUILDER
          </button>
          <button
            type="button"
            className="px-5 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            Sign In
          </button>
          <button
            type="button"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-fg transition-all hover:bg-[var(--primary-hover)]"
          >
            Join Club
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-1 flex-col items-center px-8 pb-32 pt-24">
        <div className="max-w-4xl text-center">
          <h1 className="heading-font mb-8 text-6xl font-extrabold leading-[0.9] tracking-tighter md:text-8xl">
            THE FUTURE OF <br />
            <span className="gradient-text">CAR CUSTOMIZATION.</span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg font-light text-muted md:text-xl">
            Every car is a branch of possibility. Explore community builds,
            start your own project, and let AI guide your modification
            journey.
          </p>

          <div className="group relative mx-auto w-full max-w-2xl">
            <div className="search-glow flex items-center rounded-2xl border border-line bg-surface-hover p-2 transition-all duration-300">
              <div className="pl-4 pr-3">
                <Search size={20} className="text-muted-2" />
              </div>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length && setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) go(results[0].id);
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Search for your car (e.g. Toyota Corolla, BMW M3...)"
                className="w-full border-none bg-transparent py-4 text-lg text-ink placeholder:text-muted-2 outline-none"
              />
              <button
                type="button"
                onClick={() => results[0] && go(results[0].id)}
                className="rounded-xl bg-accent px-8 py-4 font-bold text-white transition-all hover:brightness-110 active:scale-95"
              >
                START MODDING
              </button>
            </div>

            {open && results.length > 0 && (
              <ul className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lg)]">
                {results.map((c) => (
                  <li key={c.id} className="border-b border-line last:border-0">
                    <button
                      type="button"
                      onClick={() => go(c.id)}
                      className="focus-ring flex w-full items-center justify-between px-5 py-3 text-left hover:bg-surface-hover"
                    >
                      <span className="text-base font-medium text-ink">
                        {c.make} {c.model}
                      </span>
                      <span className="text-label">{c.yearRange}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-2">
                Recent:
              </span>
              {RECENT_CARS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => go(c.id)}
                  className="rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-muted transition-all hover:border-line-strong hover:text-ink"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Grid */}
        <div className="mt-40 w-full max-w-7xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-accent">
                Trending Now
              </h2>
              <h3 className="heading-font text-4xl font-bold">
                POPULAR BRANCHES
              </h3>
            </div>
            <a
              href="#"
              className="group flex items-center gap-2 text-muted transition-all hover:text-ink"
            >
              View All Showcase{" "}
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURED_CARS.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        </div>

        {/* Stats / Social Proof */}
        <div className="mt-32 grid w-full max-w-7xl grid-cols-2 gap-12 border-y border-line py-16 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="heading-font mb-2 text-5xl font-bold tracking-tight text-ink">
                {s.value}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-2">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="relative mt-32 w-full max-w-5xl overflow-hidden rounded-[40px] border border-line bg-gradient-to-br from-surface to-black p-12 text-center">
          <div className="absolute right-0 top-0 h-64 w-64 bg-accent opacity-20 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-64 w-64 bg-accent-blue opacity-20 blur-[120px]" />
          <h3 className="heading-font relative z-10 mb-6 text-5xl font-bold">
            CAN&apos;T FIND YOUR CAR?
          </h3>
          <p className="relative z-10 mx-auto mb-10 max-w-xl text-muted">
            Be the first to plant the seed. Start a new branch for any
            vehicle and let the community help you build it from the ground
            up.
          </p>
          <button
            type="button"
            onClick={seedNewBranch}
            className="heading-font relative z-10 rounded-full bg-primary px-10 py-5 font-black tracking-tight text-primary-fg transition-transform hover:scale-105 active:scale-95"
          >
            SEED A NEW BRANCH
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-line bg-bg px-8 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent">
              <GitBranch size={14} className="text-white" />
            </div>
            <span className="heading-font text-xl font-bold tracking-tighter">
              BuildaMod
            </span>
          </div>
          <div className="flex gap-8 text-sm text-muted-2">
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
        <div className="mt-12 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-700">
            © 2024 BUILDAMOD CAR MODDING HACKATHON PROJECT. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
