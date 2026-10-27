import { forwardRef, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";

import { BUCKETS, TRUST_STRIP } from "./homeContent";
import { inr, left } from "./askLogic";

/** The weekend trip the floating "Can we go?" card asks about. */
const TRIP = 5000;
const totalLeft = BUCKETS.reduce((s, b) => s + (b.amt - b.used), 0);
const totalAmt = BUCKETS.reduce((s, b) => s + b.amt, 0);
const BAR_GROW = (i: number): CSSProperties => ({ animationDelay: `${0.5 + i * 0.08}s` });

/**
 * Hero: the promise, two buttons, and the product — a phone showing the
 * example household, with three floating cards that answer plain questions.
 * The phone and cards are decorative and `aria-hidden` (every figure is an
 * example; a screen reader should not read them out as the visitor's own).
 */
const HomeHero = forwardRef<HTMLElement>(function HomeHero(_props, ref) {
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);

  // Cards drift a few pixels against the pointer. Fine pointers only.
  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !stage.current) return;
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    stage.current.querySelectorAll<HTMLElement>("[data-depth]").forEach((el) => {
      const d = Number(el.dataset.depth);
      el.style.transform = `translate(${-x * d}px, ${-y * d}px)`;
    });
  };

  return (
    <section className="hero" id="top" ref={ref} onPointerMove={onMove}>
      <div className="wrap hero-inner">
        <span className="pill rv"><b>FOR FAMILIES</b> One plan the whole household can see</span>
        <h1 className="rv" style={{ "--d": ".05s" } as CSSProperties}>
          Your household's money, <em>clearly answered.</em>
        </h1>
        <p className="sub rv" style={{ "--d": ".1s" } as CSSProperties}>
          Divide each month across seven buckets, and everyday questions answer themselves — can we go this weekend,
          is the fee covered, how long will this harvest last.
        </p>
        <div className="hero-cta rv" style={{ "--d": ".15s" } as CSSProperties}>
          <Link className="btn btn-white" to="/auth?tab=signup">
            Start free — no card <ArrowRight aria-hidden="true" />
          </Link>
          <a className="btn btn-glass" href="#ask">Ask your buckets</a>
        </div>
        <p className="hero-note rv" style={{ "--d": ".2s" } as CSSProperties}>Free plan · No bank password · No tracking cookies</p>

        <div className="stage rv" style={{ "--d": ".15s" } as CSSProperties} aria-hidden="true" ref={stage}>
          <div className="float f1" data-depth="18">
            <div className="k">Emergency fund</div>
            <div className="v num">72%</div>
            <div className="dots7">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} className={i > 4 ? "off" : ""} />)}
            </div>
            <p>₹2,16,000 of ₹3,00,000</p>
          </div>

          <div className="phone" data-depth="6">
            <div className="screen">
              <div className="sc-top">
                <span className="sc-hi">Good evening<b>Priya's household</b></span>
                <span className="sc-av">P</span>
              </div>
              <div className="sc-label">Left this month</div>
              <div className="sc-big num">{inr(totalLeft)}<small> of {inr(totalAmt)}</small></div>
              <span className="sc-gain">12 days to go · on plan</span>
              <div className="sc-list">
                {BUCKETS.slice(0, 5).map((b, i) => (
                  <div className="sc-row" key={b.name}>
                    <div><span>{b.name}</span><span>{inr(b.amt - b.used)} left</span></div>
                    <div className="sc-bar"><i style={{ width: `${Math.round((b.used / b.amt) * 100)}%`, background: b.color, ...BAR_GROW(i) }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="float f2" data-depth="26">
            <div className="k">Can we go to Goa?</div>
            <div className="v num">{inr(left("Play"))} in Play</div>
            <span className="answer">✓ Yes, with {inr(left("Play") - TRIP)} to spare</span>
          </div>
          <div className="float f3" data-depth="14">
            <div className="k">Coming up</div>
            <div className="v">Term premium</div>
            <p>₹3,600 · due in 6 days</p>
          </div>
        </div>
      </div>
      <div style={{ height: 64 }} />
    </section>
  );
});

export default HomeHero;

/** The row of plain facts under the hero. */
export function TrustStrip() {
  return (
    <div className="strip">
      <div className="wrap strip-in">
        {TRUST_STRIP.map(({ icon: Icon, text }) => (
          <span key={text}><Icon aria-hidden="true" />{text}</span>
        ))}
      </div>
    </div>
  );
}
