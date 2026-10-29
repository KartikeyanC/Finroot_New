import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { PriceAlert } from "@/lib/priceAlerts";

let alerts: PriceAlert[] = [];
const add = vi.fn((_d: unknown) => null as string | null);
const remove = vi.fn();
const rearm = vi.fn();
vi.mock("@/hooks/usePriceAlerts", () => ({
  usePriceAlerts: () => ({ alerts, add, remove, rearm }),
  useAlertPrices: () => ({ data: { "yahoo:ITC.NS": 265, "yahoo:AAPL": 343.83 }, isFetching: false }),
}));
// The picker searches over the network; a plain input stands in for it here.
vi.mock("@/components/investments/SymbolPicker", () => ({
  SymbolPicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Stock" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import PriceAlertsSection from "./PriceAlertsSection";

const itc: PriceAlert = {
  id: "a1",
  symbol: "ITC.NS",
  name: "ITC Limited",
  target: 260,
  direction: "below",
  createdAt: "2026-10-28T00:00:00.000Z",
  triggeredAt: null,
  triggeredPrice: null,
};

describe("PriceAlertsSection", () => {
  beforeEach(() => {
    alerts = [];
    add.mockReset();
    add.mockReturnValue(null);
    remove.mockReset();
    rearm.mockReset();
  });

  it("explains the idea when there are no alerts", () => {
    render(<PriceAlertsSection />);
    expect(screen.getByRole("heading", { name: /price alerts/i })).toBeInTheDocument();
    expect(screen.getByText(/no alerts yet/i)).toBeInTheDocument();
  });

  it("shows a watching alert with its live price and how far is left", () => {
    alerts = [itc];
    render(<PriceAlertsSection />);
    expect(screen.getByText("ITC Limited falls to ₹260 or below")).toBeInTheDocument();
    expect(screen.getByText("₹265")).toBeInTheDocument();
    expect(screen.getByText("1.9% to go")).toBeInTheDocument();
    expect(screen.getByText("Watching")).toBeInTheDocument();
  });

  it("offers re-arm and delete on a triggered alert", () => {
    alerts = [{ ...itc, triggeredAt: "2026-10-29T06:00:00.000Z", triggeredPrice: 259.8 }];
    render(<PriceAlertsSection />);
    expect(screen.getByText("Triggered")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Watch ITC.NS again" }));
    expect(rearm).toHaveBeenCalledWith("a1");
    fireEvent.click(screen.getByRole("button", { name: "Delete the ITC.NS alert" }));
    expect(remove).toHaveBeenCalledWith("a1");
  });

  it("creates an alert from the dialog, defaulting to a buy level", () => {
    render(<PriceAlertsSection />);
    fireEvent.click(screen.getByRole("button", { name: /new alert/i }));
    fireEvent.change(screen.getByLabelText("Stock"), { target: { value: "itc.ns" } });
    expect(screen.getByText("Now ₹265")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "260" } });
    fireEvent.click(screen.getByRole("button", { name: "Create alert" }));
    expect(add).toHaveBeenCalledWith({ symbol: "ITC.NS", name: "", target: "260", direction: "below" });
  });

  it("keeps the dialog open and says why when the alert is refused", () => {
    add.mockReturnValue("Enter the price you want to be alerted at.");
    render(<PriceAlertsSection />);
    fireEvent.click(screen.getByRole("button", { name: /new alert/i }));
    fireEvent.change(screen.getByLabelText("Stock"), { target: { value: "ITC.NS" } });
    fireEvent.click(screen.getByRole("button", { name: "Create alert" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the price");
    expect(screen.getByRole("button", { name: "Create alert" })).toBeInTheDocument();
  });
});
