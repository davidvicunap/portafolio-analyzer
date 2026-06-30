// Display formatting helpers. Pure functions, safe on client and server.

export function formatCurrency(
  value: number | null | undefined,
  opts: { compact?: boolean; currency?: string } = {},
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const { compact = false, currency = "USD" } = opts;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : 2,
  }).format(value);
}

export function formatNumber(
  value: number | null | undefined,
  opts: { compact?: boolean; maximumFractionDigits?: number } = {},
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const { compact = false, maximumFractionDigits = 2 } = opts;
  return new Intl.NumberFormat("en-US", {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits,
  }).format(value);
}

/** Accepts a fraction (0.0123) and renders as a percent (1.23%). */
export function formatPercent(
  fraction: number | null | undefined,
  opts: { signed?: boolean; digits?: number } = {},
): string {
  if (fraction == null || !Number.isFinite(fraction)) return "—";
  const { signed = false, digits = 2 } = opts;
  const pct = fraction * 100;
  const sign = signed && pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(digits)}%`;
}

/** Accepts an already-percent value (1.23) and renders 1.23%. */
export function formatPercentValue(
  pct: number | null | undefined,
  opts: { signed?: boolean; digits?: number } = {},
): string {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const { signed = false, digits = 2 } = opts;
  const sign = signed && pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(digits)}%`;
}

export function formatSignedCurrency(
  value: number | null | undefined,
  opts: { compact?: boolean } = {},
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatCurrency(Math.abs(value), opts)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Tailwind text color class for a gain/loss value. */
export function changeColor(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value === 0)
    return "text-muted";
  return value > 0 ? "text-positive" : "text-negative";
}
