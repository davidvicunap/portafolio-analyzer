"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatPercentValue, formatDate } from "@/lib/format";

export function DrawdownChart({
  series,
}: {
  series: { date: string; drawdownPct: number }[];
}) {
  if (series.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No data.</p>;
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--negative)" stopOpacity={0.05} />
              <stop offset="100%" stopColor="var(--negative)" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatDate(v)}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            minTickGap={48}
            stroke="var(--border)"
          />
          <YAxis
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            width={44}
            stroke="var(--border)"
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
            formatter={(value: unknown) => [
              formatPercentValue(typeof value === "number" ? value : null),
              "Drawdown",
            ]}
          />
          <Area
            type="monotone"
            dataKey="drawdownPct"
            stroke="var(--negative)"
            strokeWidth={1.5}
            fill="url(#ddFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
