// The goal used to flinch on a bounce only past x=1010 — a stand-in for
// "close to the goal" that was never actually measured against one. Mission
// 1's own alarm clock sits at x=890, so the object this feature was named
// after could never trigger it. These tests exercise the real event handler,
// not the formula in isolation, so a regression that silently reintroduces a
// magic threshold would fail here too.
import test from "node:test";
import assert from "node:assert/strict";
import { GameRenderer } from "../src/render.js";

// Only the impact branch of handleGameEvent is exercised, so the renderer
// needs none of its canvas or game-model machinery — same pattern as the
// portrait-accent tests.
function impactRenderer(goalCentre) {
  const renderer = Object.create(GameRenderer.prototype);
  renderer.particles = [];
  renderer.callouts = [];
  renderer.shake = 0;
  renderer.goalWobble = 0;
  renderer.model = { goalCentre };
  return renderer;
}

test("a hard hit right next to the goal makes it flinch", () => {
  const renderer = impactRenderer({ x: 890, y: 465 });
  renderer.handleGameEvent({ type: "impact", x: 900, y: 470, speed: 620, surface: "cardboard" });
  assert.ok(renderer.goalWobble > 0.8, `expected a strong flinch, got ${renderer.goalWobble}`);
});

test("mission 1's alarm clock — the object this feature is named after — can flinch", () => {
  // The bug, reproduced directly: the old rule was `event.x > 1010`, and the
  // alarm clock's own goal sits at x=890. Every bounce in that mission failed
  // this check, however close it landed.
  const renderer = impactRenderer({ x: 890, y: 465 });
  renderer.handleGameEvent({ type: "impact", x: 860, y: 460, speed: 500, surface: "cardboard" });
  assert.ok(renderer.goalWobble > 0, "the alarm clock never flinches under the old x>1010 rule");
});

test("a hit far from the goal leaves it still", () => {
  const renderer = impactRenderer({ x: 1080, y: 300 });
  renderer.handleGameEvent({ type: "impact", x: 300, y: 500, speed: 620, surface: "ground" });
  assert.equal(renderer.goalWobble, 0, `a distant hazard should not rattle the goal, got ${renderer.goalWobble}`);
});

test("a soft graze barely nudges it, even close up", () => {
  // 95 is just past the solver's own bounce threshold (physics.js only calls
  // triggerImpact above 90), so this is the gentlest real hit the game can
  // produce — worth a flinch well short of a hard one's 1.6 ceiling.
  const renderer = impactRenderer({ x: 1000, y: 400 });
  renderer.handleGameEvent({ type: "impact", x: 1010, y: 405, speed: 95, surface: "ground" });
  assert.ok(renderer.goalWobble > 0 && renderer.goalWobble < 0.5, `expected a small flinch, got ${renderer.goalWobble}`);
});

test("the flinch fades smoothly with distance, not with a hard edge", () => {
  const goalCentre = { x: 1000, y: 400 };
  const wobbleAt = (distance) => {
    const renderer = impactRenderer(goalCentre);
    renderer.handleGameEvent({ type: "impact", x: 1000 + distance, y: 400, speed: 620, surface: "ground" });
    return renderer.goalWobble;
  };
  const near = wobbleAt(50), mid = wobbleAt(150), far = wobbleAt(250), beyond = wobbleAt(400);
  assert.ok(near > mid && mid > far, `flinch must shrink with distance: ${near}, ${mid}, ${far}`);
  assert.equal(beyond, 0, "past the wobble radius, nothing should happen at all");
});

test("a follow-up hit only strengthens the flinch, never resets a bigger one", () => {
  const renderer = impactRenderer({ x: 1000, y: 400 });
  renderer.handleGameEvent({ type: "impact", x: 1000, y: 400, speed: 620, surface: "ground" });
  const strong = renderer.goalWobble;
  renderer.handleGameEvent({ type: "impact", x: 1200, y: 400, speed: 95, surface: "ground" });
  assert.equal(renderer.goalWobble, strong, "a weak, distant follow-up hit must not erase a stronger recent flinch");
});

test("the flinch decays back to still through the renderer's own update loop", () => {
  const goalCentre = { x: 1000, y: 400 };
  const renderer = impactRenderer(goalCentre);
  Object.assign(renderer, {
    time: 0, fanAngle: 0, landing: null, trail: [], flightPath: [],
    model: { goalCentre, phase: "ready", modifier: "none" },
  });
  renderer.handleGameEvent({ type: "impact", x: 1000, y: 400, speed: 620, surface: "ground" });
  assert.ok(renderer.goalWobble > 0);
  for (let i = 0; i < 60; i += 1) renderer.update(1 / 60);
  assert.equal(renderer.goalWobble, 0, "the flinch must fully settle, not idle above zero forever");
});
