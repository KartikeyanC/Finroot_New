import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { InvestmentRecord } from "@/lib/investmentsStore";
import { groupPortfolio, type StockGroup } from "@/lib/stockLots";
import { StockGroupRow } from "./StockGroupRow";

const stock = (id: string, buy: string, qty: string, buy_date: string): InvestmentRecord =>
  ({
    id,
    asset: "stocks",
    currency: "INR",
    broker: "Zerodha",
    fields: { name: "ITC", ticker: "ITC.NS", buy, qty, buy_date },
    derived: { total: parseFloat(buy) * parseFloat(qty) },
    savedAt: "2026-10-29T00:00:00.000Z",
  }) as unknown as InvestmentRecord;

const group = (() => {
  const item = groupPortfolio([stock("a", "200", "2", "2026-10-28"), stock("b", "220", "2", "2026-10-29")])[0];
  return (item as { kind: "group"; group: StockGroup }).group;
})();

const live = {
  a: { unitPrice: 265, prevUnitPrice: 265, currentValue: 530, prevCurrentValue: 530, quantity: 2, updatedAt: 1, direction: "flat" as const },
  b: { unitPrice: 265, prevUnitPrice: 265, currentValue: 530, prevCurrentValue: 530, quantity: 2, updatedAt: 1, direction: "flat" as const },
};

const mount = (props: Partial<Parameters<typeof StockGroupRow>[0]> = {}) =>
  render(
    <ul>
      <StockGroupRow group={group} live={live} onEdit={vi.fn()} onDelete={vi.fn()} {...props} />
    </ul>,
  );

describe("StockGroupRow", () => {
  it("shows one holding: total shares, average price, invested and live value", () => {
    mount();
    expect(screen.getByText("ITC")).toBeInTheDocument();
    expect(screen.getByText("2 purchases")).toBeInTheDocument();
    expect(screen.getByText(/4 shares · average/)).toHaveTextContent("₹210");
    expect(screen.getByText("+26.19% Profit")).toBeInTheDocument();
  });

  it("opens to list each purchase with its date, quantity and price", () => {
    mount();
    expect(screen.queryByText("Bought on")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("28 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("29 Oct 2026")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4); // header, 2 purchases, total
  });

  it("edits or deletes one purchase, deleting only after confirmation", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    mount({ onEdit, onDelete });
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("button", { name: "Edit the 29 Oct 2026 purchase" }));
    expect(onEdit.mock.calls[0][0].id).toBe("b");
    fireEvent.click(screen.getByRole("button", { name: "Delete the 28 Oct 2026 purchase" }));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("a");
  });

  it("Buy more opens a new purchase of the same stock", () => {
    const onBuyMore = vi.fn();
    mount({ onBuyMore });
    fireEvent.click(screen.getByRole("button", { name: /buy more/i }));
    expect(onBuyMore).toHaveBeenCalledWith({ fields: { name: "ITC", ticker: "ITC.NS" }, broker: "Zerodha" });
  });
});
