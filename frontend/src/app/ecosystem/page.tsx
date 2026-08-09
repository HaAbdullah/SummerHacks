import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Ecosystem Pulse · BuildaMod",
  description:
    "Community activity, trending branches, and network health across the BuildaMod ecosystem.",
};

export default function EcosystemPage() {
  return <AnalyticsDashboard />;
}
