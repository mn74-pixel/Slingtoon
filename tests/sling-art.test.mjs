// A player described two faults in one sentence: the hero is grabbed by the
// face, and he covers the slingshot with his body so a first-timer cannot tell
// what to do.
//
// Both were real. The bands ended at `avatarPosition`, which is the hero's
// NECK — over an uploaded photograph the coral band was drawn from the
// forehead to the mouth. And the whole sling lived in the back layer, so a
// photographed head, 184 px wide, hid 74% of it.
//
// No band geometry can keep clear of the head at every pull: drag the hero far
// enough and he passes the fork himself. What guarantees a clear face is the
// LAYER ORDER — everything that could cross him is drawn before he is, and
// only the pouch's lip, at his seat, is drawn after. These tests measure that
// order's output rather than trusting it.
import test from "node:test";
import assert from "node:assert/strict";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import { GameRenderer } from "../src/render.js";
import {
  PHOTO_SEAT_DROP, REST_LEAN, SEAT_DROP, distanceToSegment, headKeepOut, pouchEnds,
  restPosition, slingFrame, slingGrip, slingStrokes, visibleFraction,
} from "../src/sling-art.js";

// Only what drawSlingFront touches, with the transform it draws under.
function recordingContext() {
  const points = [];
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
    points,
    save() { stack.push({ ...matrix }); },
    restore() { const frame = stack.pop(); if (frame) matrix = frame; },
    translate(x, y) { matrix = multiply(matrix, { a: 1, b: 0, c: 0, d: 1, e: x, f: y }); },
    rotate(angle) {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      matrix = multiply(matrix, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 });
    },
    scale(x, y) { matrix = multiply(matrix, { a: x, b: 0, c: 0, d: y, e: 0, f: 0 }); },
    beginPath() {}, closePath() {}, stroke() {}, fill() {}, clip() {}, setLineDash() {}, drawImage() {},
    moveTo: at, lineTo: at,
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
    fillText: (value, x, y) => at(x, y),
    measureText: (value) => ({ width: value.length * 7.6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  for (const key of ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "globalAlpha", "font", "textAlign", "textBaseline"]) ctx[key] = "";
  return ctx;
}

// A renderer with only the fields the sling layers read.
function slingRenderer(model, { photo, restEase = 0 } = {}) {
  const renderer = Object.create(GameRenderer.prototype);
  renderer.model = model;
  renderer.faceImage = photo ? { width: 512, height: 512 } : null;
  renderer.restEase = restEase;
  return renderer;
}

// Every pull the game allows, on the real clamp.
function pullGrid(model) {
  const pulls = [];
  for (let x = 20; x <= 220; x += 5) for (let y = 390; y <= 600; y += 5) pulls.push(model.clampedSlingPoint({ x, y }));
  return pulls;
}

test("nothing drawn after the hero lands on his face, at any pull", () => {
  const level = LEVELS[0];
  for (const photo of [true, false]) {
    const model = new GameModel(() => {}, level);
    model.beginSling(model.anchor);
    const renderer = slingRenderer(model, { photo });
    for (const pull of pullGrid(model)) {
      model.dragSling(pull);
      const ctx = recordingContext();
      renderer.drawSlingFront(ctx);
      const head = headKeepOut(model.avatarPosition, model.avatarRadius / 35, photo);
      const onFace = ctx.points.filter((point) => Math.hypot(point.x - head.x, point.y - head.y) <= head.radius);
      assert.equal(onFace.length, 0,
        `${photo ? "photo" : "stock"} head: ${onFace.length} point(s) painted on the face at pull ${JSON.stringify(pull)}`);
    }
  }
});

// The bug in one assertion: a band that ends at `avatarPosition` ends at the
// neck. Both ends belong to the pouch, well below the chin.
test("the bands end at the pouch, never on the hero", () => {
  const anchor = LEVELS[0].anchor;
  for (const [photo, drop] of [[true, PHOTO_SEAT_DROP], [false, SEAT_DROP]]) {
    const grip = slingGrip(anchor, 1, photo);
    assert.equal(grip.y - anchor.y, drop, "the pouch hangs at the seat, a fixed drop below the origin");
    const head = headKeepOut(anchor, 1, photo);
    const ends = pouchEnds(grip, slingFrame(anchor), 1);
    for (const [name, end] of Object.entries({ far: ends.far, near: ends.near })) {
      const air = Math.hypot(end.x - head.x, end.y - head.y) - head.radius;
      assert.ok(air > 20, `${photo ? "photo" : "stock"}: the ${name} band ends ${Math.round(air)} px from the head`);
    }
  }
});

// Measured before and after: a photographed hero used to cover 74% of the
// slingshot, a stock one 64%. Two prongs and a band are the only picture that
// says "slingshot" — if the hero sits on it, a first-time player has nothing
// to read.
test("the hero does not cover the slingshot", () => {
  const anchor = LEVELS[0].anchor;
  for (const photo of [true, false]) {
    const seen = visibleFraction(anchor, restPosition(anchor), 1, photo);
    assert.ok(seen >= 0.75,
      `${photo ? "photo" : "stock"} head: only ${Math.round(seen * 100)}% of the sling is visible at rest`);
  }
});

// A slingshot at zero draw keeps its pouch at the fork, so a hero standing
// exactly on the anchor stands on the slingshot whatever shape it is. He rests
// leaning back into the band — and that must stay a drawing decision.
test("the resting lean moves pixels, not the launch", () => {
  const model = new GameModel(() => {}, LEVELS[0]);
  const renderer = slingRenderer(model, { photo: false, restEase: 1 });
  assert.equal(model.phase, GamePhase.READY);
  const drawn = renderer.heroPosition();
  assert.notDeepEqual(drawn, model.anchor, "at rest the hero is drawn off the anchor, or he hides the sling again");
  assert.deepEqual(model.avatarPosition, model.anchor, "the body the physics launches must still sit on the anchor");
  assert.ok(REST_LEAN.x < 0, "he leans back into the band, away from the target");

  // The same pull must produce the same shot as it did before the lean existed.
  const before = model.simulate({ x: 90, y: 520 });
  renderer.restEase = 1;
  const after = model.simulate({ x: 90, y: 520 });
  assert.deepEqual(after.points.at(-1), before.points.at(-1), "drawing changed the flight");
});

test("the lean is gone by the time the player is dragging", () => {
  const model = new GameModel(() => {}, LEVELS[0]);
  const renderer = slingRenderer(model, { photo: false, restEase: 1 });
  Object.assign(renderer, {
    time: 0, fanAngle: 0, landing: null, trail: [], flightPath: [], particles: [], callouts: [],
    shake: 0, goalWobble: 0, successPulse: 0,
  });
  model.beginSling(model.anchor);
  model.dragSling({ x: 90, y: 520 });
  for (let i = 0; i < 30; i += 1) renderer.update(1 / 60);
  assert.ok(renderer.restEase < 0.01, `the lean must ease out once he is held, got ${renderer.restEase}`);
  assert.deepEqual(renderer.heroPosition(), model.avatarPosition, "while dragging, the hero is drawn where the finger is");
});

// Matched to the wrong ends, the two bands cross in an X halfway to the fork.
test("the two bands never cross each other", () => {
  const anchor = LEVELS[0].anchor;
  const frame = slingFrame(anchor);
  for (const position of [anchor, restPosition(anchor), { x: 70, y: 540 }, { x: 120, y: 420 }]) {
    const ends = pouchEnds(slingGrip(position, 1, false), frame, 1);
    const far = [frame.farTip, ends.far], near = [frame.nearTip, ends.near];
    const steps = 40;
    let closest = Infinity;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const point = { x: far[0].x + (far[1].x - far[0].x) * t, y: far[0].y + (far[1].y - far[0].y) * t };
      closest = Math.min(closest, distanceToSegment(point, near[0], near[1]));
    }
    assert.ok(closest > 1, `the bands touch or cross with the hero at ${JSON.stringify(position)}`);
  }
});

test("the fork stands between the hero and the target, on both tips", () => {
  const anchor = LEVELS[0].anchor;
  const frame = slingFrame(anchor);
  for (const [name, tip] of Object.entries({ far: frame.farTip, near: frame.nearTip })) {
    assert.ok(tip.x > anchor.x, `the ${name} tip must sit on the launch side of the hero`);
  }
  assert.ok(frame.base.y > frame.crotch.y, "the handle runs down from the crotch to the ground");
  const strokes = slingStrokes(anchor, restPosition(anchor), 1, false);
  assert.equal(strokes.length, 5, "handle, two prongs and two bands");
});
