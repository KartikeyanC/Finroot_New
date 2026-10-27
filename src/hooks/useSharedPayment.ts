import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { fileToBase64, type ScanResult } from "@/lib/billScan";
import { takeSharedReceipt } from "@/lib/sharedInbox";
import { ledgerCategory, parseSharedPayment, suggestExpenseCategory } from "@/lib/sharedPayment";
import { notifyError } from "@/lib/errorMessages";

/** What Quick Add opens with. Everything is editable before saving. */
export interface QuickAddPrefill {
  type: "expense" | "income";
  amount: string;
  category: string;
  note: string;
  currency: string;
  date: string;
  /** Shown in the sheet so it is clear where the numbers came from. */
  source: "text" | "screenshot" | "unreadable";
}

/**
 * "Share → FinRoot" from a payment app lands here.
 *
 * Runs once when the dashboard mounts — not on a `?shared=1` flag — because a
 * person who isn't signed in, or whose PIN gate is up, passes through other
 * screens first and the query string would not survive them. The receipt itself
 * waits in Cache Storage (15 minutes at most), so whichever way they arrive,
 * the sheet opens when the dashboard does.
 *
 * Text is read locally. A screenshot goes to the existing `scan-receipt`
 * function, exactly as Bill Scan sends one.
 */
export function useSharedPayment(onReady: (p: QuickAddPrefill) => void, opts: { readOnly: boolean }) {
  const { currentTenantId } = useTenant();
  const ran = useRef(false);
  const cb = useRef(onReady);
  cb.current = onReady;

  useEffect(() => {
    if (ran.current || !currentTenantId) return;
    ran.current = true;

    void (async () => {
      const shared = await takeSharedReceipt();
      if (!shared) return;
      if (opts.readOnly) {
        toast.error("View-only members can't add payments.");
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const fromText = parseSharedPayment(shared.title, shared.text, shared.url);

      // 1. The other app shared words that name an amount — done, no network.
      if (fromText.amount) {
        cb.current({
          type: fromText.direction,
          amount: String(fromText.amount),
          category: fromText.direction === "expense" ? suggestExpenseCategory(fromText.merchant, shared.text, shared.title) : "Other",
          note: fromText.merchant ?? "",
          currency: "INR",
          date: today,
          source: "text",
        });
        return;
      }

      // 2. A screenshot — read it with the receipt scanner.
      if (shared.image) {
        const loading = toast.loading("Reading your payment…");
        try {
          const { data, error } = await supabase.functions.invoke<ScanResult>("scan-receipt", {
            body: {
              tenant_id: currentTenantId,
              images: [{ data: await fileToBase64(shared.image), mimeType: shared.image.type }],
            },
          });
          if (error) throw error;
          if (!data || !(data.total > 0)) throw new Error("no total");
          const raw = data.items[0]?.category;
          cb.current({
            type: "expense",
            amount: String(data.total),
            category: ledgerCategory(raw, data.merchant, shared.text),
            note: data.merchant || "",
            currency: ["INR", "USD", "EUR", "GBP", "AED"].includes(data.currency) ? data.currency : "INR",
            date: data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : today,
            source: "screenshot",
          });
        } catch (e) {
          // Still open the sheet: they shared a payment, so let them type it.
          notifyError(e, { title: "Couldn't read that screenshot" });
          cb.current({ type: "expense", amount: "", category: "Other", note: "", currency: "INR", date: today, source: "unreadable" });
        } finally {
          toast.dismiss(loading);
        }
        return;
      }

      // 3. Shared something with no amount in it. Open an empty sheet, say so.
      cb.current({
        type: fromText.direction,
        amount: "",
        category: suggestExpenseCategory(fromText.merchant, shared.text, shared.title),
        note: fromText.merchant ?? "",
        currency: "INR",
        date: today,
        source: "unreadable",
      });
    })();
  }, [currentTenantId, opts.readOnly]);
}
