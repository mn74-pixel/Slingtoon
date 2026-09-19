import assert from "node:assert/strict";
import test from "node:test";

import { clientPointToWorld, createCropFreeViewport, edgeMarker, worldPointToClient } from "../src/viewport.js";
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

// Measured on the real solver over 12 672 shots: 34% pass the right edge of the
// world, 16% fly above it, 3% leave to the left — median 1.58s with the hero
// nowhere on screen, 3.76s at the 90th percentile. A player cannot learn from a
// shot they cannot see.
test("a hero inside the frame gets no marker", () => {
  const viewport = createCropFreeViewport(1280, 640);
  for (const point of [{ x: 640, y: 320 }, { x: 1, y: 1 }, { x: 1279, y: 639 }]) {
    assert.equal(edgeMarker(point, viewport), null, `${JSON.stringify(point)} is visible and needs no marker`);
  }
});

test("a hero outside the frame is pinned to the edge he left by", () => {
  const viewport = createCropFreeViewport(1280, 640);
  const above = edgeMarker({ x: 700, y: -400 }, viewport);
  assert.ok(above, "a hero 400 px above the frame needs a marker");
  assert.equal(Math.round(above.x), 700, "the marker keeps his horizontal position");
  assert.ok(above.y > 0 && above.y < 120, `the marker sits near the top edge, got ${above.y}`);
  assert.ok(Math.abs(above.angle + Math.PI / 2) < 0.01, "and points straight up, the way he went");

  const right = edgeMarker({ x: 1900, y: 300 }, viewport);
  assert.ok(right.x < 1280 && right.x > 1180, `the marker stays inside the right edge, got ${right.x}`);
  assert.ok(Math.abs(right.angle) < 0.01, "pointing right");
  assert.ok(right.distance > 600, "and reports how far out he is, so the badge can shrink with distance");
});

// The marker only helps if it is on screen itself. The first version put the
// pointer past the frame edge, so only half the badge was visible.
test("the marker and its pointer always fit inside the frame", () => {
  const POINTER_REACH = 51; // badge radius plus the arrow beyond it
  for (const [w, h] of [[1280, 640], [852, 393], [2560, 1080], [390, 844]]) {
    const viewport = createCropFreeViewport(w, h);
    const left = -viewport.offsetX, top = -viewport.offsetY;
    const right = left + viewport.width, bottom = top + viewport.height;
    for (const point of [{ x: -900, y: -900 }, { x: 4000, y: 300 }, { x: 640, y: -2000 }, { x: 1300, y: 900 }]) {
      const marker = edgeMarker(point, viewport);
      assert.ok(marker, `${JSON.stringify(point)} is outside ${w}x${h} and needs a marker`);
      assert.ok(marker.x - POINTER_REACH >= left - 0.5 && marker.x + POINTER_REACH <= right + 0.5,
        `${w}x${h}: marker at x=${Math.round(marker.x)} would draw past the side`);
      assert.ok(marker.y - POINTER_REACH >= top - 0.5 && marker.y + POINTER_REACH <= bottom + 0.5,
        `${w}x${h}: marker at y=${Math.round(marker.y)} would draw past the top or bottom`);
    }
  }
});

test("a viewport that reveals extra world counts that as visible", () => {
  // A wide screen shows world beyond x=1280, so a hero out there is still on
  // screen and must not get a marker pinned over him.
  const wide = createCropFreeViewport(2560, 640);
  assert.ok(wide.offsetX > 100, "this viewport should reveal extra width");
  assert.equal(edgeMarker({ x: 1280 + wide.offsetX - 10, y: 300 }, wide), null,
    "revealed world is visible world");
  assert.ok(edgeMarker({ x: 1280 + wide.offsetX + 40, y: 300 }, wide), "past the revealed width he is gone again");
});
