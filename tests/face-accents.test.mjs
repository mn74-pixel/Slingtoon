// A photo head is a real person's face. A gold star once landed on the player's
// eye because an accent authored for the 36 px stock skull was drawn over a
// portrait scaled to 96 px. Nothing in the suite caught it. This does: it
// records every coordinate the accent renderers touch and fails if any of them
// falls inside the portrait box.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("a photographed head gets no personality accent drawn near it at all", () => {
  // Keeping the star off the face was not enough. Parked just beside a real
  // head it read as a stray sprite — "wyglada jak błąd kodowania". Nothing at
  // head level is drawn for a photo head; the cape and torso badge carry it.
  for (const personality of ["dramaQueen", "toughGuy", "panic", "zen"]) {
    const ctx = recordingContext();
    accentRenderer().drawPersonalityFront(ctx, personality);
    assert.deepEqual(ctx.points, [], `${personality} still draws ${ctx.points.length} point(s) beside the portrait`);
  }
});

test("the stock skull keeps its personality accents", () => {
  // The rule above must not quietly blank the drawn character too.
  const drawn = ["dramaQueen", "zen"].map((personality) => {
    const ctx = recordingContext();
    const renderer = accentRenderer();
    renderer.faceImage = null;
    renderer.drawPersonalityFront(ctx, personality);
    return ctx.points.length;
  });
  assert.ok(drawn.every((count) => count > 0), `stock accents went missing: ${JSON.stringify(drawn)}`);
});

// Every expression the model can actually produce, not just the ones that were
// convenient to check. The first version of this test covered three new states
// and missed that victory sparkles were being printed on the player's hair.
const EXPRESSIONS = ["neutral", "nervous", "airborne", "panic", "impact", "suspicious", "serene", "bracing", "hopeful", "dizzy", "victory", "defeat"];

test("no reaction accent for a photo head touches the portrait, for any expression", () => {
  for (const expression of EXPRESSIONS) {
    for (const method of ["drawPhotoReaction", "drawPhotoAccent"]) {
      const ctx = recordingContext();
      accentRenderer()[method](ctx, expression);
      const trespass = onPortrait(ctx.points);
      assert.deepEqual(trespass, [], `${method}("${expression}") draws ${trespass.length} point(s) onto the portrait, e.g. ${JSON.stringify(trespass[0])}`);
    }
  }
});

test("the expressions that should read on a photo head still draw something", () => {
  // The rule above is trivially satisfiable by drawing nothing at all, so the
  // states that carry real feeling have to prove they still show up.
  for (const expression of ["victory", "defeat", "panic", "impact", "nervous", "bracing", "hopeful", "dizzy", "serene"]) {
    const ctx = recordingContext();
    accentRenderer().drawPhotoReaction(ctx, expression);
    assert.ok(ctx.points.length > 0, `${expression} draws nothing on a photo head: a reaction in name only`);
  }
});

test("the model can only ask for expressions the renderer knows", () => {
  const source = readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
  const asked = [...source.matchAll(/return "([a-z]+)";/g)].map((match) => match[1]);
  const unique = [...new Set(asked)];
  assert.ok(unique.length > 0, "the expression getter must return literal names");
  for (const expression of unique) {
    assert.ok(EXPRESSIONS.includes(expression), `game.js can return "${expression}" but this test does not cover it`);
  }
});
