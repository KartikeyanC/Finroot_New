import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createQuoteClient,
  parseAmfi,
  parseYahooChart,
  parseYahooQuote,
  QUOTE_TTL_MS,
  quoteKey,
} from "./quotes";

// Shaped like the real responses (values illustrative): the fields the
// parsers read, plus a few they must ignore.
const YAHOO_QUOTE_RELIANCE = {
  symbol: "RELIANCE.NS",
  quoteType: "EQUITY",
  currency: "INR",
  regularMarketPrice: 1412.6,
  regularMarketTime: new Date("2026-10-28T10:00:02.000Z"),
  fullExchangeName: "NSE",
};

/** With validateResult off, times arrive as epoch seconds. */
const YAHOO_QUOTE_AAPL_RAW = {
  symbol: "AAPL",
  currency: "USD",
  regularMarketPrice: 231.4,
  regularMarketTime: 1_761_681_600,
};

const YAHOO_CHART_AAPL = {
  chart: {
    result: [
      {
        meta: {
          currency: "USD",
          symbol: "AAPL",
          regularMarketPrice: 231.4,
          regularMarketTime: 1_761_681_600,
        },
        timestamp: [1_761_681_600],
      },
    ],
    error: null,
  },
};

const AMFI_LATEST = {
  meta: {
    fund_house: "Axis Mutual Fund",
    scheme_type: "Open Ended Schemes",
    scheme_code: 119551,
    scheme_name: "Axis Bluechip Fund - Direct Plan - Growth",
  },
  data: [
    { date: "27-10-2026", nav: "64.31000" },
    { date: "24-10-2026", nav: "63.98000" },
  ],
  status: "SUCCESS",
};

const NOW = Date.parse("2026-10-29T06:00:00.000Z");

describe("parsers", () => {
  it("reads a validated yahoo-finance2 quote", () => {
    expect(parseYahooQuote(YAHOO_QUOTE_RELIANCE, NOW)).toEqual({
      price: 1412.6,
      currency: "INR",
      asOf: "2026-10-28T10:00:02.000Z",
      source: "yahoo",
    });
  });

  it("reads an unvalidated quote whose time is epoch seconds", () => {
    expect(parseYahooQuote(YAHOO_QUOTE_AAPL_RAW, NOW)).toEqual({
      price: 231.4,
      currency: "USD",
      asOf: new Date(1_761_681_600_000).toISOString(),
      source: "yahoo",
    });
  });

  it("falls back to now when Yahoo sends no time", () => {
    const q = parseYahooQuote({ regularMarketPrice: 10, currency: "usd" }, NOW);
    expect(q).toMatchObject({ currency: "USD", asOf: new Date(NOW).toISOString() });
  });

  it("rejects a quote with no usable price", () => {
    expect(parseYahooQuote(undefined, NOW)).toBeNull();
    expect(parseYahooQuote({ symbol: "XX" }, NOW)).toBeNull();
    expect(parseYahooQuote({ regularMarketPrice: 0 }, NOW)).toBeNull();
    expect(parseYahooQuote({ regularMarketPrice: Number.NaN }, NOW)).toBeNull();
  });

  it("reads the chart endpoint's meta block", () => {
    expect(parseYahooChart(YAHOO_CHART_AAPL, NOW)).toEqual({
      price: 231.4,
      currency: "USD",
      asOf: new Date(1_761_681_600_000).toISOString(),
      source: "yahoo",
    });
    expect(parseYahooChart({ chart: { result: null, error: { code: "Not Found" } } })).toBeNull();
  });

  it("takes the newest AMFI NAV as an INR price with an ISO date", () => {
    expect(parseAmfi(AMFI_LATEST)).toEqual({
      price: 64.31,
      currency: "INR",
      asOf: "2026-10-27",
      source: "amfi",
    });
  });

  it("rejects an AMFI answer for an unknown scheme", () => {
    expect(parseAmfi({ meta: {}, data: [], status: "SUCCESS" })).toBeNull();
    expect(parseAmfi({ data: [{ date: "27-10-2026", nav: "N.A." }] })).toBeNull();
    expect(parseAmfi({ data: [{ date: "2026-10-27", nav: "64.3" }] })).toBeNull();
    expect(parseAmfi(null)).toBeNull();
  });
});

describe("quoteKey", () => {
  it("normalises stock symbols and scopes by kind", () => {
    expect(quoteKey({ kind: "stock", symbol: " reliance.ns " })).toBe("stock:RELIANCE.NS");
    expect(quoteKey({ kind: "mf", schemeCode: "119551" })).toBe("mf:119551");
  });
});

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("createQuoteClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the same record shape for a stock and a fund", async () => {
    const yahooQuote = vi.fn(async () => YAHOO_QUOTE_RELIANCE);
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(AMFI_LATEST));
    const client = createQuoteClient({ yahooQuote, fetch: fetchMock });

    await expect(client.getQuote({ kind: "stock", symbol: "RELIANCE.NS" })).resolves.toMatchObject({
      price: 1412.6,
      currency: "INR",
      source: "yahoo",
    });
    await expect(client.getQuote({ kind: "mf", schemeCode: "119551" })).resolves.toMatchObject({
      price: 64.31,
      currency: "INR",
      source: "amfi",
    });
    expect(yahooQuote).toHaveBeenCalledWith("RELIANCE.NS");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.mfapi.in/mf/119551/latest");
  });

  it("serves a repeat from cache until the 5-minute TTL passes", async () => {
    const yahooQuote = vi.fn(async () => YAHOO_QUOTE_AAPL_RAW);
    const client = createQuoteClient({ yahooQuote, fetch: vi.fn() });
    const ask = () => client.getQuote({ kind: "stock", symbol: "AAPL" });

    await ask();
    vi.advanceTimersByTime(QUOTE_TTL_MS - 1_000);
    await ask();
    expect(yahooQuote).toHaveBeenCalledTimes(1);
    expect(client.peek({ kind: "stock", symbol: "aapl" })?.price).toBe(231.4);

    vi.advanceTimersByTime(2_000);
    expect(client.peek({ kind: "stock", symbol: "AAPL" })).toBeNull();
    await ask();
    expect(yahooQuote).toHaveBeenCalledTimes(2);
  });

  it("folds concurrent asks for one key into one upstream call", async () => {
    let release!: (v: unknown) => void;
    const yahooQuote = vi.fn(() => new Promise((r) => (release = r)));
    const client = createQuoteClient({ yahooQuote, fetch: vi.fn() });

    const asks = Array.from({ length: 10 }, () =>
      client.getQuote({ kind: "stock", symbol: "RELIANCE.NS" }),
    );
    expect(yahooQuote).toHaveBeenCalledTimes(1);

    release(YAHOO_QUOTE_RELIANCE);
    const results = await Promise.all(asks);
    expect(new Set(results.map((q) => q.price))).toEqual(new Set([1412.6]));
    expect(yahooQuote).toHaveBeenCalledTimes(1);
  });

  it("keeps different keys apart", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(AMFI_LATEST));
    const client = createQuoteClient({ fetch: fetchMock });

    await Promise.all([
      client.getQuote({ kind: "mf", schemeCode: "119551" }),
      client.getQuote({ kind: "mf", schemeCode: "120503" }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failure, and the next ask retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse(AMFI_LATEST));
    const client = createQuoteClient({ fetch: fetchMock });
    const ask = () => client.getQuote({ kind: "mf", schemeCode: "119551" });

    await expect(ask()).rejects.toThrow("no quote for mf:119551");
    expect(client.peek({ kind: "mf", schemeCode: "119551" })).toBeNull();

    await expect(ask()).resolves.toMatchObject({ price: 64.31 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares one rejection with every concurrent waiter, then retries", async () => {
    let fail!: (e: unknown) => void;
    const yahooQuote = vi
      .fn()
      .mockImplementationOnce(() => new Promise((_, reject) => (fail = reject)))
      .mockResolvedValueOnce(YAHOO_QUOTE_AAPL_RAW);
    // Chart fallback also fails, so the first round has no price at all.
    const fetchMock = vi.fn(async () => jsonResponse({}, 429));
    const client = createQuoteClient({ yahooQuote, fetch: fetchMock });
    const ask = () => client.getQuote({ kind: "stock", symbol: "AAPL" });

    const a = ask();
    const b = ask();
    fail(new Error("crumb"));
    await expect(a).rejects.toThrow();
    await expect(b).rejects.toThrow();
    expect(yahooQuote).toHaveBeenCalledTimes(1);

    await expect(ask()).resolves.toMatchObject({ price: 231.4 });
    expect(yahooQuote).toHaveBeenCalledTimes(2);
  });

  it("falls back to the chart endpoint when yahoo-finance2 fails", async () => {
    const yahooQuote = vi.fn(async () => {
      throw new Error("Invalid Crumb");
    });
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(YAHOO_CHART_AAPL));
    const client = createQuoteClient({ yahooQuote, fetch: fetchMock });

    await expect(client.getQuote({ kind: "stock", symbol: "AAPL" })).resolves.toMatchObject({
      price: 231.4,
      source: "yahoo",
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/v8/finance/chart/AAPL?");
  });

  it("refuses a non-numeric scheme code without going upstream", async () => {
    const fetchMock = vi.fn();
    const client = createQuoteClient({ fetch: fetchMock });

    await expect(client.getQuote({ kind: "mf", schemeCode: "../search" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
