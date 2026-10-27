import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from "framer-motion";

import { HOUSEHOLDS } from "./content";
import { card } from "./tokens";

/**
 * The example-households carousel — split out of Landing.tsx in Stage 4.13.
 *
 * It used to rotate customer testimonials that were invented; the landing
 * brief (§8) rules those out, so the slides are now research personas, each
 * labelled as an illustration. Auto-advancing, drag-dismissable slides. The `overflow-hidden` on the track
 * is load-bearing, not styling: it was the whole of Stage 4.6 / BUG-028 (see
 * the comment inside).
 */

/* ── 6. Example-households carousel ───────────────────────────────────── */
export default function Voices() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  // WCAG 2.2.2: anything that moves on its own for more than five seconds must
  // stop when the reader is looking at it or working inside it.
  const [paused, setPaused] = useState(false);
  const go = useCallback((d: number) => { setDir(d); setI((p) => (p + d + HOUSEHOLDS.length) % HOUSEHOLDS.length); }, []);

  useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => { setDir(1); setI((p) => (p + 1) % HOUSEHOLDS.length); }, 5200);
    return () => clearInterval(id);
  }, [reduce, paused]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(1);
    else if (info.offset.x > 60) go(-1);
  };

  const t = HOUSEHOLDS[i];
  return (
    <div
      className="max-w-3xl mx-auto"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    >
      <p className="mb-5 text-center text-xs text-[#8b9a94]">Illustrative households from our research — not customer quotes.</p>
      {/*
        Stage 4.6 / BUG-028 — the 36 px mobile overflow lived here, not in the
        aurora blob the audit suspected.
        Each slide is `absolute inset-0` and enters/leaves at `x: ±60`, and it
        is also drag-enabled. Without a clip, a card mid-transition (or mid-drag)
        sticks out past the viewport and widens the document — measured at 375 px
        wide: scrollWidth 411, and the outermost offender was this figure at
        left: 84 / right: 411.
        Clipping the track is the correct fix regardless: the slide is meant to
        appear from beyond the card's own edge, which is exactly what
        overflow-hidden describes.
      */}
      <div className="relative h-[300px] sm:h-[240px] overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={i}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            className={`absolute inset-0 ${card} p-8 sm:p-10 flex flex-col justify-center text-center cursor-grab active:cursor-grabbing`}
          >
            <div className="text-xs uppercase tracking-[0.18em] text-[#13B98F] font-medium">{t.who}</div>
            <p className="mt-4 text-xl sm:text-2xl font-medium leading-snug text-white">{t.need}</p>
            <p className="mt-4 text-sm sm:text-[15px] text-[#9aa3a0] leading-relaxed max-w-xl mx-auto">
              <span className="text-[#c9cfcc]">With FinRoot: </span>{t.use}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-6 flex items-center justify-center gap-[18px]">
        {/*
          Stage 4.7 — the dots were 6×6 px targets, the smallest controls in the
          product and a clear WCAG 2.5.8 failure. The dot has to STAY 6 px to
          read as a dot, so the target is grown with a transparent
          pseudo-element instead: `before:-inset-[9px]` gives a 24×24 hit area
          that paints nothing. Do not "clean this up" into padding — padding
          would resize the dot itself.

          BUG-093/095 — the gap is load-bearing and was wrong. At `gap-2` the
          dots sat 14 px apart centre-to-centre while each claimed 24 px, so
          neighbouring hit areas overlapped and the later sibling won: the
          MIDDLE dot's real target was 13×23 px, half the minimum, and a tap
          just right of it selected the next slide. 2.5.8 wants 24 px between
          centres for undersized targets — 6 px dot + 18 px gap is exactly that,
          so the areas tile edge to edge with nothing contested and no dead
          space. Changing either number without the other reopens this.
        */}
        {HOUSEHOLDS.map((_, k) => (
          <button key={k} data-cursor aria-label={`Example household ${k + 1} of ${HOUSEHOLDS.length}`} aria-current={k === i ? "true" : undefined}
            onClick={() => { setDir(k > i ? 1 : -1); setI(k); }}
            className={`relative h-1.5 rounded-full transition-all duration-300 before:absolute before:-inset-[9px] before:content-[''] ${k === i ? "w-8 bg-[#0D7A5F]" : "w-1.5 bg-white/20 hover:bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
}
