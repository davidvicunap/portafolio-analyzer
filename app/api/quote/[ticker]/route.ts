import { getQuote } from "@/lib/yahoo/client";
import { jsonError, errorMessage } from "@/lib/api";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await ctx.params;
  try {
    const quote = await getQuote(ticker);
    return Response.json({ quote });
  } catch (err) {
    return jsonError(errorMessage(err), 502);
  }
}
