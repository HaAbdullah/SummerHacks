import type { Metadata } from "next";
import { BeyondReality } from "@/components/beyond-reality/BeyondReality";

export const metadata: Metadata = {
  title: "BuildaMod | BEYOND REALITY",
};

// Deliberately unlinked from any nav — reachable only if you know the path.
export default function BeyondRealityPage() {
  return <BeyondReality />;
}
