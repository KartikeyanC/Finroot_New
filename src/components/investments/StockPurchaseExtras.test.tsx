import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { InvestmentRecord } from "@/lib/investmentsStore";

const held = [
  { id: "a", asset: "stocks", currency: "INR", fields: { name: "ITC", ticker: "ITC.NS", buy: "200", qty: "2", buy_date: "2026-10-28" }, derived: { total: 400 }, savedAt: "2026-10-28T00:00:00Z" },
  { id: "b", asset: "stocks", currency: "INR", fields: { name: "ITC", ticker: "ITC.NS", buy: "220", qty: "2", buy_date: "2026-10-29" }, derived: { total: 440 }, savedAt: "2026-10-29T00:00:00Z" },
] as unknown as InvestmentRecord[];

vi.mock("@/lib/investmentsStore", async (orig) => ({
  ...(await orig<typeof import("@/lib/investmentsStore")>()),
  useInvestments: () => ({ records: held }),
}));

import { StockPurchaseExtras } from "./StockPurchaseExtras";

describe("StockPurchaseExtras", () => {
  it("says the stock is already held and what the average becomes", () => {
    render(<StockPurchaseExtras form={{ ticker: "ITC.NS", qty: "2", buy: "260" }} set={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("You already hold ITC: 4 shares at an average of ₹210");
    expect(screen.getByRole("status")).toHaveTextContent("6 shares at an average of ₹226.67 after this buy");
  });

  it("stays quiet for a stock not held yet, and when editing a purchase", () => {
    const { rerender } = render(<StockPurchaseExtras form={{ ticker: "INFY.NS" }} set={vi.fn()} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<StockPurchaseExtras form={{ ticker: "ITC.NS" }} set={vi.fn()} editingId="b" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("records the purchase date", () => {
    const set = vi.fn();
    render(<StockPurchaseExtras form={{ ticker: "ITC.NS", buy_date: "2026-10-20" }} set={set} />);
    const date = screen.getByLabelText("Purchase date");
    expect(date).toHaveValue("2026-10-20");
    fireEvent.change(date, { target: { value: "2026-10-21" } });
    expect(set).toHaveBeenCalledWith("buy_date", "2026-10-21");
  });
});
