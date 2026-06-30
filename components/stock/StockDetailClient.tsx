"use client";

import { useState } from "react";
import Link from "next/link";
import type { CompanySummary, HistoricalSeries, Quote, Range } from "@/lib/types";
import { useFetch } from "@/lib/client/useFetch";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton, ErrorState } from "@/components/ui/States";
import { ChangeText } from "@/components/ui/ChangeText";
import { PriceChart } from "@/components/charts/PriceChart";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format";

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "1d", label: "1D" },
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
  { value: "max", label: "MAX" },
];

export function StockDetailClient({ ticker }: { ticker: string }) {
  const symbol = ticker.toUpperCase();
  const [range, setRange] = useState<Range>("1y");
  const [compare, setCompare] = useState(false);

  const quoteState = useFetch<{ quote: Quote }>(`/api/quote/${symbol}`);
  const summaryState = useFetch<CompanySummary>(`/api/summary/${symbol}`);
  const historyState = useFetch<HistoricalSeries>(
    `/api/historical/${symbol}?range=${range}`,
  );
  const benchState = useFetch<HistoricalSeries>(
    compare ? `/api/historical/%5EGSPC?range=${range}` : null,
  );

  const quote = quoteState.data?.quote ?? null;
  const summary = summaryState.data ?? null;
  const points = historyState.data?.points ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{symbol}</h1>
            {summary?.assetType && (
              <Badge tone="accent">
                {summary.assetType === "etf" ? "ETF" : "Stock"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted">{quote?.name ?? summary?.name ?? "—"}</p>
        </div>
        <div className="text-right">
          {quoteState.loading && !quote ? (
            <Skeleton className="h-9 w-32" />
          ) : (
            <>
              <div className="text-3xl font-semibold tabular">
                {formatCurrency(quote?.price)}
              </div>
              <ChangeText
                amount={quote?.change}
                percent={quote?.changePercent}
                className="justify-end text-sm"
              />
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <Segmented
            ariaLabel="Time range"
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
          />
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Compare S&amp;P 500
          </label>
        </CardHeader>
        <CardBody>
          {historyState.loading && points.length === 0 ? (
            <Skeleton className="h-72 w-full" />
          ) : historyState.error ? (
            <ErrorState
              title="Couldn't load price history"
              message={historyState.error}
              onRetry={historyState.refetch}
            />
          ) : (
            <PriceChart
              points={points}
              range={range}
              benchmark={
                compare && benchState.data
                  ? { label: "S&P 500", points: benchState.data.points }
                  : null
              }
            />
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Key metrics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Key metrics</CardTitle>
            <Link
              href={`/filings/${symbol}`}
              className="text-sm font-medium text-accent hover:underline"
            >
              SEC filings →
            </Link>
          </CardHeader>
          <CardBody>
            {summaryState.loading && !summary ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : summaryState.error && !summary ? (
              <ErrorState message={summaryState.error} onRetry={summaryState.refetch} />
            ) : (
              <MetricsGrid summary={summary} />
            )}
          </CardBody>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-3 text-sm">
            {summary ? (
              <>
                <ProfileRow label="Sector" value={summary.sector} />
                <ProfileRow label="Industry" value={summary.industry} />
                <ProfileRow
                  label="Employees"
                  value={formatNumber(summary.employees, { maximumFractionDigits: 0 })}
                />
                <ProfileRow
                  label="Headquarters"
                  value={[summary.city, summary.country].filter(Boolean).join(", ") || null}
                />
                {summary.website && (
                  <ProfileRow
                    label="Website"
                    value={
                      <a
                        href={summary.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        {summary.website.replace(/^https?:\/\//, "")}
                      </a>
                    }
                  />
                )}
                {summary.description && (
                  <p className="mt-1 line-clamp-6 text-muted">{summary.description}</p>
                )}
              </>
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function MetricsGrid({ summary }: { summary: CompanySummary | null }) {
  const m = summary?.metrics;
  const items: { label: string; value: string }[] = [
    { label: "Market cap", value: formatCurrency(m?.marketCap, { compact: true }) },
    { label: "P/E (TTM)", value: formatNumber(m?.trailingPE) },
    { label: "Forward P/E", value: formatNumber(m?.forwardPE) },
    { label: "P/B", value: formatNumber(m?.priceToBook) },
    { label: "EPS (TTM)", value: formatCurrency(m?.eps) },
    { label: "Dividend yield", value: formatPercent(m?.dividendYield) },
    { label: "Beta", value: formatNumber(m?.beta) },
    {
      label: "52-week range",
      value:
        m?.fiftyTwoWeekLow != null && m?.fiftyTwoWeekHigh != null
          ? `${formatCurrency(m.fiftyTwoWeekLow)} – ${formatCurrency(m.fiftyTwoWeekHigh)}`
          : "—",
    },
    { label: "Volume", value: formatNumber(m?.volume, { compact: true }) },
    { label: "Avg volume", value: formatNumber(m?.avgVolume, { compact: true }) },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide text-muted">{item.label}</dt>
          <dd className="tabular text-base font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}
