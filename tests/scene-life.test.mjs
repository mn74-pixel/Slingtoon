// The 88 boards were still pictures.
//
// `drawCampaignScene(ctx, level)` never took a clock, so nothing behind the
// gameplay ever moved: only the target and the companion were alive. This file
// holds the four promises the ambient layer makes, because a decorative layer
// that quietly breaks one of them is worse than no layer at all.
//
//   1. It moves. That was the whole bug.
//   2. It stays below the props. A mote must never read as something to hit.
//   3. It is deterministic. Replays and the offline renders have to agree.
//   4. It costs a fixed, small number of draws and allocates nothing per frame.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LEVELS } from "../src/game.js";
import { drawSceneLife, sceneLifeElements, SCENE_LIFE_ALPHA, SCENE_LIFE_SCENES } from "../src/scene-life.js";

// Records where the layer paints and how faint it was when it did.
function recorder() {
  const marks = [];
  let alpha = 1;
  const at = (x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) marks.push({ x, y, alpha }); };
  const ctx = {
    marks,
    get globalAlpha() { return alpha; },
    set globalAlpha(value) { alpha = value; },
    save() {}, restore() {}, beginPath() {}, closePath() {}, fill() {}, stroke() {},
    moveTo: at, lineTo: at,
    quadraticCurveTo: (cx, cy, x, y) => { at(cx, cy); at(x, y); },
    rect: (x, y, w, h) => { at(x, y); at(x + w, y + h); },
    arc: (x, y, r) => { at(x - r, y); at(x + r, y); },
    ellipse: (x, y, rx, ry) => { at(x - rx, y - ry); at(x + rx, y + ry); },
  };
  for (const key of ["fillStyle", "strokeStyle", "lineWidth", "lineCap"]) ctx[key] = "";
  return ctx;
}

const SPAN = { left: 0, width: 1280 };

test("every scene the campaign names has its own life, never a fallback", () => {
  const named = [...new Set(LEVELS.map((level) => level.scene))].sort();
  for (const scene of named) {
    assert.ok(SCENE_LIFE_SCENES.includes(scene), `scene "${scene}" has no ambient layer of its own`);
  }
  // And nothing unused sits in the table pretending to be a board.
  for (const scene of SCENE_LIFE_SCENES) {
    assert.ok(named.includes(scene), `scene "${scene}" has life but no level`);
  }
});

test("the background moves — the bug this layer exists to fix", () => {
  for (const scene of SCENE_LIFE_SCENES) {
    const before = recorder(), after = recorder();
    drawSceneLife(before, scene, 6, SPAN);
    drawSceneLife(after, scene, 7, SPAN);
    assert.equal(before.marks.length, after.marks.length);
    const moved = before.marks.filter((mark, index) => {
      const next = after.marks[index];
      return Math.hypot(next.x - mark.x, next.y - mark.y) > 2;
    });
    assert.ok(
      moved.length >= before.marks.length * 0.9,
      `${scene}: only ${moved.length}/${before.marks.length} of the layer moved in a second`,
    );
  }
});

test("the layer stays fainter than anything the player can touch", () => {
  // Props, the hero and the goal all paint at globalAlpha 1. Measured against
  // the scenes' own pixels the life adds at most ~98 luminance where a prop
  // adds 117-190, so the ceiling here is the structural half of that: no
  // ambient element is ever drawn at even half opacity.
  assert.ok(SCENE_LIFE_ALPHA(1) <= 0.45, `deepest element draws at ${SCENE_LIFE_ALPHA(1)}`);
  assert.ok(SCENE_LIFE_ALPHA(0) > 0.05, "the faintest element would be invisible");
  for (const scene of SCENE_LIFE_SCENES) {
    const ctx = recorder();
    drawSceneLife(ctx, scene, 4.2, SPAN);
    const loudest = Math.max(...ctx.marks.map((mark) => mark.alpha));
    assert.ok(loudest <= 0.45, `${scene} paints an ambient element at ${loudest}`);
  }
});

test("same scene, same clock, same picture", () => {
  for (const scene of SCENE_LIFE_SCENES) {
    const first = recorder(), second = recorder();
    drawSceneLife(first, scene, 11.25, SPAN);
    drawSceneLife(second, scene, 11.25, SPAN);
    assert.deepEqual(second.marks, first.marks, `${scene} drew a different frame from the same clock`);
  }
});

test("the elements are built once and then only read", () => {
  for (const scene of SCENE_LIFE_SCENES) {
    const elements = sceneLifeElements(scene);
    const snapshot = JSON.stringify(elements);
    for (let frame = 0; frame < 120; frame += 1) drawSceneLife(recorder(), scene, frame / 60, SPAN);
    assert.equal(sceneLifeElements(scene), elements, `${scene} rebuilt its elements`);
    assert.equal(JSON.stringify(sceneLifeElements(scene)), snapshot, `${scene} mutated its elements while drawing`);
  }
});

test("a frame is a small, fixed number of draws", () => {
  for (const scene of SCENE_LIFE_SCENES) {
    const elements = sceneLifeElements(scene);
    assert.ok(elements.length <= 80, `${scene} carries ${elements.length} ambient elements`);
    for (const element of elements) {
      for (const key of ["offset", "y", "size", "speed", "sway", "phase", "depth"]) {
        assert.ok(Number.isFinite(element[key]), `${scene}.${element.kind}.${key} is not a number`);
      }
      assert.ok(element.size > 0, `${scene}.${element.kind} has no size`);
    }
  }
});

test("the life fills the whole visible strip, not the authored box", () => {
  // A 21:9 screen reveals world either side of the 1280 box. The scenery is
  // painted across all of it, so the life has to be there too.
  const span = { left: -240, width: 1760 };
  for (const scene of SCENE_LIFE_SCENES) {
    const ctx = recorder();
    for (let frame = 0; frame < 30; frame += 1) drawSceneLife(ctx, scene, frame * 0.4, span);
    const left = ctx.marks.filter((mark) => mark.x < span.left + span.width * 0.2).length;
    const right = ctx.marks.filter((mark) => mark.x > span.left + span.width * 0.8).length;
    assert.ok(left > 0 && right > 0, `${scene}: ${left} marks left of the box, ${right} right of it`);
  }
});

test("the renderer really calls it, behind the gameplay and above the scene", async () => {
  // A layer nothing draws is the frozen background all over again, and a
  // deleted call is exactly the sabotage this file has to catch.
  const source = await readFile(new URL("../src/render.js", import.meta.url), "utf8");
  const background = source.indexOf("this.drawBackground(ctx);\n");
  const life = source.indexOf("drawSceneLife(ctx,");
  const objective = source.indexOf("drawObjective(ctx, this.model, this.time);");
  assert.ok(background > 0 && life > 0 && objective > 0, "the render pass lost one of its layers");
  assert.ok(background < life && life < objective, "the ambient layer is not between the scene and the gameplay");
  const worker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  assert.ok(worker.includes("./src/scene-life.js?v="), "the offline shell would boot without the ambient layer");
});
