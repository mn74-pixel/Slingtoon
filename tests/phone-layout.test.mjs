// Landscape phones, measured in Chromium before this change:
//
//   * every 16:9 phone (568x320, 640x360, 667x375, 736x414) got a "postcard":
//     the canvas filled 30-44% of the screen, because the full-screen phone
//     layout only switched on from 2:1 up;
//   * on 2:1 phones the strips floated over the canvas but the camera did not
//     know: 71-100 world pixels at the bottom (the floor, the hero's feet, the
//     foot of the sling) and 71-83 at the top sat under frosted glass.
//
// After: 100% of the screen on all eight phones measured, nothing hidden, and
// the world drawn 23-37% larger on 16:9 phones. The camera half is pure and
// tested here; the CSS half is guarded in scripts/validate.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { createCropFreeViewport, edgeMarker, overlayInset } from "../src/viewport.js";

test("the world fits between the strips, not under them", () => {
  for (const [w, h, strip] of [[844, 390, 42], [667, 375, 42], [568, 320, 42], [915, 412, 42]]) {
    const v = createCropFreeViewport(w, h, 1280, 640, { y: strip });
    const scale = h / v.height;
    // World rows 0 and 640, in CSS pixels from the top of the canvas.
    const top = v.offsetY * scale, bottom = (v.offsetY + 640) * scale;
    assert.ok(top >= strip - 1e-6, `${w}x${h}: the top of the world is under the mission strip (${top.toFixed(1)} < ${strip})`);
    assert.ok(bottom <= h - strip + 1e-6, `${w}x${h}: the floor is under the status row`);
    assert.ok(v.offsetX >= 0, "the sides are cropped");
  }
});

test("with nothing over the canvas the camera is exactly the old one", () => {
  for (const [w, h, width, height] of [[852, 393, 1388, 640], [800, 500, 1280, 800], [1280, 640, 1280, 640]]) {
    const v = createCropFreeViewport(w, h);
    assert.deepEqual([v.width, v.height, v.safeX, v.safeY], [width, height, 0, 0]);
  }
});

test("a broken measurement cannot shrink the world to nothing", () => {
  const v = createCropFreeViewport(844, 390, 1280, 640, { y: 5000 });
  assert.ok(Number.isFinite(v.width) && v.width < 1280 * 6, `the world shrank to a speck: view ${v.width}x${v.height}`);
  const nan = createCropFreeViewport(844, 390, 1280, 640, { y: NaN });
  assert.equal(nan.safeY, 0);
});

test("a hero under the frosted strip counts as out of sight", () => {
  const v = createCropFreeViewport(844, 390, 1280, 640, { y: 42 });
  const underStrip = { x: 640, y: -v.offsetY + v.safeY / 2 };
  const marker = edgeMarker(underStrip, v);
  assert.ok(marker, "the hero vanished behind the mission strip and nothing pointed at him");
  assert.ok(marker.y >= -v.offsetY + v.safeY, "the marker itself is drawn under the strip");
  assert.equal(edgeMarker({ x: 640, y: 320 }, v), null, "a hero in plain view got a marker");
});

test("the inset is read from the strips that really float over the canvas", () => {
  const stage = { top: 0, bottom: 390, height: 390 };
  const el = (top, bottom, position = "absolute") => ({ box: { top, bottom, height: bottom - top }, style: { position, display: "block", visibility: "visible" } });
  const fake = (e) => ({ getBoundingClientRect: () => e.box, style: e.style });
  const styleOf = (element) => element.style;
  const strips = [el(0, 42), el(352, 390)];
  assert.deepEqual(overlayInset(stage, strips.map(fake), styleOf), { x: 0, y: 42 });
  // Stacked above or below the canvas (the desktop card) is not "over" it.
  const stacked = [el(0, 42, "static"), el(352, 390, "relative")];
  assert.deepEqual(overlayInset(stage, stacked.map(fake), styleOf), { x: 0, y: 0 });
  assert.deepEqual(overlayInset(stage, [null, fake(el(500, 540))], styleOf), { x: 0, y: 0 }, "an element below the stage counted");
});
