"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PortfolioAnalytics, Range } from "@/lib/types";
import { usePortfolio } from "@/components/portfolio/PortfolioProvider";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton, ErrorState, EmptyState } from "@/components/ui/States";
import { inputClass } from "@/components/ui/Field";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { DrawdownChart } from "@/components/charts/DrawdownChart";
import { CorrelationHeatmap } from "@/components/charts/CorrelationHeatmap";
import { formatPercentValue, changeColor, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

const WINDOWS: { value: Range; label: string }[] = [
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
  { value: "max", label: "MAX" },
];

export function AnalyticsClient() {
  const { holdings, hydrated } = usePortfolio();
  const [range, setRange] = useState<Range>("1y");
  const [rfInput, setRfInput] = useState("4.0");
  const rf = useMemo(() => {
    const n = Number(rfInput);
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), 50) / 100 : 0.04;
  }, [rfInput]);
  const debouncedRf = useDebounced(rf, 600);

  const [data, setData] = useState<PortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const holdingsKey = useMemo(
    () =>
      JSON.stringify(
        holdings.map((h) => [h.ticker.toUpperCase(), h.shares, h.costBasis]),
      ),
    [holdings],
  );

  useEffect(() => {
    if (!hydrated || holdings.length === 0) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch("/api/portfolio/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdings, riskFreeRate: debouncedRf, range }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const body: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof body === "object" && body && "error" in body
              ? String((body as { error: unknown }).error)
              : `Request failed (${res.status})`;
          throw new Error(msg);
        }
        return body as PortfolioAnalytics;
      })
      .then((a) => {
        setData(a);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Request failed");
        setLoading(false);
      });
    return () => controller.abort();
    // holdingsKey captures the meaningful holding changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsKey, debouncedRf, range, hydrated, reloadTick]);

  if (!hydrated) return <AnalyticsSkeleton />;

  if (holdings.length === 0) {
    return (
      <>
        <Header range={range} onRange={setRange} rfInput={rfInput} onRf={setRfInput} />
        <EmptyState
          title="No holdings to analyze"
          message="Add holdings on the dashboard to see returns, risk, correlations, and drawdowns."
          className="mt-6"
        />
      </>
    );
  }

  return (
    <>
      <Header range={range} onRange={setRange} rfInput={rfInput} onRf={setRfInput} />

      {error && !data ? (
        <ErrorState
          title="Couldn't compute analytics"
          message={error}
          onRetry={() => setReloadTick((t) => t + 1)}
          className="mt-6"
        />
      ) : loading && !data ? (
        <AnalyticsSkeleton />
      ) : data ? (
        <div className="mt-6 flex flex-col gap-6">
          {data.skipped.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
              No price history for: {data.skipped.join(", ")}. Excluded from analytics.
            </div>
          )}

          {/* Returns & risk */}
          <Card>
            <CardHeader>
              <CardTitle>Returns &amp; risk</CardTitle>
              <span className="text-xs text-muted">
                {WINDOWS.find((w) => w.value === range)?.label} window · rf{" "}
                {formatPercentValue(data.riskFreeRate * 100)}
              </span>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              <Stat
                label="Total return"
                value={
                  <span className={changeColor(data.returns.totalReturnPct)}>
                    {formatPercentValue(data.returns.totalReturnPct, { signed: true })}
                  </span>
                }
                sub="vs cost basis"
              />
              <Stat
                label="Time-weighted"
                value={
                  <span className={changeColor(data.returns.twrPct)}>
                    {formatPercentValue(data.returns.twrPct, { signed: true })}
                  </span>
                }
                sub="over window"
              />
              <Stat
                label="Annualized (CAGR)"
                value={
                  <span className={changeColor(data.returns.cagrPct)}>
                    {formatPercentValue(data.returns.cagrPct, { signed: true })}
                  </span>
                }
              />
              <Stat
                label="S&P 500"
                value={
                  <span className={changeColor(data.benchmark.twrPct)}>
                    {formatPercentValue(data.benchmark.twrPct, { signed: true })}
                  </span>
                }
                sub="same window"
              />
              <Stat
                label="Volatility"
                value={formatPercentValue(data.risk.annualVolatilityPct)}
                sub="annualized"
              />
              <Stat label="Beta" value={formatNumber(data.risk.beta)} sub="vs S&P 500" />
              <Stat label="Sharpe ratio" value={formatNumber(data.risk.sharpe)} />
              <Stat
                label="Max drawdown"
                value={
                  <span className="text-negative">
                    {formatPercentValue(data.drawdown.maxDrawdownPct)}
                  </span>
                }
              />
            </CardBody>
          </Card>

          {/* Performance overlay */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio vs S&amp;P 500</CardTitle>
            </CardHeader>
            <CardBody>
              <PerformanceChart series={data.performance.series} />
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Drawdown */}
            <Card>
              <CardHeader>
                <CardTitle>Drawdown</CardTitle>
                <span className={cn("text-xs", "text-negative")}>
                  Max {formatPercentValue(data.drawdown.maxDrawdownPct)}
                </span>
              </CardHeader>
              <CardBody>
                <DrawdownChart series={data.drawdown.series} />
              </CardBody>
            </Card>

            {/* Concentration */}
            <Card>
              <CardHeader>
                <CardTitle>Sector concentration</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                {data.concentration.warnings.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {data.concentration.warnings.map((w) => (
                      <div
                        key={w}
                        className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
                      >
                        {w}
                      </div>
                    ))}
                  </div>
                )}
                <ul className="flex flex-col gap-2">
                  {data.concentration.bySector.map((s) => (
                    <li key={s.sector} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{s.sector}</span>
                        <span className="tabular font-medium">
                          {formatPercentValue(s.weightPct)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            s.weightPct > 30 ? "bg-warning" : "bg-accent",
                          )}
                          style={{ width: `${Math.min(s.weightPct, 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          {/* Correlation */}
          <Card>
            <CardHeader>
              <CardTitle>Correlation matrix</CardTitle>
              <span className="text-xs text-muted">daily returns · {range}</span>
            </CardHeader>
            <CardBody>
              <CorrelationHeatmap
                symbols={data.correlation.symbols}
                matrix={data.correlation.matrix}
              />
            </CardBody>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function Header({
  range,
  onRange,
  rfInput,
  onRf,
}: {
  range: Range;
  onRange: (r: Range) => void;
  rfInput: string;
  onRf: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted">Risk, correlation, and drawdown</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted">
          Risk-free rate
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              max="50"
              value={rfInput}
              onChange={(e) => onRf(e.target.value)}
              className={cn(inputClass, "h-8 w-20 pr-6")}
              aria-label="Risk-free rate percent"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted">
              %
            </span>
          </div>
        </label>
        <Segmented
          ariaLabel="Analysis window"
          options={WINDOWS}
          value={range}
          onChange={onRange}
        />
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-72 w-full" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timer.current = setTimeout(() => setDebounced(value), ms);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, ms]);
  return debounced;
}
