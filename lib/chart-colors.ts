// A calm, professional categorical palette (blue-led) that reads in light & dark.
export const CHART_COLORS = [
  "#2563eb",
  "#0891b2",
  "#7c3aed",
  "#16a34a",
  "#d97706",
  "#db2777",
  "#0d9488",
  "#4f46e5",
  "#ca8a04",
  "#dc2626",
  "#2dd4bf",
  "#9333ea",
];

export function colorAt(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
