"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { HistoricalPoint, Range } from "@/lib/types";
import { formatCurrency, formatPercentValue } from "@/lib/format";

const INTRADAY: Range[] = ["1d", "5d"];

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatAxisDate(iso: string, range: Range): string {
  const d = new Date(iso);
  if (INTRADAY.includes(range)) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (range === "5y" || range === "max") {
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
} as const;

export function PriceChart({
  points,
  range,
  benchmark,
}: {
  points: HistoricalPoint[];
  range: Range;
  benchmark?: { label: string; points: HistoricalPoint[] } | null;
}) {
  const positive =
    points.length > 1 &&
    points[points.length - 1].close >= points[0].close;
  const lineColor = positive ? "var(--positive)" : "var(--negative)";

  const compareData = useMemo(() => {
    if (!benchmark || points.length === 0) return null;
    const base = points[0].close;
    const benchMap = new Map(benchmark.points.map((p) => [dateKey(p.date), p.close]));
    const benchBase = benchmark.points[0]?.close ?? null;
    let lastBench: number | null = null;
    return points.map((p) => {
      const b = benchMap.get(dateKey(p.date));
      if (b != null) lastBench = b;
      return {
        date: p.date,
        asset: ((p.close - base) / base) * 100,
        benchmark:
          benchBase != null && lastBench != null
            ? ((lastBench - benchBase) / benchBase) * 100
            : null,
      };
    });
  }, [points, benchmark]);

  if (points.length === 0) {
    return (
      <p className="flex h-72 items-center justify-center text-sm text-muted">
        No price data for this range.
      </p>
    );
  }

  if (compareData) {
    return (
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={compareData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => formatAxisDate(v, range)}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              minTickGap={40}
              stroke="var(--border)"
            />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              width={44}
              stroke="var(--border)"
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(v: unknown) => formatAxisDate(String(v), range)}
              formatter={(value: unknown, name: unknown) => [
                formatPercentValue(typeof value === "number" ? value : null, { signed: true }),
                name === "asset" ? "This stock" : (benchmark?.label ?? "Benchmark"),
              ]}
            />
            <Legend
              formatter={(value) => (value === "asset" ? "This stock" : benchmark?.label)}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Line type="monotone" dataKey="asset" stroke="var(--accent)" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="benchmark" stroke="var(--muted)" dot={false} strokeWidth={1.5} strokeDasharray="4 3" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatAxisDate(v, range)}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            minTickGap={40}
            stroke="var(--border)"
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => formatCurrency(v, { compact: true })}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            width={56}
            stroke="var(--border)"
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(v: unknown) => formatAxisDate(String(v), range)}
            formatter={(value: unknown) => [
              formatCurrency(typeof value === "number" ? value : null),
              "Close",
            ]}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#priceFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
