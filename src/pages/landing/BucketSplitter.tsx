import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { BUCKETS, SPLITS } from "./content";
import { card, eyebrow } from "./tokens";
import { ease } from "@/animations";

/**
 * The interactive seven-bucket demo that replaced the static ring.
 *
 * A visitor types a monthly income and picks an example split; every figure
 * recalculates. It is a demonstration, not a planner: nothing is stored, and
 * the copy says the split is set by the user in the app (brief §8 — never claim
 * a salary "auto-splits").
 */

const MAX_DIGITS = 9; // ₹99,99,99,999 — far past any monthly income
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function BucketSplitter() {
  const reduce = useReducedMotion();
  const inputId = useId();
  const [digits, setDigits] = useState("120000");
  const [splitId, setSplitId] = useState<(typeof SPLITS)[number]["id"]>(SPLITS[0].id);
  const income = Number(digits) || 0;
  const split = SPLITS.find((s) => s.id === splitId) ?? SPLITS[0];

  return (
    <div id="method" className={`${card} p-6 sm:p-10 overflow-hidden scroll-mt-24`}>
      <div className="grid lg:grid-cols-[1fr_1.15fr] gap-10 items-start">
        <div className="min-w-0">
          <div className={eyebrow + " mb-3"}>Try the seven buckets</div>
          <h3 className="text-3xl md:text-4xl font-semibold leading-tight mb-4 text-white">Give every rupee a place before the month begins.</h3>
          <p className="text-[#9aa3a0] leading-relaxed mb-8">Type a monthly income and pick an example split. In the app you set your own percentages, and every expense lands in the right bucket by category.</p>

          <label htmlFor={inputId} className="block text-sm text-[#9aa3a0] mb-2">Monthly income</label>
          <div className="flex items-baseline gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 focus-within:border-[#19B886] transition-colors">
            <span className="text-2xl text-[#8b9a94]" aria-hidden="true">₹</span>
            <input
              id={inputId}
              inputMode="numeric"
              autoComplete="off"
              value={digits ? Number(digits).toLocaleString("en-IN") : ""}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS))}
              className="w-full min-w-0 h-14 bg-transparent text-3xl font-semibold text-white tabular-nums outline-none"
            />
          </div>

          <div className="mt-6 text-sm text-[#9aa3a0] mb-2" id={`${inputId}-splits`}>Example split</div>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${inputId}-splits`}>
            {SPLITS.map((s) => (
              <button
                key={s.id}
                type="button"
                data-cursor
                aria-pressed={s.id === splitId}
                onClick={() => setSplitId(s.id)}
                className={`min-h-[44px] px-4 rounded-xl text-sm border transition-colors ${s.id === splitId ? "bg-[#19B886] border-[#19B886] text-[#04130d] font-semibold" : "border-white/15 text-[#c9cfcc] hover:bg-white/5"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex h-3 gap-[3px] mb-6" aria-hidden="true">
            {BUCKETS.map((b, i) => (
              <motion.span
                key={b.name}
                className="h-full rounded-sm"
                style={{ background: b.color }}
                animate={{ flexGrow: split.pct[i] }}
                transition={reduce ? { duration: 0 } : { duration: 0.6, ease: ease.standard }}
              />
            ))}
          </div>
          <table className="w-full text-sm">
            <caption className="sr-only">Example split of {inr(income)} across the seven buckets</caption>
            <thead className="sr-only">
              <tr><th scope="col">Bucket</th><th scope="col">Share</th><th scope="col">Amount</th></tr>
            </thead>
            <tbody>
              {BUCKETS.map((b, i) => (
                <tr key={b.name} className="border-t border-white/[0.07] first:border-0">
                  <th scope="row" className="py-3 pr-3 text-left font-normal align-top">
                    <span className="flex items-center gap-2.5 text-white">
                      <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: b.color }} aria-hidden="true" />
                      {b.name}
                    </span>
                    <span className="hidden sm:block mt-0.5 pl-5 text-xs text-[#8b9a94]">{b.purpose}</span>
                  </th>
                  <td className="py-3 px-2 text-right text-[#8b9a94] tabular-nums align-top">{split.pct[i]}%</td>
                  <td className="py-3 pl-2 text-right text-white font-medium tabular-nums align-top whitespace-nowrap">{inr((income * split.pct[i]) / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-[#8b9a94]">Illustrative figures. Nothing you type here leaves this page.</p>
        </div>
      </div>
    </div>
  );
}
