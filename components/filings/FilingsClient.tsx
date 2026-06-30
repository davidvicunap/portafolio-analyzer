"use client";

import { useMemo, useState } from "react";
import type { Filing } from "@/lib/types";
import { useFetch } from "@/lib/client/useFetch";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Skeleton, ErrorState, EmptyState } from "@/components/ui/States";
import { FilingsTable } from "@/components/tables/FilingsTable";
import { cn } from "@/lib/cn";

interface FilingsResponse {
  ticker: string;
  cik: string;
  company: string;
  filings: Filing[];
}

const FILTERS = ["All", "10-K", "10-Q", "8-K", "DEF 14A", "S-1", "13F-HR"];

export function FilingsClient({ ticker }: { ticker: string }) {
  const symbol = ticker.toUpperCase();
  const { data, error, loading, refetch } = useFetch<FilingsResponse>(
    `/api/sec/filings/${symbol}`,
  );
  const [filter, setFilter] = useState("All");

  const filings = useMemo(() => {
    const all = data?.filings ?? [];
    if (filter === "All") return all;
    return all.filter((f) => f.form === filter || f.form.startsWith(`${filter}/`));
  }, [data, filter]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          SEC filings · {symbol}
        </h1>
        <p className="text-sm text-muted">
          {data?.company ? `${data.company} · CIK ${data.cik}` : "EDGAR filings"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
              filter === f
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent filings</CardTitle>
          {data && (
            <span className="text-xs text-muted">{filings.length} shown</span>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {loading && !data ? (
            <div className="p-5">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="p-5">
              <ErrorState
                title="Couldn't load filings"
                message={error}
                onRetry={refetch}
              />
            </div>
          ) : filings.length === 0 ? (
            <EmptyState
              title="No filings found"
              message={`No ${filter === "All" ? "" : filter + " "}filings available for ${symbol}.`}
              className="m-5"
            />
          ) : (
            <FilingsTable ticker={symbol} filings={filings} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
