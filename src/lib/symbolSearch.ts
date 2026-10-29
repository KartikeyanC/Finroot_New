// Search-by-name for the Add Investment dialog.
//
// A holding only gets a live price once it carries a ticker (stocks) or an
// MFAPI scheme code (mutual funds) — see `resolveSymbol` in livePrices.ts —
// and until now the person had to know that code. This asks the same
// `live-price` function to look names up: Yahoo's search for stocks, MFAPI's
// for funds. The browser cannot call either upstream itself (connect-src in
// the CSP allows only Supabase), and routing through the function keeps that
// true.
//
// The pure parts are here and tested; the dropdown is SymbolPicker.tsx.

import { useEffect, useRef, useState } from "react";
import type { Provider } from "./livePrices";

export interface SymbolHit {
  /** What goes in the holding: a Google Finance-style ticker, or a scheme code. */
  ticker: string;
  /** Display name — the fund's full name, or the company's. */
  name: string;
  /** Exchange as shown to people ("NSE", "NASDAQ"); empty for funds. */
  exchange: string;
}

/** What the function returns per hit, before `toHit` makes it a `SymbolHit`. */
export interface RawHit {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}

export const MIN_QUERY = 2;
export const DEBOUNCE_MS = 300;
export const MAX_RESULTS = 8;

/**
 * Yahoo suffix → the prefix the dialog has always asked for. The inverse of
 * `YAHOO_SUFFIX` in livePrices.ts, so a picked ticker resolves back to the
 * very symbol Yahoo returned (`symbolSearch.test.ts` pins the round trip).
 */
const SUFFIX_TO_PREFIX: Record<string, string> = {
  ".NS": "NSE",
  ".BO": "BOM",
  ".L": "LSE",
  ".T": "TSE",
  ".TO": "TSX",
  ".AX": "ASX",
  ".HK": "HKG",
  ".F": "FRA",
  ".PA": "EPA",
};

/** Yahoo's exchange codes for the US venues, which carry no suffix. */
const US_EXCHANGE_PREFIX: Record<string, string> = {
  NMS: "NASDAQ",
  NGM: "NASDAQ",
  NCM: "NASDAQ",
  NAS: "NASDAQ",
  NYQ: "NYSE",
  ASE: "AMEX",
};

/**
 * A Yahoo symbol as the dialog's ticker: `RELIANCE.NS` → `NSE:RELIANCE`,
 * `AAPL` on NMS → `NASDAQ:AAPL`. Anything else is kept as Yahoo spells it,
 * which `resolveSymbol` passes through unchanged.
 */
export function yahooToTicker(symbol: string, exchange?: string): string {
  const sym = symbol.trim().toUpperCase();
  const dot = sym.lastIndexOf(".");
  if (dot > 0) {
    const prefix = SUFFIX_TO_PREFIX[sym.slice(dot)];
    if (prefix) return `${prefix}:${sym.slice(0, dot)}`;
    return sym;
  }
  const us = exchange ? US_EXCHANGE_PREFIX[exchange.toUpperCase()] : undefined;
  return us ? `${us}:${sym}` : sym;
}

/** Only things a "Direct Stocks" holding can be: shares and ETFs. */
export function isStockType(type: string | undefined): boolean {
  return type === undefined || type === "EQUITY" || type === "ETF";
}

export function toHit(provider: Provider, raw: RawHit): SymbolHit | null {
  const symbol = String(raw?.symbol ?? "").trim();
  const name = String(raw?.name ?? "").trim();
  if (!symbol || !name) return null;
  if (provider === "mf") {
    return /^\d{4,}$/.test(symbol) ? { ticker: symbol, name, exchange: "" } : null;
  }
  if (!isStockType(raw.type)) return null;
  const ticker = yahooToTicker(symbol, raw.exchange);
  return { ticker, name, exchange: String(raw.exchange ?? "") };
}

/**
 * Asks the function. Empty on any failure — a search box that errors is
 * worse than one that finds nothing, and typing by hand still works.
 */
export async function searchSymbols(
  provider: Provider,
  query: string,
  signal?: AbortSignal,
): Promise<SymbolHit[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY) return [];
  try {
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-price`,
      {
        method: "POST",
        signal,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ search: { provider, q } }),
      },
    );
    if (!resp.ok) return [];
    const j = await resp.json();
    const results: unknown = j?.results;
    if (!Array.isArray(results)) return [];
    const hits: SymbolHit[] = [];
    for (const raw of results) {
      const hit = toHit(provider, raw as RawHit);
      if (hit) hits.push(hit);
      if (hits.length >= MAX_RESULTS) break;
    }
    return hits;
  } catch {
    return [];
  }
}

/**
 * Debounced search for a text box: results for the latest query, `searching`
 * while a request is in flight. A query that changes mid-flight aborts the
 * old request, so a slow early answer can never overwrite a later one.
 */
export function useSymbolSearch(provider: Provider, query: string) {
  const [hits, setHits] = useState<SymbolHit[]>([]);
  const [searching, setSearching] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const id = ++latest.current;
    if (q.length < MIN_QUERY) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      const found = await searchSymbols(provider, q, ctrl.signal);
      if (id !== latest.current) return;
      setHits(found);
      setSearching(false);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [provider, query]);

  return { hits, searching };
}
