import "server-only";
import YahooFinance from "yahoo-finance2";
import { withRetry, TTLCache } from "@/lib/fetch-retry";
import type {
  Quote,
  HistoricalSeries,
  HistoricalPoint,
  CompanySummary,
  Profile,
  Range,
  AssetType,
} from "@/lib/types";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Resilience: don't hard-fail when Yahoo's payload drifts from the schema.
const moduleOptions = { validateResult: false } as const;

const quoteCache = new TTLCache<Quote>(30_000); // 30s
const historicalCache = new TTLCache<HistoricalSeries>(60 * 60_000); // 1h
const summaryCache = new TTLCache<CompanySummary>(15 * 60_000); // 15m

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Yahoo responses are loosely typed; we read through `any` and normalize.
function normalizeQuote(q: any): Quote {
  return {
    symbol: String(q.symbol ?? "").toUpperCase(),
    name: str(q.shortName) ?? str(q.longName),
    price: num(q.regularMarketPrice),
    previousClose: num(q.regularMarketPreviousClose),
    change: num(q.regularMarketChange),
    changePercent: num(q.regularMarketChangePercent),
    currency: str(q.currency),
    marketState: str(q.marketState),
    volume: num(q.regularMarketVolume),
    avgVolume: num(q.averageDailyVolume3Month) ?? num(q.averageDailyVolume10Day),
    marketCap: num(q.marketCap),
    exchange: str(q.fullExchangeName) ?? str(q.exchange),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const wanted = [...new Set(symbols.map((s) => s.trim().toUpperCase()))].filter(
    Boolean,
  );
  if (wanted.length === 0) return [];

  const result: Quote[] = [];
  const missing: string[] = [];
  for (const sym of wanted) {
    const cached = quoteCache.get(sym);
    if (cached) result.push(cached);
    else missing.push(sym);
  }

  if (missing.length > 0) {
    const fetched = await withRetry(async () => {
      // yf.quote accepts an array and returns an array of results.
      const data = await yf.quote(missing, {}, moduleOptions);
      return Array.isArray(data) ? data : [data];
    });
    for (const raw of fetched) {
      const q = normalizeQuote(raw);
      if (q.symbol) {
        quoteCache.set(q.symbol, q);
        result.push(q);
      }
    }
  }

  // Preserve requested order.
  const bySymbol = new Map(result.map((q) => [q.symbol, q]));
  return wanted.map((s) => bySymbol.get(s)).filter((q): q is Quote => !!q);
}

export async function getQuote(symbol: string): Promise<Quote> {
  const [q] = await getQuotes([symbol]);
  if (!q) throw new Error(`No quote found for ${symbol}`);
  return q;
}

interface RangeConfig {
  interval: "5m" | "15m" | "30m" | "1d" | "1wk" | "1mo";
  from: () => Date;
}

const EPOCH = new Date("1970-01-02");

const RANGE_CONFIG: Record<Range, RangeConfig> = {
  "1d": { interval: "5m", from: () => daysAgo(1) },
  "5d": { interval: "30m", from: () => daysAgo(7) },
  "1mo": { interval: "1d", from: () => monthsAgo(1) },
  "3mo": { interval: "1d", from: () => monthsAgo(3) },
  "1y": { interval: "1d", from: () => monthsAgo(12) },
  "5y": { interval: "1wk", from: () => monthsAgo(60) },
  max: { interval: "1mo", from: () => EPOCH },
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

export async function getHistorical(
  symbol: string,
  range: Range,
): Promise<HistoricalSeries> {
  const sym = symbol.trim().toUpperCase();
  const key = `${sym}:${range}`;
  return historicalCache.wrap(key, async () => {
    const cfg = RANGE_CONFIG[range];
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const series: any = await withRetry(() =>
      yf.chart(
        sym,
        { period1: cfg.from(), interval: cfg.interval },
        moduleOptions,
      ),
    );

    const points: HistoricalPoint[] = [];
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    for (const row of series.quotes as any[]) {
      const close = row.adjclose ?? row.close;
      if (close == null || !Number.isFinite(close)) continue;
      points.push({
        date: new Date(row.date).toISOString(),
        close: row.close ?? close,
        adjClose: row.adjclose ?? close,
        open: row.open ?? undefined,
        high: row.high ?? undefined,
        low: row.low ?? undefined,
        volume: row.volume ?? undefined,
      });
    }

    return { symbol: sym, range, points };
  });
}

export async function getSummary(symbol: string): Promise<CompanySummary> {
  const sym = symbol.trim().toUpperCase();
  return summaryCache.wrap(sym, async () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const data: any = await withRetry(() =>
      yf.quoteSummary(
        sym,
        {
          modules: [
            "assetProfile",
            "summaryDetail",
            "defaultKeyStatistics",
            "price",
            "quoteType",
          ],
        },
        moduleOptions,
      ),
    );
    const profile = data.assetProfile ?? {};
    const detail = data.summaryDetail ?? {};
    const stats = data.defaultKeyStatistics ?? {};
    const price = data.price ?? {};
    const quoteType: string = data.quoteType?.quoteType ?? "EQUITY";
    const assetType: AssetType = quoteType === "ETF" ? "etf" : "stock";
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return {
      symbol: sym,
      name: str(price.longName) ?? str(price.shortName),
      sector: str(profile.sector),
      industry: str(profile.industry),
      description: str(profile.longBusinessSummary),
      employees: num(profile.fullTimeEmployees),
      country: str(profile.country),
      city: str(profile.city),
      website: str(profile.website),
      assetType,
      metrics: {
        price: num(price.regularMarketPrice) ?? num(detail.previousClose),
        marketCap: num(price.marketCap) ?? num(detail.marketCap),
        trailingPE: num(detail.trailingPE),
        forwardPE: num(detail.forwardPE),
        priceToBook: num(stats.priceToBook),
        eps: num(stats.trailingEps),
        dividendYield: num(detail.dividendYield) ?? num(detail.yield),
        beta: num(detail.beta),
        fiftyTwoWeekLow: num(detail.fiftyTwoWeekLow),
        fiftyTwoWeekHigh: num(detail.fiftyTwoWeekHigh),
        volume: num(detail.regularMarketVolume) ?? num(detail.volume),
        avgVolume: num(detail.averageVolume),
      },
    };
  });
}

const profileCache = new TTLCache<Profile>(15 * 60_000); // 15m

/** Minimal sector/industry/type classification for allocation breakdowns. */
export async function getProfiles(symbols: string[]): Promise<Profile[]> {
  const wanted = [...new Set(symbols.map((s) => s.trim().toUpperCase()))].filter(
    Boolean,
  );
  const results = await Promise.all(
    wanted.map(async (sym): Promise<Profile> => {
      const cached = profileCache.get(sym);
      if (cached) return cached;
      try {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const data: any = await withRetry(() =>
          yf.quoteSummary(
            sym,
            { modules: ["assetProfile", "quoteType", "price"] },
            moduleOptions,
          ),
        );
        const quoteType: string = data.quoteType?.quoteType ?? "EQUITY";
        const profile: Profile = {
          symbol: sym,
          name: str(data.price?.longName) ?? str(data.price?.shortName),
          sector: str(data.assetProfile?.sector),
          industry: str(data.assetProfile?.industry),
          assetType: quoteType === "ETF" ? "etf" : "stock",
        };
        /* eslint-enable @typescript-eslint/no-explicit-any */
        profileCache.set(sym, profile);
        return profile;
      } catch {
        // Degrade gracefully — unknown classification.
        return {
          symbol: sym,
          name: null,
          sector: null,
          industry: null,
          assetType: "stock",
        };
      }
    }),
  );
  return results;
}

export function isValidRange(value: string): value is Range {
  return value in RANGE_CONFIG;
}
