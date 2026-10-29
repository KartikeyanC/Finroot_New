// Pure helpers shared by the Add Investment form and its parts.

export const safeNum = (v: string | number | undefined): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};
export const fmt = (n: number, d = 2) => {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-IN", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
};

/** Today as YYYY-MM-DD in local time — the default purchase date. */
export function todayISO(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/**
 * When a stock purchase happened: the recorded `buy_date`, else the day the
 * record was saved (holdings added before purchase dates existed).
 */
export function buyDateOf(fields: Record<string, string> | undefined, savedAt?: string): string {
  const d = fields?.buy_date;
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return savedAt ? savedAt.slice(0, 10) : todayISO();
}
