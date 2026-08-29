import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CARTOON_STRENGTH,
  cartoonSettings,
  cartoonizePixels,
  normalizeCartoonStrength,
} from "../src/cartoon.js";

function rgbaImage(width, height, pixelAt) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const [red, green, blue, alpha = 255] = pixelAt(x, y);
      pixels[index] = red;
      pixels[index + 1] = green;
      pixels[index + 2] = blue;
      pixels[index + 3] = alpha;
    }
  }
  return pixels;
}

function luminance(pixels, width, x, y) {
  const index = (y * width + x) * 4;
  return pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
}

test("Cartoon strength is bounded and progressively increases stylisation", () => {
  assert.equal(normalizeCartoonStrength(0), 0.35);
  assert.equal(normalizeCartoonStrength(2), 1);
  assert.equal(normalizeCartoonStrength("not-a-number"), DEFAULT_CARTOON_STRENGTH);
  const soft = cartoonSettings(0.35);
  const bold = cartoonSettings(1);
  assert.ok(bold.colorLevels < soft.colorLevels);
  assert.ok(bold.inkOpacity > soft.inkOpacity);
  assert.ok(bold.smoothingPasses >= soft.smoothingPasses);
});

test("Cartoon processor preserves dimensions and alpha while changing the photograph", () => {
  const width = 24;
  const height = 18;
  const source = rgbaImage(width, height, (x, y) => [80 + x * 6, 55 + y * 7, 125 + ((x + y) % 5) * 9, 180 + ((x + y) % 2) * 75]);
  const output = cartoonizePixels(source, width, height, 0.78);
  assert.equal(output.length, source.length);

  let changed = 0;
  for (let index = 0; index < output.length; index += 4) {
    if (output[index] !== source[index] || output[index + 1] !== source[index + 1] || output[index + 2] !== source[index + 2]) changed += 1;
    assert.equal(output[index + 3], source[index + 3]);
  }
  assert.ok(changed > width * height * 0.85);
});

test("Cartoon ink darkens a strong silhouette edge", () => {
  const width = 20;
  const height = 12;
  const source = rgbaImage(width, height, (x) => (x < width / 2 ? [232, 190, 150] : [58, 43, 75]));
  const output = cartoonizePixels(source, width, height, 1);
  const flatLight = luminance(output, width, 3, 6);
  const outlinedLight = luminance(output, width, 9, 6);
  assert.ok(outlinedLight < flatLight - 20, `expected ink edge ${outlinedLight} to be darker than flat area ${flatLight}`);
});

test("512px avatar cartoonisation stays within an interactive processing budget", () => {
  const width = 512;
  const height = 512;
  const source = rgbaImage(width, height, (x, y) => [
    70 + ((x * 3 + y) % 170),
    55 + ((x + y * 2) % 150),
    60 + ((x * 2 + y * 3) % 160),
  ]);
  const started = performance.now();
  const output = cartoonizePixels(source, width, height, 0.78);
  const elapsed = performance.now() - started;
  assert.equal(output.length, source.length);
  assert.ok(elapsed < 2000, `Cartoon processing took ${elapsed.toFixed(1)} ms`);
});
