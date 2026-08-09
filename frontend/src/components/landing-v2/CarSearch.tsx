"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { searchCars } from "@/lib/api";
import type { Car } from "@/lib/types";
import styles from "./landing-v2.module.css";

/** Live generation-aware vehicle search, hitting the real search endpoint. */
export function CarSearch({
  variant,
  autoFocusRef,
}: {
  variant: "compact" | "hero";
  /** Lets the page focus this field from elsewhere (the nav CTA). */
  autoFocusRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Car[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLInputElement>(null);
  const inputRef = autoFocusRef ?? localRef;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        const cars = await searchCars(query);
        if (!cancelled) {
          setResults(cars);
          setOpen(true);
        }
      } catch {
        // A cold backend shouldn't break the page — the seeded shortcuts still work.
        if (!cancelled) setResults([]);
      }
    }, 130);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Close on outside click, so the dropdown doesn't hang over the page.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (car: { id: string; make: string; model: string; generation?: string }) => {
    const params = new URLSearchParams({ make: car.make, model: car.model });
    if (car.generation) params.set("generation", car.generation);
    router.push(`/garage/${car.id}?${params.toString()}`);
  };

  const hero = variant === "hero";

  return (
    <div ref={boxRef} className="relative w-full">
      <div
        className={`${styles.searchField} flex items-center border border-line bg-surface/80 backdrop-blur-md transition-colors ${
          hero ? "p-2" : "px-3"
        }`}
      >
        <Search size={hero ? 20 : 15} className="shrink-0 text-muted-2" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) go(results[0]);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={
            hero ? "Honda Civic, Corolla E170, WRX VA…" : "Search a car…"
          }
          aria-label="Search for a car by make, model or generation"
          className={`w-full border-none bg-transparent text-ink outline-none placeholder:text-muted-2 ${
            hero ? "px-4 py-4 text-lg" : "px-2.5 py-2 text-sm"
          }`}
        />
        {hero && (
          <button
            type="button"
            onClick={() => results[0] && go(results[0])}
            className="shrink-0 bg-accent px-6 py-4 text-sm font-bold uppercase tracking-wider text-white transition-all hover:brightness-110 active:scale-[0.98] md:px-8"
          >
            Open graph
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-80 overflow-auto border border-line-strong bg-surface text-left shadow-[var(--shadow-lg)]">
          {results.map((car) => (
            <li key={car.id} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => go(car)}
                className="focus-ring flex w-full items-center justify-between gap-4 px-4 py-3 hover:bg-surface-hover"
              >
                <span className="min-w-0 truncate text-sm text-ink">
                  {car.make} {car.model}
                  {car.generation ? (
                    <span className="ml-2 text-muted-2">{car.generation}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-label">{car.yearRange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
