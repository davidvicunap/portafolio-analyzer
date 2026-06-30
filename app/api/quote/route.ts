import type { NextRequest } from "next/server";
import { getQuotes } from "@/lib/yahoo/client";
import { jsonError, errorMessage } from "@/lib/api";

// Batch quotes: /api/quote?symbols=AAPL,MSFT,NVDA
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols");
  if (!raw) return jsonError("Provide ?symbols=AAPL,MSFT", 400);

  const symbols = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60);

  if (symbols.length === 0) return jsonError("No valid symbols provided", 400);

  try {
    const quotes = await getQuotes(symbols);
    return Response.json({ quotes });
  } catch (err) {
    return jsonError(errorMessage(err), 502);
  }
}
