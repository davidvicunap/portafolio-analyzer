import { resolveCik, SecConfigError } from "@/lib/sec/client";
import { jsonError, jsonOk, errorMessage } from "@/lib/api";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await ctx.params;
  try {
    const result = await resolveCik(ticker);
    return jsonOk(result, { cacheSeconds: 86400 });
  } catch (err) {
    if (err instanceof SecConfigError) return jsonError(err.message, 500);
    return jsonError(errorMessage(err), 404);
  }
}
