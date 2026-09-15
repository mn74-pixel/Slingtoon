// Stars buying characters is the whole point of 0.19: if the select does not
// really open, the reward is a number on a screen. This boots the real main
// module against a seeded save and reads the options the player would see.
import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../src/levels.js";
import { CHARACTER_UNLOCKS, PROGRESS_KEY } from "../src/progress.js";
import { bootMainModule } from "./dom-harness.mjs";

const labels = (select) => select.children.map((option) => ({ value: option.value, text: option.textContent, locked: option.disabled }));

test("a veteran's stars have already opened the characters they paid for", async () => {
  // Nine stars: Zen (3) and Panic (9) are bought, Tough Guy (18) is not.
  const medals = {};
  for (let i = 0; i < 9; i += 1) medals[LEVELS[i].id] = 3;
  const saved = new Map([[PROGRESS_KEY, JSON.stringify({
    version: 3, highestUnlockedLevel: 9, resumeLevelId: LEVELS[9].id,
    score: 1500, hintTokens: 4, bestScores: {}, hints: {}, medals,
  })]]);

  const { elements, restoreTimers } = await bootMainModule({ saved });
  const options = labels(elements.personality);
  assert.equal(options.length, CHARACTER_UNLOCKS.length, "every character is listed, paid for or not");
  assert.deepEqual(options.map((o) => o.value), CHARACTER_UNLOCKS.map((u) => u.personality));
  assert.deepEqual(options.map((o) => o.locked), [false, false, false, true]);

  // A locked entry has to state its price; an open one must not wear a padlock.
  const toughGuy = options.at(-1);
  assert.match(toughGuy.text, /🔒/);
  assert.match(toughGuy.text, /★18/, "the price is visible before it is paid");
  for (const open of options.slice(0, 3)) assert.doesNotMatch(open.text, /🔒|★/, `${open.value} is paid for and should read as a plain name`);

  // Choosing a character that is now affordable must actually take effect.
  elements.personality.value = "panic";
  elements.personality.dispatch("change", { target: elements.personality });
  assert.equal(elements.personality.value, "panic", "a bought character stays selected");

  // The map states the campaign's whole reward position in one line.
  elements.levelIndicator.click();
  assert.match(elements.campaignSummary.textContent, /★ 9 \/ 80/);
  assert.match(elements.campaignSummary.textContent, /✦ 0 opanowanych/, "stars alone are not mastery");
  assert.match(elements.campaignSummary.textContent, /jeszcze 9 ★ do postaci Tough Guy/);
  restoreTimers();
});
