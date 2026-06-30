import type { NextRequest } from "next/server";
import { getFilings, SecConfigError, TRACKED_FORMS } from "@/lib/sec/client";
import { jsonError, jsonOk, errorMessage } from "@/lib/api";

// /api/sec/filings/AAPL?forms=10-K,10-Q&limit=50
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await ctx.params;
  const formsParam = req.nextUrl.searchParams.get("forms");
  const limitParam = req.nextUrl.searchParams.get("limit");

  const forms = formsParam
    ? formsParam.split(",").map((f) => f.trim()).filter(Boolean)
    : [...TRACKED_FORMS];
  const limit = limitParam ? Math.min(Number(limitParam) || 100, 200) : 100;

  try {
    const result = await getFilings(ticker, { forms, limit });
    return jsonOk(result, { cacheSeconds: 1800 });
  } catch (err) {
    if (err instanceof SecConfigError) return jsonError(err.message, 500);
    return jsonError(errorMessage(err), 404);
  }
}
