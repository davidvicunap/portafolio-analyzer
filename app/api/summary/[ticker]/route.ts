import { getSummary } from "@/lib/yahoo/client";
import { jsonError, jsonOk, errorMessage } from "@/lib/api";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await ctx.params;
  try {
    const summary = await getSummary(ticker);
    return jsonOk(summary, { cacheSeconds: 600 });
  } catch (err) {
    return jsonError(errorMessage(err), 502);
  }
}
