import type { Metadata } from "next";
import Link from "next/link";
import { FilingReaderClient } from "@/components/filings/FilingReaderClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string; accession: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()} filing · Portfolio Analyzer` };
}

export default async function FilingReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string; accession: string }>;
  searchParams: Promise<{ cik?: string; doc?: string; form?: string }>;
}) {
  const { ticker, accession } = await params;
  const { cik = "", doc = "", form = "" } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/filings/${ticker.toUpperCase()}`}
        className="text-sm text-muted transition-colors hover:text-foreground"
      >
        ← Back to {ticker.toUpperCase()} filings
      </Link>
      <FilingReaderClient accession={accession} cik={cik} doc={doc} form={form} />
    </div>
  );
}
