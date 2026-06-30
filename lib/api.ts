// Shared helpers for route handlers.

export function jsonError(message: string, status = 500): Response {
  return Response.json({ error: message }, { status });
}

export function jsonOk<T>(
  data: T,
  init?: { cacheSeconds?: number; staleSeconds?: number },
): Response {
  const headers: Record<string, string> = {};
  if (init?.cacheSeconds) {
    const stale = init.staleSeconds ?? init.cacheSeconds * 4;
    headers["Cache-Control"] =
      `public, s-maxage=${init.cacheSeconds}, stale-while-revalidate=${stale}`;
  }
  return Response.json(data, { headers });
}

/** Turn an unknown thrown value into a readable message. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return typeof err === "string" ? err : "Unexpected error";
}
