// Stage 4.3 / BUG-044 · PERF-006 — batched, cached price proxy.
//
// Was: one invocation per holding per minute per tab, straight through to
// Yahoo/mfapi with no cache. 30 holdings = 43 200 invocations a day per tab.
//
// Now: the client sends every symbol it needs in ONE request; anything still
// fresh in `price_cache` is served from there, and only genuine misses go
// upstream — in parallel, deduped. A portfolio that is polled every 60 s now
// costs one invocation a minute regardless of size, and mutual funds (whose
// NAV publishes once a day) go upstream at most once in 24 h.
//
// The GET form is kept for one-off manual checks and older clients.
//
// Upstream calls go through `quotes.ts` (yahoo-finance2 for stocks, AMFI via
// mfapi for mutual funds), which adds a 5-minute in-isolate cache and folds
// concurrent asks for one symbol into one call. It sits in FRONT of
// `price_cache`: a warm isolate answers repeats without touching Postgres,
// and a cold one still gets the shared, durable cache.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import YahooFinance from "npm:yahoo-finance2@4.0.3";
import { createQuoteClient, QUOTE_TTL_MS, type QuoteRequest } from "./quotes.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Provider = "yahoo" | "mf";

/**
 * How long a `price_cache` row counts as fresh. Yahoo quotes move all day,
 * so they share the in-isolate 5-minute TTL; an mfapi NAV publishes once,
 * after market close, so the shared row is kept for a day.
 */
const TTL_MS: Record<Provider, number> = {
  yahoo: QUOTE_TTL_MS,
  mf: 24 * 60 * 60 * 1000,
};

/** A single tab asks for one symbol per holding — this is a sanity bound, not a quota. */
const MAX_SYMBOLS = 100;

const isProvider = (v: unknown): v is Provider => v === "yahoo" || v === "mf";
const keyOf = (provider: Provider, symbol: string) => `${provider}:${symbol}`;

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** Module-level, so it lives as long as the isolate and is shared by requests. */
const quotes = createQuoteClient({
  yahooQuote: (symbol) => yahooFinance.quote(symbol, {}, { validateResult: false }),
});

const toRequest = (provider: Provider, symbol: string): QuoteRequest =>
  provider === "yahoo" ? { kind: "stock", symbol } : { kind: "mf", schemeCode: symbol };

async function yahoo(symbol: string): Promise<number | null> {
  try {
    return (await quotes.getQuote({ kind: "stock", symbol })).price;
  } catch {
    return null;
  }
}

async function mf(code: string): Promise<number | null> {
  try {
    return (await quotes.getQuote({ kind: "mf", schemeCode: code })).price;
  } catch {
    return null;
  }
}

function fetchUpstream(provider: Provider, symbol: string): Promise<number | null> {
  return provider === "yahoo" ? yahoo(symbol) : mf(symbol);
}

/**
 * service_role, because `price_cache` has RLS on with no policies — the cache
 * is deliberately unreachable from the browser. This client is used ONLY for
 * that table; it never touches tenant data.
 */
function admin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface Want {
  provider: Provider;
  symbol: string;
}

interface Row {
  key: string;
  provider: string;
  symbol: string;
  price: number;
  fetched_at: string;
}

async function resolve(wants: Want[]): Promise<{
  prices: Record<string, number | null>;
  cached: number;
  fetched: number;
  stale: number;
}> {
  // Two holdings of the same stock must not become two upstream calls.
  const unique = new Map<string, Want>();
  for (const w of wants) unique.set(keyOf(w.provider, w.symbol), w);

  const prices: Record<string, number | null> = {};
  const db = admin();
  const now = Date.now();

  // A warm isolate already holding a fresh quote needs no database round trip.
  let cached = 0;
  for (const [key, want] of unique) {
    const hit = quotes.peek(toRequest(want.provider, want.symbol));
    if (hit) {
      prices[key] = hit.price;
      unique.delete(key);
      cached++;
    }
  }

  let rows: Row[] = [];
  if (db && unique.size) {
    const { data } = await db
      .from("price_cache")
      .select("key, provider, symbol, price, fetched_at")
      .in("key", [...unique.keys()]);
    rows = (data ?? []) as Row[];
  }
  const cache = new Map(rows.map((r) => [r.key, r]));

  const misses: Want[] = [];
  for (const [key, want] of unique) {
    const hit = cache.get(key);
    const age = hit ? now - new Date(hit.fetched_at).getTime() : Infinity;
    if (hit && age < TTL_MS[want.provider]) {
      prices[key] = Number(hit.price);
      cached++;
    } else {
      misses.push(want);
    }
  }

  // Misses go upstream together, not one request after another.
  const results = await Promise.all(
    misses.map(async (w) => ({ w, price: await fetchUpstream(w.provider, w.symbol) })),
  );

  const fresh: Row[] = [];
  let fetched = 0;
  let stale = 0;
  for (const { w, price } of results) {
    const key = keyOf(w.provider, w.symbol);
    if (price !== null) {
      prices[key] = price;
      fetched++;
      fresh.push({
        key,
        provider: w.provider,
        symbol: w.symbol,
        price,
        fetched_at: new Date().toISOString(),
      });
    } else {
      // Upstream failed. A stale price is far better than nothing: without it
      // the UI silently falls back to the stored book value, which reads as
      // "the market did not move" rather than "we could not reach the market".
      const hit = cache.get(key);
      prices[key] = hit ? Number(hit.price) : null;
      if (hit) stale++;
    }
  }

  if (db && fresh.length) {
    await db.from("price_cache").upsert(fresh, { onConflict: "key" });
  }

  return { prices, cached, fetched, stale };
}

function parseWants(body: unknown): Want[] {
  const raw = (body as { symbols?: unknown })?.symbols;
  if (!Array.isArray(raw)) return [];
  const out: Want[] = [];
  for (const item of raw.slice(0, MAX_SYMBOLS)) {
    const provider = (item as Want)?.provider;
    const symbol = String((item as Want)?.symbol ?? "").trim();
    if (isProvider(provider) && symbol) out.push({ provider, symbol });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "content-type": "application/json" },
    });

  try {
    if (req.method === "POST") {
      const wants = parseWants(await req.json().catch(() => ({})));
      if (!wants.length) return json({ prices: {}, cached: 0, fetched: 0, stale: 0 });
      return json(await resolve(wants));
    }

    // Single-symbol GET — kept for manual checks and pre-4.3 clients. Same
    // cache path, so it costs no more than a batch of one.
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const symbol = url.searchParams.get("symbol") ?? "";
    if (!isProvider(provider) || !symbol) return json({ price: null });
    const { prices } = await resolve([{ provider, symbol }]);
    return json({ price: prices[keyOf(provider, symbol)] ?? null });
  } catch (e) {
    return json({ prices: {}, price: null, error: String(e) });
  }
});
