"use client";

import { useRef, useState } from "react";
import { Search, ArrowRight } from "lucide-react";

type ModelSearchBarProps = {
  placeholder?: string;
  onSubmit?: (query: string) => void;
  className?: string;
};

/**
 * Porsche-inspired circular search bar — pill silhouette, refined chrome
 * border, whisper-thin typography, soft focus glow.
 */
export function ModelSearchBar({
  placeholder = "Enter your car model",
  onSubmit,
  className = "",
}: ModelSearchBarProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (!value) return;
    onSubmit?.(value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`group relative w-full max-w-[520px] ${className}`}
    >
      {/* Soft ambient glow behind the pill */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl transition-opacity duration-500 ${
          focused ? "opacity-100" : "opacity-40"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, transparent 70%)",
        }}
      />

      <div
        className={`
          relative flex items-center gap-3
          rounded-full
          border
          bg-[rgba(12,12,12,0.85)]
          backdrop-blur-xl
          px-5 py-3.5
          transition-all duration-300 ease-out
          ${
            focused
              ? "border-white/25 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)]"
          }
        `}
      >
        {/* Chrome search icon */}
        <Search
          className={`h-[18px] w-[18px] shrink-0 transition-colors duration-300 ${
            focused ? "text-white/80" : "text-white/35"
          }`}
          strokeWidth={1.5}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="
            min-w-0 flex-1
            bg-transparent
            text-[15px] font-light tracking-[0.04em]
            text-white/95
            outline-none
            placeholder:text-white/30
            placeholder:tracking-[0.06em]
          "
          autoComplete="off"
          spellCheck={false}
        />

        {/* Submit — circular chrome button */}
        <button
          type="submit"
          disabled={!query.trim()}
          aria-label="Search"
          className={`
            flex h-9 w-9 shrink-0 items-center justify-center
            rounded-full
            transition-all duration-300 ease-out
            disabled:cursor-default
            ${
              query.trim()
                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95"
                : "bg-white/5 text-white/20"
            }
          `}
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {/* Hairline accent under the bar — Porsche detail */}
      <div
        aria-hidden
        className={`
          mx-auto mt-3 h-px w-16
          bg-gradient-to-r from-transparent via-white/20 to-transparent
          transition-all duration-500
          ${focused ? "w-28 via-white/35" : ""}
        `}
      />
    </form>
  );
}
