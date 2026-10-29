// One quote API over the two free upstreams the investments screen uses:
//
//   getQuote({ kind: "stock", symbol: "RELIANCE.NS" })   // or "AAPL", "BTC-USD"
//   getQuote({ kind: "mf", schemeCode: "119551" })
//
// Both resolve to the same record, { price, currency, asOf, source }, or
// reject when no usable price came back.
//
// Stocks go through yahoo-finance2's `quote()`. A bare ticker that does not
// price as typed is retried with `.NS` (RELIANCE → RELIANCE.NS); US tickers
// such as AAPL answer first time and are never suffixed. If the library
// fails (Yahoo's crumb handshake is the usual casualty from datacenter IPs)
// the plain chart endpoint this function used before is tried, so adopting
// the library can never price fewer holdings than the old code did. Mutual
// funds come from AMFI data via api.mfapi.in, whose `/latest` route answers
// the same `{ meta, data: [{ date, nav }] }` shape as the full history, one
// row long.
//
// Caching: a 5-minute TTL Map keyed per symbol / scheme, plus a map of
// in-flight promises so concurrent asks for one key share one upstream call.
// A failure is never written to the cache — the next ask simply tries again.
// This is module state, so in the edge function it lives as long as the
// isolate does; `price_cache` in Postgres (see index.ts) is the layer that
// survives a cold start.
//
// No `npm:` or URL imports here on purpose: the yahoo client and `fetch` are
// passed in, which is what lets vitest exercise this file under Node.

export type QuoteRequest =
  | { kind: "stock"; symbol: string }
  | { kind: "mf"; schemeCode: string };

export interface Quote {
  /** Last traded price; for a mutual fund, the latest NAV. */
  price: number;
  /** ISO 4217, upper case. AMFI NAVs are always INR. */
  currency: string;
  /** ISO 8601 — the market time of the price, or the NAV's date. */
  asOf: string;
  source: "yahoo" | "amfi";
}

export const QUOTE_TTL_MS = 5 * 60_000;

/** Upstream calls that hang would hold every de-duplicated waiter with them. */
const UPSTREAM_TIMEOUT_MS = 8_000;

/** `yahooFinance.quote(symbol)` with validation off — it returns whatever Yahoo sent. */
export type YahooQuoteFn = (symbol: string) => Promise<unknown>;

export interface QuoteDeps {
  yahooQuote?: YahooQuoteFn;
  fetch?: typeof fetch;
  now?: () => number;
  ttlMs?: number;
}

export interface QuoteClient {
  getQuote(req: QuoteRequest): Promise<Quote>;
  /** A cached quote still inside its TTL, without going upstream. */
  peek(req: QuoteRequest): Quote | null;
  clear(): void;
}

export function quoteKey(req: QuoteRequest): string {
  return req.kind === "stock"
    ? `stock:${req.symbol.trim().toUpperCase()}`
    : `mf:${req.schemeCode.trim()}`;
}

// --------- Parsers (pure) ---------

const positive = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Yahoo times arrive as a Date (validated), epoch seconds (raw), or a string. */
function isoFromYahooTime(v: unknown, fallbackMs: number): string {
  let ms = NaN;
  if (v instanceof Date) ms = v.getTime();
  else if (typeof v === "number") ms = v < 1e12 ? v * 1000 : v;
  else if (typeof v === "string") ms = Date.parse(v);
  return new Date(Number.isFinite(ms) ? ms : fallbackMs).toISOString();
}

const currencyOf = (v: unknown): string =>
  typeof v === "string" && v.trim() ? v.trim().toUpperCase() : "USD";

/** One element of yahoo-finance2's `quote()` result. */
export function parseYahooQuote(raw: unknown, nowMs = Date.now()): Quote | null {
  const q = raw as Record<string, unknown> | null | undefined;
  const price = positive(q?.regularMarketPrice);
  if (!q || price === null) return null;
  return {
    price,
    currency: currencyOf(q.currency),
    asOf: isoFromYahooTime(q.regularMarketTime, nowMs),
    source: "yahoo",
  };
}

/** `query1.finance.yahoo.com/v8/finance/chart/<symbol>` — the fallback path. */
export function parseYahooChart(raw: unknown, nowMs = Date.now()): Quote | null {
  const meta = (raw as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } })
    ?.chart?.result?.[0]?.meta;
  const price = positive(meta?.regularMarketPrice);
  if (!meta || price === null) return null;
  return {
    price,
    currency: currencyOf(meta.currency),
    asOf: isoFromYahooTime(meta.regularMarketTime, nowMs),
    source: "yahoo",
  };
}

/** mfapi dates are `DD-MM-YYYY`; the NAV is a string. Newest row first. */
export function parseAmfi(raw: unknown): Quote | null {
  const row = (raw as { data?: Array<{ date?: unknown; nav?: unknown }> })?.data?.[0];
  const price = positive(row?.nav);
  const m = typeof row?.date === "string" ? row.date.match(/^(\d{2})-(\d{2})-(\d{4})$/) : null;
  if (price === null || !m) return null;
  return { price, currency: "INR", asOf: `${m[3]}-${m[2]}-${m[1]}`, source: "amfi" };
}

// --------- Client ---------

export function createQuoteClient(deps: QuoteDeps = {}): QuoteClient {
  const doFetch = deps.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const now = deps.now ?? Date.now;
  const ttl = deps.ttlMs ?? QUOTE_TTL_MS;

  const cache = new Map<string, { quote: Quote; at: number }>();
  const inflight = new Map<string, Promise<Quote>>();

  async function getJson(url: string, init?: RequestInit): Promise<unknown> {
    // Deno has AbortSignal.timeout; jsdom (the test environment) does not.
    const signal =
      typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) : undefined;
    const r = await doFetch(url, { ...init, signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function stockOnce(symbol: string): Promise<Quote | null> {
    if (deps.yahooQuote) {
      try {
        const q = parseYahooQuote(await deps.yahooQuote(symbol), now());
        if (q) return q;
      } catch {
        // Fall through to the chart endpoint.
      }
    }
    try {
      const j = await getJson(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
        { headers: { "User-Agent": "Mozilla/5.0" } },
      );
      return parseYahooChart(j, now());
    } catch {
      return null;
    }
  }

  /**
   * A bare ticker that does not price as typed is tried on NSE: `RELIANCE`
   * and `ITC` are Indian equities, while `AAPL` already answers as a US one.
   */
  async function stock(symbol: string): Promise<Quote | null> {
    const q = await stockOnce(symbol);
    if (q || symbol.includes(".")) return q;
    return stockOnce(`${symbol}.NS`);
  }

  async function mf(code: string): Promise<Quote | null> {
    try {
      return parseAmfi(await getJson(`https://api.mfapi.in/mf/${encodeURIComponent(code)}/latest`));
    } catch {
      return null;
    }
  }

  async function load(req: QuoteRequest, key: string): Promise<Quote> {
    let q: Quote | null = null;
    if (req.kind === "stock") {
      const symbol = req.symbol.trim().toUpperCase();
      if (symbol) q = await stock(symbol);
    } else {
      const code = req.schemeCode.trim();
      if (/^\d+$/.test(code)) q = await mf(code);
    }
    if (!q) throw new Error(`no quote for ${key}`);
    return q;
  }

  function peek(req: QuoteRequest): Quote | null {
    const hit = cache.get(quoteKey(req));
    return hit && now() - hit.at < ttl ? hit.quote : null;
  }

  function getQuote(req: QuoteRequest): Promise<Quote> {
    const key = quoteKey(req);
    const fresh = peek(req);
    if (fresh) return Promise.resolve(fresh);

    const pending = inflight.get(key);
    if (pending) return pending;

    const p = load(req, key)
      .then((quote) => {
        cache.set(key, { quote, at: now() });
        return quote;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  }

  return {
    getQuote,
    peek,
    clear() {
      cache.clear();
      inflight.clear();
    },
  };
}
