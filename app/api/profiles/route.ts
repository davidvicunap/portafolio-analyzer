import type { NextRequest } from "next/server";
import { getProfiles } from "@/lib/yahoo/client";
import { jsonError, jsonOk, errorMessage } from "@/lib/api";

// /api/profiles?symbols=AAPL,MSFT — sector/industry/type for allocation.
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
    const profiles = await getProfiles(symbols);
    return jsonOk({ profiles }, { cacheSeconds: 600 });
  } catch (err) {
    return jsonError(errorMessage(err), 502);
  }
}
