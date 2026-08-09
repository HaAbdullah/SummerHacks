import type { Metadata } from "next";
import { LandingV2 } from "@/components/landing-v2/LandingV2";

export const metadata: Metadata = {
  title: "BuildaMod — scroll the build",
  description:
    "Experimental landing page: scrolling walks one branch of the build graph, engine to brakes to merge.",
};

// Experiment running alongside the live landing page at `/`. Nothing links
// here from the main nav yet — swap `src/app/page.tsx` over if the team keeps it.
export default function LandingV2Page() {
  return <LandingV2 />;
}
