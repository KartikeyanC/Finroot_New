# Share a payment to FinRoot

After paying in GPay, PhonePe, Paytm or a bank app, tap **Share → FinRoot**. FinRoot opens Quick Add already filled in; the person checks Expense or Income, the category and the amount, and taps **Record**. Nothing is saved until they do.

## How it works

| Step | Where |
|---|---|
| The OS lists FinRoot as a share target | `share_target` in `public/manifest.webmanifest` (POST `/share-target`, accepts text and `image/*`) |
| The OS POSTs the receipt; it is parked on the device and the browser is redirected to `/app?shared=1` | `handleShare()` in `public/sw.js`, Cache Storage `finroots-share` |
| The dashboard reads it once, deletes it, ignores anything over 15 minutes old | `src/lib/sharedInbox.ts`, `useSharedPayment` hook, called from `DashboardLayout` |
| Text → amount, income/expense, merchant, category guess | `src/lib/sharedPayment.ts` (pure, tested) |
| Screenshot → amount, merchant, category | the existing `scan-receipt` function (same call Bill Scan makes) |
| The confirm step | `QuickAddSheet` with its `prefill` prop |

The receipt is not uploaded anywhere until the person saves the transaction. A screenshot is sent to `scan-receipt` only so it can be read.

## What the person sees when things go wrong

- No amount in the shared text and no screenshot → the sheet opens empty with "We couldn't read an amount…".
- Screenshot unreadable, or `scan-receipt` unavailable → same, after an error toast.
- View-only member → "View-only members can't add payments."
- Not signed in / PIN gate → the share waits (15 min) and the sheet opens once they reach the dashboard.

## Limits

- **Android only.** iOS Safari does not support the Web Share Target API, so FinRoot cannot appear in the iPhone share sheet. iPhone users use the existing Quick Add shortcut.
- **The PWA must be installed**, and the site served over **HTTPS**. Neither is true for `localhost` on a phone, so test on a deployed build.
- The service worker only registers in production builds (`main.tsx`), so the share target does nothing under `npm run dev`. Use `npm run build && npm run preview`.
- Payment apps differ in what they share. Many share a **screenshot**, which needs `scan-receipt` to be configured (`GEMINI_API_KEY` as a function secret); shared **text** needs nothing.
- The category is a suggestion from keywords (`KEYWORDS` in `sharedPayment.ts`) or the scanner. Extend that list as real shares show gaps.

## Testing

```bash
npx vitest run src/lib/sharedPayment.test.ts src/lib/sharedInbox.test.ts src/components/QuickAddSheet.prefill.test.tsx
```

To exercise the service worker by hand, serve the production build and, in the page console, POST a `FormData` to `/share-target` with `redirect: "manual"`: the answer is an opaque redirect and `caches.open("finroots-share")` then holds `/__share__/meta`.
