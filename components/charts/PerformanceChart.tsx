"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatDate } from "@/lib/format";

export function PerformanceChart({
  series,
  benchmarkLabel = "S&P 500",
}: {
  series: { date: string; portfolio: number; benchmark: number | null }[];
  benchmarkLabel?: string;
}) {
  if (series.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No data.</p>;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatDate(v)}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            minTickGap={48}
            stroke="var(--border)"
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v, { compact: true })}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            width={56}
            stroke="var(--border)"
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            labelFormatter={(v: unknown) => formatDate(String(v))}
            formatter={(value: unknown, name: unknown) => [
              formatCurrency(typeof value === "number" ? value : null),
              name === "portfolio" ? "Portfolio" : benchmarkLabel,
            ]}
          />
          <Legend
            formatter={(value) => (value === "portfolio" ? "Portfolio" : `${benchmarkLabel} (rebased)`)}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Line type="monotone" dataKey="portfolio" stroke="var(--accent)" dot={false} strokeWidth={2} />
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="var(--muted)"
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
