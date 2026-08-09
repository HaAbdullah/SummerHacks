"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

// Real Porsche photography (Unsplash), used the same way the rest of the
// landing page hotlinks remote images (see FEATURED_CARS in Landing.tsx).
const ROW_1_IMAGES = [
  "https://images.unsplash.com/photo-1673082797735-f994d6120ded?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1658863567312-fcaf9a15bc6f?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1689960947007-f20efe2e19f4?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1634673970798-a15ae56f6c65?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1580274455191-1c62238fa333?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1687815529363-846223d93c55?q=80&w=600&auto=format&fit=crop",
];

const ROW_2_IMAGES = [
  "https://images.unsplash.com/photo-1761658769189-a89a90c331fe?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1553032674-e1cd6fb0fe18?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1611651186486-415f04eb78e4?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1707566926203-08def48cdbd0?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1613921568536-555645be4032?q=80&w=600&auto=format&fit=crop",
];

function CarRow({
  images,
  x,
  topClass,
}: {
  images: string[];
  x: MotionValue<string>;
  topClass: string;
}) {
  const loop = [...images, ...images];
  return (
    <div
      className={`pointer-events-none absolute left-1/2 ${topClass} -translate-x-1/2 -rotate-[8deg]`}
    >
      <motion.div style={{ x }} className="flex w-max items-center gap-5">
        {loop.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt="Porsche 911"
            className="h-[140px] w-[220px] flex-none rounded-2xl border border-line object-cover shadow-[var(--shadow-lg)] sm:h-[190px] sm:w-[300px] md:h-[250px] md:w-[400px]"
          />
        ))}
      </motion.div>
    </div>
  );
}

export function ParallaxCarHero({ children }: { children?: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  // `<body>` (not the window) is BuildaMod's real scroll container — its
  // `overflow-x-hidden` forces `overflow-y: auto` per the CSS overflow spec,
  // so it owns scrolling instead of propagating to the viewport. useScroll
  // must track that element explicitly or scrollYProgress never moves.
  const bodyRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" ? document.body : null,
  );
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    container: bodyRef,
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const xRow1 = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["4%", "-40%"],
  );
  const xRow2 = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["-40%", "4%"],
  );

  return (
    <section
      ref={sectionRef}
      className="relative -mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:-mx-8 md:w-[calc(100%+4rem)]"
    >
      {/* Background layer — clipped to whatever height the content below
          ends up being, so the diagonal lines never force extra page height. */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-bg" />

        {/* Anchored a fixed distance from the top (not centered on the
            section) so the overlap always sits behind the headline, even
            as search/buttons grow the section taller below it. */}
        <CarRow
          images={ROW_1_IMAGES}
          x={xRow1}
          topClass="top-[100px] sm:top-[150px] md:top-[210px]"
        />
        <CarRow
          images={ROW_2_IMAGES}
          x={xRow2}
          topClass="top-[160px] sm:top-[230px] md:top-[320px]"
        />

        {/* Vignette so the diagonal lines fade into the page background at the
            very edges only — kept light so the cars stay the star, not the text scrim. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg via-transparent to-bg" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg via-transparent to-bg" />
        {/* Light dark pool behind the headline/search for legibility — much lower
            opacity than before so the Porsches read at full strength, not washed out. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_28%,rgba(0,0,0,0.4),transparent_72%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 pb-16 pt-24 text-center sm:gap-8 sm:px-6 sm:pb-20 sm:pt-36 md:pb-24 md:pt-48">
        <h1 className="heading-font text-[2.25rem] font-extrabold leading-[0.95] tracking-tighter text-ink [text-shadow:0_4px_40px_rgba(0,0,0,0.9)] sm:text-5xl md:text-7xl lg:text-8xl">
          THE FUTURE OF <br />
          <span className="gradient-text">CAR CUSTOMIZATION.</span>
        </h1>
        {children}
      </div>
    </section>
  );
}
