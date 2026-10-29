import { describe, expect, it } from "vitest";
import type { InvestmentRecord } from "./investmentsStore";
import { existingHolding, groupCurrent, groupPortfolio, lotKey, toLot } from "./stockLots";

const stock = (id: string, f: Record<string, string>, over: Partial<InvestmentRecord> = {}): InvestmentRecord =>
  ({
    id,
    asset: "stocks",
    currency: "INR",
    broker: "Zerodha",
    fields: f,
    derived: { total: parseFloat(f.buy ?? "0") * parseFloat(f.qty ?? "0") },
    savedAt: "2026-10-01T10:00:00.000Z",
    ...over,
  }) as unknown as InvestmentRecord;

// The user's example: ITC bought today at 200 x 2, tomorrow at 220 x 2.
const day1 = stock("a", { name: "ITC", ticker: "ITC.NS", buy: "200", qty: "2", buy_date: "2026-10-28" });
const day2 = stock("b", { name: "ITC", ticker: "NSE:ITC", buy: "220", qty: "2", buy_date: "2026-10-29" });

describe("lotKey", () => {
  it("treats NSE:ITC and ITC.NS as the same stock", () => {
    expect(lotKey(day1)).toBe("ITC.NS|INR");
    expect(lotKey(day2)).toBe("ITC.NS|INR");
  });

  it("falls back to the name when there is no ticker, and never merges other assets", () => {
    expect(lotKey(stock("c", { name: "itc" }))).toBe("ITC|INR");
    expect(lotKey({ ...day1, asset: "mutual_funds" } as InvestmentRecord)).toBeNull();
  });
});

describe("groupPortfolio", () => {
  it("merges two buys of ITC into one holding with the weighted average", () => {
    const items = groupPortfolio([day2, day1]);
    expect(items).toHaveLength(1);
    const g = items[0].kind === "group" ? items[0].group : null;
    expect(g).toMatchObject({ name: "ITC", qty: 4, invested: 840, avgPrice: 210 });
    expect(g!.lots.map((l) => [l.date, l.qty, l.price])).toEqual([
      ["2026-10-28", 2, 200],
      ["2026-10-29", 2, 220],
    ]);
  });

  it("keeps a stock bought once, and every other asset, as a single row in place", () => {
    const infy = stock("i", { name: "Infosys", ticker: "INFY.NS", buy: "1500", qty: "1" });
    const fd = { id: "f", asset: "fd", currency: "INR", fields: {}, derived: {}, savedAt: "" } as unknown as InvestmentRecord;
    const items = groupPortfolio([infy, day2, fd, day1]);
    expect(items.map((i) => (i.kind === "group" ? `group:${i.group.key}` : i.record.id))).toEqual([
      "i",
      "group:ITC.NS|INR",
      "f",
    ]);
  });

  it("does not merge the same ticker held in different currencies", () => {
    const usd = stock("u", { name: "ITC", ticker: "ITC.NS", buy: "3", qty: "1" }, { currency: "USD" } as Partial<InvestmentRecord>);
    expect(groupPortfolio([day1, usd]).every((i) => i.kind === "single")).toBe(true);
  });
});

describe("lots", () => {
  it("uses the saved day when a purchase has no date yet", () => {
    expect(toLot(stock("o", { name: "ITC", buy: "1", qty: "1" })).date).toBe("2026-10-01");
  });

  it("values the holding from each purchase's live value when priced", () => {
    const g = groupPortfolio([day1, day2])[0];
    if (g.kind !== "group") throw new Error("expected a group");
    expect(groupCurrent(g.group, () => 530)).toBe(1060);
    expect(groupCurrent(g.group, () => undefined)).toBe(840);
  });
});

describe("existingHolding", () => {
  it("finds what a new purchase would join", () => {
    const held = existingHolding([day1, day2], { ticker: "ITC.NS", name: "ITC" });
    expect(held).toMatchObject({ qty: 4, avgPrice: 210 });
  });

  it("ignores the record being edited, an empty ticker and other stocks", () => {
    expect(existingHolding([day1], { ticker: "ITC.NS" }, "a")).toBeNull();
    expect(existingHolding([day1], { ticker: "" })).toBeNull();
    expect(existingHolding([day1], { ticker: "INFY.NS" })).toBeNull();
  });
});
