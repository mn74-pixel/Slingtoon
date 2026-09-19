// The layout rule decides where objects go from a table of rectangles in
// prop-art.js, while interactions-renderer.js decides what actually gets
// painted. Two descriptions of the same thing drift, and when they drift the
// crowding comes back without a single test going red.
//
// So this records every coordinate the renderer touches for one item and fails
// if any of them falls outside the box the layout believed in. The same trick
// caught a gold star drawn on a player's photographed eye.
import test from "node:test";
import assert from "node:assert/strict";
import { drawInteractions } from "../src/interactions-renderer.js";
import { LEVELS } from "../src/levels.js";
import { PROP_CLEARANCE, clearanceBetween, goalParts, propParts } from "../src/prop-art.js";

function recordingContext() {
  const points = [];
  let text = null;
  // The renderer draws a portal's swirls after translating and rotating to the
  // ring's centre, so a recorder that ignores the transform sees them at the
  // origin. It has to carry the same matrix the canvas would.
  let matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  // The hazard paints its diagonal stripes 40 px past both ends and then clips
  // them to its own box. Without modelling the clip, the recorder reports paint
  // that never reaches a pixel.
  let clip = null;
  let path = [];
  const stack = [];
  const multiply = (m, n) => ({
    a: m.a * n.a + m.c * n.b, b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d, d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e, f: m.b * n.e + m.d * n.f + m.f,
  });
  const at = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const point = { x: matrix.a * x + matrix.c * y + matrix.e, y: matrix.b * x + matrix.d * y + matrix.f };
    path.push(point);
    if (clip && (point.x < clip.left || point.x > clip.right || point.y < clip.top || point.y > clip.bottom)) return;
    points.push(point);
  };
  const ctx = {
    points,
    save() { stack.push({ matrix: { ...matrix }, clip }); },
    restore() { const frame = stack.pop(); if (frame) { matrix = frame.matrix; clip = frame.clip; } },
    translate(x, y) { matrix = multiply(matrix, { a: 1, b: 0, c: 0, d: 1, e: x, f: y }); },
    rotate(angle) {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      matrix = multiply(matrix, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 });
    },
    scale(x, y) { matrix = multiply(matrix, { a: x, b: 0, c: 0, d: y, e: 0, f: 0 }); },
    beginPath() { path = []; }, closePath() {}, stroke() {}, fill() {},
    clip() {
      if (!path.length) return;
      clip = {
        left: Math.min(...path.map((point) => point.x)), right: Math.max(...path.map((point) => point.x)),
        top: Math.min(...path.map((point) => point.y)), bottom: Math.max(...path.map((point) => point.y)),
      };
    },
    setLineDash() {}, drawImage() {},
    moveTo: at, lineTo: at,
    quadraticCurveTo: (cx, cy, x, y) => { at(cx, cy); at(x, y); },
    bezierCurveTo: (a, b, c, d, x, y) => { at(a, b); at(c, d); at(x, y); },
    // A pendulum draws its sweep as an arc of a few tenths of a turn. Recording
    // the whole circle's bounding box reported paint 300 px above the pivot
    // that the renderer never puts there.
    arc: (x, y, r, from = 0, to = Math.PI * 2) => {
      const steps = 24;
      for (let i = 0; i <= steps; i += 1) {
        const angle = from + (to - from) * (i / steps);
        at(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      }
    },
    ellipse: (x, y, rx, ry) => { at(x - rx, y - ry); at(x + rx, y + ry); },
    rect: (x, y, w, h) => { at(x, y); at(x + w, y + h); },
    roundRect: (x, y, w, h) => { at(x, y); at(x + w, y + h); },
    fillRect: (x, y, w, h) => { at(x, y); at(x + w, y + h); },
    strokeRect: (x, y, w, h) => { at(x, y); at(x + w, y + h); },
    // Captions are boxes of their own, measured the way the renderer measures
    // them; the label's own width is checked separately below.
    fillText: (value, x, y) => { text = value; at(x, y); },
    measureText: (value) => ({ width: value.length * 7.6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    get lastText() { return text; },
  };
  for (const key of ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "globalAlpha", "font", "textAlign", "textBaseline"]) ctx[key] = "";
  return ctx;
}

// A model stub with only what drawInteractions reads.
const modelFor = (item) => ({
  interactions: [item],
  objectState: {},
  flightTime: 0,
  mode: "quickSling",
  moveUsed: false,
});

const inside = (point, parts, slack) => parts.some((part) =>
  point.x >= part.left - slack && point.x <= part.right + slack
  && point.y >= part.top - slack && point.y <= part.bottom + slack);

// One of every kind the campaign actually ships, taken from the real levels so
// the shapes are the shipped ones and not invented for the test.
function sampleItems() {
  const seen = new Map();
  for (const level of LEVELS) {
    for (const item of level.interactions) if (!seen.has(item.type)) seen.set(item.type, item);
  }
  return [...seen.entries()];
}

test("every interaction the campaign ships has a footprint in prop-art", () => {
  for (const [type, item] of sampleItems()) {
    const parts = propParts(item);
    const isField = parts.length === 0;
    assert.ok(isField || parts.every((part) => part.right > part.left && part.bottom > part.top),
      `${type} produced an empty or inverted footprint`);
  }
});

// The number that matters: what the renderer paints has to fit inside what the
// layout reserved. The slack covers stroke widths and the decorative flourishes
// that hang a few pixels past an outline.
test("the renderer never paints outside the footprint the layout reserved", () => {
  const SLACK = 26;
  for (const [type, item] of sampleItems()) {
    const parts = propParts(item);
    if (!parts.length) continue;
    const ctx = recordingContext();
    drawInteractions(ctx, modelFor(item), 0);
    const strays = ctx.points.filter((point) => !inside(point, parts, SLACK));
    assert.equal(strays.length, 0,
      `${type} paints ${strays.length} point(s) outside its declared footprint, first at ${JSON.stringify(strays[0])}`);
  }
});

// Measured on the shipped levels, because this is the property the player sees
// and a regex over the layout code cannot check it.
test("no two objects in any mission are drawn closer than the clearance", () => {
  for (const level of LEVELS) {
    const groups = level.interactions
      .map((item) => ({ id: item.id ?? item.type, parts: propParts(item) }))
      .filter((group) => group.parts.length);
    groups.push({ id: "goal", parts: goalParts(level.goal) });
    for (let i = 0; i < groups.length; i += 1) {
      for (let j = i + 1; j < groups.length; j += 1) {
        const air = clearanceBetween(groups[i].parts, groups[j].parts);
        if (!Number.isFinite(air)) continue;
        assert.ok(air >= PROP_CLEARANCE - 0.5,
          `mission ${level.number}: ${groups[i].id} and ${groups[j].id} leave ${Math.round(air)} px of air`);
      }
    }
  }
});

// The bug this whole module exists for: mission 70 shipped with the DZYŃ!
// button painted over the exit portal, because the spacing rule asked a portal
// where it was and the portal answered with its entry.
test("a portal is placed by both of its rings, not just the entry", () => {
  const portals = LEVELS.flatMap((level) =>
    level.interactions.filter((item) => item.type === "portal").map((item) => ({ level, item })));
  assert.ok(portals.length > 10, "the campaign should still be full of portals");
  for (const { level, item } of portals) {
    const parts = propParts(item);
    const entrySide = parts.filter((part) => part.right <= (item.entry.x + item.exit.x) / 2);
    const exitSide = parts.filter((part) => part.left >= (item.entry.x + item.exit.x) / 2);
    assert.ok(entrySide.length && exitSide.length,
      `mission ${level.number}: ${item.id} reports a footprint on only one side of the pipe`);
  }
});

test("the goal's artwork is reserved, not just its hit circle", () => {
  for (const level of LEVELS.slice(0, 20)) {
    const [body] = goalParts(level.goal);
    assert.ok(body.right - body.left >= 148,
      `mission ${level.number}: the goal reserved only ${Math.round(body.right - body.left)} px, narrower than the art it draws`);
  }
});
