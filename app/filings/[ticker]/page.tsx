import type { Metadata } from "next";
import Link from "next/link";
import { FilingsClient } from "@/components/filings/FilingsClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()} filings · Portfolio Analyzer` };
}

export default async function FilingsPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/stock/${ticker.toUpperCase()}`}
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Back to {ticker.toUpperCase()}
      </Link>
      <FilingsClient ticker={ticker} />
    </div>
  );
}
