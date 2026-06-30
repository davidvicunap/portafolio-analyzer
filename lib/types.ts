// Shared domain types used across client and server.

export type AssetType = "stock" | "etf";

/** A single portfolio position, as entered by the user. */
export interface Holding {
  id: string;
  ticker: string;
  shares: number;
  costBasis: number; // per-share cost
  purchaseDate?: string; // ISO yyyy-mm-dd
  notes?: string;
}

/** Live quote, normalized from Yahoo Finance. */
export interface Quote {
  symbol: string;
  name: string | null;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  marketState: string | null;
  volume: number | null;
  avgVolume: number | null;
  marketCap: number | null;
  exchange: string | null;
}

/** One point on a historical price series. */
export interface HistoricalPoint {
  date: string; // ISO
  close: number;
  adjClose: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export type Range = "1d" | "5d" | "1mo" | "3mo" | "1y" | "5y" | "max";

export interface HistoricalSeries {
  symbol: string;
  range: Range;
  points: HistoricalPoint[];
}

/** Company profile + key statistics. */
export interface CompanySummary {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  description: string | null;
  employees: number | null;
  country: string | null;
  city: string | null;
  website: string | null;
  assetType: AssetType;
  metrics: {
    price: number | null;
    marketCap: number | null;
    trailingPE: number | null;
    forwardPE: number | null;
    priceToBook: number | null;
    eps: number | null;
    dividendYield: number | null; // fraction (0.012 = 1.2%)
    beta: number | null;
    fiftyTwoWeekLow: number | null;
    fiftyTwoWeekHigh: number | null;
    volume: number | null;
    avgVolume: number | null;
  };
}

/** Lightweight company classification, for allocation breakdowns. */
export interface Profile {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  assetType: AssetType;
}

/** SEC filing entry. */
export interface Filing {
  accessionNumber: string;
  form: string;
  filingDate: string;
  reportDate: string | null;
  primaryDocument: string;
  primaryDocDescription: string | null;
  filingUrl: string; // index page on sec.gov
  documentUrl: string; // direct primary document
  cik: string;
}

/** A parsed section extracted from a 10-K / 10-Q. */
export interface FilingSection {
  id: string;
  title: string;
  /** Plain-text-ish HTML (sanitized to simple tags) for rendering. */
  html: string;
  wordCount: number;
}

export interface ParsedFiling {
  accessionNumber: string;
  form: string;
  company: string | null;
  filingDate: string | null;
  documentUrl: string;
  sections: FilingSection[];
}

/** Portfolio-level analytics result. */
export interface PortfolioAnalytics {
  asOf: string;
  riskFreeRate: number;
  totalValue: number;
  returns: {
    totalReturnPct: number; // vs cost basis
    cagrPct: number | null; // annualized, from earliest purchase
    twrPct: number | null; // time-weighted, from price history
  };
  risk: {
    annualVolatilityPct: number | null;
    beta: number | null;
    sharpe: number | null;
  };
  benchmark: {
    symbol: string;
    twrPct: number | null;
  };
  correlation: {
    symbols: string[];
    matrix: number[][];
  };
  drawdown: {
    series: { date: string; value: number; drawdownPct: number }[];
    maxDrawdownPct: number | null;
  };
  concentration: {
    bySector: { sector: string; weightPct: number }[];
    warnings: string[];
  };
  performance: {
    series: { date: string; portfolio: number; benchmark: number | null }[];
  };
  skipped: string[]; // symbols dropped for missing data
}

export interface ApiError {
  error: string;
}
