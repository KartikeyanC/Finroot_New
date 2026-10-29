import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useState } from "react";

const add = vi.fn((_d: unknown) => null as string | null);
vi.mock("@/hooks/usePriceAlerts", () => ({
  usePriceAlerts: () => ({ add }),
  useAlertPrices: () => ({ data: { "yahoo:ITC.NS": 265 } }),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { StockPriceAlertField } from "./StockPriceAlertField";
import { useStockAlertSaver } from "@/hooks/useStockAlertSaver";
import { alertSymbolFor, EMPTY_STOCK_ALERT, type StockAlertDraft } from "@/lib/stockAlertDraft";

function Host({ ticker }: { ticker: string }) {
  const [v, setV] = useState<StockAlertDraft>(EMPTY_STOCK_ALERT);
  return <StockPriceAlertField ticker={ticker} value={v} onChange={setV} />;
}

describe("StockPriceAlertField", () => {
  beforeEach(() => {
    add.mockReset();
    add.mockReturnValue(null);
    toast.success.mockReset();
    toast.error.mockReset();
  });

  it("maps the holding's ticker to the symbol the alert watches", () => {
    expect(alertSymbolFor("ITC.NS")).toBe("ITC.NS");
    expect(alertSymbolFor("NSE:RELIANCE")).toBe("RELIANCE.NS");
    expect(alertSymbolFor("aapl")).toBe("AAPL");
    expect(alertSymbolFor("")).toBe("");
  });

  it("is off until switched on, then asks for a side and a price", () => {
    render(<Host ticker="ITC.NS" />);
    expect(screen.queryByLabelText(/^Price/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: /set a price alert/i }));
    expect(screen.getByLabelText(/^Price/)).toBeInTheDocument();
    expect(screen.getByText(/ITC\.NS is at ₹265 now/)).toBeInTheDocument();
  });

  it("asks for the stock first when no ticker is chosen", () => {
    render(<Host ticker="" />);
    fireEvent.click(screen.getByRole("switch", { name: /set a price alert/i }));
    expect(screen.getByText("Pick the stock above first.")).toBeInTheDocument();
  });

  it("the saver creates the alert when switched on, and does nothing when off", () => {
    const { result } = renderHook(() => useStockAlertSaver());
    result.current(EMPTY_STOCK_ALERT, "ITC.NS", "ITC Limited");
    expect(add).not.toHaveBeenCalled();

    result.current({ enabled: true, direction: "below", target: "250" }, "NSE:ITC", "ITC Limited");
    expect(add).toHaveBeenCalledWith({ symbol: "ITC.NS", name: "ITC Limited", target: "250", direction: "below" });
    expect(toast.success).toHaveBeenCalledWith("Price alert set", {
      description: "ITC Limited falls to ₹250 or below",
    });
  });

  it("the saver says why when an alert is refused", () => {
    add.mockReturnValue("Enter the price you want to be alerted at.");
    const { result } = renderHook(() => useStockAlertSaver());
    result.current({ enabled: true, direction: "below", target: "" }, "ITC.NS", "");
    expect(toast.error).toHaveBeenCalledWith("Price alert not set", {
      description: "Enter the price you want to be alerted at.",
    });
  });
});
