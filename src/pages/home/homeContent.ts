import {
  CalendarDays, Download, EyeOff, FileText, Globe2, KeyRound, Leaf, Lock, PenLine, ScanLine, ShieldCheck,
  Target, TrendingUp, Users, Wallet, type LucideIcon,
} from "lucide-react";

/**
 * Home page copy and catalogues. Editing the words means opening this file and
 * nothing else — the same split `landing/content.ts` made for the old page.
 *
 * Content rules (docs/Landing_Design_Brief.md §8) apply to every line: the
 * bucket names are the app's own (`BUDGET_BUCKETS`), nothing says a salary
 * "auto-splits", no invented customers, counts or ratings, and every figure on
 * the page is an example that says so. The households come from the persona
 * research (F:\Movie\AK\FinRoot\research) and are labelled as examples.
 *
 * Pricing is NOT here: the cards come from the database (`useResolvedPricing`).
 */

export const NAV = [
  { label: "Ask your buckets", href: "#ask" },
  { label: "The seven", href: "#buckets" },
  { label: "Households", href: "#households" },
  { label: "Privacy", href: "#privacy" },
  { label: "Pricing", href: "#pricing" },
];

/** The app's own seven buckets, with one example month of ₹1,20,000. */
export const BUCKETS = [
  { name: "Needs", color: "#4f57de", amt: 52000, used: 37000, purpose: "Rent, food, transport, health — whatever keeps the month running." },
  { name: "Financial Freedom", color: "#0e8f67", amt: 18000, used: 7200, purpose: "Money set aside to buy your independence, one month at a time." },
  { name: "Education", color: "#3d8fd6", amt: 8000, used: 4400, purpose: "Courses, fees, books — learning as a line, not a leftover." },
  { name: "Play", color: "#e0598b", amt: 12000, used: 5600, purpose: "Spend it without guilt. It was planned for." },
  { name: "Long-Term Savings", color: "#8a63d2", amt: 14000, used: 4200, purpose: "The slow money: the house, the retirement, the rainy decade." },
  { name: "Giving", color: "#f0a43a", amt: 6000, used: 6000, purpose: "What you share, decided before the month can talk you out of it." },
  { name: "Agri", color: "#5e9e4a", amt: 10000, used: 2200, purpose: "Land, inputs and farm goals — the bucket most apps forget." },
] as const;

export type BucketName = (typeof BUCKETS)[number]["name"];

export const TRUST_STRIP: { icon: LucideIcon; text: string }[] = [
  { icon: ShieldCheck, text: "Row-level security" },
  { icon: Lock, text: "Encrypted at rest" },
  { icon: Globe2, text: "INR · USD · EUR · GBP · AED" },
  { icon: Users, text: "Household roles" },
  { icon: EyeOff, text: "No tracking cookies" },
];

export const ORBIT_OUTER: [string, string][] = [
  ["Typed entries", "#4f57de"], ["Bank statement", "#3d8fd6"], ["Bill scan", "#e0598b"],
  ["5 currencies", "#0e8f67"], ["Goals", "#8a63d2"], ["Insurance", "#f0a43a"],
];
export const ORBIT_INNER: [string, string][] = [
  ["Partner", "#0e8f67"], ["Parents", "#f0a43a"], ["Advisor · view only", "#8a63d2"],
];

export const LEDGER_FACTS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: PenLine, title: "Typed in seconds", body: "Income and expenses across all your accounts." },
  { icon: FileText, title: "Bank statements, imported", body: "Rows arrive categorised and ready to review." },
  { icon: ScanLine, title: "Bills, scanned", body: "Photograph a bill; the amount, date and category are read for you." },
  { icon: Users, title: "Roles for the family", body: "The owner chooses what each member can open, and who can only view." },
];

export interface HouseholdUse { icon: LucideIcon; title: string; body: string; planned?: boolean }
export interface Household { key: string; tab: string; who: string; line: string; body: string; uses: HouseholdUse[] }

export const HOUSEHOLDS: Household[] = [
  { key: "family", tab: "Families & couples", who: "Dual income · Mumbai · one child", line: "We don't fight about money — we fight about not knowing.",
    body: "One shared budget both partners trust. School fees sit in Education, premiums show up on the calendar before they're due, and each partner sees the same buckets.",
    uses: [
      { icon: Users, title: "Household roles", body: "Partner as admin, parents view-only" },
      { icon: CalendarDays, title: "Bills & premiums calendar", body: "Everything due, a week ahead" },
      { icon: Target, title: "Shared goals", body: "Child's education, a home" },
    ] },
  { key: "young", tab: "Young professionals", who: "Salaried · Bengaluru · renting", line: "I check my balance after it has already rained.",
    body: "Salary divided across seven buckets, so weekend spending comes from Play and the emergency fund grows on its own line.",
    uses: [
      { icon: ScanLine, title: "Bill scan", body: "UPI and cafe bills stop vanishing" },
      { icon: Target, title: "Emergency fund goal", body: "Progress on every payday" },
      { icon: TrendingUp, title: "Investments", body: "SIPs and holdings, live prices" },
    ] },
  { key: "global", tab: "NRIs & freelancers", who: "Engineer · Dubai and Kochi", line: "Half my life is in dirhams and half in rupees.",
    body: "Accounts kept in their own currencies, totalled in rupees. Parents in Kerala can be added as members to see the household's side.",
    uses: [
      { icon: Globe2, title: "Five currencies", body: "INR, USD, EUR, GBP, AED" },
      { icon: Users, title: "Family across borders", body: "Members with their own access" },
      { icon: TrendingUp, title: "One net worth", body: "Every account, one number" },
    ] },
  { key: "farm", tab: "Farming households", who: "Joint family · Coimbatore · farmland", line: "Rain decides our income. Nobody decides our expenses.",
    body: "Harvest income logged as it arrives, the Agri bucket kept apart for next season, and a daughter keeps the entries while elders see the same view.",
    uses: [
      { icon: Leaf, title: "Agri bucket", body: "Seed, fertiliser, equipment" },
      { icon: PenLine, title: "Manual-first", body: "No bank connection needed" },
      { icon: CalendarDays, title: "Harvest-to-harvest view", body: "See how long a season's money lasts", planned: true },
    ] },
  { key: "retired", tab: "Parents & retirees", who: "Retired couple · Chennai", line: "I don't want to grow money. I want to not lose track of it.",
    body: "Policies and FD maturities in one place, reminders before renewals, and a son added as a member so he sees exactly what they see.",
    uses: [
      { icon: ShieldCheck, title: "Insurance shelf", body: "Policies, premiums, documents" },
      { icon: CalendarDays, title: "Reminders", body: "Renewals and maturities" },
      { icon: Users, title: "A child as a member", body: "Same view, from anywhere" },
    ] },
];

/** Plain-language privacy promises. Each one is true of the product today. */
export const PROMISES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: KeyRound, title: "We never ask for your bank password", body: "FinRoot can't move money. It only shows what you add to it." },
  { icon: PenLine, title: "You choose how money gets in", body: "Type it, import a statement from your bank, or scan a bill." },
  { icon: Users, title: "You decide who sees what", body: "The owner chooses which sections each member can open, and who can only view." },
  { icon: ShieldCheck, title: "Only your household can read it", body: "Encrypted at rest, and locked to your workspace inside the database itself." },
  { icon: EyeOff, title: "No tracking, no ads", body: "No analytics scripts, ad pixels or tracking cookies. Your numbers are never sold." },
  { icon: Download, title: "Yours to take", body: "Export your records any time, and ask us to delete your account." },
];

export const FAQ: [string, string][] = [
  ["Is my financial data safe?", "Every row is encrypted at rest, scoped to your household with row-level security, and never sold. You can export your records at any time, and ask us to delete your account."],
  ["Do I have to connect my bank?", "No. Add transactions by hand, import a statement from your bank, or scan a bill. FinRoot never asks for your banking password."],
  ["Does my salary split automatically?", "You decide how each month divides across the seven buckets. After that, every expense you log lands in the right bucket by its category, so what's left is always current."],
  ["Can my family use it together?", "Yes. Invite members to your household. The owner decides which sections each person can open, and who can only view."],
  ["Do you track me?", "No. There is no analytics script, no ad pixel and no tracking cookie on this site or in the app."],
  ["Can I cancel anytime?", "Yes. Cancel in one click — your data stays."],
];

export const FOOTER_COLUMNS = [
  { title: "Product", links: [
    { label: "Ask your buckets", href: "#ask" }, { label: "The seven buckets", href: "#buckets" }, { label: "Pricing", href: "#pricing" },
  ] },
  { title: "Company", links: [
    { label: "FAQ", href: "#faq" }, { label: "Support", to: "/support" }, { label: "Status", to: "/status" },
  ] },
  { title: "Legal", links: [
    { label: "Your data", href: "#privacy" }, { label: "Privacy policy", to: "/privacy" }, { label: "Terms", to: "/terms" },
  ] },
] as const;

export { Wallet };
