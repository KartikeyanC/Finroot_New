import { useEffect, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { useBranding } from "@/hooks/useBranding";
import { NAV } from "./homeContent";

/**
 * The floating glass nav. Translucent over the hero, solid white once the hero
 * has scrolled away, and a sheet on phones. Every target is >= 44px
 * (`.fh .nav-end .btn`, `.burger`) — tap-targets.spec.ts pins the 24px floor.
 */
export default function HomeNav({ heroRef }: { heroRef: RefObject<HTMLElement> }) {
  const { appName } = useBranding();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > (heroRef.current?.offsetHeight ?? 600) - 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [heroRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className={`nav${solid ? " solid" : ""}${open ? " open" : ""}`}>
      <div className="wrap">
        <div className="nav-bar">
          <a href="#top" className="hlogo" aria-label={`${appName} home`}>
            <BrandLogo />
            {appName}
          </a>
          <nav className="links" aria-label="Primary">
            {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          </nav>
          <div className="nav-end">
            <Link className="signin" to="/auth">Sign in</Link>
            <Link className="btn btn-start" to="/auth?tab=signup">Start free</Link>
            <button
              type="button"
              className="burger"
              aria-expanded={open}
              aria-controls="home-sheet"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        <div className="sheet" id="home-sheet" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
          {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
          <a href="#faq">FAQ</a>
          <Link to="/auth">Sign in</Link>
          <Link className="btn btn-ink" to="/auth?tab=signup">Start free</Link>
        </div>
      </div>
    </header>
  );
}
