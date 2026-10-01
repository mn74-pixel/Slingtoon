// Tablets and computers, measured in Chromium before 0.47.0: the canvas filled
// 43% of a 1024x600 tablet and 52-61% of laptops and monitors, and the picture
// itself was stretched — the canvas was ~1280 pixels wide whatever the screen,
// so a 1440x900 Retina laptop blew every pixel up 1.76x and a 3x phone 1.38x.
// The layout half is guarded in scripts/validate.mjs; the camera half is here.
import test from "node:test";
import assert from "node:assert/strict";
import { RENDER_MAX_PIXELS, RENDER_MAX_RATIO, SLOW_FRAME_MS, createCropFreeViewport, nextPixelBudget, renderScale } from "../src/viewport.js";

test("the canvas follows the screen's own pixels", () => {
  for (const [w, h, dpr] of [[844, 390, 3], [1366, 768, 1], [1024, 600, 1.5], [568, 320, 2]]) {
    const view = createCropFreeViewport(w, h, 1280, 640, { y: 50 });
    const k = renderScale(w, view, dpr);
    const devicePixels = w * dpr, canvasPixels = view.width * k;
    if (view.width * view.height * k * k < RENDER_MAX_PIXELS * 0.999) {
      assert.ok(Math.abs(canvasPixels / devicePixels - 1) < 1e-9, `${w}x${h}@${dpr}: ${(canvasPixels / devicePixels).toFixed(2)} canvas px per device px`);
    }
  }
});

test("the fill cost is capped", () => {
  for (const [w, h, dpr] of [[2560, 1440, 2], [3840, 2160, 2], [1440, 900, 2]]) {
    const view = createCropFreeViewport(w, h);
    const k = renderScale(w, view, dpr);
    assert.ok(view.width * view.height * k * k <= RENDER_MAX_PIXELS * 1.0001, `${w}x${h}@${dpr} paints ${(view.width * view.height * k * k / 1e6).toFixed(1)} Mpx`);
    assert.ok(k <= RENDER_MAX_RATIO);
  }
  const view = createCropFreeViewport(1440, 900);
  assert.ok(renderScale(1440, view, 2, 1_000_000) < renderScale(1440, view, 2), "a smaller budget did not make a smaller canvas");
});

test("a slow device steps down to the old picture, and no further", () => {
  const slow = new Float32Array(90).fill(50), fast = new Float32Array(90).fill(16.7);
  const floor = 1_200_000;
  let budget = RENDER_MAX_PIXELS;
  const seen = [];
  for (let i = 0; i < 12; i += 1) { budget = nextPixelBudget(budget, slow, floor); seen.push(budget); }
  assert.equal(budget, floor, "a slow device never reached the old pixel count");
  assert.ok(seen[0] < RENDER_MAX_PIXELS, "the first slow window changed nothing");
  assert.equal(nextPixelBudget(RENDER_MAX_PIXELS, fast, floor), RENDER_MAX_PIXELS, "a smooth device lost sharpness");
  assert.equal(nextPixelBudget(floor, slow, floor), floor, "the budget went under the old picture");
});

test("noise is not a verdict", () => {
  // A few long frames (a GC pause, a tab switch) must not cost sharpness, and
  // a window too short to judge changes nothing.
  const window = new Float32Array(90).fill(16.7);
  for (let i = 0; i < 20; i += 1) window[i * 4] = 80;
  assert.equal(nextPixelBudget(RENDER_MAX_PIXELS, window, 1e6), RENDER_MAX_PIXELS);
  assert.equal(nextPixelBudget(RENDER_MAX_PIXELS, new Float32Array(10).fill(90), 1e6), RENDER_MAX_PIXELS);
  assert.ok(SLOW_FRAME_MS > 16.7 && SLOW_FRAME_MS < 33.3, "the threshold no longer separates 60 fps from 30 fps");
});
