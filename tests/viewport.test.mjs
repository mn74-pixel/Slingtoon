import assert from "node:assert/strict";
import test from "node:test";

import { clientPointToWorld, createCropFreeViewport, worldPointToClient } from "../src/viewport.js";

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
