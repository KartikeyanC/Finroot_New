import { useEffect, type RefObject } from "react";

/**
 * Scroll reveal for the home page: every `.rv` inside `root` fades up once it
 * is on screen. Plain CSS + IntersectionObserver rather than framer-motion — the
 * page has ~40 revealed elements and none of them needs a spring.
 *
 * Two safeties, both lessons the old landing page paid for (BUG-051): an
 * animation must never be able to withhold content, so anything already in view
 * after 1.8 s is shown whether or not the observer fired, and a browser without
 * IntersectionObserver gets everything immediately. Reduced motion is handled in
 * the CSS (`.rv` is simply visible).
 *
 * Only elements that exist when the page mounts are observed, so do not put
 * `.rv` on anything data-driven (the pricing cards); wrap the container instead.
 */
export function useReveal(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>(".rv"));
    if (!("IntersectionObserver" in window)) {
      items.forEach((i) => i.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    items.forEach((i) => io.observe(i));
    const t = window.setTimeout(() => {
      items.forEach((i) => { if (i.getBoundingClientRect().top < window.innerHeight) i.classList.add("in"); });
    }, 1800);
    return () => { io.disconnect(); window.clearTimeout(t); };
  }, [root]);
}
