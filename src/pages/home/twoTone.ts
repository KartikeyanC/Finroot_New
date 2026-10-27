/**
 * Splits a heading into the part that is set dark and the part that is set
 * soft — "Quietly priced. Loudly worth it." → ["Quietly priced.", "Loudly worth it."].
 *
 * The pricing heading is Product-Owner-editable (`site_settings`), so the home
 * page cannot hard-code where its two tones break. Anything without a sentence
 * break — one clause, or no text — stays a single dark run.
 */
export function twoTone(title: string): [string, string] {
  const clean = title.trim();
  const m = /^(.+?[.!?])\s+(\S.*)$/.exec(clean);
  return m ? [m[1], m[2]] : [clean, ""];
}
