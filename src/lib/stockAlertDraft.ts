// The draft behind the price-alert option in Add Investment (Direct Stocks).
// Lives apart from StockPriceAlertField.tsx so that file exports only a
// component (react-refresh), and so the dialog can import it cheaply.

import { resolveSymbol } from "@/lib/livePrices";
import type { InvestmentRecord } from "@/lib/investmentsStore";
import type { AlertDirection } from "@/lib/priceAlerts";

export interface StockAlertDraft {
  enabled: boolean;
  direction: AlertDirection;
  target: string;
}

export const EMPTY_STOCK_ALERT: StockAlertDraft = { enabled: false, direction: "below", target: "" };

/** The Yahoo symbol a holding's ticker prices under (NSE:ITC → ITC.NS, ITC.NS → ITC.NS). */
export function alertSymbolFor(ticker: string | undefined): string {
  const record = { id: "draft", asset: "stocks", fields: { ticker: ticker ?? "" } } as unknown as InvestmentRecord;
  return resolveSymbol(record).symbol;
}
