import { BUCKETS, type BucketName } from "./homeContent";

/**
 * "Ask your buckets" — the home page's interactive centrepiece.
 *
 * Each question reads one or two buckets of a made-up example household and
 * answers in a sentence. Nothing here is stored or sent anywhere; the page says
 * so. It is the whole product idea in one gesture: when every rupee already has
 * a bucket, a plain question is just "what's left in this one?".
 *
 * Kept free of React so the arithmetic — which a visitor reads as a promise —
 * is covered by tests.
 */

export const inr = (n: number): string =>
  (n < 0 ? "−" : "") + "₹" + Math.round(Math.abs(n)).toLocaleString("en-IN");

const bucket = (name: BucketName) => BUCKETS.find((b) => b.name === name)!;
/** What's left in a bucket in the example month. */
export const left = (name: BucketName): number => bucket(name).amt - bucket(name).used;

export interface Control {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  val: number;
  fmt: (v: number) => string;
}

export interface Verdict {
  ok: boolean;
  title: string;
  body: string;
  /** What's available, and what's needed — drives the meter. */
  have: number;
  need: number;
}

export interface Question {
  id: "trip" | "fee" | "harvest";
  q: string;
  sub: string;
  meter: string;
  controls: Control[];
  solve: (v: Record<string, number>) => Verdict;
}

/** How many months a harvest has to stretch: until the next one. */
export const SEASON_MONTHS = 9;

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export const QUESTIONS: Question[] = [
  {
    id: "trip",
    q: "Can we afford a weekend trip?",
    sub: "Reads the Play bucket",
    meter: "Play left this month",
    controls: [{ id: "cost", label: "Trip cost", min: 1000, max: 30000, step: 500, val: 5000, fmt: inr }],
    solve: ({ cost }) => {
      const have = left("Play");
      const spare = have - cost;
      const savings = left("Long-Term Savings");
      if (spare >= 0) {
        return { ok: true, title: `Yes — ${inr(spare)} stays in Play.`, body: `Play has ${inr(have)} left this month, so the trip fits without touching any other bucket.`, have, need: cost };
      }
      const short = -spare;
      return {
        ok: false,
        title: `Play is ${inr(short)} short.`,
        body: short <= savings
          ? `Moving ${inr(short)} from Long-Term Savings (${inr(savings)} left) would cover it — or wait until Play refills on the 1st.`
          : "That's more than Play and Long-Term Savings hold this month. Plan it for next month instead.",
        have,
        need: cost,
      };
    },
  },
  {
    id: "fee",
    q: "Is next term's school fee covered?",
    sub: "Reads the Education bucket",
    meter: "Education by the due date",
    controls: [
      { id: "fee", label: "Fee due", min: 5000, max: 80000, step: 1000, val: 36000, fmt: inr },
      { id: "months", label: "Months until it's due", min: 1, max: 12, step: 1, val: 4, fmt: (v) => plural(v, "month") },
    ],
    solve: ({ fee, months }) => {
      const monthly = bucket("Education").amt;
      const have = left("Education") + monthly * (months - 1);
      const gap = fee - have;
      if (gap <= 0) {
        return { ok: true, title: `Covered, with ${inr(-gap)} to spare.`, body: `Education has ${inr(left("Education"))} now and gets ${inr(monthly)} each month — ${inr(have)} by the time the fee is due.`, have, need: fee };
      }
      return {
        ok: false,
        title: `${inr(gap)} short by the due date.`,
        body: `Raising Education by ${inr(Math.ceil(gap / months / 100) * 100)} a month from now would close the gap in time.`,
        have,
        need: fee,
      };
    },
  },
  {
    id: "harvest",
    q: "How long will this harvest last?",
    sub: "Reads Agri and Needs",
    meter: "Household money vs. one season",
    controls: [
      { id: "harvest", label: "Harvest income", min: 100000, max: 1200000, step: 10000, val: 740000, fmt: inr },
      { id: "agri", label: "Kept in Agri for next season", min: 10, max: 60, step: 5, val: 35, fmt: (v) => v + "%" },
      { id: "needs", label: "Household spend a month", min: 15000, max: 90000, step: 1000, val: 40000, fmt: inr },
    ],
    solve: ({ harvest, agri, needs }) => {
      const forAgri = (harvest * agri) / 100;
      const forHome = harvest - forAgri;
      const months = forHome / needs;
      const shown = Math.floor(months * 10) / 10;
      const required = needs * SEASON_MONTHS;
      if (months >= SEASON_MONTHS) {
        return { ok: true, title: `About ${shown} months — past the next harvest.`, body: `${inr(forAgri)} stays in Agri for seed and inputs, and ${inr(forHome)} carries the household through a ${SEASON_MONTHS}-month season.`, have: forHome, need: required };
      }
      return {
        ok: false,
        title: `About ${shown} months — short of a ${SEASON_MONTHS}-month season.`,
        body: `Keeping ${inr(required - forHome)} more for the household, or spending ${inr(Math.ceil((needs - forHome / SEASON_MONTHS) / 100) * 100)} less a month, would bridge it.`,
        have: forHome,
        need: required,
      };
    },
  },
];

/** The starting value of every control, per question. */
export function initialValues(): Record<Question["id"], Record<string, number>> {
  return Object.fromEntries(
    QUESTIONS.map((q) => [q.id, Object.fromEntries(q.controls.map((c) => [c.id, c.val]))]),
  ) as Record<Question["id"], Record<string, number>>;
}
