import { expect, test, type Page, type Route } from "@playwright/test";

import { hasCreds, signInAndUnlock } from "./auth";

/**
 * Add Investment → search by name. The picker asks the `live-price` function
 * with `{ search: { provider, q } }`; that part is answered here with the
 * shapes Yahoo and MFAPI really return (checked by hand against both), so the
 * test is about what the dialog does with an answer — fills the ticker or
 * scheme code the live-price path understands, and the name — not about
 * whether Yahoo is up tonight. Price requests (`{ symbols }`) pass through.
 */
async function answerSearches(page: Page) {
  await page.route("**/functions/v1/live-price", async (route: Route) => {
    const body = route.request().postDataJSON() as { search?: { provider: string; q: string } } | null;
    if (!body?.search) return route.continue();
    const results =
      body.search.provider === "mf"
        ? [
            { symbol: "122639", name: "Parag Parikh Flexi Cap Fund - Direct Plan - Growth" },
            { symbol: "122640", name: "Parag Parikh Flexi Cap Fund - Regular Plan - Growth" },
          ]
        : [
            { symbol: "RELIANCE.NS", name: "Reliance Industries Limited", exchange: "NSE", type: "EQUITY" },
            { symbol: "RELIANCE.BO", name: "Reliance Industries Limited", exchange: "BSE", type: "EQUITY" },
            { symbol: "RELIANCE-USD", name: "Reliance Coin", exchange: "CCC", type: "CRYPTOCURRENCY" },
          ];
    await route.fulfill({ json: { results } });
  });
}

test.describe("Add Investment: search by name", () => {
  test.skip(!hasCreds, "needs E2E_EMAIL / E2E_PASSWORD");

  test("a stock picked by name becomes its ticker, and a fund its scheme code", async ({ page }) => {
    await answerSearches(page);
    await signInAndUnlock(page);
    await page.goto("/app/investments");
    await page.getByRole("button", { name: /add investment/i }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Stocks is the first asset type; make sure it is the one showing. The
    // picker's input is the combobox; the name box beside it is a textbox.
    const stockBox = dialog.getByRole("combobox", { name: /Reliance, Apple/ });
    if (!(await stockBox.isVisible().catch(() => false))) {
      await dialog.getByRole("combobox").first().click();
      await page.getByRole("option", { name: "Direct Stocks" }).click();
    }
    await stockBox.fill("reliance");
    const nse = page.getByRole("option", { name: /Reliance Industries Limited.*RELIANCE\.NS/s });
    await expect(nse).toBeVisible();
    // The crypto hit is not a stock and must not be offered.
    await expect(page.getByRole("option", { name: /Reliance Coin/ })).toHaveCount(0);
    await page.screenshot({ path: "test-results/symbol-picker-stock.png" });
    await nse.click();
    await expect(stockBox).toHaveValue("RELIANCE.NS");
    await expect(dialog.getByPlaceholder("e.g. Infosys Ltd")).toHaveValue("Reliance Industries Limited");

    // Mutual funds: the same box, the scheme code instead.
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: "Mutual Funds" }).click();
    // The dialog keeps the name across an asset switch; clear it so the pick
    // is what fills it.
    await dialog.getByPlaceholder("e.g. Parag Parikh Flexi Cap", { exact: true }).fill("");
    const fundBox = dialog.getByRole("combobox", { name: /Parag Parikh/ });
    await fundBox.fill("parag");
    const direct = page.getByRole("option", { name: /Direct Plan - Growth.*122639/s });
    await expect(direct).toBeVisible();
    await page.screenshot({ path: "test-results/symbol-picker-fund.png" });
    await direct.click();
    await expect(fundBox).toHaveValue("122639");
    await expect(dialog.getByPlaceholder("e.g. Parag Parikh Flexi Cap", { exact: true })).toHaveValue(
      "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
    );

    // Typing a code by hand is untouched: no search, no list, the value stays.
    await fundBox.fill("1");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(fundBox).toHaveValue("1");
  });
});
