"use client";

import { useState } from "react";
import Link from "next/link";
import type { Position } from "@/lib/portfolio-metrics";
import {
  formatCurrency,
  formatNumber,
  formatPercentValue,
  changeColor,
} from "@/lib/format";
import { cn } from "@/lib/cn";

type SortKey =
  | "ticker"
  | "shares"
  | "price"
  | "dayChangePct"
  | "value"
  | "unrealizedPLPct";

interface Column {
  key: SortKey;
  label: string;
  align: "left" | "right";
}

const COLUMNS: Column[] = [
  { key: "ticker", label: "Ticker", align: "left" },
  { key: "shares", label: "Shares", align: "right" },
  { key: "price", label: "Price", align: "right" },
  { key: "dayChangePct", label: "Day", align: "right" },
  { key: "value", label: "Value", align: "right" },
  { key: "unrealizedPLPct", label: "Unrealized P/L", align: "right" },
];

function sortValue(p: Position, key: SortKey): number | string {
  switch (key) {
    case "ticker":
      return p.holding.ticker;
    case "shares":
      return p.holding.shares;
    case "price":
      return p.price ?? -Infinity;
    case "dayChangePct":
      return p.dayChangePct ?? -Infinity;
    case "value":
      return p.value ?? -Infinity;
    case "unrealizedPLPct":
      return p.unrealizedPLPct ?? -Infinity;
  }
}

export function HoldingsTable({
  positions,
  onEdit,
  onRemove,
}: {
  positions: Position[];
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [asc, setAsc] = useState(false);

  const sorted = [...positions].sort((a, b) => {
    const av = sortValue(a, sortKey);
    const bv = sortValue(b, sortKey);
    let cmp: number;
    if (typeof av === "string" && typeof bv === "string") {
      cmp = av.localeCompare(bv);
    } else {
      cmp = (av as number) - (bv as number);
    }
    return asc ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "ticker");
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={
                  sortKey === col.key
                    ? asc
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className={cn(
                  "px-3 py-2 font-medium",
                  col.align === "right" ? "text-right" : "text-left",
                )}
              >
                <button
                  onClick={() => toggleSort(col.key)}
                  className={cn(
                    "inline-flex items-center gap-1 hover:text-foreground",
                    col.align === "right" && "flex-row-reverse",
                  )}
                >
                  {col.label}
                  <span className="text-[0.65rem]">
                    {sortKey === col.key ? (asc ? "▲" : "▼") : ""}
                  </span>
                </button>
              </th>
            ))}
            <th scope="col" className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.holding.id}
              className="border-b border-border/60 transition-colors hover:bg-surface-2/60"
            >
              <td className="px-3 py-2.5">
                <Link
                  href={`/stock/${p.holding.ticker}`}
                  className="font-semibold text-accent hover:underline"
                >
                  {p.holding.ticker}
                </Link>
                {p.quote?.name && (
                  <div className="max-w-[160px] truncate text-xs text-muted">
                    {p.quote.name}
                  </div>
                )}
              </td>
              <td className="tabular px-3 py-2.5 text-right">
                {formatNumber(p.holding.shares, { maximumFractionDigits: 4 })}
              </td>
              <td className="tabular px-3 py-2.5 text-right">
                {formatCurrency(p.price)}
              </td>
              <td
                className={cn(
                  "tabular px-3 py-2.5 text-right",
                  changeColor(p.dayChangePct),
                )}
              >
                {formatPercentValue(p.dayChangePct, { signed: true })}
              </td>
              <td className="tabular px-3 py-2.5 text-right">
                {formatCurrency(p.value)}
              </td>
              <td
                className={cn(
                  "tabular px-3 py-2.5 text-right",
                  changeColor(p.unrealizedPL),
                )}
              >
                <div>{formatCurrency(p.unrealizedPL)}</div>
                <div className="text-xs">
                  {formatPercentValue(p.unrealizedPLPct, { signed: true })}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                <button
                  onClick={() => onEdit(p.holding.id)}
                  className="rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
                  aria-label={`Edit ${p.holding.ticker}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => onRemove(p.holding.id)}
                  className="rounded-md px-2 py-1 text-xs text-muted hover:bg-negative/10 hover:text-negative"
                  aria-label={`Remove ${p.holding.ticker}`}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
