// Integration test with small DOM/Canvas test doubles, not a substitute for browser/mobile QA.
import test from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../src/levels.js";
import { bootMainModule } from "./dom-harness.mjs";

test("real main module: campaign navigation, touch shots, hints, medals, FIK and retries are connected", async () => {
  const { elements, saved, advance, shoot, restoreTimers } = await bootMainModule();
  assert.equal(elements.missionTitle.textContent, LEVELS[0].mission.title);
  assert.equal(elements.nextLevel.disabled, true);
  assert.equal(elements.oneMoveMode.hidden, true);
  for (let i = 0; i < LEVELS.length; i++) {
    assert.equal(elements.missionTitle.textContent, LEVELS[i].mission.title);
    // One Move used to live in mission 4 alone, so this read `i !== 3`. It is
    // offered wherever a mission has furniture the player may slide — and the
    // Quick Sling pill beside it is hidden in the same breath, because a
    // switch with one position is a dead control.
    assert.equal(elements.oneMoveMode.hidden, !LEVELS[i].editable,
      `mission ${i + 1}: One Move shown without anything to move, or hidden with something to move`);
    assert.equal(elements.quickMode.hidden, !LEVELS[i].editable,
      `mission ${i + 1}: the mode switch must appear and disappear as a pair`);
    shoot(LEVELS[i].assistPull);
    assert.equal(elements.nextLevel.disabled, true);
    assert.equal(elements.airMoveButton.hidden, i < 4);
    advance(410);
    assert.equal(elements.resultPanel.hidden, false);
    assert.ok(elements.resultPanel.classes.has("is-success"), `mission ${i + 1} should succeed through actual UI handlers`);
    assert.match(elements.resultReward.textContent, /Przejście/);
    if (i < LEVELS.length - 1) elements.againButton.click();
  }
  elements.levelIndicator.click();
  assert.equal(elements.missionMap.open, true);
  assert.equal(elements.missionList.children.length, 8);
  assert.ok(elements.missionList.children.every((e) => !e.disabled));
  elements.chapterSelect.value = "0";
  elements.chapterSelect.dispatch("change", { target: elements.chapterSelect });
  elements.missionList.children[4].click();
  assert.equal(elements.missionMap.open, false);
  elements.hintButton.click();
  assert.match(elements.statusText.textContent, /Miętowa para/);
  elements.hintButton.click();
  elements.hintButton.click();
  assert.equal(elements.hintButton.textContent, "💡 UKRYJ PODPOWIEDŹ");
  elements.hintButton.click();
  assert.equal(elements.hintButton.textContent, "💡 POKAŻ ODKRYTE");
  elements.hintButton.click();
  assert.match(elements.statusText.textContent, /Duch pokazuje/);
  const before = saved.get("slingtoon-progress-v3");
  elements.restartButton.click();
  assert.equal(saved.get("slingtoon-progress-v3"), before, "retry must not buy another hint");
  shoot({ x: 190, y: 455 });
  assert.equal(elements.airMoveButton.disabled, false);
  elements.airMoveButton.click();
  assert.equal(elements.airMoveButton.disabled, true);
  assert.equal(elements.airMoveButton.textContent, "✓ FIK ZUŻYTY");
  advance(410);
  assert.ok(elements.resultPanel.classes.has("is-failure"));
  assert.equal(elements.whatIfButton.hidden, false);
  elements.againButton.click();
  assert.equal(elements.resultPanel.hidden, true);
  assert.equal(elements.hintButton.disabled, false);

  // Wiping the campaign asks first, can be backed out of, and really forgets.
  elements.levelIndicator.click();
  assert.equal(elements.resetConfirm.hidden, true, "the map opens without the warning showing");
  elements.resetProgress.click();
  assert.equal(elements.resetConfirm.hidden, false);
  assert.equal(elements.resetProgress.hidden, true);
  elements.resetCancel.click();
  assert.equal(elements.resetConfirm.hidden, true, "backing out changes nothing");
  assert.ok(saved.get("slingtoon-progress-v3"), "a cancelled wipe keeps the save");

  elements.resetProgress.click();
  elements.resetConfirmYes.click();
  assert.equal(elements.missionMap.open, false, "the map closes once the campaign restarts");
  assert.equal(elements.missionTitle.textContent, LEVELS[0].mission.title, "back on mission 1");
  assert.equal(elements.nextLevel.disabled, true, "every later mission is locked again");
  assert.equal(elements.scoreBadge.textContent, "★ 0");
  const fresh = JSON.parse(saved.get("slingtoon-progress-v3"));
  assert.equal(fresh.highestUnlockedLevel, 0);
  assert.equal(fresh.score, 0);
  assert.deepEqual(fresh.medals, {});
  assert.equal(fresh.resumeLevelId, LEVELS[0].id);
  restoreTimers();
});
