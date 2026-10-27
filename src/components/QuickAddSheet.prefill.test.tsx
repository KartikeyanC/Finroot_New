import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import QuickAddSheet from "./QuickAddSheet";
import type { QuickAddPrefill } from "@/hooks/useSharedPayment";

const mutateAsync = vi.fn(async () => ({}));

// The sheet's data hooks need a signed-in tenant; the behaviour under test is
// what it shows and what it would save, so they are stubbed.
vi.mock("@/hooks/useTransactions", () => ({ useCreateTransaction: () => ({ mutateAsync }) }));
vi.mock("@/lib/categories", () => ({
  useCustomCategories: () => ({ store: { expense: [], income: { active: [], passive: [] } } }),
}));
vi.mock("@/components/transactions/TrackerField", () => ({ default: () => null }));

const swiggy: QuickAddPrefill = {
  type: "expense", amount: "450", category: "Food & Dining", note: "Swiggy",
  currency: "INR", date: "2026-10-26", source: "text",
};

describe("QuickAddSheet opened from a shared payment", () => {
  // Vitest globals are off, so Testing Library does not unmount for us — and
  // several open modal sheets at once fight over focus forever in jsdom.
  afterEach(cleanup);

  it("shows the shared amount, category and note, ready to confirm", async () => {
    render(<QuickAddSheet open onOpenChange={() => {}} prefill={swiggy} />);
    expect(await screen.findByText("Confirm payment")).toBeTruthy();
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("450");
    expect((screen.getByLabelText(/note/i) as HTMLInputElement).value).toBe("Swiggy");
    expect(screen.getByRole("combobox", { name: /category/i }).textContent).toContain("Food & Dining");
    expect(screen.getByRole("button", { name: /record expense/i })).toBeTruthy();
  });

  it("saves exactly what was confirmed — nothing is saved before the button", async () => {
    mutateAsync.mockClear();
    render(<QuickAddSheet open onOpenChange={() => {}} prefill={swiggy} />);
    await screen.findByText("Confirm payment");
    expect(mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /record expense/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: "expense", amount: 450, category: "Food & Dining", currency: "INR", description: "Swiggy" }),
    );
  });

  it("keeps a shared category when the type arrives as income", async () => {
    render(<QuickAddSheet open onOpenChange={() => {}} prefill={{ ...swiggy, type: "income", category: "Other", note: "Ravi" }} />);
    await screen.findByText("Confirm payment");
    expect(screen.getByRole("button", { name: /record income/i })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /category/i }).textContent).toContain("Other");
  });

  it("says so when no amount could be read, and leaves the amount empty", async () => {
    render(<QuickAddSheet open onOpenChange={() => {}} prefill={{ ...swiggy, amount: "", source: "unreadable" }} />);
    expect(await screen.findByText(/couldn't read an amount/i)).toBeTruthy();
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("");
  });

  it("is the ordinary Quick Add when nothing was shared", async () => {
    render(<QuickAddSheet open onOpenChange={() => {}} />);
    expect(await screen.findByText("Quick Add")).toBeTruthy();
    expect(screen.queryByText("Confirm payment")).toBeNull();
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("");
  });
});
