import { useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenantSetting } from "@/hooks/useTenantSetting";
import { fetchPrices } from "@/lib/livePrices";
import {
  newAlert,
  parseStoredAlerts,
  rearm,
  validateDraft,
  type AlertDraft,
  type PriceAlert,
} from "@/lib/priceAlerts";

/**
 * The workspace's price alerts, stored in `tenant_settings.price_alerts`.
 *
 * Every write sends the whole list (that is how a tenant setting works), so
 * each action builds on the latest list held in a ref rather than on the value
 * captured when a callback was created — otherwise the watcher marking one
 * alert as fired could undo an alert added a second earlier.
 */
export function usePriceAlerts() {
  // Re-read every minute: alerts added, deleted or fired on the phone show up
  // here without a reload.
  const { value, setValue, loading, saving } = useTenantSetting("price_alerts", { refreshMs: 60_000 });
  const alerts = useMemo(() => parseStoredAlerts(value), [value]);
  const latest = useRef(alerts);
  latest.current = alerts;

  /** Adds the alert, or returns why it could not be added. */
  const add = useCallback(
    (draft: AlertDraft): string | null => {
      const problem = validateDraft(draft, latest.current);
      if (problem) return problem;
      const next = [newAlert(draft, crypto.randomUUID()), ...latest.current];
      latest.current = next;
      setValue(next);
      return null;
    },
    [setValue],
  );

  const remove = useCallback(
    (id: string) => {
      const next = latest.current.filter((a) => a.id !== id);
      latest.current = next;
      setValue(next);
    },
    [setValue],
  );

  const rearmAlert = useCallback(
    (id: string) => {
      const next = latest.current.map((a) => (a.id === id ? rearm(a) : a));
      latest.current = next;
      setValue(next);
    },
    [setValue],
  );

  /** For the watcher: merge newly-fired alerts into the latest list by id. */
  const markFired = useCallback(
    (fired: PriceAlert[]) => {
      if (!fired.length) return;
      const byId = new Map(fired.map((a) => [a.id, a]));
      const next = latest.current.map((a) => (byId.has(a.id) && !a.triggeredAt ? byId.get(a.id)! : a));
      latest.current = next;
      setValue(next);
    },
    [setValue],
  );

  return { alerts, loading, saving, add, remove, rearm: rearmAlert, markFired };
}

/** How often alert prices are re-checked while the app is open and visible. */
export const ALERT_POLL_MS = 60_000;

/**
 * Live prices for a set of alert symbols, as `{ "yahoo:RELIANCE.NS": 1174 }`.
 * One query per symbol set, shared by the watcher and the alerts section, so
 * both together cost one live-price call a minute. React Query pauses the
 * interval while the tab is hidden.
 */
export function useAlertPrices(symbols: string[], enabled = true) {
  const sorted = useMemo(() => [...new Set(symbols)].sort(), [symbols]);
  return useQuery({
    queryKey: ["alert-prices", sorted.join(",")],
    enabled: enabled && sorted.length > 0,
    staleTime: ALERT_POLL_MS / 2,
    refetchInterval: ALERT_POLL_MS,
    queryFn: () => fetchPrices(sorted.map((symbol) => ({ provider: "yahoo" as const, symbol }))),
  });
}
