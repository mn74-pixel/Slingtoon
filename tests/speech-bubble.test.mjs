// The hero's speech bubble always sat above the head. Measured over 615 flights
// (every mission's certified route and six deliberate misses each) it covered
// the uncollected star in 183 flights and the goal's core in 4.1% of flight
// frames. It now moves below the hero, or fades where both sides are taken.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";
import { BUBBLE_FADE, speechBubbleLayout } from "../src/prop-art.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const covers = (box, spot) => {
  const x = clamp(spot.x, box.x, box.x + box.width), y = clamp(spot.y, box.y, box.y + box.height);
  return Math.hypot(spot.x - x, spot.y - y) < spot.r;
};

test("an opaque bubble never covers the star or the goal", () => {
  let frames = 0, shown = 0, hidden = 0;
  for (const level of LEVELS) for (const [dx, dy] of [[0, 0], [-30, 0], [30, 0], [0, -30], [0, 30], [-60, 20], [40, -40]]) {
    const model = new GameModel(() => {}, level);
    model.beginSling(model.anchor);
    model.dragSling({ x: level.assistPull.x + dx, y: level.assistPull.y + dy });
    if (!model.releaseSling()) continue;
    for (let step = 0; step < 2000 && model.phase === GamePhase.FLYING; step += 1) {
      model.update(1 / 120);
      if (model.phase !== GamePhase.FLYING || !model.speechText) continue;
      frames += 1;
      const avoid = [{ x: model.goalCentre.x, y: model.goalCentre.y, r: model.goalRadius * 0.6 }];
      if (level.star && !model.collectedStar) avoid.push({ x: level.star.x, y: level.star.y, r: 22 });
      const box = speechBubbleLayout(model.speechText, model.avatarPosition, { above: model.avatarRadius, below: model.avatarRadius }, avoid);
      if (box.alpha < 1) continue;
      shown += 1;
      if (avoid.some((spot) => covers(box, spot))) hidden += 1;
    }
  }
  assert.ok(frames > 50000, `only ${frames} frames with a bubble were checked`);
  assert.equal(hidden, 0, `${hidden} frames printed the bubble over the star or the goal`);
  assert.ok(shown / frames > 0.98, `the bubble faded in ${((1 - shown / frames) * 100).toFixed(1)}% of frames`);
});

test("above when the sky is clear, below when it is not, faded when both are taken", () => {
  const hero = { x: 500, y: 350 }, clear = speechBubbleLayout("HEJ!", hero, { above: 35, below: 35 });
  assert.equal(clear.side, "above");
  assert.equal(clear.alpha, 1);
  assert.ok(clear.y + clear.height <= hero.y - 35, "the bubble sits on the hero's head");
  const star = { x: 500, y: clear.y + 20, r: 22 };
  const moved = speechBubbleLayout("HEJ!", hero, { above: 35, below: 35 }, [star]);
  assert.equal(moved.side, "below");
  assert.ok(moved.y >= hero.y + 35, "the lower bubble sits on the hero's body");
  const boxed = speechBubbleLayout("HEJ!", hero, { above: 35, below: 35 }, [star, { x: 500, y: moved.y + 20, r: 22 }]);
  assert.equal(boxed.side, "above");
  assert.equal(boxed.alpha, BUBBLE_FADE);
});

test("the renderer really places the bubble with the layout", async () => {
  const source = await readFile(new URL("../src/render.js", import.meta.url), "utf8");
  assert.match(source, /speechBubbleLayout\(model\.speechText, position,/);
  assert.match(source, /avoid\.push\(\{ x: model\.level\.star\.x/, "the star is no longer avoided");
});
