// Every mission is drawn in the scenery it names, and that scenery reaches the
// edges of whatever screen it is shown on.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEVELS } from "../src/levels.js";

const render = readFileSync(new URL("../src/render.js", import.meta.url), "utf8");
const world = readFileSync(new URL("../src/world-renderer.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const procedural = new Set([...render.matchAll(/^\s+"?([a-z-]+)"?: \(\) => this\.draw\w+Scene\(ctx\),$/gm)].map((m) => m[1]));
const campaign = new Set([...world.matchAll(/scene === "([a-z-]+)"/g)].map((m) => m[1]));

test("every mission without its own backdrop names a scene the renderer can draw", () => {
  assert.ok(procedural.has("laundry") && campaign.has("beach"), "scene tables were not found");
  // An unknown scene falls back to the laundry without a word: mission 96
  // asked for a bedroom that only exists as mission 1's painted backdrop.
  const unknown = LEVELS.filter((level) => !level.background && !procedural.has(level.scene) && !campaign.has(level.scene));
  assert.deepEqual(unknown.map((level) => `${level.number}:${level.scene}`), []);
});

test("campaign scenery is carried out to the screen edges, not stopped at the world box", () => {
  // The beach dune was a closed polygon from x 0 to 1280, so on a wide phone
  // the sea ran on past the sand on both sides.
  assert.doesNotMatch(world, /\[1280, 640\], \[0, 640\]/, "a ground shape is closed at the world edge instead of the screen edge");
  // The same in the hand-drawn scenes: the hills of the garden, park and lake.
  assert.doesNotMatch(render, /lineTo\(1280, 640\); ctx\.lineTo\(0, 640\)/, "hills are closed at the world edge");
  // And a full-screen tint covers the screen, not the world box.
  assert.doesNotMatch(render, /fillRect\(0, 0, WORLD\.width, WORLD\.height\)/, "a tint stops at the world edge");
});

test("the instruction chip does not grow by the bottom safe area in fullscreen", () => {
  // Left over from when the status row sat at the bottom of the screen: in
  // fullscreen on a notched phone the top-left chip grew by the home-bar inset
  // and covered the objective chip under it.
  assert.doesNotMatch(styles, /is-fullscreen-active \.status-row \{[^}]*safe-area-inset-bottom/);
  assert.doesNotMatch(styles, /is-fullscreen-active \.objective-status \{ top:/);
});
