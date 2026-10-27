import { describe, expect, it } from "vitest";

import { twoTone } from "./twoTone";

describe("twoTone", () => {
  it("splits at the first sentence break", () => {
    expect(twoTone("Quietly priced. Loudly worth it.")).toEqual(["Quietly priced.", "Loudly worth it."]);
  });

  it("splits on ! and ? too, and only at the first break", () => {
    expect(twoTone("Ready? Set. Go.")).toEqual(["Ready?", "Set. Go."]);
  });

  it("keeps a heading with no sentence break as one dark run", () => {
    expect(twoTone("Simple pricing")).toEqual(["Simple pricing", ""]);
    expect(twoTone("Simple pricing.")).toEqual(["Simple pricing.", ""]);
  });

  it("copes with empty and padded text — the heading is editable by the Product Owner", () => {
    expect(twoTone("")).toEqual(["", ""]);
    expect(twoTone("   Plans.   Fair ones.  ")).toEqual(["Plans.", "Fair ones."]);
  });
});
