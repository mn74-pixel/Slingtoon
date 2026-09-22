// One Move — sliding one piece of furniture before the shot — existed in
// exactly one mission of eighty-eight. In the other eighty-seven the mode
// switch beside it had nothing to switch to: measured on the live build,
// clicking "Quick Sling" changed not a single attribute. A control that does
// nothing reads as a broken game, which is how it was reported.
//
// It spans eleven missions now, chosen by measurement: across the full
// -90..+100 slide each one keeps every spacing rule, keeps its star readable,
// and stays winnable at every offset.
import test from "node:test";
import assert from "node:assert/strict";
import { GameMode, GameModel, LEVELS } from "../src/game.js";
import { PROP_CLEARANCE, STAR_CLEARANCE, clearanceBetween, goalParts, propParts, starClearance } from "../src/prop-art.js";
import { winningPulls } from "../scripts/lib/route-search.mjs";

const editable = LEVELS.filter((level) => level.editable);
// The extremes and the middle. The full sweep of seven offsets was measured
// once while choosing these eleven missions; re-running it on every `npm test`
// cost ten seconds to re-learn the same thing.
const OFFSETS = [-90, 0, 100];

const slide = (level, offset) => level.interactions.map((item) => {
  if (item.id !== level.editable.id) return item;
  return item.a && item.b
    ? { ...item, a: { ...item.a, x: item.a.x + offset }, b: { ...item.b, x: item.b.x + offset } }
    : { ...item, x: item.x + offset };
});

const worstAir = (interactions, goal) => {
  const groups = interactions.map((item) => ({ parts: propParts(item) })).filter((group) => group.parts.length);
  groups.push({ parts: goalParts(goal) });
  let worst = Infinity;
  for (let i = 0; i < groups.length; i += 1) for (let j = i + 1; j < groups.length; j += 1) {
    const air = clearanceBetween(groups[i].parts, groups[j].parts);
    if (Number.isFinite(air)) worst = Math.min(worst, air);
  }
  return worst;
};

test("the mode is offered in enough missions to be a mode", () => {
  assert.ok(editable.length >= 10,
    `One Move is offered in ${editable.length} missions; with one, the switch beside it is a dead control`);
});

test("every movable object can actually be grabbed and slid", () => {
  for (const level of editable) {
    const model = new GameModel(() => {}, level);
    assert.equal(model.setMode(GameMode.ONE_MOVE), true, `mission ${level.number} refuses its own mode`);
    const item = model.interactions.find((entry) => entry.id === level.editable.id);
    assert.ok(item, `mission ${level.number}: editable names ${level.editable.id}, which is not in the mission`);
    // A cushion is two points, a crate is a box. Reading `item.a.x` on a crate
    // threw before a frame was drawn — that is what made the first eight of
    // these missions uncrashable only by never being offered.
    const grabAt = item.a && item.b
      ? { x: (item.a.x + item.b.x) / 2, y: (item.a.y + item.b.y) / 2 }
      : { x: item.x + (item.width ?? 60) / 2, y: item.y + (item.height ?? 60) / 2 };
    assert.equal(model.beginObjectMove(grabAt), true, `mission ${level.number}: ${level.editable.id} cannot be grabbed`);
    model.dragObject({ x: grabAt.x + 70, y: grabAt.y });
    assert.equal(model.endObjectMove(), true, `mission ${level.number}: the slide did not count as the one move`);
    assert.ok(Math.abs(model.layoutOffset) > 8, `mission ${level.number}: the object did not move`);
  }
});

test("sliding an object never breaks the board it sits on", () => {
  for (const level of editable) {
    for (const offset of OFFSETS) {
      const interactions = slide(level, offset);
      const air = worstAir(interactions, level.goal);
      assert.ok(air >= PROP_CLEARANCE - 0.5,
        `mission ${level.number} at offset ${offset}: drawings leave ${Math.round(air)} px of air`);
      if (level.star) {
        const { air: starAir, against } = starClearance(level.star, { ...level, interactions });
        assert.ok(starAir >= STAR_CLEARANCE,
          `mission ${level.number} at offset ${offset}: the star is buried by ${against} (${Math.round(starAir)} px)`);
      }
    }
  }
});

test("a mission stays winnable wherever the player leaves the object", () => {
  for (const level of editable) {
    for (const offset of OFFSETS) {
      const model = new GameModel(() => {}, { ...level, interactions: slide(level, offset) });
      const { winners } = winningPulls(model);
      assert.ok(winners.length > 0,
        `mission ${level.number}: sliding ${level.editable.id} to ${offset} makes the mission impossible`);
    }
  }
});

test("the mode names the object the player can actually move", () => {
  const named = new Map();
  for (const level of editable) {
    const model = new GameModel(() => {}, level);
    model.setMode(GameMode.ONE_MOVE);
    const item = level.interactions.find((entry) => entry.id === level.editable.id);
    const name = model.movableName;
    assert.ok(name && !name.includes("undefined"), `mission ${level.number} has no name for ${level.editable.id}`);
    named.set(item.type, name);
    if (item.type !== "cushion") {
      assert.notEqual(name, "ukośną poduszkę",
        `mission ${level.number} moves a ${item.type} but the game calls it a cushion`);
    }
  }
  assert.ok(named.size >= 3, `the eleven missions should move more than ${named.size} kind(s) of object`);
});

test("a mission with nothing to move refuses the mode outright", () => {
  const plain = LEVELS.find((level) => !level.editable);
  const model = new GameModel(() => {}, plain);
  assert.equal(model.setMode(GameMode.ONE_MOVE), false, `mission ${plain.number} accepted a mode it cannot offer`);
  assert.equal(model.mode, GameMode.QUICK);
});

// The fault as reported: a switch that does nothing. It is now shown only where
// there is something to switch to.
test("the mode switch appears only where a mission offers the choice", async () => {
  const { bootMainModule } = await import("./dom-harness.mjs");
  const { elements, restoreTimers } = await bootMainModule();
  // Mission 1 has no furniture to move.
  assert.equal(elements.quickMode.hidden, true, "mission 1 shows a Quick Sling pill with nothing to switch to");
  assert.equal(elements.oneMoveMode.hidden, true);
  restoreTimers();
});
