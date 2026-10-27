import { useRef, useState, type KeyboardEvent } from "react";

import { HOUSEHOLDS } from "./homeContent";

/**
 * Households like yours — five example households from the persona research,
 * each with the part of FinRoot that matters to them. They are labelled as
 * examples, not customers (landing brief §8).
 *
 * A real tablist: arrow keys move between tabs, only the selected tab is in the
 * tab order, and the panel is labelled by its tab.
 */
export default function Households() {
  const [key, setKey] = useState(HOUSEHOLDS[0].key);
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({});
  const h = HOUSEHOLDS.find((x) => x.key === key)!;

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = HOUSEHOLDS.findIndex((x) => x.key === key);
    const next = HOUSEHOLDS[(i + step + HOUSEHOLDS.length) % HOUSEHOLDS.length].key;
    setKey(next);
    tabs.current[next]?.focus();
  };

  return (
    <section className="sec mist" id="households" aria-labelledby="households-title">
      <div className="wrap">
        <div className="center">
          <span className="chip rv">Households like yours</span>
          <h2 className="h2 rv" id="households-title">Different incomes. <span className="soft">The same seven buckets.</span></h2>
          <p className="lede rv">Example households from our research — not customer quotes.</p>
        </div>

        <div className="ptabs" role="tablist" aria-label="Example households" onKeyDown={onKeyDown}>
          {HOUSEHOLDS.map((x) => (
            <button
              type="button"
              role="tab"
              key={x.key}
              id={`home-tab-${x.key}`}
              aria-controls="home-household"
              aria-selected={x.key === key}
              tabIndex={x.key === key ? 0 : -1}
              ref={(el) => { tabs.current[x.key] = el; }}
              onClick={() => setKey(x.key)}
            >
              {x.tab}
            </button>
          ))}
        </div>

        <div className="pcard" id="home-household" role="tabpanel" aria-labelledby={`home-tab-${h.key}`}>
          <div className="pc-l">
            <span className="who">{h.who}</span>
            <h3>“{h.line}”</h3>
            <p>{h.body}</p>
            <span className="tag">Example household · illustrative</span>
          </div>
          <div className="pc-r">
            <div className="uses">
              {h.uses.map(({ icon: Icon, title, body, planned }) => (
                <div className="use" key={title}>
                  <span className="ic"><Icon aria-hidden="true" /></span>
                  <div>
                    <b>{title}{planned && <span className="soon">PLANNED</span>}</b>
                    <span>{body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
