import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PriceAlert } from "@/lib/priceAlerts";

const toast = vi.fn();
vi.mock("sonner", () => ({ toast: (...a: unknown[]) => toast(...a) }));

let canAccess = true;
vi.mock("@/contexts/AccessContext", () => ({ useAccess: () => ({ canAccess: () => canAccess }) }));

let alerts: PriceAlert[] = [];
let prices: Record<string, number | null> | undefined;
const markFired = vi.fn();
const useAlertPrices = vi.fn((_symbols: string[], _enabled?: boolean) => ({ data: prices }));
vi.mock("@/hooks/usePriceAlerts", () => ({
  usePriceAlerts: () => ({ alerts, markFired }),
  useAlertPrices: (s: string[], e?: boolean) => useAlertPrices(s, e),
}));

import { PriceAlertWatcher } from "./PriceAlertWatcher";

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

const mount = () =>
  render(
    <MemoryRouter>
      <PriceAlertWatcher />
    </MemoryRouter>,
  );

describe("PriceAlertWatcher", () => {
  beforeEach(() => {
    toast.mockReset();
    markFired.mockReset();
    useAlertPrices.mockClear();
    canAccess = true;
    alerts = [itc];
    prices = undefined;
  });

  it("asks for prices of active alerts only", () => {
    alerts = [itc, { ...itc, id: "a2", symbol: "AAPL", triggeredAt: "2026-10-28T10:00:00.000Z" }];
    mount();
    expect(useAlertPrices).toHaveBeenLastCalledWith(["ITC.NS"], true);
  });

  it("fires once when the price reaches the target, and records it", () => {
    prices = { "yahoo:ITC.NS": 259.5 };
    const view = mount();
    expect(markFired).toHaveBeenCalledTimes(1);
    expect(markFired.mock.calls[0][0][0]).toMatchObject({ id: "a1", triggeredPrice: 259.5 });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toBe("Price alert: ITC Limited");

    // Same prices again before the "triggered" write lands: no second toast.
    view.rerender(
      <MemoryRouter>
        <PriceAlertWatcher />
      </MemoryRouter>,
    );
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("stays quiet while the price is above a buy level", () => {
    prices = { "yahoo:ITC.NS": 265 };
    mount();
    expect(markFired).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("does nothing for someone without the Investments menu", () => {
    canAccess = false;
    prices = { "yahoo:ITC.NS": 200 };
    mount();
    expect(useAlertPrices).toHaveBeenLastCalledWith([], false);
    expect(toast).not.toHaveBeenCalled();
  });
});
