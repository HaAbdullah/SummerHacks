"use client";

import Link from "next/link";

export function AnalyticsCta() {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-br from-[#121212] to-black p-12">
      <div
        aria-hidden
        className="absolute right-0 top-0 h-96 w-96 bg-accent opacity-10 blur-[150px]"
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-0 h-96 w-96 bg-accent-blue opacity-10 blur-[150px]"
      />
      <div className="relative z-10 max-w-3xl">
        <h2 className="heading-font mb-6 text-4xl font-bold tracking-tight text-ink md:text-5xl">
          TRANSFORM DATA INTO{" "}
          <span className="text-accent">REAL BUILDS.</span>
        </h2>
        <p className="mb-10 text-lg leading-relaxed text-muted">
          The BuildaMod data layer tracks every sketch, voice clip, and branch
          choice to help you predict mod compatibility and visualize the future
          of your car before you even open your toolbox.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/"
            className="heading-font rounded-xl bg-white px-10 py-4 text-sm font-black text-black transition-all hover:scale-105"
          >
            EXPLORE API
          </Link>
          <button
            type="button"
            className="heading-font rounded-xl border border-white/10 bg-white/5 px-10 py-4 text-sm font-black text-ink transition-all hover:bg-white/10"
          >
            DOWNLOAD REPORT
          </button>
        </div>
      </div>
    </section>
  );
}
