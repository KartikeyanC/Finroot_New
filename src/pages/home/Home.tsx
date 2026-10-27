import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

import { SkipLink } from "@/components/SkipLink";
import AskBuckets from "./AskBuckets";
import BucketRail from "./BucketRail";
import { Closing, HomeFooter } from "./ClosingFooter";
import FaqSection from "./FaqSection";
import Households from "./Households";
import HomeHero, { TrustStrip } from "./HomeHero";
import HomeNav from "./HomeNav";
import OrbitSection from "./OrbitSection";
import PricingSection from "./PricingSection";
import PrivacySection from "./PrivacySection";
import { useReveal } from "./useReveal";
import "./home.base.css";
import "./home.sections.css";
import "./home.end.css";

/**
 * The public home page (`/`) — "Your household's money, clearly answered."
 *
 * It replaced the dark "glass dashboard" landing page (`pages/Landing.tsx`,
 * which is still in the repository, unrouted). Everything the old page took from
 * the app it still does: the pricing cards come from the database, the name and
 * tagline from the Product Owner's branding, and the skip link, `<main>` landmark
 * and single `<h1>` are unchanged — e2e/ui-a11y.spec.ts and tap-targets.spec.ts
 * pin them.
 *
 * Styles are scoped under `.fh` (home.*.css), so none of this can leak into the
 * app. The page paints its own surface: the app theme sets the `<body>` colours
 * and the home page is a fixed light design, like the old one was a fixed dark
 * one (BUG-094).
 *
 * Content rules: docs/Landing_Design_Brief.md §8 — every claim true of the
 * product, every figure an example that says so.
 */
export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  useReveal(root);

  // In-page links glide, unless the visitor asked for less motion.
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = reduce ? "auto" : "smooth";
    return () => { el.style.scrollBehavior = prev; };
  }, [reduce]);

  return (
    <div className="fh fh-js" ref={root}>
      <SkipLink target="landing-main" className="focus:bg-[#0D7A5F] focus:text-white focus:ring-white/70" />
      <HomeNav heroRef={hero} />
      <main id="landing-main" tabIndex={-1}>
        <HomeHero ref={hero} />
        <TrustStrip />
        <AskBuckets />
        <BucketRail />
        <OrbitSection />
        <Households />
        <PrivacySection />
        <PricingSection />
        <FaqSection />
        <Closing />
      </main>
      <HomeFooter />
    </div>
  );
}
