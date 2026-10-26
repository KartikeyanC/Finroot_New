import {
  Download, EyeOff, Globe2, HeartHandshake, KeyRound, ShieldCheck, Sprout,
  Target, TrendingUp, UserRound, Users, Wallet,
} from "lucide-react";

/**
 * Landing page copy and catalogues — split out in Stage 4.13.
 *
 * Landing.tsx was 1 414 lines, and a good third of it was prose. Marketing
 * copy changes on a completely different cadence from the animation and layout
 * code it was wedged between, and mixing the two is what made the file
 * unreviewable. Editing the words now means opening this file and nothing else.
 *
 * Every claim here must be true of the product (docs/Landing_Design_Brief.md
 * §8): no invented user counts, ratings or testimonials, the bucket names are
 * the app's own (`BUDGET_BUCKETS`), and nothing says a salary "auto-splits" —
 * the user sets the allocation. The persona framing comes from
 * F:\Movie\AK\FinRoot\research (proto-personas, not yet validated).
 */

/* ═══════════════════════════ content ═══════════════════════════ */
export const NAV = [
  { label: "Who it's for", href: "#who" },
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Privacy", href: "#privacy" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];
export const FEATURES = [
  { icon: Wallet, title: "Every rupee, accounted for", body: "Income, expenses and investments in one ledger across 5 currencies — categorised as you go, owned by you.", span: "md:col-span-3", tall: true },
  { icon: Users, title: "One household, clear roles", body: "Invite your partner, parents or advisor. The owner decides which sections each member can open, and who can only view.", span: "md:col-span-3", tall: true },
  { icon: Target, title: "Goals that breathe", body: "Set a target and a date, then watch progress move as money is put aside. Pause and resume any time.", span: "md:col-span-2", tall: false },
  { icon: TrendingUp, title: "Investment intelligence", body: "Portfolio value, dividends and interest drawn from your own transactions, with live price refresh.", span: "md:col-span-2", tall: false },
  { icon: ShieldCheck, title: "Private by architecture", body: "Row-level security on every finance table, encrypted at rest. Your numbers are never sold.", span: "md:col-span-2", tall: false },
];
export const WORKFLOW = [
  { n: "01", t: "Capture", d: "Log income and expenses in seconds, import a bank statement, or scan a bill — rows arrive categorised and ready to review." },
  { n: "02", t: "Divide by design", d: "Decide once how each month divides across seven buckets. Log a spend and it lands in the right bucket by category, so what's left is always current." },
  { n: "03", t: "Share and compound", d: "Everyone in the household sees the same numbers. Goals move as money is put aside, and bills and renewals show up on one calendar before they're due." },
];

/** Persona strip. `main` marks the primary persona (Household CFO). */
export const WHO = [
  { icon: Users, title: "Families & couples", body: "One budget both partners trust, bills and premiums on one calendar, and roles for who sees what.", href: "#workflow", cta: "How households use it", main: true },
  { icon: UserRound, title: "Young professionals", body: "Divide your salary on payday and see what's left in each bucket.", href: "#method", cta: "Try the buckets" },
  { icon: Globe2, title: "NRIs & freelancers", body: "Accounts in INR, USD, EUR, GBP and AED, totalled in your home currency.", href: "#product", cta: "Multi-currency" },
  { icon: Sprout, title: "Farming households", body: "An Agri bucket for land and inputs, beside the household's own.", href: "#farming", cta: "For farming families" },
  { icon: HeartHandshake, title: "Parents & retirees", body: "Policies, renewals and documents in one place — with a son or daughter who can see them too.", href: "#privacy", cta: "Your data, plainly" },
];

/** The app's own seven buckets (`BUDGET_BUCKETS`), with one-line purposes from the brief. */
export const BUCKETS = [
  { name: "Needs", purpose: "Rent, food, transport, health — whatever keeps the month running.", color: "#19B886" },
  { name: "Financial Freedom", purpose: "Money set aside to buy your independence, one month at a time.", color: "#C9A84C" },
  { name: "Education", purpose: "Courses, fees, books — learning as a line, not a leftover.", color: "#6aa7e8" },
  { name: "Play", purpose: "Spend it without guilt. It was planned for.", color: "#e07a9a" },
  { name: "Long-Term Savings", purpose: "The slow money: the house, the retirement, the rainy decade.", color: "#9b87f0" },
  { name: "Giving", purpose: "What you share, decided before the month can talk you out of it.", color: "#f0a35c" },
  { name: "Agri", purpose: "Land, inputs and farm goals — the bucket most apps forget.", color: "#7cc46b" },
] as const;

/** Illustrative splits for the interactive demo. Each row sums to 100. */
export const SPLITS = [
  { id: "balanced", label: "Balanced", pct: [45, 15, 7, 10, 12, 5, 6] },
  { id: "saver", label: "Saver", pct: [40, 20, 8, 8, 15, 4, 5] },
  { id: "farm", label: "Farming family", pct: [40, 10, 8, 7, 10, 5, 20] },
] as const;

/**
 * Example households, replacing the old invented testimonials (brief §8: no
 * customer names or quotes). Each is a persona from the research, labelled on
 * the page as an illustration.
 */
export const HOUSEHOLDS = [
  { who: "Dual income · Mumbai · one child", need: "We don't fight about money — we fight about not knowing.", use: "One shared budget, school fees and premiums on the calendar, both partners see the same buckets." },
  { who: "Salaried · Bengaluru · renting", need: "I check my balance after it has already rained.", use: "Divides salary on payday across seven buckets and snaps bills so UPI spends stop vanishing." },
  { who: "Joint family · Coimbatore · farmland", need: "Rain decides our income. Nobody decides our expenses.", use: "Logs harvest income as it arrives, keeps the Agri bucket apart, and a daughter manages entries for the family." },
  { who: "Retired couple · Chennai · children abroad", need: "I don't want to grow money. I want to not lose track of it.", use: "Policies and FD maturities in one place, with their son added as a member to see the same view." },
];

export const FARMING = [
  { title: "An Agri bucket of its own", body: "Set money aside for the next season before the household spends." },
  { title: "Lump-sum income, logged as it lands", body: "Record harvest, dairy or shop income whenever it comes — not only a monthly salary." },
  { title: "The whole family, one view", body: "A son or daughter can keep the entries while elders see the same numbers." },
  { title: "Works like your notebook", body: "Type entries by hand. No bank connection needed." },
];
export const FARMING_PLANNED = ["Harvest-to-harvest view", "Hindi, Marathi, Tamil and Punjabi"];

/** Plain-language privacy promises. Each one is true of the product today. */
export const PRIVACY = [
  { icon: KeyRound, title: "We never ask for your bank password", body: "FinRoot can't move money. It only shows what you add to it." },
  { icon: Wallet, title: "You choose how money gets in", body: "Type it, import a statement from your bank, or scan a bill." },
  { icon: Users, title: "You decide who sees what", body: "The owner chooses which sections each member can open, and who can only view." },
  { icon: ShieldCheck, title: "Only your household can read it", body: "Encrypted at rest, and locked to your workspace inside the database itself." },
  { icon: EyeOff, title: "No tracking, no ads", body: "No analytics scripts, ad pixels or tracking cookies. Your numbers are never sold." },
  { icon: Download, title: "Yours to take", body: "Export your records any time, and ask us to delete your account." },
];

export const FAQ = [
  { q: "Is my financial data safe?", a: "Every row is encrypted at rest, scoped to your household with row-level security, and never sold. You can export your records at any time, and ask us to delete your account." },
  { q: "Do I have to connect my bank?", a: "No. Add transactions by hand, import a statement from your bank, or scan a bill. FinRoot never asks for your banking password." },
  { q: "Can my family use it together?", a: "Yes. Invite members to your household. The owner decides which sections each person can open, and who can only view." },
  { q: "What are the seven buckets?", a: "Needs, Financial Freedom, Education, Play, Long-Term Savings, Giving and Agri. You choose how much of each month goes into each one." },
  { q: "Do you track me?", a: "No. There is no analytics script, no ad pixel and no tracking cookie on this site or in the app." },
  { q: "Do you support multiple currencies?", a: "Yes — INR, USD, EUR, GBP and AED out of the box, with totals in your home currency." },
  { q: "Can I cancel anytime?", a: "Yes. Plans are monthly. Cancel in one click — your data stays." },
];
export const MARQUEE = ["Encrypted at rest", "Seven-bucket budgeting", "Household roles", "Live investment prices", "Multi-currency", "Bill scanning", "No tracking cookies"];
