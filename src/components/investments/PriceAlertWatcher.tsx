import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAccess } from "@/contexts/AccessContext";
import { useAlertPrices, usePriceAlerts } from "@/hooks/usePriceAlerts";
import { activeSymbols, evaluateAlerts, firedMessage, type PriceAlert } from "@/lib/priceAlerts";

/**
 * Always-on price-alert checker, mounted once in DashboardLayout so an alert
 * fires on whichever page is open — not only on Investments.
 *
 * Checks every minute while the window is visible (the shared price query
 * pauses when hidden), fires each alert once, and records that in the
 * workspace so the phone app and other tabs see it as triggered too.
 * Renders nothing.
 */
export function PriceAlertWatcher() {
  const { canAccess } = useAccess();
  const allowed = canAccess("investments");
  const { alerts, markFired } = usePriceAlerts();
  const symbols = useMemo(() => (allowed ? activeSymbols(alerts) : []), [allowed, alerts]);
  const { data: prices } = useAlertPrices(symbols, allowed);
  const navigate = useNavigate();
  // A second render with the same prices must not toast twice while the
  // "triggered" write is still in flight.
  const announced = useRef(new Set<string>());

  useEffect(() => {
    if (!allowed || !prices) return;
    const { fired } = evaluateAlerts(alerts, prices);
    const fresh = fired.filter((a) => !announced.current.has(a.id));
    if (!fresh.length) return;
    for (const a of fresh) announced.current.add(a.id);
    markFired(fresh);
    for (const a of fresh) announce(a, () => navigate("/app/investments"));
  }, [allowed, alerts, prices, markFired, navigate]);

  return null;
}

function announce(alert: PriceAlert, open: () => void) {
  const { title, body } = firedMessage(alert);
  toast(title, {
    description: body,
    duration: 30_000,
    action: { label: "View", onClick: open },
  });
  // A system notification too, when the person allowed it (asked for when the
  // first alert is created). Never prompts from here: no user gesture.
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const n = new Notification(title, { body, tag: `price-alert-${alert.id}` });
      n.onclick = () => {
        window.focus();
        open();
      };
    }
  } catch {
    // Some embedded browsers expose Notification but refuse to construct it.
  }
}
