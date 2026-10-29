import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/finance";
import { BROKER_TINTS, type Broker, type InvestmentRecord } from "@/lib/investmentsStore";
import type { LiveMap } from "@/lib/livePrices";
import { groupCurrent, type StockGroup } from "@/lib/stockLots";

export type BuyMorePrefill = { fields: Record<string, string>; broker?: Broker };

const qtyText = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 4 });
const dateText = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * One stock bought several times, as one holding: total quantity, average
 * buy price, invested and live value. Opens to list every purchase (date,
 * quantity, price), each still editable and deletable on its own.
 */
export function StockGroupRow({
  group,
  live,
  onEdit,
  onDelete,
  onBuyMore,
}: {
  group: StockGroup;
  live: LiveMap;
  onEdit: (rec: InvestmentRecord) => void;
  onDelete: (id: string) => void;
  onBuyMore?: (prefill: BuyMorePrefill) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const first = group.lots[0].record;
  const currency = first.currency;
  const tick = group.lots.map((l) => live[l.record.id]).find(Boolean);
  const current = groupCurrent(group, (id) => live[id]?.currentValue);
  const delta = current - group.invested;
  const positive = delta >= 0;
  const pct = group.invested > 0 ? (delta / group.invested) * 100 : 0;
  const brokers = [...new Set(group.lots.map((l) => l.record.broker).filter(Boolean))] as Broker[];
  const latest = group.lots[group.lots.length - 1].record;
  const panelId = `lots-${group.key.replace(/[^a-zA-Z0-9]/g, "-")}`;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="relative px-2 py-4 hover:bg-muted/40 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
            <span className="font-semibold text-foreground truncate">{group.name}</span>
            {brokers.map((b) => (
              <Badge key={b} variant="outline" className={`text-xs ${BROKER_TINTS[b]}`}>
                via {b}
              </Badge>
            ))}
            <Badge variant="secondary" className="text-xs">
              {group.lots.length} purchases
            </Badge>
            <Badge variant="outline" className="text-xs">{currency}</Badge>
            {tick && (
              <Badge
                variant="outline"
                className={`text-xs gap-1 ${
                  positive
                    ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/5"
                    : "border-rose-500/40 text-rose-500 bg-rose-500/5"
                }`}
              >
                {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {positive ? "+" : ""}
                {pct.toFixed(2)}% {positive ? "Profit" : "Loss"}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 pl-6">
            {qtyText(group.qty)} shares · average {formatMoney(group.avgPrice, currency)}
          </div>
        </button>

        <div className="flex items-center gap-6 ml-auto">
          {tick && (
            <Stat label="Current Price" value={formatMoney(tick.unitPrice, currency)} />
          )}
          <Stat label="Invested" value={formatMoney(group.invested, currency)} />
          <Stat
            label="Current"
            value={formatMoney(current, currency)}
            className={positive ? "text-emerald-500" : "text-rose-500"}
          />
        </div>

        {onBuyMore && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() =>
              onBuyMore({
                fields: {
                  name: String(latest.fields?.name ?? group.name),
                  ticker: String(latest.fields?.ticker ?? ""),
                },
                broker: latest.broker,
              })
            }
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Buy more
          </Button>
        )}
      </div>

      {open && (
        <div id={panelId} className="mt-3 ml-6 rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="text-left font-medium px-3 py-2">Bought on</th>
                <th className="text-right font-medium px-3 py-2">Quantity</th>
                <th className="text-right font-medium px-3 py-2">Buy price</th>
                <th className="text-right font-medium px-3 py-2">Amount</th>
                <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {group.lots.map((l) => (
                <tr key={l.record.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{dateText(l.date)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{qtyText(l.qty)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.price, currency)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.invested, currency)}</td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    {confirmId === l.record.id ? (
                      <span className="inline-flex items-center gap-1 text-xs">
                        Delete this purchase?
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => onDelete(l.record.id)}>
                          Delete
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmId(null)}>
                          Cancel
                        </Button>
                      </span>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={`Edit the ${dateText(l.date)} purchase`}
                          onClick={() => onEdit(l.record)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-rose-500"
                          aria-label={`Delete the ${dateText(l.date)} purchase`}
                          onClick={() => setConfirmId(l.record.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold border-t border-border">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{qtyText(group.qty)}</td>
                <td className="px-3 py-2 text-right tabular-nums">avg {formatMoney(group.avgPrice, currency)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(group.invested, currency)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </motion.li>
  );
}

function Stat({ label, value, className = "text-foreground" }: { label: string; value: string; className?: string }) {
  return (
    <div className="text-right">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${className}`}>{value}</div>
    </div>
  );
}
