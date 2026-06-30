import { z } from "zod";
import { getHistorical, getProfiles, isValidRange } from "@/lib/yahoo/client";
import { computeAnalytics } from "@/lib/analytics";
import type { HistoricalPoint, Range } from "@/lib/types";
import { jsonError, errorMessage } from "@/lib/api";

const BENCHMARK = "^GSPC";

const HoldingSchema = z.object({
  id: z.string(),
  ticker: z.string().min(1).max(12),
  shares: z.number().finite(),
  costBasis: z.number().finite(),
  purchaseDate: z.string().optional(),
  notes: z.string().optional(),
});

const BodySchema = z.object({
  holdings: z.array(HoldingSchema).min(1).max(100),
  riskFreeRate: z.number().min(0).max(0.5).optional(),
  range: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid request: expected { holdings: [...] }", 400);
  }

  const { holdings, riskFreeRate = 0.04 } = parsed.data;
  const range: Range = isValidRange(parsed.data.range ?? "")
    ? (parsed.data.range as Range)
    : "1y";

  const symbols = [...new Set(holdings.map((h) => h.ticker.toUpperCase()))];

  try {
    const [seriesEntries, benchmark, profiles] = await Promise.all([
      Promise.all(
        symbols.map(async (sym): Promise<[string, HistoricalPoint[]]> => {
          try {
            const series = await getHistorical(sym, range);
            return [sym, series.points];
          } catch {
            return [sym, []];
          }
        }),
      ),
      getHistorical(BENCHMARK, range).then((s) => s.points).catch(() => []),
      getProfiles(symbols),
    ]);

    const seriesBySymbol = Object.fromEntries(seriesEntries);

    if (benchmark.length < 2) {
      return jsonError("Benchmark data unavailable; try again shortly.", 502);
    }

    const analytics = computeAnalytics({
      holdings,
      seriesBySymbol,
      benchmarkSymbol: BENCHMARK,
      benchmarkPoints: benchmark,
      profiles,
      riskFreeRate,
    });

    return Response.json(analytics);
  } catch (err) {
    return jsonError(errorMessage(err), 502);
  }
}
