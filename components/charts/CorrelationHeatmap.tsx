"use client";

function cellColor(v: number): { bg: string; fg: string } {
  // Blue for positive correlation, red for negative; opacity = magnitude.
  const mag = Math.min(Math.abs(v), 1);
  const bg =
    v >= 0
      ? `rgba(37, 99, 235, ${0.12 + mag * 0.7})`
      : `rgba(220, 38, 38, ${0.12 + mag * 0.7})`;
  const fg = mag > 0.55 ? "#ffffff" : "var(--foreground)";
  return { bg, fg };
}

export function CorrelationHeatmap({
  symbols,
  matrix,
}: {
  symbols: string[];
  matrix: number[][];
}) {
  if (symbols.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Add at least two priced holdings to see correlations.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="p-1" />
            {symbols.map((s) => (
              <th key={s} className="p-1 font-medium text-muted">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {symbols.map((rowSym, i) => (
            <tr key={rowSym}>
              <th className="p-1 text-right font-medium text-muted">{rowSym}</th>
              {symbols.map((colSym, j) => {
                const v = matrix[i]?.[j] ?? 0;
                const { bg, fg } = cellColor(v);
                return (
                  <td
                    key={colSym}
                    className="tabular h-10 w-12 rounded-md text-center align-middle"
                    style={{ background: bg, color: fg }}
                    title={`${rowSym} vs ${colSym}: ${v.toFixed(2)}`}
                  >
                    {v.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
