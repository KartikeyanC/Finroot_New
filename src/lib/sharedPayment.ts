import { EXPENSE_CATEGORIES } from "@/lib/finance";

/**
 * Turning a payment receipt shared from another app (GPay, PhonePe, Paytm, a
 * bank app…) into something Quick Add can pre-fill.
 *
 * The phone's Share menu hands FinRoot a piece of text and/or a screenshot
 * (the PWA's `share_target`, see `public/manifest.webmanifest` and
 * `public/sw.js`). Nothing here talks to the network — it reads text, guesses
 * a category, and holds the two small facts that decide whether a stored share
 * is still worth showing. A screenshot is read by the existing `scan-receipt`
 * function; the caller does that, not this file.
 *
 * Everything is a SUGGESTION: the person confirms Expense or Income, the
 * category and the amount in the sheet before anything is saved.
 */

export type SharedDirection = "expense" | "income";

export interface ParsedPayment {
  /** Null when the text carries no amount with a currency marker. */
  amount: number | null;
  direction: SharedDirection;
  /** Who was paid (or who paid you), when the text says. */
  merchant: string | null;
}

/**
 * ₹450 · ₹ 1,250.50 · Rs. 99 · Rs99 · INR 2,000 · 450 rupees.
 *
 * A currency marker is REQUIRED. Receipts are full of other digits — UPI
 * reference numbers, phone numbers, times — and "the first number" would
 * happily save a 12-digit transaction id as the amount.
 */
const AMOUNT = /(?:₹|\brs\.?|\binr)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)|\b([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:rupees|rs\b)/i;

const INCOME_WORDS = /\b(received|credited|refund(?:ed)?|cashback|deposited)\b/i;

export function parseAmount(text: string): number | null {
  const m = AMOUNT.exec(text);
  if (!m) return null;
  const n = Number((m[1] ?? m[2]).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 && n < 1e9 ? n : null;
}

/** "paid to Swiggy on 12 Mar" → "Swiggy"; "received from Ravi" → "Ravi". */
function parseMerchant(text: string, direction: SharedDirection): string | null {
  const word = direction === "income" ? "from" : "(?:to|at)";
  const re = new RegExp(`\\b${word}\\s+([^\\n,.₹]{2,40}?)(?=\\s+(?:on|via|using|for|from|with|ref|upi|txn|transaction)\\b|[\\n,.]|$)`, "i");
  const m = re.exec(text);
  const name = m?.[1]?.trim();
  return name && /[a-z]/i.test(name) ? name : null;
}

/** Reads whatever text the other app shared. Pure. */
export function parseSharedPayment(...parts: Array<string | null | undefined>): ParsedPayment {
  const text = parts.filter(Boolean).join("\n");
  const direction: SharedDirection = INCOME_WORDS.test(text) ? "income" : "expense";
  return { amount: parseAmount(text), direction, merchant: parseMerchant(text, direction) };
}

/* ── category suggestion ──────────────────────────────────────────── */

type Category = (typeof EXPENSE_CATEGORIES)[number];

/** Keyword → category. Order matters: the first match wins. */
const KEYWORDS: Array<[RegExp, Category]> = [
  [/swiggy|zomato|dominos|domino'?s|pizza|burger|cafe|café|coffee|restaurant|dhaba|biryani|bakery|mess\b|canteen|kfc|mcdonald|starbucks|eatfit|food/i, "Food & Dining"],
  [/uber|ola\b|rapido|redbus|irctc|metro|namma|fastag|petrol|diesel|fuel|bpcl|hpcl|indian ?oil|shell\b|parking|toll|auto\b|cab\b|bus\b/i, "Transport"],
  [/amazon|flipkart|myntra|ajio|meesho|nykaa|bigbasket|blinkit|zepto|instamart|dmart|reliance (?:smart|retail)|mart\b|store\b|supermarket|grocer/i, "Shopping"],
  [/pharm|medical|apollo|medplus|1mg|netmeds|hospital|clinic|diagnostic|lab\b|dental|doctor|dr\.? /i, "Healthcare"],
  [/netflix|spotify|hotstar|prime video|youtube|jiocinema|sonyliv|zee5|icloud|google one|subscription|membership/i, "Subscriptions"],
  [/electricity|bescom|tneb|msedcl|water bill|gas\b|piped|broadband|airtel|jio\b|vodafone|\bvi\b|bsnl|recharge|dth|tata ?sky|postpaid|prepaid/i, "Utilities"],
  [/\brent\b|landlord|maintenance|society/i, "Rent"],
  [/school|college|tuition|course|udemy|byju|unacademy|coaching|exam|fee\b|fees\b|library/i, "Education"],
  [/makemytrip|goibibo|cleartrip|booking\.com|airbnb|oyo|hotel|resort|flight|indigo|vistara|air india|yatra/i, "Travel"],
  [/bookmyshow|pvr|inox|cinema|movie|concert|gaming|steam\b|playstation|xbox/i, "Entertainment"],
  [/salon|spa\b|parlour|parlor|barber|cult\.?fit|gym|urban ?company|beauty/i, "Personal Care"],
];

export function suggestExpenseCategory(...hints: Array<string | null | undefined>): Category {
  const text = hints.filter(Boolean).join(" ");
  for (const [re, cat] of KEYWORDS) if (re.test(text)) return cat;
  return "Other";
}

/**
 * `scan-receipt` has its own category list (it includes "Travel & Transport",
 * which FinRoot's ledger does not). Anything outside the ledger's list is
 * mapped or re-guessed rather than saved as a category that appears nowhere else.
 */
export function ledgerCategory(raw: string | null | undefined, ...hints: Array<string | null | undefined>): Category {
  if (raw && (EXPENSE_CATEGORIES as readonly string[]).includes(raw)) return raw as Category;
  if (raw === "Travel & Transport") return "Transport";
  return suggestExpenseCategory(...hints);
}

/* ── how long a stored share stays worth showing ──────────────────── */

/** A share is something you did seconds ago. An hour-old one is stale — drop it. */
export const SHARE_TTL_MS = 15 * 60 * 1000;

export function isShareFresh(storedAt: number, now: number = Date.now()): boolean {
  return Number.isFinite(storedAt) && now - storedAt >= 0 && now - storedAt <= SHARE_TTL_MS;
}
