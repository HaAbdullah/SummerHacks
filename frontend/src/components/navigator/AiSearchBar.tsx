"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { aiSearch } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export function AiSearchBar({ carId }: { carId: string }) {
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const { setSearchResult, searchResult } = useAppStore();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || thinking) return;
    setThinking(true);
    setSearchResult(null);
    const minWait = new Promise((r) => setTimeout(r, 650));
    try {
      const [result] = await Promise.all([
        aiSearch(carId, query.trim()),
        minWait,
      ]);
      setSearchResult(result);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="group relative">
        <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-accent">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="AI Search Branches..."
          className={`w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-[13px] text-ink placeholder-muted-2 transition-all focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/10 ${
            thinking ? "opacity-70" : ""
          }`}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSearchResult(null);
          }}
        />
      </form>

      {searchResult && (
        <div className="mt-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
          <p className="text-[12px] leading-relaxed text-ink-soft">
            {searchResult.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
