import { describe, expect, it } from "vitest";

import { BUCKETS } from "./homeContent";
import { initialValues, inr, left, QUESTIONS, SEASON_MONTHS } from "./askLogic";

const q = (id: string) => QUESTIONS.find((x) => x.id === id)!;

describe("the example household", () => {
  it("uses the app's own seven bucket names, in order", () => {
    expect(BUCKETS.map((b) => b.name)).toEqual([
      "Needs", "Financial Freedom", "Education", "Play", "Long-Term Savings", "Giving", "Agri",
    ]);
  });

  it("is one ₹1,20,000 month — the figure the page prints", () => {
    expect(BUCKETS.reduce((s, b) => s + b.amt, 0)).toBe(120_000);
  });

  it("never spends more than a bucket holds", () => {
    for (const b of BUCKETS) expect(b.used).toBeLessThanOrEqual(b.amt);
  });
});

describe("inr", () => {
  it("groups the Indian way and signs negatives", () => {
    expect(inr(120000)).toBe("₹1,20,000");
    expect(inr(740000)).toBe("₹7,40,000");
    expect(inr(-2600)).toBe("−₹2,600");
    expect(inr(1234.6)).toBe("₹1,235");
  });
});

describe("Can we afford a weekend trip?", () => {
  it("says yes, and how much stays in Play, when it fits", () => {
    const v = q("trip").solve({ cost: 5000 });
    expect(left("Play")).toBe(6400);
    expect(v.ok).toBe(true);
    expect(v.title).toBe("Yes — ₹1,400 stays in Play.");
  });

  it("offers to move money from Long-Term Savings when Play is short but savings can cover it", () => {
    const v = q("trip").solve({ cost: 9000 });
    expect(v.ok).toBe(false);
    expect(v.title).toBe("Play is ₹2,600 short.");
    expect(v.body).toMatch(/Long-Term Savings \(₹9,800 left\)/);
  });

  it("says to wait for next month when neither bucket can cover it", () => {
    const v = q("trip").solve({ cost: 30000 });
    expect(v.ok).toBe(false);
    expect(v.body).toMatch(/next month/i);
  });

  it("is exactly affordable at the boundary", () => {
    expect(q("trip").solve({ cost: 6400 }).ok).toBe(true);
    expect(q("trip").solve({ cost: 6500 }).ok).toBe(false);
  });
});

describe("Is next term's school fee covered?", () => {
  it("counts what's left now plus a month's allocation for every month still to come", () => {
    // Education: 8,000 − 4,400 = 3,600 now, +8,000 for each of the 3 later months.
    const v = q("fee").solve({ fee: 20000, months: 4 });
    expect(v.have).toBe(3600 + 8000 * 3);
    expect(v.ok).toBe(true);
    expect(v.title).toBe("Covered, with ₹7,600 to spare.");
  });

  it("names the monthly top-up that would close a shortfall", () => {
    const v = q("fee").solve({ fee: 36000, months: 4 });
    expect(v.ok).toBe(false);
    expect(v.title).toBe("₹8,400 short by the due date.");
    expect(v.body).toMatch(/₹2,100 a month/);
  });

  it("is covered when due this month and the bucket already holds it", () => {
    expect(q("fee").solve({ fee: 3600, months: 1 }).ok).toBe(true);
    expect(q("fee").solve({ fee: 3700, months: 1 }).ok).toBe(false);
  });
});

describe("How long will this harvest last?", () => {
  it("is past the next harvest when the household's share covers a full season", () => {
    // 740,000 × 65% = 481,000 for the home; at 40,000 a month that is 12.0 months.
    const v = q("harvest").solve({ harvest: 740000, agri: 35, needs: 40000 });
    expect(v.ok).toBe(true);
    expect(v.title).toBe("About 12 months — past the next harvest.");
    expect(v.need).toBe(40000 * SEASON_MONTHS);
  });

  it("says how short it falls, and two ways to close it", () => {
    const v = q("harvest").solve({ harvest: 300000, agri: 50, needs: 40000 });
    expect(v.ok).toBe(false);
    expect(v.title).toBe("About 3.7 months — short of a 9-month season.");
    expect(v.body).toMatch(/₹2,10,000 more/);
  });

  it("rounds the months down, never up — a promise of 8.96 months must not read as 9", () => {
    const v = q("harvest").solve({ harvest: 359_900, agri: 0, needs: 40000 });
    expect(v.title).toContain("About 8.9 months");
    expect(v.ok).toBe(false);
  });
});

describe("initialValues", () => {
  it("starts every control where the question defines it", () => {
    const v = initialValues();
    expect(v.trip).toEqual({ cost: 5000 });
    expect(v.fee).toEqual({ fee: 36000, months: 4 });
    expect(v.harvest).toEqual({ harvest: 740000, agri: 35, needs: 40000 });
  });

  it("opens on an answer that makes sense (every default question solves without error)", () => {
    const v = initialValues();
    for (const question of QUESTIONS) {
      const r = question.solve(v[question.id]);
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.need).toBeGreaterThan(0);
    }
  });
});
