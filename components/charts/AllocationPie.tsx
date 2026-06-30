"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AllocationSlice } from "@/lib/portfolio-metrics";
import { colorAt } from "@/lib/chart-colors";
import { formatCurrency, formatPercentValue } from "@/lib/format";

export function AllocationPie({ data }: { data: AllocationSlice[] }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        No priced positions to allocate.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={88}
              paddingAngle={1}
              stroke="none"
            >
              {data.map((slice, i) => (
                <Cell key={slice.key} fill={colorAt(i)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: unknown, _name: unknown, item: unknown) => {
                const v = typeof value === "number" ? value : Number(value);
                const payload = (item as { payload?: AllocationSlice })?.payload;
                return [
                  `${formatCurrency(v)} · ${formatPercentValue(payload?.pct)}`,
                  payload?.label ?? "",
                ];
              }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--foreground)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex w-full flex-col gap-1.5">
        {data.slice(0, 8).map((slice, i) => (
          <li
            key={slice.key}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: colorAt(i) }}
                aria-hidden
              />
              <span className="truncate">{slice.label}</span>
            </span>
            <span className="tabular shrink-0 text-muted">
              {formatPercentValue(slice.pct)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
