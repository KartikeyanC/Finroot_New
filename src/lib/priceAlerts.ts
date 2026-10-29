// Price alerts: "tell me when RELIANCE.NS falls to ₹1,100".
//
// The idea comes from how patient investors buy: decide in advance the price
// you would be happy to pay, then act only when the market offers it. An
// alert holds that decision — a stock, a target, and which side of the target
// counts — and fires ONCE when a live price crosses it. After that it stays
// "triggered" (with the price that tripped it) until the person re-arms or
// deletes it, so a stock bouncing around the target cannot spam them.
//
// Alerts are stored per workspace in `tenant_settings` under `price_alerts`
// (see tenantSettings.ts), the same way saved tracker views are, so the web
// dashboard, the Windows app and the phone app all see one list. The phone
// app reads and writes the same JSON shape — keep the two in step.
//
// Everything here is pure; the hook is usePriceAlerts.ts and the always-on
// checker is PriceAlertWatcher.tsx.

import { cacheKey } from "./livePrices";

export type AlertDirection = "below" | "above";

export interface PriceAlert {
  id: string;
  /** Yahoo symbol, as the live-price function prices it: RELIANCE.NS, AAPL. */
  symbol: string;
  /** Company name for display; falls back to the symbol. */
  name: string;
  /** The price the person decided on, in the stock's own currency. */
  target: number;
  /** "below": fire when the price falls to the target or under (a buy level). */
  direction: AlertDirection;
  createdAt: string;
  /** Set once, when the alert fires. Null/absent while it is still watching. */
  triggeredAt?: string | null;
  triggeredPrice?: number | null;
}

export interface AlertDraft {
  symbol: string;
  name?: string;
  target: number | string;
  direction: AlertDirection;
}

/** A sanity bound, not a quota — the checker prices every active alert each minute. */
export const MAX_ALERTS = 50;

export const isActive = (a: PriceAlert) => !a.triggeredAt;

export function isHit(alert: Pick<PriceAlert, "target" | "direction">, price: number): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  return alert.direction === "below" ? price <= alert.target : price >= alert.target;
}

/** The symbols the checker must price: active alerts only, deduped. */
export function activeSymbols(alerts: PriceAlert[]): string[] {
  return [...new Set(alerts.filter(isActive).map((a) => a.symbol))];
}

/**
 * Apply one round of live prices. Returns the alerts with any newly-hit ones
 * marked triggered, plus the list that fired this round (for the toast). An
 * alert with no price this round is left alone — a failed lookup is not a hit.
 */
export function evaluateAlerts(
  alerts: PriceAlert[],
  prices: Record<string, number | null | undefined>,
  now: Date = new Date(),
): { next: PriceAlert[]; fired: PriceAlert[] } {
  const fired: PriceAlert[] = [];
  const next = alerts.map((a) => {
    if (!isActive(a)) return a;
    const price = prices[cacheKey("yahoo", a.symbol)];
    if (typeof price !== "number" || !isHit(a, price)) return a;
    const hit = { ...a, triggeredAt: now.toISOString(), triggeredPrice: price };
    fired.push(hit);
    return hit;
  });
  return { next, fired };
}

const SYMBOL = /^[A-Z0-9][A-Z0-9&.=^-]{0,24}$/;

export function normaliseSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Null when the draft is fine, otherwise a message for the form. */
export function validateDraft(draft: AlertDraft, existing: PriceAlert[] = []): string | null {
  const symbol = normaliseSymbol(draft.symbol);
  if (!symbol) return "Pick a stock or type its ticker.";
  if (!SYMBOL.test(symbol)) return "That does not look like a ticker (for example RELIANCE.NS or AAPL).";
  const target = typeof draft.target === "number" ? draft.target : parseFloat(String(draft.target));
  if (!Number.isFinite(target) || target <= 0) return "Enter the price you want to be alerted at.";
  if (draft.direction !== "below" && draft.direction !== "above") return "Choose when to alert.";
  if (existing.filter(isActive).length >= MAX_ALERTS) return `You can watch up to ${MAX_ALERTS} prices at once.`;
  const dup = existing.some(
    (a) => isActive(a) && a.symbol === symbol && a.direction === draft.direction && a.target === target,
  );
  if (dup) return "You already have this alert.";
  return null;
}

export function newAlert(draft: AlertDraft, id: string, now: Date = new Date()): PriceAlert {
  const symbol = normaliseSymbol(draft.symbol);
  const target = typeof draft.target === "number" ? draft.target : parseFloat(String(draft.target));
  return {
    id,
    symbol,
    name: draft.name?.trim() || symbol,
    target,
    direction: draft.direction,
    createdAt: now.toISOString(),
    triggeredAt: null,
    triggeredPrice: null,
  };
}

/** Start watching again — keeps the target, forgets the last trigger. */
export function rearm(alert: PriceAlert): PriceAlert {
  return { ...alert, triggeredAt: null, triggeredPrice: null };
}

/**
 * How far the price still has to move to reach the target, as a percentage
 * of the current price. Positive = still to go; 0 or less = reached.
 */
export function distanceToTarget(alert: Pick<PriceAlert, "target" | "direction">, price: number): number {
  if (!Number.isFinite(price) || price <= 0) return NaN;
  const gap = alert.direction === "below" ? price - alert.target : alert.target - price;
  return (gap / price) * 100;
}

/** "₹" for Indian listings, "$" for bare US tickers, nothing for the rest. */
export function currencySymbol(symbol: string): string {
  if (/\.(NS|BO)$/.test(symbol)) return "₹";
  if (!symbol.includes(".")) return "$";
  return "";
}

export function formatPrice(symbol: string, value: number): string {
  const cur = currencySymbol(symbol);
  const locale = cur === "₹" ? "en-IN" : "en-US";
  return `${cur}${value.toLocaleString(locale, { maximumFractionDigits: 2 })}`;
}

export function describeAlert(alert: PriceAlert): string {
  const verb = alert.direction === "below" ? "falls to" : "rises to";
  const tail = alert.direction === "below" ? "or below" : "or above";
  return `${alert.name} ${verb} ${formatPrice(alert.symbol, alert.target)} ${tail}`;
}

/** The notification for a fired alert: "ITC.NS is at ₹259.80 — at or below your ₹260 buy price." */
export function firedMessage(alert: PriceAlert): { title: string; body: string } {
  const at = formatPrice(alert.symbol, alert.triggeredPrice ?? alert.target);
  const target = formatPrice(alert.symbol, alert.target);
  const side = alert.direction === "below" ? `at or below your ${target} buy price` : `at or above your ${target} target`;
  return { title: `Price alert: ${alert.name}`, body: `${alert.symbol} is at ${at}, ${side}.` };
}

/** Tolerant read of whatever is stored — a hand-edited or older row must not crash the page. */
export function parseStoredAlerts(raw: unknown): PriceAlert[] {
  if (!Array.isArray(raw)) return [];
  const out: PriceAlert[] = [];
  for (const item of raw) {
    const a = item as Partial<PriceAlert>;
    const target = Number(a?.target);
    if (!a || typeof a.id !== "string" || typeof a.symbol !== "string") continue;
    if (!Number.isFinite(target) || target <= 0) continue;
    if (a.direction !== "below" && a.direction !== "above") continue;
    out.push({
      id: a.id,
      symbol: normaliseSymbol(a.symbol),
      name: typeof a.name === "string" && a.name ? a.name : normaliseSymbol(a.symbol),
      target,
      direction: a.direction,
      createdAt: typeof a.createdAt === "string" ? a.createdAt : new Date(0).toISOString(),
      triggeredAt: typeof a.triggeredAt === "string" ? a.triggeredAt : null,
      triggeredPrice: typeof a.triggeredPrice === "number" ? a.triggeredPrice : null,
    });
  }
  return out;
}
