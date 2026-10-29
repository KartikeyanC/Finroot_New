// Stock search for the Add Investment dialog: yahoo-finance2's `search()`,
// normalised to Yahoo symbols the live-price path can price as-is.
//
//   "reliance" → RELIANCE.NS (NSE) · RELIANCE.BO dropped (same company on BSE)
//   "itc"      → ITC.NS, ITCHOTELS.NS, …
//   "apple"    → AAPL (NASDAQ)
//
// Indian equities are normalised to NSE: an NSE listing always carries
// `.NS`, and a BSE listing is dropped when the same company is also on NSE.
// A BSE-only company keeps its `.BO` symbol, since `.NS` would not price.
// US tickers stay bare, exactly as Yahoo spells them.
//
// As with quotes.ts, the yahoo client and `fetch` are injected; if the
// library fails, Yahoo's plain search endpoint is tried before giving up.

export interface SearchHit {
  /** A Yahoo symbol: RELIANCE.NS, AAPL, HSBA.L. */
  symbol: string;
  name: string;
  /** Exchange as people know it: "NSE", "NASDAQ". */
  exchange?: string;
  /** Yahoo quoteType: EQUITY, ETF, MUTUALFUND, … */
  type?: string;
}

export type YahooSearchFn = (query: string) => Promise<unknown>;

export const MAX_HITS = 10;
const UPSTREAM_TIMEOUT_MS = 8_000;

/** Yahoo's exchange codes for India's two venues. */
const NSE_CODES = new Set(["NSI", "NSE"]);
const BSE_CODES = new Set(["BSE", "BOM"]);

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** NSE listings always get `.NS`, whatever Yahoo sent. */
export function withIndianSuffix(symbol: string, exchangeCode: string): string {
  const sym = symbol.trim().toUpperCase();
  if (NSE_CODES.has(exchangeCode.toUpperCase()) && !sym.includes(".")) return `${sym}.NS`;
  return sym;
}

const baseOf = (symbol: string) => symbol.replace(/\.(NS|BO)$/, "");

/** `{ quotes: [...] }` from yahoo-finance2's search() or the raw endpoint. */
export function parseYahooSearch(raw: unknown, max = MAX_HITS): SearchHit[] {
  const quotes = (raw as { quotes?: unknown })?.quotes;
  if (!Array.isArray(quotes)) return [];

  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  for (const item of quotes) {
    const q = item as Record<string, unknown>;
    // News, people and other non-Yahoo rows have no tradable symbol.
    if (q?.isYahooFinance === false) continue;
    const code = str(q?.exchange);
    const symbol = withIndianSuffix(str(q?.symbol), code);
    const name = str(q?.longname) || str(q?.shortname);
    if (!symbol || !name || seen.has(symbol)) continue;
    seen.add(symbol);
    hits.push({
      symbol,
      name,
      exchange: str(q?.exchDisp) || code,
      type: str(q?.quoteType) || undefined,
    });
  }

  // The same company on BSE adds nothing once its NSE listing is there.
  const onNse = new Set(hits.filter((h) => h.symbol.endsWith(".NS")).map((h) => baseOf(h.symbol)));
  return hits
    .filter((h) => !(h.symbol.endsWith(".BO") && onNse.has(baseOf(h.symbol))))
    .slice(0, max);
}

export interface SearchDeps {
  yahooSearch?: YahooSearchFn;
  fetch?: typeof fetch;
}

export function createStockSearch(deps: SearchDeps = {}) {
  const doFetch = deps.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));

  async function raw(query: string): Promise<SearchHit[]> {
    const signal =
      typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) : undefined;
    const r = await doFetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}` +
        `&quotesCount=${MAX_HITS}&newsCount=0&listsCount=0`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal },
    );
    if (!r.ok) return [];
    return parseYahooSearch(await r.json());
  }

  return async function searchStocks(query: string): Promise<SearchHit[]> {
    const q = query.trim();
    if (!q) return [];
    if (deps.yahooSearch) {
      try {
        const hits = parseYahooSearch(await deps.yahooSearch(q));
        if (hits.length) return hits;
      } catch {
        // Fall through to the plain endpoint.
      }
    }
    try {
      return await raw(q);
    } catch {
      return [];
    }
  };
}
