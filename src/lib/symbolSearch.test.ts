import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  DEBOUNCE_MS,
  MAX_RESULTS,
  searchSymbols,
  toHit,
  useSymbolSearch,
  yahooToTicker,
} from "./symbolSearch";
import { resolveSymbol } from "./livePrices";
import type { InvestmentRecord } from "./investmentsStore";

const stock = (ticker: string): InvestmentRecord =>
  ({ id: "r1", asset: "stocks", fields: { ticker } }) as unknown as InvestmentRecord;

describe("yahooToTicker", () => {
  it("turns a Yahoo suffix into the prefix the dialog asks for", () => {
    expect(yahooToTicker("RELIANCE.NS")).toBe("NSE:RELIANCE");
    expect(yahooToTicker("500325.BO")).toBe("BOM:500325");
    expect(yahooToTicker("HSBA.L")).toBe("LSE:HSBA");
    expect(yahooToTicker("SHOP.TO")).toBe("TSX:SHOP");
  });

  it("names the US venue from Yahoo's exchange code, since those carry no suffix", () => {
    expect(yahooToTicker("AAPL", "NMS")).toBe("NASDAQ:AAPL");
    expect(yahooToTicker("IBM", "NYQ")).toBe("NYSE:IBM");
    expect(yahooToTicker("SPY", "ASE")).toBe("AMEX:SPY");
  });

  it("keeps a symbol it has no prefix for, which resolveSymbol passes through", () => {
    expect(yahooToTicker("SAP.DE")).toBe("SAP.DE");
    expect(yahooToTicker("BTC-USD")).toBe("BTC-USD");
    expect(yahooToTicker("ABC")).toBe("ABC");
  });

  // The whole point: whatever the picker writes must come back out of
  // resolveSymbol as the symbol Yahoo priced it under.
  it.each([
    ["RELIANCE.NS", "NSI"],
    ["500325.BO", "BSE"],
    ["AAPL", "NMS"],
    ["IBM", "NYQ"],
    ["HSBA.L", "LSE"],
    ["0005.HK", "HKG"],
    ["SAP.DE", "GER"],
  ])("round-trips %s through resolveSymbol", (symbol, exchange) => {
    const ticker = yahooToTicker(symbol, exchange);
    expect(resolveSymbol(stock(ticker))).toEqual({ provider: "yahoo", symbol });
  });
});

describe("toHit", () => {
  it("keeps shares and ETFs for a stocks holding, nothing else", () => {
    expect(toHit("yahoo", { symbol: "INFY.NS", name: "Infosys", exchange: "NSE", type: "EQUITY" }))
      .toEqual({ ticker: "NSE:INFY", name: "Infosys", exchange: "NSE" });
    expect(toHit("yahoo", { symbol: "NIFTYBEES.NS", name: "Nippon Nifty", type: "ETF" })?.ticker)
      .toBe("NSE:NIFTYBEES");
    expect(toHit("yahoo", { symbol: "BTC-USD", name: "Bitcoin", type: "CRYPTOCURRENCY" })).toBeNull();
    expect(toHit("yahoo", { symbol: "0P0000XYZ.BO", name: "Some Fund", type: "MUTUALFUND" })).toBeNull();
  });

  it("accepts only a numeric scheme code for a fund, as resolveSymbol does", () => {
    expect(toHit("mf", { symbol: "122639", name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth" }))
      .toEqual({ ticker: "122639", name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth", exchange: "" });
    expect(toHit("mf", { symbol: "PPFCF", name: "Parag Parikh" })).toBeNull();
    expect(toHit("mf", { symbol: "", name: "Nameless" })).toBeNull();
  });
});

describe("searchSymbols", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "anon-key");
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("asks the live-price function with a search body and maps the answer", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { symbol: "RELIANCE.NS", name: "Reliance Industries Limited", exchange: "NSE", type: "EQUITY" },
          { symbol: "RELIANCE-USD", name: "Reliance Coin", type: "CRYPTOCURRENCY" },
        ],
      }),
    });
    const hits = await searchSymbols("yahoo", "reliance");
    expect(hits).toEqual([{ ticker: "NSE:RELIANCE", name: "Reliance Industries Limited", exchange: "NSE" }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.supabase.co/functions/v1/live-price");
    expect(init.headers.apikey).toBe("anon-key");
    expect(JSON.parse(init.body)).toEqual({ search: { provider: "yahoo", q: "reliance" } });
  });

  it("caps the list and never throws: an error is an empty list", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: Array.from({ length: 20 }, (_, i) => ({ symbol: `${100000 + i}`, name: `Fund ${i}` })),
      }),
    });
    expect(await searchSymbols("mf", "fund")).toHaveLength(MAX_RESULTS);

    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    expect(await searchSymbols("mf", "fund")).toEqual([]);

    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await searchSymbols("mf", "fund")).toEqual([]);
  });

  it("does not call out for a query shorter than MIN_QUERY", async () => {
    expect(await searchSymbols("yahoo", "r")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("useSymbolSearch", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "anon-key");
  });
  afterEach(() => {
    vi.useRealTimers();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("waits for a pause in typing, then searches the latest text once", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ symbol: "122639", name: "Parag Parikh Flexi Cap" }] }),
    });
    const { result, rerender } = renderHook(({ q }) => useSymbolSearch("mf", q), {
      initialProps: { q: "pa" },
    });
    rerender({ q: "par" });
    rerender({ q: "parag" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.searching).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS);
    });
    vi.useRealTimers();
    await waitFor(() => expect(result.current.hits).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).search.q).toBe("parag");
    expect(result.current.searching).toBe(false);
  });

  it("clears the list when the text drops below MIN_QUERY", () => {
    const { result, rerender } = renderHook(({ q }) => useSymbolSearch("yahoo", q), {
      initialProps: { q: "" },
    });
    rerender({ q: "r" });
    expect(result.current.hits).toEqual([]);
    expect(result.current.searching).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
