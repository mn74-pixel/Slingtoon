import assert from "node:assert/strict";
import test from "node:test";

import { clientPointToWorld, createCropFreeViewport, worldPointToClient } from "../src/viewport.js";
import { GameRenderer } from "../src/render.js";

test("wide iPhone viewport reveals extra room instead of cropping the top", () => {
  const viewport = createCropFreeViewport(852, 393);
  assert.equal(viewport.height, 640);
  assert.ok(viewport.width > 1280);
  assert.ok(viewport.offsetX > 0);
  assert.equal(viewport.offsetY, 0);
});

test("taller viewport extends vertically and still keeps the full world", () => {
  const viewport = createCropFreeViewport(800, 500);
  assert.equal(viewport.width, 1280);
  assert.ok(viewport.height > 640);
  assert.equal(viewport.offsetX, 0);
  assert.ok(viewport.offsetY > 0);
});

test("world and client transforms round-trip touch coordinates", () => {
  const rect = { left: 24, top: 11, width: 852, height: 393 };
  const viewport = createCropFreeViewport(rect.width, rect.height);
  const worldPoint = { x: 173, y: 455 };
  const clientPoint = worldPointToClient(worldPoint.x, worldPoint.y, rect, viewport);
  const restored = clientPointToWorld(clientPoint.x, clientPoint.y, rect, viewport);
  assert.ok(Math.abs(restored.x - worldPoint.x) < 0.0001);
  assert.ok(Math.abs(restored.y - worldPoint.y) < 0.0001);
});

test("camera centre stays locked to world centre on every aspect ratio", () => {
  for (const [width, height] of [[852, 393], [800, 500], [1280, 640], [667, 250]]) {
    const viewport = createCropFreeViewport(width, height);
    const centre = clientPointToWorld(width * 0.5, height * 0.5, { left: 0, top: 0, width, height }, viewport);
    assert.ok(Math.abs(centre.x - 640) < 0.51);
    assert.ok(Math.abs(centre.y - 320) < 0.51);
  }
});

// The viewport reveals world beyond 1280x640 rather than cropping, and the
// procedural scenes paint across all of it. A painted backdrop is an SVG drawn
// at the world rectangle, so it stopped dead at the edge: a wide window showed
// two hard vertical seams with the clear colour beyond them, and a portrait
// phone got the same seams above and below. Every point of the revealed margin
// has to be covered by something.
function backdropCoverage(offsetX, offsetY) {
  const painted = [];
  const ctx = {
    drawImage(image, ...args) {
      // 5-argument form is (image, dx, dy, dw, dh); 9-argument adds the source
      // rectangle first.
      const [dx, dy, dw, dh] = args.length >= 8 ? args.slice(4, 8) : args;
      painted.push({ left: dx, top: dy, right: dx + dw, bottom: dy + dh });
    },
  };
  const renderer = Object.create(GameRenderer.prototype);
  renderer.background = { width: 1280, height: 640, naturalWidth: 1280, naturalHeight: 640 };
  renderer.viewport = { offsetX, offsetY };
  renderer.drawBackdropImage(ctx);
  return painted;
}

const coveredBy = (point, rects) => rects.some((r) =>
  point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom);

test("a painted backdrop reaches into every margin the viewport reveals", () => {
  for (const [offsetX, offsetY] of [[288, 0], [0, 190], [288, 190], [0, 0]]) {
    const painted = backdropCoverage(offsetX, offsetY);
    const bare = [];
    for (let x = -offsetX; x <= 1280 + offsetX; x += 8) {
      for (let y = -offsetY; y <= 640 + offsetY; y += 8) {
        if (!coveredBy({ x, y }, painted)) bare.push({ x, y });
      }
    }
    assert.equal(bare.length, 0,
      `margin ${offsetX}x${offsetY}: ${bare.length} point(s) of the visible frame get no backdrop, first at ${JSON.stringify(bare[0])}`);
  }
});

// The corners belong to neither the side bands nor the top and bottom ones.
// Without their own draws a wide portrait screen shows four rectangles of
// clear colour, which is how the seam looked before.
test("the backdrop's corners are filled, not just its edges", () => {
  const painted = backdropCoverage(200, 150);
  for (const corner of [{ x: -190, y: -140 }, { x: 1470, y: -140 }, { x: -190, y: 780 }, { x: 1470, y: 780 }]) {
    assert.ok(coveredBy(corner, painted), `corner ${JSON.stringify(corner)} is bare`);
  }
});

test("a backdrop with nothing revealed is drawn exactly once, at the world rectangle", () => {
  const painted = backdropCoverage(0, 0);
  assert.equal(painted.length, 1, "no margin means no extra work per frame");
  assert.deepEqual(painted[0], { left: 0, top: 0, right: 1280, bottom: 640 });
});
