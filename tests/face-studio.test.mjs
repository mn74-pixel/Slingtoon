import test from "node:test";
import assert from "node:assert/strict";

import { cropTransform, isLikelyImageFile, rotatedDimensions } from "../src/face-studio.js";

test("accepts camera image types and common image extensions", () => {
  assert.equal(isLikelyImageFile({ type: "image/jpeg", name: "selfie" }), true);
  assert.equal(isLikelyImageFile({ type: "", name: "IMG_1001.HEIC" }), true);
  assert.equal(isLikelyImageFile({ type: "application/pdf", name: "notes.pdf" }), false);
});

test("swaps dimensions after a quarter turn", () => {
  assert.deepEqual(rotatedDimensions(1200, 800, 0), { width: 1200, height: 800 });
  assert.deepEqual(rotatedDimensions(1200, 800, 1), { width: 800, height: 1200 });
  assert.deepEqual(rotatedDimensions(1200, 800, 3), { width: 800, height: 1200 });
});

test("cover scale never leaves an empty edge inside the circular crop", () => {
  const transform = cropTransform(1200, 800, 0, 1, 999, -999);
  assert.equal(transform.scale, 0.62);
  assert.equal(transform.maxOffsetX, 124);
  assert.equal(transform.maxOffsetY, 0);
  assert.equal(transform.offsetX, 124);
  assert.equal(transform.offsetY, 0);
});

test("zoom is clamped and creates room for manual face positioning", () => {
  const transform = cropTransform(1000, 1000, 0, 99, 9999, 9999);
  assert.equal(transform.zoom, 4);
  assert.ok(transform.maxOffsetX > 700);
  assert.equal(transform.offsetX, transform.maxOffsetX);
  assert.equal(transform.offsetY, transform.maxOffsetY);
});
