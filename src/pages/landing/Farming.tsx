import { Sprout } from "lucide-react";

import { FARMING, FARMING_PLANNED } from "./content";
import { card, eyebrow } from "./tokens";
import { Reveal } from "./primitives";

/**
 * Farming households — the Agri bucket is the one most apps don't have, so it
 * gets a section rather than a line in a list. The example harvest on the right
 * is illustrative (and labelled so); the two "planned" items are not built yet
 * and must stay marked as such until they are.
 */

const HARVEST = 740000;
const ALLOC = [
  { name: "Agri — next season", amt: 260000 },
  { name: "Needs — the household, 9 months", amt: 360000 },
  { name: "Long-Term Savings", amt: 80000 },
  { name: "Giving", amt: 40000 },
];
const SPENT = [
  { name: "Drip irrigation repair", amt: 38000 },
  { name: "Fertiliser", amt: 42800 },
  { name: "Labour, pruning", amt: 18000 },
];
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
const agriLeft = ALLOC[0].amt - SPENT.reduce((s, x) => s + x.amt, 0);
const agriLeftPct = Math.round((agriLeft / ALLOC[0].amt) * 100);

export default function Farming() {
  return (
    <section id="farming" aria-labelledby="farming-title" className="max-w-6xl mx-auto px-6 py-28 scroll-mt-24">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <Reveal className="min-w-0">
          <div className={eyebrow + " mb-3"}>Farming households</div>
          <h2 id="farming-title" className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
            When income comes with the harvest, <span className="text-[#8b9a94]">not on the 1st.</span>
          </h2>
          <p className="mt-5 text-[#9aa3a0] leading-relaxed max-w-xl">
            FinRoot's budget has an Agri bucket built in. Keep farm money — land, seed, fertiliser, equipment — apart from the household's, so a good season pays for the lean months.
          </p>
          <ul className="mt-8 grid gap-4">
            {FARMING.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#7cc46b]/15 text-[#7cc46b]" aria-hidden="true">
                  <Sprout className="w-4 h-4" />
                </span>
                <span>
                  <span className="block font-medium text-white">{f.title}</span>
                  <span className="block text-sm text-[#9aa3a0]">{f.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-[#8b9a94]">
            Planned next:{" "}
            {FARMING_PLANNED.map((p, i) => (
              <span key={p}>
                <span className="text-[#c9cfcc]">{p}</span>{i < FARMING_PLANNED.length - 1 ? " · " : "."}
              </span>
            ))}
          </p>
        </Reveal>

        <Reveal i={1} className="min-w-0">
          <div className={`${card} p-6 sm:p-8 bg-gradient-to-br from-[#7cc46b]/[0.07] to-transparent`}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-white">Grape harvest received</span>
              <span className="text-xs text-[#8b9a94]">Illustrative</span>
            </div>
            <div className="mt-2 text-4xl font-semibold text-white tabular-nums">{inr(HARVEST)}</div>
            <ul className="mt-5 divide-y divide-white/[0.07] text-sm">
              {ALLOC.map((a) => (
                <li key={a.name} className="flex justify-between gap-4 py-2.5">
                  <span className="text-[#c9cfcc]">{a.name}</span>
                  <span className="text-white tabular-nums">{inr(a.amt)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-white">Agri bucket</span>
                <span className="text-[#9aa3a0] tabular-nums">{inr(agriLeft)} left</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/[0.08] overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-[#7cc46b]" style={{ width: `${agriLeftPct}%` }} />
              </div>
              <ul className="mt-3 text-sm">
                {SPENT.map((s) => (
                  <li key={s.name} className="flex justify-between gap-4 py-1.5">
                    <span className="text-[#9aa3a0]">{s.name}</span>
                    <span className="text-[#c9cfcc] tabular-nums">−{inr(s.amt)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[#8b9a94]">{agriLeftPct}% of this season's inputs still to spend.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
