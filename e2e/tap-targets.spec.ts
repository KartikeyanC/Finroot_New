import { test, expect } from "@playwright/test";
import { EMAIL, PASSWORD, signInAndUnlock } from "./auth";

/**
 * Stage 4.7 — tap-target minimums (WCAG 2.5.8, 24×24 CSS px).
 *
 * Five controls in the product were under it and none of the fixes are
 * visible: they are padding, or in the carousel's case a transparent
 * pseudo-element. That makes them exactly the kind of thing a later styling
 * tweak removes by accident, which is why they are pinned here rather than
 * only measured once.
 */

test("landing: the controls a thumb has to hit clear 44px", async ({ page }) => {
  // The old landing page had a testimonial carousel whose 6px dots needed an
  // enlarged hit area (BUG-093/095). The home page has no dots: its small
  // controls are the household tabs, the question buttons and the bucket-rail
  // arrows, and they are full-size rather than padded up from something tiny.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForTimeout(2000);
  const controls = [
    '#households [role="tab"]',
    "#ask .qs button",
    '#buckets button[aria-label^="Scroll buckets"]',
  ];
  for (const sel of controls) {
    const loc = page.locator(sel);
    await loc.first().scrollIntoViewIfNeeded();
    const n = await loc.count();
    expect(n, `${sel} should exist`).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const b = (await loc.nth(i).boundingBox())!;
      expect(b.height, `${sel} #${i} height`).toBeGreaterThanOrEqual(44);
      expect(b.width, `${sel} #${i} width`).toBeGreaterThanOrEqual(44);
    }
  }
});

test("landing: footer links are >=24px tall", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2500);
  const links = page.locator("footer a");
  const n = await links.count();
  for (let i = 0; i < n; i++) {
    const b = await links.nth(i).boundingBox();
    if (b) expect(b.height, await links.nth(i).innerText()).toBeGreaterThanOrEqual(24);
  }
});

test("app: the header, reminder and workspace controls clear 24px", async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "set E2E_EMAIL / E2E_PASSWORD in .env.e2e to run");
  test.setTimeout(180_000);
  await signInAndUnlock(page);
  const found: Record<string, { w: number; h: number }> = {};

  await page.goto("/app");
  await page.waitForTimeout(1600);
  const profile = page.locator('a[href="/app/profile"]').first();
  found.profileLink = (await profile.boundingBox())!;
  const bell = page.locator('button[title^="Filter:"]').first();
  if (await bell.count()) found.reminderFilter = (await bell.boundingBox())!;

  await page.goto("/app/workspace");
  await page.waitForTimeout(1600);
  const disclosure = page.locator("button", { hasText: /Pre-set module permissions/i }).first();
  found.presetModules = (await disclosure.boundingBox())!;

  for (const [k, b] of Object.entries(found)) {
    expect(b.height, k).toBeGreaterThanOrEqual(24);
  }
});

test("landing: the skip link clears 24px once focused", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2500);
  // sr-only until focused, so measuring it at rest reports 1x1 — a false alarm.
  await page.keyboard.press("Tab");
  const link = page.locator('a[href="#landing-main"]');
  const box = (await link.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(24);
  expect(box.width).toBeGreaterThanOrEqual(24);
});
