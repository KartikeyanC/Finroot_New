import { useState, type CSSProperties } from "react";

import { initialValues, inr, QUESTIONS, type Question } from "./askLogic";

/**
 * "Ask your buckets" — plain questions, answered from an example household.
 * The arithmetic lives in `askLogic.ts` (tested); this only draws it.
 *
 * Only the verdict is a live region. The first version of the page made the whole
 * panel `aria-live`, which re-read every slider label on every tick.
 */
export default function AskBuckets() {
  const [active, setActive] = useState<Question["id"]>("trip");
  const [values, setValues] = useState(initialValues);
  const q = QUESTIONS.find((x) => x.id === active)!;
  const v = values[q.id];
  const r = q.solve(v);
  const pct = Math.max(4, Math.min(100, (r.have / r.need) * 100));

  return (
    <section className="sec" id="ask" aria-labelledby="ask-title">
      <div className="wrap">
        <div className="center">
          <span className="chip rv">Ask your buckets</span>
          <h2 className="h2 rv" id="ask-title">Plain questions. <span className="soft">Plain answers.</span></h2>
          <p className="lede rv">
            When every rupee already has a bucket, the answer is just what's left in it. Move the sliders — this is an
            example household, and nothing you change leaves the page.
          </p>
        </div>

        <div className="ask">
          <div className="qs" role="group" aria-label="Questions">
            {QUESTIONS.map((x) => (
              <button type="button" className="q" key={x.id} aria-pressed={x.id === active} onClick={() => setActive(x.id)}>
                <b>{x.q}</b>
                <span>{x.sub}</span>
              </button>
            ))}
          </div>

          <div className="panel rv">
            <p className="panel-q">{q.q}</p>
            <div className="ctrls">
              {q.controls.map((c) => (
                <div className="ctrl" key={`${q.id}-${c.id}`}>
                  <label htmlFor={`ask-${c.id}`}>
                    {c.label} <output htmlFor={`ask-${c.id}`}>{c.fmt(v[c.id])}</output>
                  </label>
                  <input
                    type="range"
                    id={`ask-${c.id}`}
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={v[c.id]}
                    onChange={(e) => setValues((s) => ({ ...s, [q.id]: { ...s[q.id], [c.id]: Number(e.target.value) } }))}
                  />
                </div>
              ))}
            </div>

            <div className={`verdict ${r.ok ? "yes" : "no"}`} role="status">
              <span className="mark" aria-hidden="true">{r.ok ? "✓" : "!"}</span>
              <div>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </div>
            </div>

            <div className="meter">
              <div className="row">
                <span>{q.meter}</span>
                <span className="num">{inr(r.have)} of {inr(r.need)} needed</span>
              </div>
              <div className="track" aria-hidden="true">
                <i style={{ width: `${pct}%`, background: r.ok ? "var(--gain)" : "var(--warn)" } as CSSProperties} />
              </div>
            </div>

            <p className="fine">
              Example household · illustrative figures. In FinRoot, what's left in each bucket is always current, because
              every expense lands in its bucket by category.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
