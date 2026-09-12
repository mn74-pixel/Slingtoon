export const PROGRESS_KEY = "slingtoon-progress-v3";
export const TOKEN_SCORE_STEP = 200;
const integer = (value, maximum = 1_000_000) => Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.floor(value))) : 0;

export function readProgress(storage, levels) {
  const result = { version: 3, highestUnlockedLevel: 0, resumeLevelId: levels[0].id, score: 0, hintTokens: 2, bestScores: {}, hints: {}, medals: {} };
  try {
    const current = storage.getItem(PROGRESS_KEY);
    const previous = storage.getItem("slingtoon-progress-v2");
    const parsed = JSON.parse(current ?? previous ?? "null");
    if (parsed && typeof parsed === "object") {
      result.highestUnlockedLevel = integer(parsed.highestUnlockedLevel, levels.length - 1);
      result.score = integer(parsed.score);
      result.hintTokens = Number.isFinite(parsed.hintTokens) ? integer(parsed.hintTokens, 999) : 2;
      // Old scores are retained in the total. These are new puzzles, with fresh personal records.
      if (parsed.version === 3) for (const { id } of levels) {
        result.bestScores[id] = integer(parsed.bestScores?.[id], 240);
        result.hints[id] = integer(parsed.hints?.[id], 3);
        result.medals[id] = integer(parsed.medals?.[id], 7);
      }
      // Completing the old final mission must unlock the first appended mission.
      while (result.highestUnlockedLevel < levels.length - 1 && (result.medals[levels[result.highestUnlockedLevel].id] & 1)) result.highestUnlockedLevel++;
      const resume = levels.findIndex((level) => level.id === parsed.resumeLevelId);
      result.resumeLevelId = levels[resume >= 0 && resume <= result.highestUnlockedLevel ? resume : result.highestUnlockedLevel].id;
    } else {
      result.highestUnlockedLevel = integer(Number(storage.getItem("slingtoon-progress-v1")), levels.length - 1);
      result.resumeLevelId = levels[result.highestUnlockedLevel].id;
    }
  } catch { /* Storage is an enhancement, not a requirement to play. */ }
  return result;
}

export function hintOffer(progress, level, attempts = 0) {
  const stage = (progress.hints[level.id] ?? 0) + 1;
  if (stage > level.hints.stages.length) return null;
  const rescue = attempts >= level.hints.policy.autoAfterAttempts + 2;
  const free = stage <= level.hints.policy.freeStages || rescue;
  return { stage, cost: free ? 0 : level.hints.stages[stage - 1].cost, rescue, hint: level.hints.stages[stage - 1] };
}

export function purchaseHint(progress, level, attempts) {
  const offer = hintOffer(progress, level, attempts);
  if (!offer || progress.hintTokens < offer.cost) return { ok: false, offer };
  progress.hintTokens -= offer.cost;
  progress.hints[level.id] = offer.stage;
  return { ok: true, offer };
}

export function rewardSuccess(progress, { id, attempts, star, mode, hintStage, modifier = "none" }) {
  const precision = attempts === 1 && modifier === "none";
  // Brute force has to be visible in the score: the shot bonus is gone by the
  // fourth attempt, while the flat base keeps a hard mission from dead-ending.
  const score = 100 + (star ? 60 : 0) + Math.max(0, 60 - Math.max(0, attempts - 1) * 20) + (mode === "oneMoveChallenge" && hintStage < 3 ? 20 : 0);
  const best = progress.bestScores[id] ?? 0;
  const gained = Math.max(0, score - best);
  const tokenGain = Math.floor((progress.score + gained) / TOKEN_SCORE_STEP) - Math.floor(progress.score / TOKEN_SCORE_STEP);
  progress.bestScores[id] = Math.max(score, best);
  progress.medals[id] = (progress.medals[id] ?? 0) | 1 | (star ? 2 : 0) | (precision ? 4 : 0);
  progress.score += gained;
  progress.hintTokens += tokenGain;
  return { score, gained, tokenGain, star, precision, newBest: gained > 0 };
}

export function medalText(bits = 0) {
  return `${bits & 1 ? "●" : "○"} Przejście · ${bits & 2 ? "★" : "☆"} Gwiazdka · ${bits & 4 ? "◆" : "◇"} Pierwszy strzał`;
}
