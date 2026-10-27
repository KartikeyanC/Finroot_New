import { describe, expect, it } from "vitest";

import {
  isShareFresh, ledgerCategory, parseAmount, parseSharedPayment, SHARE_TTL_MS, suggestExpenseCategory,
} from "./sharedPayment";

describe("parseAmount", () => {
  it.each([
    ["Paid ₹450 to Swiggy", 450],
    ["₹ 1,250.50 sent", 1250.5],
    ["Rs. 99 debited", 99],
    ["Rs99", 99],
    ["INR 2,000 credited", 2000],
    ["you paid 450 rupees", 450],
  ])("reads %j as %d", (text, n) => expect(parseAmount(text)).toBe(n));

  it("needs a currency marker — a UPI reference number is not an amount", () => {
    expect(parseAmount("UPI Ref 412398712345 at 10:42")).toBeNull();
    expect(parseAmount("Call 9876543210")).toBeNull();
  });

  it("ignores zero and absurd values", () => {
    expect(parseAmount("₹0")).toBeNull();
  });

  it("takes the amount, not the reference number that follows it", () => {
    expect(parseAmount("Paid ₹450 · Ref 412398712345")).toBe(450);
  });
});

describe("parseSharedPayment", () => {
  it("reads an expense and its merchant", () => {
    expect(parseSharedPayment("Paid ₹450 to Swiggy on 12 Mar via UPI")).toEqual({
      amount: 450, direction: "expense", merchant: "Swiggy",
    });
  });

  it("reads money received as income, and who it came from", () => {
    expect(parseSharedPayment("You received ₹2,000 from Ravi Kumar")).toEqual({
      amount: 2000, direction: "income", merchant: "Ravi Kumar",
    });
  });

  it("joins title and text, and copes with nothing useful at all", () => {
    expect(parseSharedPayment("Payment successful", "₹120 paid to Cafe Roots").amount).toBe(120);
    expect(parseSharedPayment(null, undefined, "")).toEqual({ amount: null, direction: "expense", merchant: null });
  });
});

describe("suggestExpenseCategory", () => {
  it.each([
    ["Swiggy", "Food & Dining"],
    ["Uber India", "Transport"],
    ["Amazon Pay", "Shopping"],
    ["Apollo Pharmacy", "Healthcare"],
    ["Netflix", "Subscriptions"],
    ["BESCOM electricity", "Utilities"],
    ["Airtel recharge", "Utilities"],
    ["BookMyShow", "Entertainment"],
    ["MakeMyTrip", "Travel"],
  ])("%s → %s", (hint, cat) => expect(suggestExpenseCategory(hint)).toBe(cat));

  it("falls back to Other rather than guessing", () => {
    expect(suggestExpenseCategory("Ramesh Stores & Co")).not.toBe("Healthcare");
    expect(suggestExpenseCategory("Xyzzy")).toBe("Other");
    expect(suggestExpenseCategory(null, undefined)).toBe("Other");
  });
});

describe("ledgerCategory", () => {
  it("keeps a category the ledger has, maps the scanner's extra one, re-guesses the rest", () => {
    expect(ledgerCategory("Food & Dining")).toBe("Food & Dining");
    expect(ledgerCategory("Travel & Transport")).toBe("Transport");
    expect(ledgerCategory("Groceries", "Swiggy")).toBe("Food & Dining");
    expect(ledgerCategory(undefined, "")).toBe("Other");
  });
});

describe("isShareFresh", () => {
  const now = 1_000_000_000_000;
  it("accepts a recent share and drops a stale or future-dated one", () => {
    expect(isShareFresh(now - 5_000, now)).toBe(true);
    expect(isShareFresh(now - SHARE_TTL_MS - 1, now)).toBe(false);
    expect(isShareFresh(now + 60_000, now)).toBe(false);
    expect(isShareFresh(Number.NaN, now)).toBe(false);
  });
});
