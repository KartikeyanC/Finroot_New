import { describe, expect, it, vi } from "vitest";
import { createStockSearch, parseYahooSearch, withIndianSuffix } from "./search";

// Shaped like yahoo-finance2's search() result (values illustrative): the
// fields the parser reads, plus a news-style row it must skip.
const ITC_SEARCH = {
  count: 6,
  quotes: [
    { exchange: "NSI", shortname: "ITC LTD", quoteType: "EQUITY", symbol: "ITC.NS", longname: "ITC Limited", exchDisp: "NSE", isYahooFinance: true },
    { exchange: "NSI", shortname: "ITC HOTELS LTD", quoteType: "EQUITY", symbol: "ITCHOTELS.NS", longname: "ITC Hotels Limited", exchDisp: "NSE", isYahooFinance: true },
    { exchange: "BSE", shortname: "ITC LTD.", quoteType: "EQUITY", symbol: "ITC.BO", longname: "ITC Limited", exchDisp: "Bombay", isYahooFinance: true },
    { exchange: "BSE", shortname: "ITC HOTELS LTD", quoteType: "EQUITY", symbol: "ITCHOTELS.BO", longname: "ITC Hotels Limited", exchDisp: "Bombay", isYahooFinance: true },
    { exchange: "BSE", shortname: "SOME BSE ONLY", quoteType: "EQUITY", symbol: "543210.BO", exchDisp: "Bombay", isYahooFinance: true },
    { index: "urn:x", name: "ITC news", permalink: "itc", isYahooFinance: false },
  ],
  news: [],
};

const APPLE_SEARCH = {
  quotes: [
    { exchange: "NMS", shortname: "Apple Inc.", quoteType: "EQUITY", symbol: "AAPL", longname: "Apple Inc.", exchDisp: "NASDAQ", isYahooFinance: true },
    { exchange: "NEO", shortname: "APPLE CDR", quoteType: "EQUITY", symbol: "AAPL.NE", exchDisp: "NEO", isYahooFinance: true },
  ],
};

describe("withIndianSuffix", () => {
  it("gives an NSE listing .NS and leaves everything else alone", () => {
    expect(withIndianSuffix("RELIANCE", "NSI")).toBe("RELIANCE.NS");
    expect(withIndianSuffix("reliance.ns", "NSI")).toBe("RELIANCE.NS");
    expect(withIndianSuffix("ITC.BO", "BSE")).toBe("ITC.BO");
    expect(withIndianSuffix("AAPL", "NMS")).toBe("AAPL");
  });
});

describe("parseYahooSearch", () => {
  it("keeps NSE listings, drops their BSE twins, and keeps BSE-only companies", () => {
    expect(parseYahooSearch(ITC_SEARCH).map((h) => h.symbol)).toEqual([
      "ITC.NS",
      "ITCHOTELS.NS",
      "543210.BO",
    ]);
  });

  it("returns the name, exchange and type the client filters on", () => {
    expect(parseYahooSearch(ITC_SEARCH)[0]).toEqual({
      symbol: "ITC.NS",
      name: "ITC Limited",
      exchange: "NSE",
      type: "EQUITY",
    });
    expect(parseYahooSearch(ITC_SEARCH)[2].name).toBe("SOME BSE ONLY");
  });

  it("keeps US tickers bare", () => {
    expect(parseYahooSearch(APPLE_SEARCH).map((h) => h.symbol)).toEqual(["AAPL", "AAPL.NE"]);
  });

  it("appends .NS when Yahoo sends an NSE row without it", () => {
    const raw = { quotes: [{ exchange: "NSI", symbol: "RELIANCE", longname: "Reliance Industries Limited" }] };
    expect(parseYahooSearch(raw)[0].symbol).toBe("RELIANCE.NS");
  });

  it("caps the list and survives junk", () => {
    const many = {
      quotes: Array.from({ length: 30 }, (_, i) => ({ symbol: `S${i}`, shortname: `Co ${i}`, exchange: "NMS" })),
    };
    expect(parseYahooSearch(many)).toHaveLength(10);
    expect(parseYahooSearch(null)).toEqual([]);
    expect(parseYahooSearch({ quotes: "nope" })).toEqual([]);
  });
});

const jsonResponse = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("createStockSearch", () => {
  it("uses yahoo-finance2's search first", async () => {
    const yahooSearch = vi.fn(async () => ITC_SEARCH);
    const fetchMock = vi.fn<typeof fetch>();
    const search = createStockSearch({ yahooSearch, fetch: fetchMock });

    expect((await search(" itc ")).map((h) => h.symbol)[0]).toBe("ITC.NS");
    expect(yahooSearch).toHaveBeenCalledWith("itc");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the plain search endpoint when the library fails", async () => {
    const yahooSearch = vi.fn(async () => {
      throw new Error("Invalid Crumb");
    });
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(APPLE_SEARCH));
    const search = createStockSearch({ yahooSearch, fetch: fetchMock });

    expect((await search("apple"))[0]).toMatchObject({ symbol: "AAPL", exchange: "NASDAQ" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/v1/finance/search?q=apple");
  });

  it("answers an empty list, never an error, when both paths fail", async () => {
    const search = createStockSearch({
      yahooSearch: async () => {
        throw new Error("down");
      },
      fetch: vi.fn<typeof fetch>(async () => jsonResponse({}, 429)),
    });
    await expect(search("itc")).resolves.toEqual([]);
  });
});
