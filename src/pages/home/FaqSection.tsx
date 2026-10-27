import { Link } from "react-router-dom";

import { FAQ } from "./homeContent";

/**
 * Native <details>: keyboard and screen-reader behaviour for free, and the
 * answers are in the document for search engines without any script.
 */
export default function FaqSection() {
  return (
    <section className="sec" id="faq" aria-labelledby="faq-title">
      <div className="wrap faq">
        <div className="faq-side">
          <span className="chip">FAQ</span>
          <h2 className="h2" id="faq-title">Answers, <em>before you ask.</em></h2>
          <p>Still curious? <Link to="/support">Talk to support →</Link></p>
        </div>
        <div className="faq-list">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}<span className="pm" aria-hidden="true" /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
