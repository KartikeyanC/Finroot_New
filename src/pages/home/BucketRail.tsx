import { useRef, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";

import { BUCKETS } from "./homeContent";
import { inr } from "./askLogic";

/** The seven buckets as a horizontal rail of cards. */
export default function BucketRail() {
  const rail = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const scroll = (dir: 1 | -1) => {
    const el = rail.current;
    const card = el?.querySelector<HTMLElement>(".bk");
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 14), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section className="sec mist" id="buckets" aria-labelledby="buckets-title">
      <div className="wrap">
        <div className="rail-head">
          <div>
            <span className="chip rv">The seven buckets</span>
            <h2 className="h2 rv" id="buckets-title">Every rupee gets <em>a place.</em></h2>
          </div>
          <div className="rail-nav">
            <button type="button" aria-label="Scroll buckets left" onClick={() => scroll(-1)}><ArrowLeft /></button>
            <button type="button" aria-label="Scroll buckets right" onClick={() => scroll(1)}><ArrowRight /></button>
          </div>
        </div>
        {/* A scroll container must be reachable without a mouse. */}
        <div className="rail" ref={rail} tabIndex={0} role="group" aria-label="The seven buckets">
          {BUCKETS.map((b, i) => (
            <article className="bk" key={b.name} style={{ "--c": b.color } as CSSProperties}>
              <span className="sw" aria-hidden="true" />
              <span className="idx" style={{ marginTop: 14 }}>0{i + 1} / 07</span>
              <h3>{b.name}</h3>
              <p>{b.purpose}</p>
              <div className="eg"><span>Example month</span><b className="num">{inr(b.amt)}</b></div>
            </article>
          ))}
        </div>
        <p className="fine">
          Example month: {inr(BUCKETS.reduce((s, b) => s + b.amt, 0))} of income. You set your own amounts — and every
          expense lands in the right bucket by category.
        </p>
      </div>
    </section>
  );
}
