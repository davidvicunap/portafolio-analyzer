import type { Holding } from "@/lib/types";

/**
 * Persistence seam for the portfolio. v1 is localStorage; this interface lets a
 * future backend (Vercel KV, Postgres, Supabase) drop in without touching the UI.
 */
export interface PortfolioStore {
  list(): Holding[];
  save(holdings: Holding[]): void;
}

const STORAGE_KEY = "portfolio.holdings.v1";

function isHolding(value: unknown): value is Holding {
  if (typeof value !== "object" || value === null) return false;
  const h = value as Record<string, unknown>;
  return (
    typeof h.id === "string" &&
    typeof h.ticker === "string" &&
    typeof h.shares === "number" &&
    typeof h.costBasis === "number"
  );
}

export class LocalStoragePortfolioStore implements PortfolioStore {
  list(): Holding[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isHolding);
    } catch {
      return [];
    }
  }

  save(holdings: Holding[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    } catch {
      // Quota or privacy mode — fail silently; UI keeps in-memory state.
    }
  }
}

export const portfolioStore: PortfolioStore = new LocalStoragePortfolioStore();

/** Normalize raw input into a Holding (used by the form and CSV import). */
export function makeHolding(input: {
  ticker: string;
  shares: number;
  costBasis: number;
  purchaseDate?: string;
  notes?: string;
}): Holding {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ticker: input.ticker.trim().toUpperCase(),
    shares: input.shares,
    costBasis: input.costBasis,
    purchaseDate: input.purchaseDate || undefined,
    notes: input.notes?.trim() || undefined,
  };
}
