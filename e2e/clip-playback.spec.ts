import path from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * Clip playback through the file route (BI-078.3).
 *
 * Safari will not play a `<video>` whose source ignores `Range`, and BI-078.1
 * left that unverified. No UI renders a clip until BI-078.4, so this spec
 * builds a bare `<video>` on the app's own origin, points it at the route for
 * the committed clip fixture, and waits for the media element to load
 * metadata. It reads only, so it names the committed `test-fixtures/imagegen-clip/`
 * root directly in the route URL — no copy, and no Link imagegen flow, which
 * is not this spec's subject.
 *
 * It asserts metadata and duration, not decoded frames: metadata is what a
 * route that refused or mangled ranges fails to deliver (with ranges off,
 * WebKit reports MEDIA_ERR_SRC_NOT_SUPPORTED). Playwright's Chromium loads
 * this H.264 fixture's metadata too (verified BI-078.3).
 */
const CLIP_ROOT = path.join(process.cwd(), 'test-fixtures', 'imagegen-clip');
const CLIP_PATH = 'rounds/r1/hero-banner-001.mp4';

test('a clip served by the file route loads in a <video>', async ({ page }) => {
  await page.goto('/');
  const src = `/api/imagegen/file?${new URLSearchParams({ root: CLIP_ROOT, path: CLIP_PATH })}`;

  const media = await page.evaluate(
    (videoSrc) =>
      new Promise<{ readyState: number; duration: number; error: number | null }>((resolve) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        const settle = () =>
          resolve({ readyState: video.readyState, duration: video.duration, error: video.error?.code ?? null });
        video.addEventListener('loadedmetadata', settle, { once: true });
        video.addEventListener('error', settle, { once: true });
        video.src = videoSrc;
        document.body.append(video);
      }),
    src,
  );

  expect(media.error).toBeNull();
  expect(media.readyState).toBeGreaterThanOrEqual(1); // HAVE_METADATA
  expect(media.duration).toBeGreaterThan(0);

  // The route honors ranges. This is asked directly, not by watching the
  // <video>'s own requests: Linux WebKit (CI) fetches media through GStreamer,
  // outside Playwright's network events, so a waitForResponse on its 206 never
  // fires even though the clip loads (BI-086).
  const ranged = await page.request.get(src, { headers: { Range: 'bytes=0-1' } });
  expect(ranged.status()).toBe(206);
  expect(ranged.headers()['content-range']).toMatch(/^bytes 0-1\//);
});
