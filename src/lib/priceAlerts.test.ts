import { describe, expect, it } from "vitest";
import {
  activeSymbols,
  currencySymbol,
  describeAlert,
  distanceToTarget,
  evaluateAlerts,
  firedMessage,
  formatPrice,
  isHit,
  MAX_ALERTS,
  newAlert,
  parseStoredAlerts,
  rearm,
  alertColumnFor,
  validateDraft,
  type PriceAlert,
} from "./priceAlerts";

const NOW = new Date("2026-10-29T06:00:00.000Z");

const alert = (over: Partial<PriceAlert> = {}): PriceAlert => ({
  id: "a1",
  symbol: "ITC.NS",
  name: "ITC Limited",
  target: 260,
  direction: "below",
  createdAt: "2026-10-28T00:00:00.000Z",
  triggeredAt: null,
  triggeredPrice: null,
  ...over,
});

describe("isHit", () => {
  it("a buy level fires at or below the target, never above it", () => {
    expect(isHit(alert(), 265)).toBe(false);
    expect(isHit(alert(), 260)).toBe(true);
    expect(isHit(alert(), 259.8)).toBe(true);
  });

  it("an upper level fires at or above the target", () => {
    const up = alert({ direction: "above", target: 300 });
    expect(isHit(up, 299.99)).toBe(false);
    expect(isHit(up, 300)).toBe(true);
  });

  it("a missing or broken price is never a hit", () => {
    expect(isHit(alert(), 0)).toBe(false);
    expect(isHit(alert(), Number.NaN)).toBe(false);
    expect(isHit(alert(), -5)).toBe(false);
  });
});

describe("evaluateAlerts", () => {
  it("marks a hit alert triggered with the price and time, and reports it", () => {
    const { next, fired } = evaluateAlerts([alert()], { "yahoo:ITC.NS": 259.8 }, NOW);
    expect(fired).toHaveLength(1);
    expect(next[0]).toMatchObject({ triggeredAt: NOW.toISOString(), triggeredPrice: 259.8 });
  });

  it("fires once: a triggered alert is left alone on the next round", () => {
    const first = evaluateAlerts([alert()], { "yahoo:ITC.NS": 259 }, NOW).next;
    const second = evaluateAlerts(first, { "yahoo:ITC.NS": 250 }, new Date(NOW.getTime() + 60_000));
    expect(second.fired).toEqual([]);
    expect(second.next[0].triggeredPrice).toBe(259);
  });

  it("does nothing when the price did not reach the target or was not fetched", () => {
    const alerts = [alert(), alert({ id: "a2", symbol: "AAPL", name: "Apple", target: 200 })];
    const { next, fired } = evaluateAlerts(alerts, { "yahoo:ITC.NS": 265, "yahoo:AAPL": null }, NOW);
    expect(fired).toEqual([]);
    expect(next).toEqual(alerts);
  });
});

describe("activeSymbols", () => {
  it("prices only alerts still watching, each symbol once", () => {
    const alerts = [
      alert(),
      alert({ id: "a2", target: 240 }),
      alert({ id: "a3", symbol: "AAPL", triggeredAt: NOW.toISOString() }),
    ];
    expect(activeSymbols(alerts)).toEqual(["ITC.NS"]);
  });
});

describe("validateDraft", () => {
  it("accepts a stock, a price and a side", () => {
    expect(validateDraft({ symbol: "itc.ns", target: "260", direction: "below" })).toBeNull();
    expect(validateDraft({ symbol: "AAPL", target: 180.5, direction: "above" })).toBeNull();
  });

  it("explains what is missing", () => {
    expect(validateDraft({ symbol: "", target: "260", direction: "below" })).toMatch(/Pick a stock/);
    expect(validateDraft({ symbol: "tata motors!", target: "260", direction: "below" })).toMatch(/ticker/);
    expect(validateDraft({ symbol: "ITC.NS", target: "", direction: "below" })).toMatch(/price/);
    expect(validateDraft({ symbol: "ITC.NS", target: "-3", direction: "below" })).toMatch(/price/);
  });

  it("refuses an exact duplicate of an alert that is still watching", () => {
    expect(validateDraft({ symbol: "ITC.NS", target: 260, direction: "below" }, [alert()])).toMatch(/already/);
    const fired = alert({ triggeredAt: NOW.toISOString() });
    expect(validateDraft({ symbol: "ITC.NS", target: 260, direction: "below" }, [fired])).toBeNull();
  });

  it("caps how many prices are watched at once", () => {
    const many = Array.from({ length: MAX_ALERTS }, (_, i) => alert({ id: `x${i}`, target: 100 + i }));
    expect(validateDraft({ symbol: "AAPL", target: 1, direction: "below" }, many)).toMatch(/up to/);
  });
});

describe("newAlert and rearm", () => {
  it("normalises the symbol and starts watching", () => {
    expect(newAlert({ symbol: " itc.ns ", target: "260.5", direction: "below" }, "id1", NOW)).toEqual({
      id: "id1",
      symbol: "ITC.NS",
      name: "ITC.NS",
      target: 260.5,
      direction: "below",
      createdAt: NOW.toISOString(),
      triggeredAt: null,
      triggeredPrice: null,
    });
  });

  it("re-arming keeps the target and clears the last trigger", () => {
    const back = rearm(alert({ triggeredAt: NOW.toISOString(), triggeredPrice: 259 }));
    expect(back).toMatchObject({ target: 260, triggeredAt: null, triggeredPrice: null });
  });
});

describe("display helpers", () => {
  it("shows rupees for Indian listings and dollars for bare US tickers", () => {
    expect(currencySymbol("ITC.NS")).toBe("₹");
    expect(currencySymbol("500325.BO")).toBe("₹");
    expect(currencySymbol("AAPL")).toBe("$");
    expect(currencySymbol("HSBA.L")).toBe("");
    expect(formatPrice("RELIANCE.NS", 1174.5)).toBe("₹1,174.5");
  });

  it("measures how far the price still has to move", () => {
    expect(distanceToTarget(alert(), 265)).toBeCloseTo(1.887, 2);
    expect(distanceToTarget(alert(), 255)).toBeLessThan(0);
    expect(distanceToTarget(alert({ direction: "above", target: 300 }), 250)).toBeCloseTo(20, 5);
  });

  it("describes the alert and the moment it fired in plain words", () => {
    expect(describeAlert(alert())).toBe("ITC Limited falls to ₹260 or below");
    const fired = alert({ triggeredAt: NOW.toISOString(), triggeredPrice: 259.8 });
    expect(firedMessage(fired)).toEqual({
      title: "Price alert: ITC Limited",
      body: "ITC.NS is at ₹259.8, at or below your ₹260 buy price.",
    });
  });
});

describe("parseStoredAlerts", () => {
  it("keeps good rows and drops broken ones instead of crashing", () => {
    const raw = [
      alert(),
      { id: "bad1", symbol: "X", target: "nope", direction: "below" },
      { id: "bad2", symbol: "X", target: 5, direction: "sideways" },
      { symbol: "NOID", target: 5, direction: "below" },
      { id: "ok2", symbol: "aapl", target: "190", direction: "above" },
      null,
    ];
    const parsed = parseStoredAlerts(raw);
    expect(parsed.map((a) => a.id)).toEqual(["a1", "ok2"]);
    expect(parsed[1]).toMatchObject({ symbol: "AAPL", name: "AAPL", target: 190, triggeredAt: null });
  });

  it("reads a non-array as no alerts", () => {
    expect(parseStoredAlerts({})).toEqual([]);
    expect(parseStoredAlerts(null)).toEqual([]);
  });
});

describe("alertColumnFor", () => {
  it("shows the buy level nearest to firing, and how many more there are", () => {
    const col = alertColumnFor("ITC.NS", [alert({ target: 240 }), alert({ id: "a2", target: 255 })]);
    expect(col).toEqual({ text: "↓ ₹255", detail: "ITC Limited falls to ₹255 or below", triggered: false, more: 1 });
  });

  it("shows an upper target with an up arrow", () => {
    expect(alertColumnFor("ITC.NS", [alert({ direction: "above", target: 300 })])?.text).toBe("↑ ₹300");
  });

  it("shows the latest trigger once every alert has fired", () => {
    const col = alertColumnFor("ITC.NS", [
      alert({ triggeredAt: "2026-10-28T06:00:00.000Z", triggeredPrice: 259 }),
      alert({ id: "a2", triggeredAt: "2026-10-29T06:00:00.000Z", triggeredPrice: 257.5 }),
    ]);
    expect(col).toMatchObject({ text: "Hit ₹257.5", triggered: true });
  });

  it("is empty for a stock with no alerts", () => {
    expect(alertColumnFor("AAPL", [alert()])).toBeNull();
  });
});
