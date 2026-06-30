import type { Holding, Quote, Profile } from "@/lib/types";

export interface Position {
  holding: Holding;
  quote: Quote | null;
  price: number | null;
  value: number | null; // shares * price
  cost: number; // shares * costBasis
  dayChange: number | null; // shares * quote.change
  dayChangePct: number | null;
  unrealizedPL: number | null;
  unrealizedPLPct: number | null;
  weightPct: number; // share of total value
}

export interface PortfolioTotals {
  totalValue: number;
  totalCost: number; // cost of priced positions
  dayChange: number;
  dayChangePct: number | null;
  totalReturn: number;
  totalReturnPct: number | null;
  pricedCount: number;
  totalCount: number;
}

export interface AllocationSlice {
  key: string;
  label: string;
  value: number;
  pct: number;
}

export function buildPositions(
  holdings: Holding[],
  quotes: Quote[],
): Position[] {
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));
  const positions = holdings.map((holding): Position => {
    const quote = quoteMap.get(holding.ticker.toUpperCase()) ?? null;
    const price = quote?.price ?? null;
    const cost = holding.shares * holding.costBasis;
    const value = price != null ? holding.shares * price : null;
    const dayChange =
      quote?.change != null ? holding.shares * quote.change : null;
    const unrealizedPL = value != null ? value - cost : null;
    const unrealizedPLPct =
      value != null && cost > 0 ? ((value - cost) / cost) * 100 : null;
    return {
      holding,
      quote,
      price,
      value,
      cost,
      dayChange,
      dayChangePct: quote?.changePercent ?? null,
      unrealizedPL,
      unrealizedPLPct,
      weightPct: 0,
    };
  });

  const totalValue = positions.reduce((sum, p) => sum + (p.value ?? 0), 0);
  for (const p of positions) {
    p.weightPct = totalValue > 0 && p.value != null ? (p.value / totalValue) * 100 : 0;
  }
  return positions;
}

export function computeTotals(positions: Position[]): PortfolioTotals {
  const priced = positions.filter((p) => p.value != null);
  const totalValue = priced.reduce((s, p) => s + (p.value ?? 0), 0);
  const totalCost = priced.reduce((s, p) => s + p.cost, 0);
  const dayChange = priced.reduce((s, p) => s + (p.dayChange ?? 0), 0);
  const prevValue = totalValue - dayChange;
  const totalReturn = totalValue - totalCost;
  return {
    totalValue,
    totalCost,
    dayChange,
    dayChangePct: prevValue > 0 ? (dayChange / prevValue) * 100 : null,
    totalReturn,
    totalReturnPct: totalCost > 0 ? (totalReturn / totalCost) * 100 : null,
    pricedCount: priced.length,
    totalCount: positions.length,
  };
}

function toSlices(
  groups: Map<string, { label: string; value: number }>,
  total: number,
): AllocationSlice[] {
  return [...groups.entries()]
    .map(([key, { label, value }]) => ({
      key,
      label,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function allocationByHolding(positions: Position[]): AllocationSlice[] {
  const total = positions.reduce((s, p) => s + (p.value ?? 0), 0);
  const groups = new Map<string, { label: string; value: number }>();
  for (const p of positions) {
    if (p.value == null) continue;
    groups.set(p.holding.ticker, {
      label: p.holding.ticker,
      value: (groups.get(p.holding.ticker)?.value ?? 0) + p.value,
    });
  }
  return toSlices(groups, total);
}

export function allocationBySector(
  positions: Position[],
  profiles: Profile[],
): AllocationSlice[] {
  const sectorBySymbol = new Map(
    profiles.map((p) => [p.symbol, p.sector ?? "Unknown"]),
  );
  const total = positions.reduce((s, p) => s + (p.value ?? 0), 0);
  const groups = new Map<string, { label: string; value: number }>();
  for (const p of positions) {
    if (p.value == null) continue;
    const sector = sectorBySymbol.get(p.holding.ticker) ?? "Unknown";
    groups.set(sector, {
      label: sector,
      value: (groups.get(sector)?.value ?? 0) + p.value,
    });
  }
  return toSlices(groups, total);
}

export function allocationByType(
  positions: Position[],
  profiles: Profile[],
): AllocationSlice[] {
  const typeBySymbol = new Map(profiles.map((p) => [p.symbol, p.assetType]));
  const total = positions.reduce((s, p) => s + (p.value ?? 0), 0);
  const groups = new Map<string, { label: string; value: number }>();
  for (const p of positions) {
    if (p.value == null) continue;
    const type = typeBySymbol.get(p.holding.ticker) ?? "stock";
    const label = type === "etf" ? "ETF" : "Stock";
    groups.set(type, {
      label,
      value: (groups.get(type)?.value ?? 0) + p.value,
    });
  }
  return toSlices(groups, total);
}

export interface Performer {
  ticker: string;
  pct: number;
  amount: number;
}

/** Best and worst by a chosen metric, ignoring unpriced positions. */
export function performers(
  positions: Position[],
  metric: "day" | "allTime",
): { best: Performer | null; worst: Performer | null } {
  const ranked = positions
    .filter((p) =>
      metric === "day" ? p.dayChangePct != null : p.unrealizedPLPct != null,
    )
    .map((p) => ({
      ticker: p.holding.ticker,
      pct: (metric === "day" ? p.dayChangePct : p.unrealizedPLPct) ?? 0,
      amount: (metric === "day" ? p.dayChange : p.unrealizedPL) ?? 0,
    }))
    .sort((a, b) => b.pct - a.pct);
  if (ranked.length === 0) return { best: null, worst: null };
  return { best: ranked[0], worst: ranked[ranked.length - 1] };
}
