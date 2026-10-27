import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { useBranding } from "@/hooks/useBranding";
import { BUCKETS, FOOTER_COLUMNS } from "./homeContent";

/** The last call to action, with four of the buckets drifting behind it. */
export function Closing() {
  const drift = [
    { name: BUCKETS[0].name, style: { left: "8%", top: "18%" } },
    { name: BUCKETS[1].name, style: { right: "10%", top: "14%", animationDelay: "-2s" } },
    { name: BUCKETS[6].name, style: { left: "12%", bottom: "16%", animationDelay: "-4s" } },
    { name: BUCKETS[5].name, style: { right: "14%", bottom: "20%", animationDelay: "-6s" } },
  ];
  return (
    <section className="closing" aria-labelledby="closing-title">
      {drift.map((d) => <span key={d.name} className="drift" style={d.style} aria-hidden="true">{d.name}</span>)}
      <h2 id="closing-title">Two minutes to set up. <em>Seven buckets to fill.</em></h2>
      <p>One place where every rupee in the household is accounted for.</p>
      <div className="hero-cta">
        <Link className="btn btn-white" to="/auth?tab=signup">Start free <ArrowRight aria-hidden="true" /></Link>
        <a className="btn btn-glass" href="#pricing">Compare plans</a>
      </div>
    </section>
  );
}

/** Branding (name, tagline) comes from the Product Owner's settings, like the old footer. */
export function HomeFooter() {
  const brand = useBranding();
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <a href="#top" className="hlogo"><BrandLogo />{brand.appName}</a>
            <p>{brand.tagline} Made in India.</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3>{col.title}</h3>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"to" in l ? <Link to={l.to}>{l.label}</Link> : <a href={l.href}>{l.label}</a>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="foot-bar">
          <span>© {new Date().getFullYear()} {brand.appName}. All rights reserved.</span>
          <span>Made in India</span>
        </div>
      </div>
    </footer>
  );
}
