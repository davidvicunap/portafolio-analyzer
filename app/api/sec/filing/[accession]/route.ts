import type { NextRequest } from "next/server";
import { fetchWithRetry, TTLCache } from "@/lib/fetch-retry";
import { secHeaders, SecConfigError } from "@/lib/sec/client";
import { parseFilingSections } from "@/lib/sec/parse";
import type { ParsedFiling } from "@/lib/types";
import { jsonError, jsonOk, errorMessage } from "@/lib/api";

const ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data";
// Filings are immutable once filed — cache parsed output aggressively.
const parsedCache = new TTLCache<ParsedFiling>(24 * 60 * 60_000);

// /api/sec/filing/0000320193-24-000123?cik=0000320193&doc=aapl.htm&form=10-K
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ accession: string }> },
) {
  const { accession } = await ctx.params;
  const cik = req.nextUrl.searchParams.get("cik") ?? "";
  const doc = req.nextUrl.searchParams.get("doc") ?? "";
  const form = req.nextUrl.searchParams.get("form") ?? "";

  const accessionDigits = accession.replace(/[^0-9-]/g, "");
  const accessionNoDash = accessionDigits.replace(/-/g, "");
  const cikNumeric = String(parseInt(cik.replace(/\D/g, ""), 10));
  const safeDoc = doc.replace(/[^A-Za-z0-9._-]/g, "");

  if (!accessionNoDash || cikNumeric === "NaN" || !safeDoc) {
    return jsonError("Missing or invalid cik/doc/accession", 400);
  }

  const cacheKey = `${cikNumeric}/${accessionNoDash}/${safeDoc}`;

  try {
    const parsed = await parsedCache.wrap(cacheKey, async () => {
      const url = `${ARCHIVES_BASE}/${cikNumeric}/${accessionNoDash}/${safeDoc}`;
      const res = await fetchWithRetry(
        url,
        { headers: secHeaders(), next: { revalidate: 86400 } },
        { timeoutMs: 25000, retries: 2 },
      );
      const html = await res.text();
      const sections = parseFilingSections(html, form);
      return {
        accessionNumber: accessionDigits,
        form,
        company: null,
        filingDate: null,
        documentUrl: url,
        sections,
      } satisfies ParsedFiling;
    });

    return jsonOk(parsed, { cacheSeconds: 86400 });
  } catch (err) {
    if (err instanceof SecConfigError) return jsonError(err.message, 500);
    return jsonError(errorMessage(err), 502);
  }
}
