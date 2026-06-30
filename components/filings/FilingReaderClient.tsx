"use client";

import { useState } from "react";
import type { ParsedFiling } from "@/lib/types";
import { useFetch } from "@/lib/client/useFetch";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton, ErrorState, EmptyState } from "@/components/ui/States";
import { formatNumber } from "@/lib/format";

export function FilingReaderClient({
  accession,
  cik,
  doc,
  form,
}: {
  accession: string;
  cik: string;
  doc: string;
  form: string;
}) {
  const query = `cik=${encodeURIComponent(cik)}&doc=${encodeURIComponent(doc)}&form=${encodeURIComponent(form)}`;
  const { data, error, loading, refetch } = useFetch<ParsedFiling>(
    `/api/sec/filing/${encodeURIComponent(accession)}?${query}`,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge tone="accent">{form}</Badge>
            <h1 className="text-xl font-semibold tracking-tight">Filing analysis</h1>
          </div>
          <p className="text-xs text-muted">Accession {accession}</p>
        </div>
        {data?.documentUrl && (
          <a href={data.documentUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">
              Open original filing ↗
            </Button>
          </a>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-xs text-muted">
        Sections are extracted from the filing for quick reading. Always verify
        against the original on SEC.gov.
      </div>

      {loading && !data ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load this filing"
          message={error}
          onRetry={refetch}
        />
      ) : !data || data.sections.length === 0 ? (
        <EmptyState
          title="No extractable sections"
          message="This filing's structure couldn't be parsed into sections. Open the original filing to read it in full."
          action={
            data?.documentUrl ? (
              <a href={data.documentUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm">Open original filing ↗</Button>
              </a>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.sections.map((section) => (
            <SectionAccordion
              key={section.id}
              title={section.title}
              wordCount={section.wordCount}
              html={section.html}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionAccordion({
  title,
  wordCount,
  html,
}: {
  title: string;
  wordCount: number;
  html: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted">
            ~{formatNumber(wordCount, { compact: true })} words
          </span>
        </span>
        <span className="text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4">
          <div
            className="filing-prose flex max-h-[32rem] flex-col gap-3 overflow-y-auto text-sm leading-relaxed text-foreground/90"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )}
    </Card>
  );
}
