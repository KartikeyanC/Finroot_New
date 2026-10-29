import { Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useInvestments } from "@/lib/investmentsStore";
import { formatMoney } from "@/lib/finance";
import { buyDateOf, fmt, todayISO } from "@/lib/investmentForm";
import { existingHolding } from "@/lib/stockLots";
import { Field } from "./formParts";

/**
 * Add Investment (Direct Stocks): the purchase date, and — when the stock is
 * already in the portfolio — what this purchase joins. Each purchase stays
 * its own record; the portfolio list shows them as one holding with the
 * average price.
 */
export function StockPurchaseExtras({
  form,
  set,
  editingId,
  savedAt,
  currency = "INR",
}: {
  currency?: string;
  form: Record<string, string>;
  set: (k: string, v: string) => void;
  editingId?: string;
  savedAt?: string;
}) {
  const { records } = useInvestments();
  const held = existingHolding(records, { ticker: form.ticker, name: form.name, currency }, editingId);

  const qty = parseFloat(form.qty ?? "") || 0;
  const buy = parseFloat(form.buy ?? "") || 0;
  const afterQty = held ? held.qty + qty : 0;
  const afterAvg = held && afterQty > 0 ? (held.invested + qty * buy) / afterQty : 0;

  return (
    <>
      <Field label="Purchase date">
        <Input
          type="date"
          aria-label="Purchase date"
          value={buyDateOf(form, savedAt)}
          max={todayISO()}
          onChange={(e) => set("buy_date", e.target.value)}
        />
      </Field>
      {held && !editingId && (
        <div role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" aria-hidden />
            You already hold {held.name}: {fmt(held.qty, 0)} shares at an average of {formatMoney(held.avgPrice, currency)}
          </div>
          <div className="text-muted-foreground">
            This purchase is added to the same holding
            {qty > 0 && buy > 0
              ? `: ${fmt(afterQty, 0)} shares at an average of ${formatMoney(afterAvg, currency)} after this buy.`
              : "."}
          </div>
        </div>
      )}
    </>
  );
}
