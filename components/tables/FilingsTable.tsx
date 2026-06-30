"use client";

import Link from "next/link";
import type { Filing } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

const ANALYZABLE = new Set(["10-K", "10-Q"]);

function isAnalyzable(form: string): boolean {
  return [...ANALYZABLE].some((f) => form === f || form.startsWith(`${f}/`));
}

export function FilingsTable({
  ticker,
  filings,
}: {
  ticker: string;
  filings: Filing[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th scope="col" className="px-3 py-2 text-left font-medium">Form</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Filed</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Period</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Accession</th>
            <th scope="col" className="px-3 py-2 text-right font-medium" />
          </tr>
        </thead>
        <tbody>
          {filings.map((f) => {
            const analyzable = isAnalyzable(f.form);
            const readerHref = `/filings/${ticker}/${f.accessionNumber}?cik=${f.cik}&doc=${encodeURIComponent(
              f.primaryDocument,
            )}&form=${encodeURIComponent(f.form)}`;
            return (
              <tr
                key={f.accessionNumber}
                className="border-b border-border/60 transition-colors hover:bg-surface-2/60"
              >
                <td className="px-3 py-2.5">
                  <Badge tone={analyzable ? "accent" : "neutral"}>{f.form}</Badge>
                </td>
                <td className="tabular px-3 py-2.5">{formatDate(f.filingDate)}</td>
                <td className="tabular px-3 py-2.5 text-muted">
                  {f.reportDate ? formatDate(f.reportDate) : "—"}
                </td>
                <td className="tabular px-3 py-2.5 text-xs text-muted">
                  {f.accessionNumber}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  {analyzable && (
                    <Link
                      href={readerHref}
                      className="rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10"
                    >
                      Analyze
                    </Link>
                  )}
                  <a
                    href={f.filingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
                  >
                    SEC ↗
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
