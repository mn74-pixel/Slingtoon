import test from "node:test";
import assert from "node:assert/strict";

import { FaceStudio, containRect, isLikelyImageFile, rotatedDimensions } from "../src/face-studio.js";

function classListMock() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
    toggle: (name, force) => {
      if (force === true) values.add(name);
      else if (force === false) values.delete(name);
      else if (values.has(name)) values.delete(name);
      else values.add(name);
    },
  };
}

function elementMock(overrides = {}) {
  return {
    addEventListener() {},
    classList: classListMock(),
    click() {},
    disabled: false,
    focus() {},
    hidden: false,
    textContent: "",
    value: "",
    ...overrides,
  };
}

function canvasMock() {
  const gradient = { addColorStop() {} };
  const context = new Proxy({ createLinearGradient: () => gradient }, {
    get(target, property) {
      if (property in target) return target[property];
      return () => {};
    },
  });
  return elementMock({
    getContext: () => context,
    hasPointerCapture: () => false,
    height: 640,
    setPointerCapture() {},
    width: 640,
  });
}

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

test("source preview is contained without forcing a circular crop", () => {
  const fit = containRect(1200, 800, 640, 640, 20);
  assert.equal(fit.width, 600);
  assert.equal(fit.height, 400);
  assert.equal(fit.x, 20);
  assert.equal(fit.y, 120);
});

test("portrait preview preserves the source aspect ratio", () => {
  const fit = containRect(500, 1000, 640, 640, 20);
  assert.equal(fit.height, 600);
  assert.equal(fit.width, 300);
  assert.equal(fit.x, 170);
  assert.equal(fit.y, 20);
});

test("Face Studio opens before the iOS photo picker and can reselect the same file", () => {
  const previousDocument = globalThis.document;
  const previousAnimationFrame = globalThis.requestAnimationFrame;
  let inputClicks = 0;

  globalThis.document = {
    addEventListener() {},
    body: { classList: classListMock() },
  };
  globalThis.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };

  try {
    const input = elementMock({ click: () => { inputClicks += 1; }, value: "previous-photo" });
    const root = elementMock({ hidden: true });
    const replace = elementMock();
    const confirm = elementMock();
    const studio = new FaceStudio({
      root,
      backdrop: elementMock(),
      canvas: canvasMock(),
      cancel: elementMock(),
      confirm,
      input,
      remove: elementMock(),
      replace,
      rotate: elementMock(),
      status: elementMock(),
      styleCanvas: canvasMock(),
      styleStrength: elementMock({ value: "0.78" }),
      styleValue: elementMock(),
    });

    studio.openEditor();
    assert.equal(root.hidden, false);
    assert.equal(inputClicks, 0);
    assert.match(replace.textContent, /Wybierz zdjęcie/);
    assert.equal(confirm.disabled, true);

    studio.requestFile();
    assert.equal(input.value, "");
    assert.equal(inputClicks, 1);
  } finally {
    globalThis.document = previousDocument;
    globalThis.requestAnimationFrame = previousAnimationFrame;
  }
});
