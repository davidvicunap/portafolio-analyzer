import { cn } from "@/lib/cn";
import { changeColor, formatPercentValue, formatSignedCurrency } from "@/lib/format";

/** Renders a $ and/or % change with directional color and an arrow glyph. */
export function ChangeText({
  amount,
  percent,
  className,
  showArrow = true,
}: {
  amount?: number | null;
  percent?: number | null; // already a percent value (1.23 => 1.23%)
  className?: string;
  showArrow?: boolean;
}) {
  const basis = amount ?? percent ?? 0;
  const arrow = basis > 0 ? "▲" : basis < 0 ? "▼" : "";
  return (
    <span className={cn("tabular inline-flex items-center gap-1", changeColor(basis), className)}>
      {showArrow && arrow && <span className="text-[0.7em]">{arrow}</span>}
      {amount != null && <span>{formatSignedCurrency(amount)}</span>}
      {amount != null && percent != null && <span className="opacity-70">·</span>}
      {percent != null && <span>{formatPercentValue(percent, { signed: true })}</span>}
    </span>
  );
}
