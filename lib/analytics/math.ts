// Statistics helpers for portfolio analytics. Pure functions.

export const TRADING_DAYS = 252;

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

export function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}

export function stdev(xs: number[]): number {
  return Math.sqrt(variance(xs));
}

export function covariance(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (xs[i] - mx) * (ys[i] - my);
  return sum / (n - 1);
}

export function correlation(xs: number[], ys: number[]): number {
  const sx = stdev(xs);
  const sy = stdev(ys);
  if (sx === 0 || sy === 0) return 0;
  return covariance(xs, ys) / (sx * sy);
}

/** Period-over-period simple returns from a price/value series. */
export function dailyReturns(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    if (prev === 0) {
      out.push(0);
      continue;
    }
    out.push((values[i] - prev) / prev);
  }
  return out;
}

/** Annualized volatility from a series of daily returns. */
export function annualizedVolatility(returns: number[]): number {
  return stdev(returns) * Math.sqrt(TRADING_DAYS);
}

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
