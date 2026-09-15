// A photo head is a real person's face. A gold star once landed on the player's
// eye because an accent authored for the 36 px stock skull was drawn over a
// portrait scaled to 96 px. Nothing in the suite caught it. This does: it
// records every coordinate the accent renderers touch and fails if any of them
// falls inside the portrait box.
import test from "node:test";
import assert from "node:assert/strict";
import { GameRenderer } from "../src/render.js";

const PORTRAIT_HALF = 48; // drawImage(faceImage, -48, -48, 96, 96)

// Records the points every path command touches, in the renderer's own space.
function recordingContext() {
  const points = [];
  const at = (x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y }); };
  const ctx = {
    points,
    save() {}, restore() {}, beginPath() {}, closePath() {}, stroke() {}, fill() {},
    moveTo: at, lineTo: at,
    quadraticCurveTo: (cx, cy, x, y) => { at(cx, cy); at(x, y); },
    bezierCurveTo: (a, b, c, d, x, y) => { at(a, b); at(c, d); at(x, y); },
    // A circle's extent matters, not just its centre: a small arc at the edge of
    // the box still reaches into it.
    arc: (x, y, r) => { at(x - r, y - r); at(x + r, y + r); at(x - r, y + r); at(x + r, y - r); },
    ellipse: (x, y, rx, ry) => { at(x - rx, y - ry); at(x + rx, y + ry); at(x - rx, y + ry); at(x + rx, y - ry); },
    rect: (x, y, w, h) => { at(x, y); at(x + w, y + h); },
    drawImage() {}, translate() {}, scale() {}, rotate() {}, clip() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    measureText: (text) => ({ width: text.length * 8 }),
  };
  for (const key of ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "globalAlpha", "font", "textAlign", "shadowColor", "shadowBlur", "shadowOffsetY"]) ctx[key] = "";
  return ctx;
}

const onPortrait = (points) => points.filter((p) => Math.abs(p.x) <= PORTRAIT_HALF && Math.abs(p.y) <= PORTRAIT_HALF);

function accentRenderer() {
  // Only the accent methods are exercised, so the renderer needs no real canvas.
  const renderer = Object.create(GameRenderer.prototype);
  renderer.faceImage = { width: 512, height: 512 };
  renderer.time = 1.25;
  return renderer;
}

test("no personality accent is drawn onto a player's photographed face", () => {
  for (const personality of ["dramaQueen", "toughGuy", "panic", "zen"]) {
    const ctx = recordingContext();
    accentRenderer().drawPersonalityFront(ctx, personality);
    const trespass = onPortrait(ctx.points);
    assert.deepEqual(trespass, [], `${personality} draws ${trespass.length} point(s) onto the portrait, e.g. ${JSON.stringify(trespass[0])}`);
  }
});

test("every reaction accent for a photo head stays clear of the portrait", () => {
  for (const expression of ["bracing", "hopeful", "dizzy", "serene"]) {
    const ctx = recordingContext();
    accentRenderer().drawPhotoAccent(ctx, expression);
    assert.ok(ctx.points.length > 0, `${expression} must actually draw something, or it is a reaction in name only`);
    const trespass = onPortrait(ctx.points);
    assert.deepEqual(trespass, [], `${expression} draws ${trespass.length} point(s) onto the portrait, e.g. ${JSON.stringify(trespass[0])}`);
  }
});
