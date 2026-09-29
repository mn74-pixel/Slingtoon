// The campaign played as a flat slide.
//
// Measured on the certified route of every mission: 41 of 88 flights rose less
// than 150 px over an 885 px span, median rise 157 px, not one lob in the game.
// Three levers were tried and rejected before the one that worked — a steeper
// assist alone loses the width, more launch power makes the widest route
// FLATTER, and preferring arc among equally forgiving routes buys 16 px. The
// targets themselves were the answer: 69 of them rose, each by as much as its
// own re-certification allowed (scripts/lift-goals.mjs).
//
// This file is the guard on that. It flies the shipped route of all 88 missions
// and holds the shape of the campaign, so nobody flattens it back by editing a
// grid constant and watching the other tests stay green.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GameModel, GamePhase, LEVELS } from "../src/game.js";

const flights = LEVELS.map((level) => {
  const model = new GameModel(() => {}, level);
  model.beginSling(model.anchor);
  model.dragSling(level.assistPull);
  model.releaseSling();
  const start = { ...model.avatarPosition };
  let top = start.y, far = start.x, frames = 0;
  for (; frames < 4000 && model.phase === GamePhase.FLYING; frames += 1) {
    model.update(1 / 120);
    top = Math.min(top, model.avatarPosition.y);
    far = Math.max(far, model.avatarPosition.x);
  }
  return { number: level.number, rise: start.y - top, far, won: model.phase === GamePhase.SUCCEEDED };
});
const median = (values) => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];

test("every assisted route still wins", () => {
  const lost = flights.filter((flight) => !flight.won).map((flight) => flight.number);
  assert.deepEqual(lost, [], `missions the shipped route no longer wins: ${lost.join(", ")}`);
});

test("the campaign flies in arcs, not slides", () => {
  // Before the lift: median 157, 41 flat. After: median 210, 21 flat. The
  // thresholds sit between the two, so a regression toward the slide fails
  // here long before it reaches a player.
  const rises = flights.map((flight) => flight.rise);
  assert.ok(median(rises) >= 190, `median flight rise is only ${median(rises).toFixed(0)} px`);
  const flat = flights.filter((flight) => flight.rise < 150);
  assert.ok(flat.length <= 28, `${flat.length} of ${flights.length} flights are flat slides`);
  // And the arc must not be one mission's freak: a real spread of shapes.
  assert.ok(Math.max(...rises) - Math.min(...rises) >= 300, "every flight climbs the same amount");
});

test("the arc was not bought with the width", () => {
  // The player already complained about the empty right-hand side of the
  // board. Height that lands the hero at 60% of the screen is not an
  // improvement, so the reach is held at the same time as the rise.
  const fars = flights.map((flight) => flight.far);
  assert.ok(median(fars) >= 920, `the median flight now ends at x=${median(fars).toFixed(0)}`);
  const short = flights.filter((flight) => flight.far < 896);
  assert.ok(short.length <= 31, `${short.length} flights end before 70% of the width`);
});

test("the lift table is measured, never hand-typed", async () => {
  const source = await readFile(new URL("../src/campaign.js", import.meta.url), "utf8");
  const block = source.split("const GOAL_LIFT = Object.freeze({")[1]?.split("});")[0];
  assert.ok(block, "GOAL_LIFT is gone; the campaign is back on the shot grid's heights");
  const entries = [...block.matchAll(/(\d+): (\d+)/g)].map(([, n, lift]) => [Number(n), Number(lift)]);
  assert.ok(entries.length >= 55, `only ${entries.length} targets were lifted`);
  for (const [number, lift] of entries) {
    // Chapter 1 ships hand-written routes that the balancer never regenerates,
    // so its heights are not the search's to move.
    assert.ok(number >= 9 && number <= 88, `mission ${number} is outside the balanced range`);
    assert.ok(lift >= 30 && lift <= 180, `mission ${number} was lifted ${lift} px`);
    assert.equal(lift % 30, 0, `mission ${number}'s lift of ${lift} px is off the search's ladder`);
  }
  assert.equal(new Set(entries.map(([number]) => number)).size, entries.length, "a mission is listed twice");
});
