import type { Metadata } from "next";
import { EngineBlueprintAnalyzer } from "@/components/blueprints/EngineBlueprintAnalyzer";

export const metadata: Metadata = {
  title: "Engine Blueprint Lab · BuildaMod",
  description: "Analyze an engine image and inspect high-confidence components.",
};

export default function EngineBlueprintPage() {
  return <EngineBlueprintAnalyzer />;
}
