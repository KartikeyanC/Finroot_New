import { useCallback } from "react";
import { toast } from "sonner";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { describeAlert } from "@/lib/priceAlerts";
import { alertSymbolFor, type StockAlertDraft } from "@/lib/stockAlertDraft";

/** Called by the dialog on save: creates the alert when the switch is on. */
export function useStockAlertSaver() {
  const { add } = usePriceAlerts();
  return useCallback(
    (draft: StockAlertDraft, ticker: string | undefined, name: string | undefined) => {
      if (!draft.enabled) return;
      const symbol = alertSymbolFor(ticker);
      const problem = add({ symbol, name: name || symbol, target: draft.target, direction: draft.direction });
      if (problem) {
        toast.error("Price alert not set", { description: problem });
        return;
      }
      const target = parseFloat(draft.target);
      toast.success("Price alert set", {
        description: describeAlert({
          id: "",
          symbol,
          name: name || symbol,
          target,
          direction: draft.direction,
          createdAt: "",
        }),
      });
    },
    [add],
  );
}
