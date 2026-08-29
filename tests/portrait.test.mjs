import test from "node:test";
import assert from "node:assert/strict";

import {
  FACE_CATEGORIES,
  boundsFromLandmarks,
  connectionPaths,
  deriveHeadBounds,
  isHeadPixel,
  normalizePortraitStyle,
} from "../src/portrait.js";

test("portrait strength is bounded", () => {
  assert.equal(normalizePortraitStyle(0), 0.45);
  assert.equal(normalizePortraitStyle(2), 1);
  assert.equal(normalizePortraitStyle("bad"), 0.78);
});

test("connection list is split into drawable paths", () => {
  assert.deepEqual(connectionPaths([
    { start: 1, end: 2 },
    { start: 2, end: 3 },
    { start: 8, end: 9 },
  ]), [[1, 2, 3], [8, 9]]);
});

test("slim face geometry stays slim instead of becoming a circle", () => {
  const landmarks = [
    { x: 0.46, y: 0.25 },
    { x: 0.54, y: 0.25 },
    { x: 0.55, y: 0.67 },
    { x: 0.5, y: 0.79 },
    { x: 0.45, y: 0.67 },
  ];
  const face = boundsFromLandmarks(landmarks);
  assert.equal(Number(face.width.toFixed(2)), 0.1);
  assert.equal(Number(face.height.toFixed(2)), 0.54);
  assert.ok(face.width / face.height < 0.2);
});

test("head bounds expand to actual segmented hair", () => {
  const landmarks = [
    { x: 0.4, y: 0.34 },
    { x: 0.6, y: 0.34 },
    { x: 0.62, y: 0.68 },
    { x: 0.5, y: 0.78 },
    { x: 0.38, y: 0.68 },
  ];
  const width = 20;
  const height = 20;
  const categories = new Uint8Array(width * height);
  categories[2 * width + 6] = FACE_CATEGORIES.HAIR;
  categories[3 * width + 13] = FACE_CATEGORIES.HAIR;
  const bounds = deriveHeadBounds(landmarks, { width, height, categories });
  assert.equal(bounds.foundHair, true);
  assert.ok(bounds.top < 0.15);
  assert.ok(bounds.left < 0.36);
  assert.ok(bounds.right > 0.64);
});

test("head mask keeps hair and face but rejects clothing", () => {
  const headBounds = {
    left: 0.2,
    top: 0.1,
    right: 0.8,
    bottom: 0.88,
    face: { left: 0.34, top: 0.25, right: 0.66, bottom: 0.77, width: 0.32, height: 0.52 },
  };
  assert.equal(isHeadPixel(FACE_CATEGORIES.HAIR, 0.4, 0.15, headBounds), true);
  assert.equal(isHeadPixel(FACE_CATEGORIES.FACE_SKIN, 0.5, 0.5, headBounds), true);
  assert.equal(isHeadPixel(FACE_CATEGORIES.CLOTHES, 0.5, 0.8, headBounds), false);
  assert.equal(isHeadPixel(FACE_CATEGORIES.BODY_SKIN, 0.5, 0.87, headBounds), false);
});

