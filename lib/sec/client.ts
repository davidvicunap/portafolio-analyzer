import "server-only";
import { fetchWithRetry, TTLCache } from "@/lib/fetch-retry";
import type { Filing } from "@/lib/types";

const TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_BASE = "https://data.sec.gov/submissions";
const ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data";

/** Forms surfaced in the filings hub. */
export const TRACKED_FORMS = [
  "10-K",
  "10-Q",
  "8-K",
  "DEF 14A",
  "S-1",
  "13F-HR",
] as const;

export class SecConfigError extends Error {}

/** SEC requires a descriptive User-Agent on every request. */
function userAgent(): string {
  const ua = process.env.SEC_USER_AGENT;
  if (!ua || ua.trim().length === 0) {
    throw new SecConfigError(
      "SEC_USER_AGENT is not set. Add it (format: \"Name email@domain.com\") to your environment.",
    );
  }
  return ua;
}

function secHeaders(): HeadersInit {
  return {
    "User-Agent": userAgent(),
    "Accept-Encoding": "gzip, deflate",
  };
}

export function padCik(cik: string | number): string {
  return String(cik).replace(/\D/g, "").padStart(10, "0");
}

// ---- CIK lookup (ticker -> CIK), cached ----

let tickerMapPromise: Promise<Map<string, { cik: string; title: string }>> | null = null;
let tickerMapExpires = 0;

async function loadTickerMap(): Promise<Map<string, { cik: string; title: string }>> {
  const now = Date.now();
  if (tickerMapPromise && now < tickerMapExpires) return tickerMapPromise;
  tickerMapExpires = now + 24 * 60 * 60 * 1000; // 24h
  tickerMapPromise = (async () => {
    const res = await fetchWithRetry(
      TICKERS_URL,
      { headers: secHeaders(), next: { revalidate: 86400 } },
      { timeoutMs: 15000 },
    );
    const data = (await res.json()) as Record<
      string,
      { cik_str: number; ticker: string; title: string }
    >;
    const map = new Map<string, { cik: string; title: string }>();
    for (const entry of Object.values(data)) {
      map.set(entry.ticker.toUpperCase(), {
        cik: padCik(entry.cik_str),
        title: entry.title,
      });
    }
    return map;
  })();
  // If the load fails, clear so the next call retries.
  tickerMapPromise.catch(() => {
    tickerMapPromise = null;
    tickerMapExpires = 0;
  });
  return tickerMapPromise;
}

export interface CikResult {
  ticker: string;
  cik: string;
  title: string;
}

export async function resolveCik(ticker: string): Promise<CikResult> {
  const sym = ticker.trim().toUpperCase();
  const map = await loadTickerMap();
  const hit = map.get(sym);
  if (!hit) {
    throw new Error(`No SEC CIK found for ticker ${sym}`);
  }
  return { ticker: sym, cik: hit.cik, title: hit.title };
}

// ---- Submissions / filings ----

const submissionsCache = new TTLCache<SubmissionsData>(60 * 60_000); // 1h

interface SubmissionsData {
  cik: string;
  name: string;
  filings: Filing[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getSubmissions(cik: string): Promise<SubmissionsData> {
  const padded = padCik(cik);
  return submissionsCache.wrap(padded, async () => {
    const res = await fetchWithRetry(
      `${SUBMISSIONS_BASE}/CIK${padded}.json`,
      { headers: secHeaders(), next: { revalidate: 3600 } },
      { timeoutMs: 15000 },
    );
    const data: any = await res.json();
    const recent = data.filings?.recent ?? {};
    const cikNumeric = String(parseInt(padded, 10));

    const filings: Filing[] = [];
    const forms: string[] = recent.form ?? [];
    for (let i = 0; i < forms.length; i++) {
      const accession: string = recent.accessionNumber?.[i] ?? "";
      const accessionNoDash = accession.replace(/-/g, "");
      const primaryDocument: string = recent.primaryDocument?.[i] ?? "";
      filings.push({
        accessionNumber: accession,
        form: forms[i],
        filingDate: recent.filingDate?.[i] ?? "",
        reportDate: recent.reportDate?.[i] || null,
        primaryDocument,
        primaryDocDescription: recent.primaryDocDescription?.[i] || null,
        filingUrl: `${ARCHIVES_BASE}/${cikNumeric}/${accessionNoDash}/${accession}-index.htm`,
        documentUrl: primaryDocument
          ? `${ARCHIVES_BASE}/${cikNumeric}/${accessionNoDash}/${primaryDocument}`
          : `${ARCHIVES_BASE}/${cikNumeric}/${accessionNoDash}/`,
        cik: padded,
      });
    }

    return { cik: padded, name: data.name ?? "", filings };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface FilingsResult {
  ticker: string;
  cik: string;
  company: string;
  filings: Filing[];
}

export async function getFilings(
  ticker: string,
  opts: { forms?: string[]; limit?: number } = {},
): Promise<FilingsResult> {
  const { cik, title } = await resolveCik(ticker);
  const submissions = await getSubmissions(cik);
  const formSet = new Set(opts.forms ?? TRACKED_FORMS);
  const filtered = submissions.filings
    .filter((f) => {
      // Match base form or amendments (e.g. "10-K/A").
      return [...formSet].some(
        (form) => f.form === form || f.form.startsWith(`${form}/`),
      );
    })
    .slice(0, opts.limit ?? 100);

  return {
    ticker: ticker.toUpperCase(),
    cik,
    company: submissions.name || title,
    filings: filtered,
  };
}

/** Find a single filing by accession number for a given CIK. */
export async function getFilingByAccession(
  cik: string,
  accessionNumber: string,
): Promise<Filing | null> {
  const submissions = await getSubmissions(cik);
  const normalized = accessionNumber.replace(/[^0-9-]/g, "");
  return (
    submissions.filings.find(
      (f) => f.accessionNumber === normalized || f.accessionNumber.replace(/-/g, "") === normalized.replace(/-/g, ""),
    ) ?? null
  );
}

export { secHeaders };
