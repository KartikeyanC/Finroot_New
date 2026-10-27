import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearSharedReceipt, takeSharedReceipt } from "./sharedInbox";
import { SHARE_TTL_MS } from "./sharedPayment";

/** A minimal in-memory CacheStorage — just the calls sharedInbox makes. */
function installFakeCaches() {
  const store = new Map<string, Response>();
  const cache = {
    match: async (k: string) => store.get(k)?.clone(),
    put: async (k: string, r: Response) => { store.set(k, r); },
    delete: async (k: string) => store.delete(k),
  };
  vi.stubGlobal("caches", { open: async () => cache });
  return {
    store,
    park(meta: object, image?: Blob) {
      store.set("/__share__/meta", new Response(JSON.stringify(meta)));
      if (image) store.set("/__share__/image", new Response(image, { headers: { "Content-Type": image.type } }));
    },
  };
}

const NOW = 1_700_000_000_000;

describe("takeSharedReceipt", () => {
  let fake: ReturnType<typeof installFakeCaches>;
  beforeEach(() => { fake = installFakeCaches(); });
  afterEach(() => vi.unstubAllGlobals());

  it("returns nothing when nothing was shared", async () => {
    await expect(takeSharedReceipt(NOW)).resolves.toBeNull();
  });

  it("returns a fresh text share and deletes it, so it can only be used once", async () => {
    fake.park({ at: NOW - 3_000, title: "Payment successful", text: "Paid ₹450 to Swiggy", url: "", hasImage: false });
    const got = await takeSharedReceipt(NOW);
    expect(got).toMatchObject({ title: "Payment successful", text: "Paid ₹450 to Swiggy", image: null });
    expect(fake.store.size).toBe(0);
    await expect(takeSharedReceipt(NOW)).resolves.toBeNull();
  });

  it("returns a shared screenshot as a File with the right type", async () => {
    fake.park({ at: NOW - 1_000, title: "", text: "", url: "", hasImage: true }, new Blob(["png"], { type: "image/png" }));
    const got = await takeSharedReceipt(NOW);
    expect(got?.image).toBeInstanceOf(File);
    expect(got?.image?.type).toBe("image/png");
    expect(got?.image?.name).toBe("shared-receipt.png");
    expect(fake.store.size).toBe(0);
  });

  it("drops a share older than 15 minutes — and still deletes it", async () => {
    fake.park({ at: NOW - SHARE_TTL_MS - 1, text: "Paid ₹450 to Swiggy", hasImage: false });
    await expect(takeSharedReceipt(NOW)).resolves.toBeNull();
    expect(fake.store.size).toBe(0);
  });

  it("treats a corrupt record as nothing rather than throwing, and clears it", async () => {
    fake.store.set("/__share__/meta", new Response("not json"));
    await expect(takeSharedReceipt(NOW)).resolves.toBeNull();
    expect(fake.store.size).toBe(0);
  });
});

describe("without Cache Storage", () => {
  it("quietly returns nothing (private windows, old browsers)", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(takeSharedReceipt(NOW)).resolves.toBeNull();
    await expect(clearSharedReceipt()).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});
