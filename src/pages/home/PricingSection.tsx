import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";

import { useResolvedPricing } from "@/hooks/usePricingContent";
import { twoTone } from "./twoTone";

/**
 * Pricing. Copy and prices come from the database (`useResolvedPricing`): the
 * heading and each card's wording are Product-Owner-editable, and a card's price
 * is read from the `plans` catalogue, never typed here (BUG-019). This file only
 * decides how that data looks.
 *
 * `.rv` goes on the grid, not on the cards: cards can be replaced when the data
 * arrives, and an element created after mount is never revealed.
 */
export default function PricingSection() {
  const pricing = useResolvedPricing();
  const [first, rest] = twoTone(pricing.title);
  const n = Math.min(Math.max(pricing.cards.length, 1), 3);

  return (
    <section className="sec mist" id="pricing" aria-labelledby="pricing-title">
      <div className="wrap">
        <div className="center">
          <span className="chip rv">{pricing.eyebrow}</span>
          <h2 className="h2 rv" id="pricing-title">{first}{rest && <> <span className="soft">{rest}</span></>}</h2>
        </div>

        <div className={`plans rv n${n}`} style={{ "--n": n } as CSSProperties}>
          {pricing.cards.map((p, i) => (
            <div className={`plan${p.highlight ? " feat" : ""}`} key={`${p.name}-${i}`}>
              <div className="pt">
                <span>{p.name}</span>
                {p.badge && <span className="tag">{p.badge}</span>}
              </div>
              <div className="pp">
                <strong className="num">{p.price}</strong>
                {p.period && <span>{p.period}</span>}
              </div>
              <p className="pb">{p.blurb}</p>
              <ul>
                {p.features.map((f, fi) => (
                  <li key={`${f}-${fi}`}><Check aria-hidden="true" /><span>{f}</span></li>
                ))}
              </ul>
              <Link className={`btn ${p.highlight ? "btn-white" : "btn-ink"}`} to={!p.ctaHref || p.ctaHref === "/auth" ? "/auth?tab=signup" : p.ctaHref}>
                {p.cta} <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
        <p className="note">Prices in INR. Cancel in one click — your data stays.</p>
      </div>
    </section>
  );
}
