import { BellRing } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAlertPrices } from "@/hooks/usePriceAlerts";
import { cacheKey } from "@/lib/livePrices";
import { currencySymbol, formatPrice, type AlertDirection } from "@/lib/priceAlerts";
import { alertSymbolFor, type StockAlertDraft } from "@/lib/stockAlertDraft";

/**
 * The price-alert option inside Add Investment (Direct Stocks): "alert me when
 * this stock falls to ₹X". Kept out of AddInvestmentDialog.tsx, which is at
 * the 30 kB limit; the dialog holds the draft (lib/stockAlertDraft.ts) and
 * calls useStockAlertSaver on save.
 */
export function StockPriceAlertField({
  ticker,
  value,
  onChange,
}: {
  ticker: string | undefined;
  value: StockAlertDraft;
  onChange: (next: StockAlertDraft) => void;
}) {
  const symbol = alertSymbolFor(ticker);
  const { data: prices } = useAlertPrices(symbol ? [symbol] : [], value.enabled && symbol.length >= 2);
  const now = symbol ? prices?.[cacheKey("yahoo", symbol)] ?? null : null;
  const cur = symbol ? currencySymbol(symbol) : "";

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="stock-alert-toggle" className="flex items-center gap-2 cursor-pointer">
          <BellRing className="h-4 w-4 text-primary" aria-hidden />
          Set a price alert for this stock
        </Label>
        <Switch
          id="stock-alert-toggle"
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>

      {value.enabled && (
        <>
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="stock-alert-direction" className="text-xs">Alert me when it</Label>
              <Select
                value={value.direction}
                onValueChange={(v) => onChange({ ...value, direction: v as AlertDirection })}
              >
                <SelectTrigger id="stock-alert-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="below">falls to or below (buy level)</SelectItem>
                  <SelectItem value="above">rises to or above</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-32">
              <Label htmlFor="stock-alert-target" className="text-xs">Price {cur}</Label>
              <Input
                id="stock-alert-target"
                inputMode="decimal"
                placeholder="0.00"
                value={value.target}
                onChange={(e) => onChange({ ...value, target: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {!symbol
              ? "Pick the stock above first."
              : now !== null
                ? `${symbol} is at ${formatPrice(symbol, now)} now. You will be alerted once when it reaches your price.`
                : `You will be alerted once when ${symbol} reaches your price.`}
          </p>
        </>
      )}
    </div>
  );
}
