// Retry helpers with timeout + exponential backoff. Server-side only.

export interface RetryOptions {
  retries?: number; // max attempts beyond the first
  timeoutMs?: number;
  baseDelayMs?: number;
}

/** Run an async function with a timeout and exponential-backoff retries. */
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  { retries = 2, timeoutMs = 10_000, baseDelayMs = 300 }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fn(controller.signal);
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt + Math.random() * 100;
        await new Promise((r) => setTimeout(r, delay));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

/** fetch() wrapper that enforces a timeout, retries, and throws on non-2xx. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  options: RetryOptions = {},
): Promise<Response> {
  return withRetry(async (signal) => {
    const res = await fetch(url, { ...init, signal });
    if (!res.ok) {
      throw new Error(`Request to ${url} failed: ${res.status} ${res.statusText}`);
    }
    return res;
  }, options);
}

/** Minimal in-memory TTL cache. Survives within a single warm serverless instance. */
export class TTLCache<T> {
  private store = new Map<string, { value: T; expires: number }>();
  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  async wrap(key: string, producer: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await producer();
    this.set(key, value);
    return value;
  }
}
