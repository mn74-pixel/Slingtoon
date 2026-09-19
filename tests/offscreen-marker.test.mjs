// The renderer's half of the off-screen marker: it must draw nothing while the
// hero is visible, draw inside the frame once he is gone, and hold back the
// speech bubble — which is clamped into view and otherwise hangs over the top
// edge pointing at nobody, in exactly the spot the marker uses.
import test from "node:test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import { GameRenderer } from "../src/render.js";
import { createCropFreeViewport } from "../src/viewport.js";

function recordingContext() {
  const points = [];
  const text = [];
  let matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const stack = [];
  const multiply = (m, n) => ({
    a: m.a * n.a + m.c * n.b, b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d, d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e, f: m.b * n.e + m.d * n.f + m.f,
  });
  const at = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    points.push({ x: matrix.a * x + matrix.c * y + matrix.e, y: matrix.b * x + matrix.d * y + matrix.f });
  };
  const ctx = {
    points, text,
    save() { stack.push({ ...matrix }); },
    restore() { const frame = stack.pop(); if (frame) matrix = frame; },
    translate(x, y) { matrix = multiply(matrix, { a: 1, b: 0, c: 0, d: 1, e: x, f: y }); },
    rotate(angle) {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      matrix = multiply(matrix, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 });
    },
    scale(x, y) { matrix = multiply(matrix, { a: x, b: 0, c: 0, d: y, e: 0, f: 0 }); },
    beginPath() {}, closePath() {}, stroke() {}, fill() {}, clip() {}, setLineDash() {},
    drawImage(image, ...args) { const [dx, dy, dw, dh] = args.length >= 8 ? args.slice(4, 8) : args; at(dx, dy); at(dx + dw, dy + dh); },
    moveTo: at, lineTo: at,
    arcTo: (x1, y1, x2, y2) => { at(x1, y1); at(x2, y2); },
    quadraticCurveTo: (cx, cy, x, y) => { at(cx, cy); at(x, y); },
    bezierCurveTo: (a, b, c, d, x, y) => { at(a, b); at(c, d); at(x, y); },
    arc: (x, y, r, from = 0, to = Math.PI * 2) => {
      for (let i = 0; i <= 16; i += 1) {
        const angle = from + (to - from) * (i / 16);
        at(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      }
    },
    ellipse: (x, y, rx, ry) => { at(x - rx, y - ry); at(x + rx, y + ry); },
    rect: (x, y, w, h) => { at(x, y); at(x + w, y + h); },
    roundRect: (x, y, w, h) => { at(x, y); at(x + w, y + h); },
    fillRect: (x, y, w, h) => { at(x, y); at(x + w, y + h); },
    strokeRect: (x, y, w, h) => { at(x, y); at(x + w, y + h); },
    fillText: (value, x, y) => { text.push(value); at(x, y); },
    measureText: (value) => ({ width: value.length * 7.6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  for (const key of ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "globalAlpha", "font", "textAlign", "textBaseline"]) ctx[key] = "";
  return ctx;
}

function flyingRenderer(position, { photo = false, width = 1280, height = 640 } = {}) {
  const model = new GameModel(() => {}, LEVELS[0]);
  model.beginSling(model.anchor);
  model.dragSling({ x: 90, y: 520 });
  model.releaseSling();
  model.avatarPosition = { ...position };
  const renderer = Object.create(GameRenderer.prototype);
  renderer.model = model;
  renderer.viewport = createCropFreeViewport(width, height);
  renderer.faceImage = photo ? { width: 512, height: 512 } : null;
  renderer.faceExpressions = null;
  renderer.time = 0;
  renderer.restEase = 0;
  assert.equal(model.phase, GamePhase.FLYING);
  return renderer;
}

test("nothing is drawn while the hero is on screen", () => {
  const renderer = flyingRenderer({ x: 600, y: 300 });
  const ctx = recordingContext();
  renderer.drawOffscreenMarker(ctx);
  assert.equal(ctx.points.length, 0, "a visible hero needs no marker");
});

test("a hero above the frame gets a marker, drawn inside the frame", () => {
  const renderer = flyingRenderer({ x: 700, y: -420 });
  const ctx = recordingContext();
  renderer.drawOffscreenMarker(ctx);
  assert.ok(ctx.points.length > 0, "the hero is gone and nothing marks where");
  for (const point of ctx.points) {
    assert.ok(point.x >= 0 && point.x <= 1280 && point.y >= 0 && point.y <= 640,
      `the marker paints outside the frame at ${JSON.stringify(point)}`);
  }
  // It belongs at the top, near his column, not in the middle of the board.
  const top = Math.min(...ctx.points.map((p) => p.y));
  assert.ok(top < 40, `the marker should hug the top edge, closest point was y=${Math.round(top)}`);
});

test("a hero past the right edge gets a marker on the right", () => {
  const renderer = flyingRenderer({ x: 2100, y: 300 });
  const ctx = recordingContext();
  renderer.drawOffscreenMarker(ctx);
  assert.ok(ctx.points.length > 0);
  const right = Math.max(...ctx.points.map((p) => p.x));
  assert.ok(right > 1240 && right <= 1280, `the marker should hug the right edge, got ${Math.round(right)}`);
});

test("the marker shrinks the further out he is, so distance reads without a number", () => {
  const spread = (position) => {
    const ctx = recordingContext();
    flyingRenderer(position).drawOffscreenMarker(ctx);
    const xs = ctx.points.map((p) => p.x);
    return Math.max(...xs) - Math.min(...xs);
  };
  const near = spread({ x: 700, y: -120 });
  const far = spread({ x: 700, y: -1400 });
  assert.ok(far < near, `a distant hero should read smaller: near ${Math.round(near)}, far ${Math.round(far)}`);
});

test("the marker only appears in flight", () => {
  const renderer = flyingRenderer({ x: 700, y: -420 });
  renderer.model.phase = GamePhase.READY;
  const ctx = recordingContext();
  renderer.drawOffscreenMarker(ctx);
  assert.equal(ctx.points.length, 0, "a marker at rest would point at a hero who is standing in the sling");
});

// The bubble is clamped into view, so off-screen it hangs over the top edge
// pointing at nobody — in the same place the marker goes.
test("the speech bubble waits while the hero is out of frame", () => {
  // speechText is derived from the phase, so the line under test is whatever
  // the model itself says in flight.
  const renderer = flyingRenderer({ x: 700, y: -420 });
  Object.assign(renderer, { landing: null, trail: [], particles: [], callouts: [] });
  const line = renderer.model.speechText;
  assert.ok(line.length > 0, "the hero has something to say in flight");
  const ctx = recordingContext();
  renderer.drawAvatar(ctx);
  assert.ok(!ctx.text.includes(line), "the bubble was drawn for a hero who is not on screen");

  const visible = flyingRenderer({ x: 700, y: 300 });
  Object.assign(visible, { landing: null, trail: [], particles: [], callouts: [] });
  const shown = recordingContext();
  visible.drawAvatar(shown);
  assert.ok(shown.text.includes(visible.model.speechText), "a hero on screen must keep his lines");
});

// The tests above call drawOffscreenMarker directly, so they would all still
// pass if the call were removed from the frame — which is exactly the state
// this change fixes. This one checks the wiring.
test("the marker is drawn every frame, after the hero", async () => {
  const source = await readFile(new URL("../src/render.js", import.meta.url), "utf8");
  const sequence = source.slice(source.indexOf("  render() {"), source.indexOf("  drawViewportBackdrop("));
  const hero = sequence.indexOf("this.drawAvatar(ctx);");
  const marker = sequence.indexOf("this.drawOffscreenMarker(ctx);");
  assert.ok(hero > 0, "the render sequence should still draw the hero");
  assert.ok(marker > 0, "render() never calls drawOffscreenMarker, so the hero still vanishes off-frame");
  assert.ok(marker > hero, "the marker belongs on top of the hero, not under him");
});
