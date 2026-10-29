import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// Holdings and price alerts added on the phone must show up in the web app /
// Windows app without a reload. These pin the query options that make it so.

const useQuery = vi.hoisted(() => vi.fn((_opts: Record<string, unknown>) => ({ data: undefined, isLoading: false })));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (o: Record<string, unknown>) => useQuery(o),
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn(), getQueryData: vi.fn(), cancelQueries: vi.fn() }),
}));
vi.mock("@/contexts/TenantContext", () => ({ useTenant: () => ({ currentTenantId: "t1" }) }));

import { useTenantSetting } from "./useTenantSetting";
import { usePriceAlerts } from "./usePriceAlerts";
import { INVESTMENTS_REFRESH_MS, useInvestments } from "@/lib/investmentsStore";
import { liveQueryDefaults } from "@/lib/liveRefresh";

const lastOptions = () => useQuery.mock.calls.at(-1)![0];

describe("cross-device refresh", () => {
  beforeEach(() => useQuery.mockClear());

  it("investments re-read every minute and on return to the window", () => {
    renderHook(() => useInvestments());
    const opts = useQuery.mock.calls.map((c) => c[0]).find((o) => (o.queryKey as unknown[])[0] === "investments")!;
    expect(opts.refetchInterval).toBe(INVESTMENTS_REFRESH_MS);
    expect(INVESTMENTS_REFRESH_MS).toBe(60_000);
    expect(opts.refetchOnWindowFocus).toBe(true);
  });

  it("price alerts re-read every minute and on return to the window", () => {
    renderHook(() => usePriceAlerts());
    const opts = useQuery.mock.calls.map((c) => c[0]).find((o) => (o.queryKey as unknown[])[1] === "price_alerts")!;
    expect(opts.refetchInterval).toBe(60_000);
    expect(opts.refetchOnWindowFocus).toBe(true);
  });

  it("other settings fall back to the app-wide refresh", () => {
    renderHook(() => useTenantSetting("budget_planner"));
    expect(lastOptions()).not.toHaveProperty("refetchInterval");
    expect(lastOptions()).not.toHaveProperty("refetchOnWindowFocus");
  });

  it("the app-wide default re-reads every screen each minute and on focus", () => {
    expect(liveQueryDefaults.refetchInterval).toBe(60_000);
    expect(liveQueryDefaults.refetchOnWindowFocus).toBe(true);
  });
});
