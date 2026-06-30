import type { NextRequest } from "next/server";
import { getHistorical, isValidRange } from "@/lib/yahoo/client";
import { jsonError, jsonOk, errorMessage } from "@/lib/api";

// /api/historical/AAPL?range=1y
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await ctx.params;
  const range = req.nextUrl.searchParams.get("range") ?? "1y";
  if (!isValidRange(range)) {
    return jsonError(
      "Invalid range. Use one of: 1d, 5d, 1mo, 3mo, 1y, 5y, max",
      400,
    );
  }
  try {
    const series = await getHistorical(ticker, range);
    if (series.points.length === 0) {
      return jsonError(`No price history for ${ticker.toUpperCase()}`, 404);
    }
    // Historical data is not time-critical: cache at the edge.
    const cacheSeconds = range === "1d" || range === "5d" ? 300 : 3600;
    return jsonOk(series, { cacheSeconds });
  } catch (err) {
    return jsonError(errorMessage(err), 502);
  }
}
