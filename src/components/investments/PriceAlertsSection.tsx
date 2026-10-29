import { useMemo, useState } from "react";
import { BellRing, BellPlus, RotateCcw, Trash2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SymbolPicker } from "@/components/investments/SymbolPicker";
import { useAlertPrices, usePriceAlerts } from "@/hooks/usePriceAlerts";
import { cacheKey } from "@/lib/livePrices";
import {
  activeSymbols,
  currencySymbol,
  describeAlert,
  distanceToTarget,
  formatPrice,
  isActive,
  normaliseSymbol,
  type AlertDirection,
  type PriceAlert,
} from "@/lib/priceAlerts";

/**
 * "Price alerts" on the Investments page: decide your buy price in advance,
 * and FinRoot tells you when the market gets there. The checking itself is
 * done by PriceAlertWatcher, on every page; this section lists and edits.
 */
export default function PriceAlertsSection() {
  const { alerts, add, remove, rearm } = usePriceAlerts();
  const [open, setOpen] = useState(false);
  const symbols = useMemo(() => activeSymbols(alerts), [alerts]);
  // Same query (same key) the watcher uses: no extra calls for this list.
  const { data: prices } = useAlertPrices(symbols);

  const watching = alerts.filter(isActive);
  const triggered = alerts.filter((a) => !isActive(a));

  return (
    <section className="rounded-xl border border-border bg-card/60 backdrop-blur-sm" aria-labelledby="price-alerts-title">
      <header className="flex items-center justify-between gap-4 p-5 border-b border-border flex-wrap">
        <div>
          <h2 id="price-alerts-title" className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <BellRing className="h-4 w-4 text-primary" aria-hidden /> Price alerts
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Decide the price you would buy at, and FinRoot tells you when the stock gets there. Checked every
            minute while FinRoot is open; the phone app checks too.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setOpen(true)}>
          <BellPlus className="h-3.5 w-3.5" aria-hidden /> New alert
        </Button>
      </header>

      {alerts.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground flex items-start gap-3">
          <Target className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
          <p>
            No alerts yet. Pick a stock you like but find too expensive today, set the price you would be happy
            to pay, and you will be told when it reaches it.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {[...watching, ...triggered].map((a) => (
            <AlertRow
              key={a.id}
              alert={a}
              price={prices?.[cacheKey("yahoo", a.symbol)] ?? null}
              onDelete={() => remove(a.id)}
              onRearm={() => rearm(a.id)}
            />
          ))}
        </ul>
      )}

      <NewAlertDialog open={open} onOpenChange={setOpen} onCreate={add} />
    </section>
  );
}

function AlertRow({
  alert,
  price,
  onDelete,
  onRearm,
}: {
  alert: PriceAlert;
  price: number | null;
  onDelete: () => void;
  onRearm: () => void;
}) {
  const active = isActive(alert);
  const gap = price !== null ? distanceToTarget(alert, price) : NaN;
  return (
    <li className="flex items-center gap-4 px-5 py-3 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground truncate">{alert.name}</span>
          <span className="text-xs text-muted-foreground">{alert.symbol}</span>
          {active ? (
            <Badge variant="outline" className="text-[11px]">Watching</Badge>
          ) : (
            <Badge className="text-[11px] bg-success/15 text-success border border-success/30 hover:bg-success/15">
              Triggered
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{describeAlert(alert)}</p>
      </div>

      <div className="text-right text-sm tabular-nums min-w-[9rem]">
        {active ? (
          price !== null ? (
            <>
              <div className="font-semibold text-foreground">{formatPrice(alert.symbol, price)}</div>
              <div className="text-xs text-muted-foreground">
                {Number.isFinite(gap) && gap > 0 ? `${gap.toFixed(1)}% to go` : "At target"}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">Waiting for a price…</div>
          )
        ) : (
          <>
            <div className="font-semibold text-foreground">
              {formatPrice(alert.symbol, alert.triggeredPrice ?? alert.target)}
            </div>
            <div className="text-xs text-muted-foreground">
              {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : ""}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        {!active && (
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Watch ${alert.symbol} again`} onClick={onRearm}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Delete the ${alert.symbol} alert`} onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function NewAlertDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: ReturnType<typeof usePriceAlerts>["add"];
}) {
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState<AlertDirection>("below");
  const [error, setError] = useState<string | null>(null);

  const clean = normaliseSymbol(symbol);
  const { data: prices, isFetching } = useAlertPrices(clean ? [clean] : [], open && clean.length >= 2);
  const current = clean ? prices?.[cacheKey("yahoo", clean)] ?? null : null;

  const reset = () => {
    setSymbol("");
    setName("");
    setTarget("");
    setDirection("below");
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = onCreate({ symbol: clean, name, target, direction });
    if (problem) {
      setError(problem);
      return;
    }
    // Ask once, from this click (browsers only allow it from a user gesture).
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch {
      /* not available in this browser */
    }
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New price alert</DialogTitle>
            <DialogDescription>
              Choose a stock and the price you would act at. You will be alerted once, when the live price gets
              there.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label>Stock</Label>
            <SymbolPicker
              provider="yahoo"
              placeholder="e.g. Reliance, ITC, Apple — or RELIANCE.NS"
              value={symbol}
              onChange={(v) => {
                setSymbol(v.toUpperCase());
                setError(null);
              }}
              onPick={(hit) => setName(hit.name)}
            />
            <p className="text-xs text-muted-foreground min-h-[1rem]" aria-live="polite">
              {clean.length >= 2
                ? current !== null
                  ? `Now ${formatPrice(clean, current)}${name ? ` · ${name}` : ""}`
                  : isFetching
                    ? "Looking up the price…"
                    : "No live price for that ticker yet."
                : ""}
            </p>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="alert-direction">Alert me when it</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as AlertDirection)}>
                <SelectTrigger id="alert-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="below">falls to or below (buy level)</SelectItem>
                  <SelectItem value="above">rises to or above</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 w-36">
              <Label htmlFor="alert-target">Price {clean ? currencySymbol(clean) : ""}</Label>
              <Input
                id="alert-target"
                inputMode="decimal"
                placeholder="0.00"
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  setError(null);
                }}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create alert</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
