import { cn } from "@/lib/cn";

interface StatProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  valueClassName?: string;
  className?: string;
}

/** A labelled metric: big value with an optional sub-line. */
export function Stat({ label, value, sub, valueClassName, className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className={cn("text-2xl font-semibold tabular", valueClassName)}>
        {value}
      </span>
      {sub != null && <span className="text-sm tabular text-muted">{sub}</span>}
    </div>
  );
}
