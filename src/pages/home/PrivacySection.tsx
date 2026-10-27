import type { CSSProperties } from "react";

import { PROMISES } from "./homeContent";

/**
 * Privacy in plain words. Each promise is something the product does today —
 * RLS, encryption at rest, no tracking (ADR-0009), export and deletion by
 * request. Change a line only if the product changed first.
 */
export default function PrivacySection() {
  return (
    <section className="sec" id="privacy" aria-labelledby="privacy-title">
      <div className="wrap">
        <span className="chip rv">Your data</span>
        <h2 className="h2 rv" id="privacy-title" style={{ maxWidth: 820 }}>
          What happens to your money data, <span className="soft">in plain words.</span>
        </h2>
        <div className="promises">
          {PROMISES.map(({ icon: Icon, title, body }, i) => (
            <div className="promise rv" key={title} style={{ "--d": `${(i % 3) * 0.05}s` } as CSSProperties}>
              <span className="ic"><Icon aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
