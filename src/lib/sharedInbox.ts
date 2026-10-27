import { isShareFresh } from "@/lib/sharedPayment";

/**
 * The page's side of the Web Share Target: `public/sw.js` parks a shared
 * receipt in Cache Storage ("finroots-share"); this reads it once and deletes
 * it. The keys and the cache name are the service worker's — keep them in step.
 *
 * Cache Storage is not localStorage, so `deviceLocal.test.ts` has nothing to
 * say about it; the rule it enforces still applies in spirit, which is why a
 * share is deleted the moment it is read and ignored after 15 minutes.
 */

const SHARE_CACHE = "finroots-share";
const META = "/__share__/meta";
const IMAGE = "/__share__/image";

export interface SharedReceipt {
  title: string;
  text: string;
  url: string;
  /** The screenshot, when the other app shared one. */
  image: File | null;
}

async function open(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    return await caches.open(SHARE_CACHE);
  } catch {
    return null;
  }
}

/** Remove whatever is parked, fresh or not. */
export async function clearSharedReceipt(): Promise<void> {
  const cache = await open();
  if (!cache) return;
  await Promise.all([cache.delete(META), cache.delete(IMAGE)]).catch(() => {});
}

/**
 * Read-and-delete. Resolves to null when nothing is waiting, when it has gone
 * stale, or when Cache Storage is unavailable (private windows, old browsers).
 */
export async function takeSharedReceipt(now: number = Date.now()): Promise<SharedReceipt | null> {
  const cache = await open();
  if (!cache) return null;
  try {
    const metaRes = await cache.match(META);
    if (!metaRes) return null;
    const meta = (await metaRes.json()) as { at?: number; title?: string; text?: string; url?: string; hasImage?: boolean };

    let image: File | null = null;
    if (meta.hasImage) {
      const imgRes = await cache.match(IMAGE);
      if (imgRes) {
        const blob = await imgRes.blob();
        const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        image = new File([blob], `shared-receipt.${ext}`, { type: blob.type });
      }
    }
    await clearSharedReceipt(); // gone from the device whether or not it is used
    if (!isShareFresh(Number(meta.at), now)) return null;
    return { title: meta.title ?? "", text: meta.text ?? "", url: meta.url ?? "", image };
  } catch {
    await clearSharedReceipt();
    return null;
  }
}
