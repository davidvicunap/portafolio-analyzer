import type {
  Holding,
  HistoricalPoint,
  Profile,
  PortfolioAnalytics,
} from "@/lib/types";
import {
  dailyReturns,
  annualizedVolatility,
  covariance,
  variance,
  correlation,
  mean,
  round,
  TRADING_DAYS,
} from "./math";

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Align a symbol's prices onto a target date spine, forward-filling gaps. */
function forwardFill(
  spineKeys: string[],
  points: HistoricalPoint[],
): (number | null)[] {
  const map = new Map(points.map((p) => [dateKey(p.date), p.close]));
  let last: number | null = null;
  return spineKeys.map((key) => {
    const v = map.get(key);
    if (v != null) last = v;
    return last;
  });
}

export interface AnalyticsInput {
  holdings: Holding[];
  seriesBySymbol: Record<string, HistoricalPoint[]>;
  benchmarkSymbol: string;
  benchmarkPoints: HistoricalPoint[];
  profiles: Profile[];
  riskFreeRate: number; // fraction, e.g. 0.04
}

export function computeAnalytics(input: AnalyticsInput): PortfolioAnalytics {
  const { holdings, seriesBySymbol, benchmarkSymbol, benchmarkPoints, profiles, riskFreeRate } =
    input;

  // Aggregate shares + cost per symbol.
  const sharesBySymbol = new Map<string, number>();
  const costBySymbol = new Map<string, number>();
  for (const h of holdings) {
    const sym = h.ticker.toUpperCase();
    sharesBySymbol.set(sym, (sharesBySymbol.get(sym) ?? 0) + h.shares);
    costBySymbol.set(sym, (costBySymbol.get(sym) ?? 0) + h.shares * h.costBasis);
  }

  const allSymbols = [...sharesBySymbol.keys()];
  const priced = allSymbols.filter((s) => (seriesBySymbol[s]?.length ?? 0) >= 2);
  const skipped = allSymbols.filter((s) => !priced.includes(s));

  const sectorBySymbol = new Map(profiles.map((p) => [p.symbol, p.sector ?? "Unknown"]));

  // Date spine from the benchmark's trading calendar.
  const spine = [...benchmarkPoints].sort(
    (a, b) => +new Date(a.date) - +new Date(b.date),
  );
  const spineKeys = spine.map((p) => dateKey(p.date));
  const benchAll = spine.map((p) => p.close);

  const filled: Record<string, (number | null)[]> = {};
  for (const sym of priced) {
    filled[sym] = forwardFill(spineKeys, seriesBySymbol[sym]);
  }

  // First index where every priced symbol has data.
  let startIndex = 0;
  if (priced.length > 0) {
    for (let i = 0; i < spineKeys.length; i++) {
      if (priced.every((s) => filled[s][i] != null)) {
        startIndex = i;
        break;
      }
    }
  }

  const dates = spineKeys.slice(startIndex);
  const benchValues = benchAll.slice(startIndex);

  // Portfolio value series.
  const portfolioValues: number[] = [];
  for (let i = startIndex; i < spineKeys.length; i++) {
    let v = 0;
    for (const sym of priced) {
      const price = filled[sym][i] ?? 0;
      v += (sharesBySymbol.get(sym) ?? 0) * price;
    }
    portfolioValues.push(v);
  }

  const currentValue = portfolioValues[portfolioValues.length - 1] ?? 0;
  const startValue = portfolioValues[0] ?? 0;
  const pricedCost = priced.reduce((s, sym) => s + (costBySymbol.get(sym) ?? 0), 0);

  // Returns.
  const totalReturnPct = pricedCost > 0 ? ((currentValue - pricedCost) / pricedCost) * 100 : 0;
  const twrPct = startValue > 0 ? (currentValue / startValue - 1) * 100 : null;
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const years =
    firstDate && lastDate
      ? (+new Date(lastDate) - +new Date(firstDate)) / (365.25 * 24 * 3600 * 1000)
      : 0;
  const cagrPct =
    startValue > 0 && years > 0.05
      ? ((currentValue / startValue) ** (1 / years) - 1) * 100
      : null;

  // Risk.
  const portReturns = dailyReturns(portfolioValues);
  const benchReturns = dailyReturns(benchValues);
  const hasRisk = portReturns.length >= 2;
  const annualVolDec = hasRisk ? annualizedVolatility(portReturns) : null;
  const benchVar = variance(benchReturns);
  const beta =
    hasRisk && benchVar > 0
      ? covariance(portReturns, benchReturns) / benchVar
      : null;
  const expReturn = hasRisk ? mean(portReturns) * TRADING_DAYS : null;
  const sharpe =
    annualVolDec != null && annualVolDec > 0 && expReturn != null
      ? (expReturn - riskFreeRate) / annualVolDec
      : null;
  const benchTwrPct =
    benchValues.length > 1 && benchValues[0] > 0
      ? (benchValues[benchValues.length - 1] / benchValues[0] - 1) * 100
      : null;

  // Correlation matrix across priced symbols.
  const symbolReturns: Record<string, number[]> = {};
  for (const sym of priced) {
    const series = filled[sym].slice(startIndex).map((v) => v ?? 0);
    symbolReturns[sym] = dailyReturns(series);
  }
  const matrix = priced.map((a) =>
    priced.map((b) =>
      a === b ? 1 : round(correlation(symbolReturns[a], symbolReturns[b]), 2),
    ),
  );

  // Drawdown.
  let peak = -Infinity;
  const drawdownSeries = portfolioValues.map((v, i) => {
    peak = Math.max(peak, v);
    const dd = peak > 0 ? (v / peak - 1) * 100 : 0;
    return { date: dates[i], value: round(v, 2), drawdownPct: round(dd, 2) };
  });
  const maxDrawdownPct =
    drawdownSeries.length > 0
      ? Math.min(...drawdownSeries.map((d) => d.drawdownPct))
      : null;

  // Concentration (current weights by sector).
  const valueBySymbol = new Map<string, number>();
  for (const sym of priced) {
    const lastPrice = filled[sym][spineKeys.length - 1] ?? 0;
    valueBySymbol.set(sym, (sharesBySymbol.get(sym) ?? 0) * lastPrice);
  }
  const sectorTotals = new Map<string, number>();
  for (const [sym, val] of valueBySymbol) {
    const sector = sectorBySymbol.get(sym) ?? "Unknown";
    sectorTotals.set(sector, (sectorTotals.get(sector) ?? 0) + val);
  }
  const bySector = [...sectorTotals.entries()]
    .map(([sector, val]) => ({
      sector,
      weightPct: currentValue > 0 ? round((val / currentValue) * 100, 1) : 0,
    }))
    .sort((a, b) => b.weightPct - a.weightPct);
  const warnings: string[] = [];
  for (const s of bySector) {
    if (s.sector !== "Unknown" && s.weightPct > 30) {
      warnings.push(
        `${s.sector} is ${s.weightPct.toFixed(0)}% of the portfolio — consider diversifying.`,
      );
    }
  }
  const unknownWeight = bySector.find((s) => s.sector === "Unknown")?.weightPct ?? 0;
  if (unknownWeight > 20) {
    warnings.push(
      `${unknownWeight.toFixed(0)}% of holdings have no sector classification.`,
    );
  }

  // Performance overlay: portfolio value vs benchmark rebased to portfolio start.
  const performanceSeries = portfolioValues.map((v, i) => ({
    date: dates[i],
    portfolio: round(v, 2),
    benchmark:
      benchValues[0] > 0 && startValue > 0
        ? round((benchValues[i] / benchValues[0]) * startValue, 2)
        : null,
  }));

  return {
    asOf: new Date().toISOString(),
    riskFreeRate,
    totalValue: round(currentValue, 2),
    returns: {
      totalReturnPct: round(totalReturnPct, 2),
      cagrPct: cagrPct != null ? round(cagrPct, 2) : null,
      twrPct: twrPct != null ? round(twrPct, 2) : null,
    },
    risk: {
      annualVolatilityPct: annualVolDec != null ? round(annualVolDec * 100, 2) : null,
      beta: beta != null ? round(beta, 2) : null,
      sharpe: sharpe != null ? round(sharpe, 2) : null,
    },
    benchmark: {
      symbol: benchmarkSymbol,
      twrPct: benchTwrPct != null ? round(benchTwrPct, 2) : null,
    },
    correlation: { symbols: priced, matrix },
    drawdown: {
      series: drawdownSeries,
      maxDrawdownPct: maxDrawdownPct != null ? round(maxDrawdownPct, 2) : null,
    },
    concentration: { bySector, warnings },
    performance: { series: performanceSeries },
    skipped,
  };
}
