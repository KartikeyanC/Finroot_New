// Several purchases of one stock are one holding.
//
// Each "Add Investment" for a stock stays its own record — one purchase lot
// with its own date, quantity and price — so editing or deleting a single buy
// stays exact. The portfolio list then shows lots of the same stock as ONE
// row: total quantity, the weighted average buy price, total invested and the
// live value, with the lots listed underneath.
//
// Pure: the list is PortfolioList.tsx / StockGroupRow.tsx.

import { getCurrent, getInvested, type InvestmentRecord } from "./investmentsStore";
import { resolveSymbol } from "./livePrices";
import { buyDateOf } from "./investmentForm";

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

/**
 * What makes two records the same stock: the priced symbol (NSE:ITC and
 * ITC.NS are both ITC.NS) and the currency. A stock saved without a ticker
 * falls back to its name, so "ITC" twice still merges. Null = never merged.
 */
export function lotKey(r: InvestmentRecord): string | null {
  if (r.asset !== "stocks") return null;
  const { symbol } = resolveSymbol(r);
  const id = symbol || String(r.fields?.name ?? "").trim().toUpperCase();
  return id ? `${id}|${r.currency}` : null;
}

export interface Lot {
  record: InvestmentRecord;
  date: string; // YYYY-MM-DD
  qty: number;
  price: number;
  invested: number;
}

export function toLot(r: InvestmentRecord): Lot {
  const qty = num(r.fields?.qty) || num(r.fields?.quantity);
  const invested = getInvested(r);
  const price = num(r.fields?.buy) || (qty > 0 ? invested / qty : 0);
  return { record: r, date: buyDateOf(r.fields, r.savedAt), qty, price, invested };
}

export interface StockGroup {
  key: string;
  name: string;
  /** Oldest purchase first. */
  lots: Lot[];
  qty: number;
  invested: number;
  /** Weighted: total invested ÷ total quantity. */
  avgPrice: number;
}

export type PortfolioItem =
  | { kind: "single"; record: InvestmentRecord }
  | { kind: "group"; group: StockGroup };

export function summarise(key: string, records: InvestmentRecord[]): StockGroup {
  const lots = records.map(toLot).sort((a, b) => a.date.localeCompare(b.date));
  const qty = lots.reduce((s, l) => s + l.qty, 0);
  const invested = lots.reduce((s, l) => s + l.invested, 0);
  const named = records.find((r) => String(r.fields?.name ?? "").trim());
  return {
    key,
    name: String(named?.fields?.name ?? resolveSymbol(records[0]).symbol).trim(),
    lots,
    qty,
    invested,
    avgPrice: qty > 0 ? invested / qty : 0,
  };
}

/**
 * The list as rows: a stock bought more than once becomes one group (placed
 * where its newest purchase sat); everything else stays a single row, in
 * the original order.
 */
export function groupPortfolio(records: InvestmentRecord[]): PortfolioItem[] {
  const byKey = new Map<string, InvestmentRecord[]>();
  for (const r of records) {
    const k = lotKey(r);
    if (k) byKey.set(k, [...(byKey.get(k) ?? []), r]);
  }
  const placed = new Set<string>();
  const out: PortfolioItem[] = [];
  for (const r of records) {
    const k = lotKey(r);
    const lots = k ? byKey.get(k)! : null;
    if (!k || !lots || lots.length < 2) {
      out.push({ kind: "single", record: r });
      continue;
    }
    if (placed.has(k)) continue;
    placed.add(k);
    out.push({ kind: "group", group: summarise(k, lots) });
  }
  return out;
}

/** The holding a new purchase would join, if the person already owns it. */
export function existingHolding(
  records: InvestmentRecord[],
  draft: { ticker?: string; name?: string; currency?: string },
  excludeId?: string,
): StockGroup | null {
  const probe = {
    id: "draft",
    asset: "stocks",
    currency: draft.currency ?? "INR",
    fields: { ticker: draft.ticker ?? "", name: draft.name ?? "" },
  } as unknown as InvestmentRecord;
  const k = lotKey(probe);
  if (!k || !(draft.ticker ?? "").trim()) return null;
  const same = records.filter((r) => r.id !== excludeId && lotKey(r) === k);
  return same.length ? summarise(k, same) : null;
}

/** Current value of a group: each lot's live value when priced, else stored. */
export function groupCurrent(group: StockGroup, liveValue: (id: string) => number | undefined): number {
  return group.lots.reduce((s, l) => s + (liveValue(l.record.id) ?? getCurrent(l.record)), 0);
}
