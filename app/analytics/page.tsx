import type { Metadata } from "next";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";

export const metadata: Metadata = {
  title: "Analytics · Portfolio Analyzer",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
