import test from "node:test";
import assert from "node:assert/strict";

import {
  FACE_CATEGORIES,
  boundsFromLandmarks,
  connectionPaths,
  createPortraitTransform,
  deriveHeadBounds,
  fitInsideFrame,
  isHeadPixel,
  normalizePortraitStyle,
} from "../src/portrait.js";
import { opaqueBounds } from "../src/face-mimic.js";

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

test("automatic framing gives a distant face the same cartoon size as a selfie", () => {
  const selfie = [
    { x: 0.36, y: 0.22 },
    { x: 0.64, y: 0.22 },
    { x: 0.65, y: 0.64 },
    { x: 0.5, y: 0.78 },
    { x: 0.35, y: 0.64 },
  ];
  const distant = [
    { x: 0.455, y: 0.41 },
    { x: 0.545, y: 0.41 },
    { x: 0.548, y: 0.545 },
    { x: 0.5, y: 0.59 },
    { x: 0.452, y: 0.545 },
  ];
  const selfieBounds = deriveHeadBounds(selfie, null);
  const distantBounds = deriveHeadBounds(distant, null);
  const selfieTransform = createPortraitTransform(selfieBounds, 1024, 1024, 512);
  const distantTransform = createPortraitTransform(distantBounds, 1024, 1024, 512);
  const selfieFill = selfieBounds.face.height * 1024 * selfieTransform.scale / 512;
  const distantFill = distantBounds.face.height * 1024 * distantTransform.scale / 512;

  assert.ok(selfieFill > 0.6 && selfieFill < 0.67);
  assert.ok(Math.abs(selfieFill - distantFill) < 0.001);
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

// Sztuczny canvas: tylko tyle, ile czyta opaqueBounds — kanał alfa.
function stubCanvas(width, height, opaque) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (opaque(x, y)) data[(y * width + x) * 4 + 3] = 255;
    }
  }
  return { width, height, getContext: () => ({ getImageData: () => ({ data }) }) };
}

// Kołnierz dochodzący do dołu kadru nie zostawia minom miejsca na ruch, więc
// wycinek wjeżdża do środka. Skala liczona od środka kadru, nie od własnego
// boksu: głowa ma zostać tam, gdzie rysuje ją renderer, tylko mniejsza.
test("a cut-out that touches the frame is eased in to leave room for expressions", () => {
  const canvas = stubCanvas(512, 512, (x, y) => x >= 52 && x <= 458 && y >= 28);
  const { scale } = fitInsideFrame(canvas, 26);
  assert.ok(scale < 1 && scale > 0.8, `skala ${scale}`);
  const middle = 256;
  const bottom = middle + (511 - middle) * scale;
  const top = middle + (28 - middle) * scale;
  assert.ok(bottom <= 512 - 1 - 26 + 1e-6, `dół na ${bottom}`);
  assert.ok(top >= 26 - 1e-6, `góra na ${top}`);
});

test("a cut-out that already has room is left at full size", () => {
  const canvas = stubCanvas(512, 512, (x, y) => x >= 80 && x <= 430 && y >= 60 && y <= 450);
  assert.equal(fitInsideFrame(canvas, 26).scale, 1);
});

test("an empty cut-out reports no coverage instead of passing as a head", () => {
  assert.equal(opaqueBounds(stubCanvas(64, 64, () => false)).coverage, 0);
  assert.equal(opaqueBounds(stubCanvas(64, 64, () => true)).coverage, 1);
});
