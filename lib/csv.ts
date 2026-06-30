import Papa from "papaparse";
import type { HoldingDraft } from "@/components/portfolio/HoldingForm";

export interface PreviewRow {
  line: number;
  ticker: string;
  shares: string;
  costBasis: string;
  purchaseDate: string;
  notes: string;
  draft: HoldingDraft | null;
  error: string | null;
}

const HEADER_ALIASES: Record<string, keyof Omit<PreviewRow, "line" | "draft" | "error">> = {
  ticker: "ticker",
  symbol: "ticker",
  shares: "shares",
  quantity: "shares",
  qty: "shares",
  cost_basis: "costBasis",
  costbasis: "costBasis",
  cost: "costBasis",
  price: "costBasis",
  avg_cost: "costBasis",
  "average cost": "costBasis",
  purchase_date: "purchaseDate",
  date: "purchaseDate",
  purchased: "purchaseDate",
  notes: "notes",
  note: "notes",
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

export const CSV_TEMPLATE =
  "ticker,shares,cost_basis,purchase_date,notes\nAAPL,10,150.25,2024-01-15,Long-term\nMSFT,5,300,2023-11-02,\n";

export function parseHoldingsCsv(text: string): PreviewRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => {
      const norm = normalizeHeader(h);
      const alias = HEADER_ALIASES[norm] ?? HEADER_ALIASES[h.trim().toLowerCase()];
      return alias ?? norm;
    },
  });

  const rows: PreviewRow[] = [];
  parsed.data.forEach((record, i) => {
    const ticker = (record.ticker ?? "").trim();
    const shares = (record.shares ?? "").trim();
    const costBasis = (record.costBasis ?? "").trim();
    const purchaseDate = (record.purchaseDate ?? "").trim();
    const notes = (record.notes ?? "").trim();

    let error: string | null = null;
    let draft: HoldingDraft | null = null;

    const sharesNum = Number(shares);
    const costNum = Number(costBasis);

    if (!ticker && !shares && !costBasis) return; // fully blank row

    if (!/^[A-Za-z.\-]{1,10}$/.test(ticker)) {
      error = "Invalid ticker";
    } else if (!Number.isFinite(sharesNum) || sharesNum <= 0) {
      error = "Shares must be a positive number";
    } else if (!Number.isFinite(costNum) || costNum < 0) {
      error = "Cost basis must be zero or more";
    } else if (purchaseDate && Number.isNaN(Date.parse(purchaseDate))) {
      error = "Invalid purchase date";
    } else {
      draft = {
        ticker: ticker.toUpperCase(),
        shares: sharesNum,
        costBasis: costNum,
        purchaseDate: purchaseDate || undefined,
        notes: notes || undefined,
      };
    }

    rows.push({
      line: i + 2, // +1 for header, +1 for 1-based
      ticker,
      shares,
      costBasis,
      purchaseDate,
      notes,
      draft,
      error,
    });
  });

  return rows;
}
