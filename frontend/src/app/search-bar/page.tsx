"use client";

import { ModelSearchBar } from "@/components/search/ModelSearchBar";

export default function SearchBarPreviewPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Deep void background with subtle vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 45%, #0c0c0c 0%, #050505 55%, #000 100%)",
        }}
      />

      {/* Faint grid — automotive blueprint feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 50%, black 20%, transparent 75%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-10">
        <header className="text-center">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.35em] text-white/30">
            BuildaMod
          </p>
          <h1
            className="text-[28px] font-medium tracking-[-0.02em] text-white/90 sm:text-[32px]"
            style={{ fontFamily: "var(--font-display), sans-serif" }}
          >
            Find your car
          </h1>
        </header>

        <ModelSearchBar
          onSubmit={(q) => {
            // Preview-only: log so you can see it fire in the console
            console.log("search:", q);
          }}
        />

        <p className="text-[12px] tracking-wide text-white/20">
          Type a model · press enter
        </p>
      </div>
    </main>
  );
}
