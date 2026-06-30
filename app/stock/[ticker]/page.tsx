import type { Metadata } from "next";
import Link from "next/link";
import { StockDetailClient } from "@/components/stock/StockDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()} · Portfolio Analyzer` };
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard"
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Back to dashboard
      </Link>
      <StockDetailClient ticker={ticker} />
    </div>
  );
}
