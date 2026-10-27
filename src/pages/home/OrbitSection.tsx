import type { CSSProperties } from "react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { LEDGER_FACTS, ORBIT_INNER, ORBIT_OUTER } from "./homeContent";

/** Pills spaced evenly round a ring, starting at 12 o'clock. */
function Ring({ items, className }: { items: [string, string][]; className: string }) {
  return (
    <div className={className}>
      {items.map(([label, color], i) => {
        const a = (i / items.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <div className="node" key={label} style={{ left: `${50 + 50 * Math.cos(a)}%`, top: `${50 + 50 * Math.sin(a)}%` }}>
            <span style={{ "--c": color } as CSSProperties}><i />{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** "One ledger": where entries come from, and who can see them. */
export default function OrbitSection() {
  return (
    <section className="sec" aria-labelledby="ledger-title">
      <div className="wrap orbit-sec">
        <div>
          <span className="chip rv">One ledger</span>
          <h2 className="h2 rv" id="ledger-title">Different sources. <span className="soft">One household picture.</span></h2>
          <p className="lede rv">
            Type it, import it, or snap it. Everything lands in the same private ledger, and everyone you invite sees the
            same numbers — or only the parts you choose.
          </p>
          <div className="facts">
            {LEDGER_FACTS.map(({ icon: Icon, title, body }) => (
              <div className="fact rv" key={title}>
                <Icon aria-hidden="true" />
                <div><b>{title}</b><span>{body}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="orbit rv" aria-hidden="true">
          <div className="ring" />
          <div className="ring r2" />
          <Ring className="spin" items={ORBIT_OUTER} />
          <Ring className="spin rev" items={ORBIT_INNER} />
          <div className="core"><BrandLogo /></div>
        </div>
      </div>
    </section>
  );
}
