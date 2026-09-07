import { GameModel, GameMode, GamePhase, LEVELS, modifierName } from "./game.js?v=0.12.0";
import { GameRenderer } from "./render.js?v=0.12.0";
import { GameAudio } from "./audio.js?v=0.12.0";
import { FaceStudio } from "./face-studio.js?v=0.12.0";

const $ = (selector) => document.querySelector(selector);

const elements = {
  canvas: $("#gameCanvas"),
  stage: $("#stage"),
  loading: $("#loadingPanel"),
  chapterEyebrow: $("#chapterEyebrow"),
  missionKicker: $("#missionKicker"),
  missionTitle: $("#missionTitle"),
  previousLevel: $("#previousLevel"),
  nextLevel: $("#nextLevel"),
  levelIndicator: $("#levelIndicator"),
  quickMode: $("#quickMode"),
  oneMoveMode: $("#oneMoveMode"),
  personality: $("#personality"),
  faceButton: $("#faceButton"),
  faceInput: $("#faceInput"),
  soundButton: $("#soundButton"),
  fullscreenButton: $("#fullscreenButton"),
  modeBadge: $("#modeBadge"),
  shotBadge: $("#shotBadge"),
  scoreBadge: $("#scoreBadge"),
  resultPanel: $("#resultPanel"),
  resultTag: $("#resultTag"),
  resultTitle: $("#resultTitle"),
  resultSpeech: $("#resultSpeech"),
  resultReward: $("#resultReward"),
  whatIfButton: $("#whatIfButton"),
  againButton: $("#againButton"),
  restartButton: $("#restartButton"),
  hintButton: $("#hintButton"),
  instructionIcon: $("#instructionIcon"),
  instructionTitle: $("#instructionTitle"),
  statusText: $("#statusText"),
  faceStudio: $("#faceStudio"),
  faceBackdrop: $("#faceBackdrop"),
  faceCanvas: $("#faceCanvas"),
  faceCancel: $("#faceCancel"),
  faceConfirm: $("#faceConfirm"),
  faceRemove: $("#faceRemove"),
  faceReplace: $("#faceReplace"),
  faceRotate: $("#faceRotate"),
  faceStylePreview: $("#faceStylePreview"),
  faceStyleStrength: $("#faceStyleStrength"),
  faceStyleValue: $("#faceStyleValue"),
  faceStatus: $("#faceStatus"),
  fullscreenGuide: $("#fullscreenGuide"),
  fullscreenBackdrop: $("#fullscreenBackdrop"),
  fullscreenStart: $("#fullscreenStart"),
  fullscreenClose: $("#fullscreenClose"),
  toast: $("#toast"),
};

const audio = new GameAudio();
const model = new GameModel();
const renderer = new GameRenderer(elements.canvas, model);
const PROGRESS_KEY = "slingtoon-progress-v2";
const LEGACY_PROGRESS_KEY = "slingtoon-progress-v1";
const TOKEN_SCORE_STEP = 250;

let activePointer = null;
let interaction = null;
let lastFrame = performance.now();
let resultTimer = null;
let toastTimer = null;
let installPrompt = null;
let currentLevelIndex = 0;
let progress = loadProgress();
let highestUnlockedLevel = progress.highestUnlockedLevel;
let paidHintsThisRun = 0;
let lastReward = null;
const FULLSCREEN_TIP_KEY = "slingtoon-fullscreen-tip-0.12.0";

function clampProgress(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(LEVELS.length - 1, value)) : 0;
}

function loadProgress() {
  const fallback = { version: 2, highestUnlockedLevel: 0, score: 0, hintTokens: 2, bestScores: {} };
  try {
    const stored = window.localStorage.getItem(PROGRESS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...fallback,
        ...parsed,
        highestUnlockedLevel: clampProgress(parsed.highestUnlockedLevel),
        score: Math.max(0, Number(parsed.score) || 0),
        hintTokens: Math.max(0, Number(parsed.hintTokens) || 0),
        bestScores: parsed.bestScores && typeof parsed.bestScores === "object" ? parsed.bestScores : {},
      };
    }
    const legacy = Number.parseInt(window.localStorage.getItem(LEGACY_PROGRESS_KEY) ?? "0", 10);
    fallback.highestUnlockedLevel = clampProgress(legacy);
  } catch {
    // A fresh, useful state is safer than blocking the game on storage.
  }
  return fallback;
}

function saveProgress() {
  progress.highestUnlockedLevel = highestUnlockedLevel;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Progress persistence is optional in private browsing modes.
  }
}

function scoreSuccess() {
  const attemptBonus = Math.max(0, 80 - Math.max(0, model.attempts - 1) * 18);
  const noPaidHintBonus = paidHintsThisRun === 0 ? 45 : 0;
  const oneMoveBonus = model.mode === GameMode.ONE_MOVE ? 30 : 0;
  const score = 100 + attemptBonus + noPaidHintBonus + oneMoveBonus;
  const previousBest = Number(progress.bestScores[model.level.id]) || 0;
  const gained = Math.max(0, score - previousBest);
  const previousTokenMilestone = Math.floor(progress.score / TOKEN_SCORE_STEP);
  progress.bestScores[model.level.id] = Math.max(previousBest, score);
  progress.score += gained;
  const tokenGain = Math.max(0, Math.floor(progress.score / TOKEN_SCORE_STEP) - previousTokenMilestone);
  progress.hintTokens += tokenGain;
  lastReward = { score, gained, tokenGain, newBest: score > previousBest };
}

function requestHint() {
  const stages = model.level.hints?.stages ?? [];
  const nextStageNumber = model.hintStage + 1;
  const stage = stages[nextStageNumber - 1];
  if (!stage) {
    showToast("Wszystkie sekrety tej misji są już odkryte.");
    return;
  }
  const freeStages = model.level.hints?.policy?.freeStages ?? 0;
  const cost = nextStageNumber <= freeStages ? 0 : stage.cost ?? 1;
  if (progress.hintTokens < cost) {
    showToast(`Brakuje ${cost - progress.hintTokens} żetonu. Zdobywaj Punkty Sprytu za przejścia bez pomocy.`, true);
    return;
  }
  progress.hintTokens -= cost;
  if (cost > 0) paidHintsThisRun += 1;
  model.revealHint(nextStageNumber);
  saveProgress();
  showToast(`${stage.title}${cost ? ` · -${cost} żeton${cost > 1 ? "y" : ""}` : " · gratis"}`);
}

function isStandaloneMode() {
  return window.navigator.standalone === true
    || window.matchMedia("(display-mode: fullscreen)").matches
    || window.matchMedia("(display-mode: standalone)").matches;
}

function isAppleTouchDevice() {
  return /iPad|iPhone|iPod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

function shouldSuggestFullscreen() {
  let alreadySeen = false;
  try {
    alreadySeen = window.sessionStorage.getItem(FULLSCREEN_TIP_KEY) === "seen";
  } catch {
    // Some privacy modes disable storage; the guide can still work normally.
  }
  return isAppleTouchDevice()
    && !isStandaloneMode()
    && window.matchMedia("(orientation: landscape)").matches
    && !alreadySeen;
}

function updateFullscreenUi() {
  const active = isStandaloneMode() || Boolean(document.fullscreenElement);
  document.body.classList.toggle("is-standalone", isStandaloneMode());
  document.body.classList.toggle("is-fullscreen-active", active);
  elements.fullscreenButton.classList.toggle("is-active", active);
  elements.fullscreenButton.setAttribute("aria-pressed", String(active));
  elements.fullscreenButton.setAttribute("aria-label", active ? "Pełny ekran jest włączony" : "Włącz pełny ekran");
  elements.fullscreenButton.title = active ? "Pełny ekran jest włączony" : "Włącz pełny ekran";
  requestAnimationFrame(syncGameViewport);
}

function openFullscreenGuide({ automatic = false } = {}) {
  elements.fullscreenGuide.hidden = false;
  elements.fullscreenGuide.dataset.automatic = String(automatic);
  document.body.classList.add("fullscreen-guide-open");
}

function closeFullscreenGuide() {
  try {
    window.sessionStorage.setItem(FULLSCREEN_TIP_KEY, "seen");
  } catch {
    // Closing the guide must never depend on storage being available.
  }
  elements.fullscreenGuide.hidden = true;
  delete elements.fullscreenGuide.dataset.automatic;
  document.body.classList.remove("fullscreen-guide-open");
  elements.fullscreenButton.focus({ preventScroll: true });
}

function scheduleFullscreenSuggestion() {
  if (!shouldSuggestFullscreen()) return;
  window.setTimeout(() => {
    if (shouldSuggestFullscreen() && elements.faceStudio.hidden && elements.resultPanel.hidden) {
      openFullscreenGuide({ automatic: true });
    }
  }, 700);
}

async function requestGameFullscreen() {
  if (isStandaloneMode()) {
    return true;
  }

  if (document.fullscreenElement) return true;

  if (document.documentElement.requestFullscreen && document.fullscreenEnabled) {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      screen.orientation?.lock?.("landscape")?.catch(() => {});
      updateFullscreenUi();
      return true;
    } catch {
      // Safari on iPhone falls through to the Home Screen web-app guide.
    }
  }

  if (installPrompt) {
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    return choice.outcome === "accepted";
  }

  return false;
}

async function enterFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen?.();
    return;
  }

  if (isStandaloneMode()) {
    showToast("Pełny ekran aplikacji jest już włączony.");
    return;
  }

  if (await requestGameFullscreen()) return;
  openFullscreenGuide();
}

async function startFullscreenFromGuide() {
  const entered = await requestGameFullscreen();
  if (entered) {
    closeFullscreenGuide();
    showToast("Pełny ekran włączony — zaczynamy chaos!");
    return;
  }

  elements.fullscreenGuide.dataset.fallback = "true";
  showToast("Jeśli Safari odmówiło, dodaj grę do ekranu początkowego.", true);
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("is-error", isError);
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, isError ? 5200 : 2800);
}

function setFaceButton(hasFace) {
  elements.faceButton.classList.toggle("has-face", hasFace);
  elements.faceButton.textContent = hasFace ? "✓" : "☺";
  elements.faceButton.title = hasFace ? "Edytuj lub zmień twarz" : "Dodaj twarz lokalnie";
  elements.faceButton.setAttribute("aria-label", hasFace ? "Edytuj lub zmień twarz" : "Dodaj twarz lokalnie");
}

const faceStudio = new FaceStudio(
  {
    root: elements.faceStudio,
    backdrop: elements.faceBackdrop,
    canvas: elements.faceCanvas,
    cancel: elements.faceCancel,
    confirm: elements.faceConfirm,
    input: elements.faceInput,
    remove: elements.faceRemove,
    replace: elements.faceReplace,
    rotate: elements.faceRotate,
    status: elements.faceStatus,
    styleCanvas: elements.faceStylePreview,
    styleStrength: elements.faceStyleStrength,
    styleValue: elements.faceStyleValue,
  },
  {
    onApply: (portrait) => {
      renderer.setFaceImage(portrait);
      setFaceButton(true);
      showToast("Rysunkowa głowa gotowa — bez okrągłej czaszki.");
    },
    onRemove: () => {
      renderer.setFaceImage(null);
      setFaceButton(false);
      showToast("Twarz usunięta z tej sesji.");
    },
    onError: (message) => showToast(message, true),
  },
);

model.onEvent = (event) => {
  renderer.handleGameEvent(event);
  audio.handleGameEvent(event);

  if (["reset", "mode", "launch", "what-if"].includes(event.type)) hideResult();
  if ((event.type === "reset" && event.resetAttempts) || event.type === "mode") {
    paidHintsThisRun = 0;
    lastReward = null;
  }
  if (event.type === "level") {
    paidHintsThisRun = 0;
    lastReward = null;
    updateMissionUi();
    updateLevelNavigation();
  }
  if (event.type === "hint" && event.automatic) {
    const hint = model.activeHint;
    if (hint) showToast(`Darmowa wskazówka po dwóch próbach: ${hint.title}`);
  }
  if (event.type === "success" || event.type === "failure") {
    if (event.type === "success") scoreSuccess();
    if (event.type === "success" && currentLevelIndex < LEVELS.length - 1) {
      highestUnlockedLevel = Math.max(highestUnlockedLevel, currentLevelIndex + 1);
      updateLevelNavigation();
    }
    saveProgress();
    clearTimeout(resultTimer);
    resultTimer = window.setTimeout(() => {
      if (model.phase === GamePhase.SUCCEEDED || model.phase === GamePhase.FAILED) showResult();
    }, 520);
  }
  updateUi();
};

function pointFromPointer(event) {
  return renderer.clientPoint(event.clientX, event.clientY);
}

function syncGameViewport() {
  const rect = elements.stage.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) renderer.resizeView(rect.width, rect.height);
}

function updateMissionUi() {
  const mission = model.level.mission;
  elements.chapterEyebrow.textContent = `${model.level.chapter} · ${model.level.name}`;
  elements.missionKicker.textContent = mission.kicker;
  elements.missionTitle.textContent = mission.title;
  elements.canvas.setAttribute("aria-label", mission.canvasLabel);
  elements.levelIndicator.textContent = `${currentLevelIndex + 1} / ${LEVELS.length}`;
}

function updateLevelNavigation() {
  const controlsEnabled = model.phase !== GamePhase.FLYING && model.phase !== GamePhase.AIMING;
  const isLastLevel = currentLevelIndex >= LEVELS.length - 1;
  const nextLevelLocked = currentLevelIndex >= highestUnlockedLevel;
  elements.previousLevel.disabled = !controlsEnabled || currentLevelIndex === 0;
  elements.nextLevel.disabled = !controlsEnabled || nextLevelLocked || isLastLevel;
  elements.nextLevel.title = isLastLevel
    ? "Finał rozdziału"
    : nextLevelLocked
      ? "Ukończ tę misję, aby odblokować następną"
      : "Następny poziom";
  elements.levelIndicator.textContent = `${currentLevelIndex + 1} / ${LEVELS.length}`;
}

function setLevelIndex(index) {
  const nextIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
  if (nextIndex > highestUnlockedLevel || nextIndex === currentLevelIndex) return false;
  currentLevelIndex = nextIndex;
  hideResult();
  model.setLevel(LEVELS[currentLevelIndex]);
  return true;
}

function beginPointer(event) {
  event.preventDefault();
  audio.unlock().catch(() => {});
  if (activePointer !== null || model.phase === GamePhase.FLYING) return;

  const point = pointFromPointer(event);
  if (model.beginTrampolineMove(point)) interaction = "trampoline";
  else if (model.beginSling(point)) interaction = "sling";
  else return;

  activePointer = event.pointerId;
  elements.canvas.setPointerCapture(event.pointerId);
  elements.canvas.classList.add("is-dragging");
  updateUi();
}

function movePointer(event) {
  if (event.pointerId !== activePointer) return;
  event.preventDefault();
  const point = pointFromPointer(event);
  if (interaction === "trampoline") model.dragTrampoline(point);
  if (interaction === "sling") model.dragSling(point);
}

function endPointer(event) {
  if (event.pointerId !== activePointer) return;
  event.preventDefault();
  if (interaction === "trampoline") model.endTrampolineMove();
  if (interaction === "sling") model.releaseSling();
  if (elements.canvas.hasPointerCapture(event.pointerId)) elements.canvas.releasePointerCapture(event.pointerId);
  activePointer = null;
  interaction = null;
  elements.canvas.classList.remove("is-dragging");
  updateUi();
}

function cancelPointer(event) {
  if (event.pointerId !== activePointer) return;
  if (interaction === "trampoline") model.endTrampolineMove();
  if (interaction === "sling" && model.phase === GamePhase.AIMING) {
    model.resetLevel(false);
  }
  activePointer = null;
  interaction = null;
  elements.canvas.classList.remove("is-dragging");
  updateUi();
}

function setMode(mode) {
  if (model.mode === mode) return;
  model.setMode(mode);
}

function showResult() {
  const success = model.phase === GamePhase.SUCCEEDED;
  const result = model.level.result;
  elements.resultPanel.hidden = false;
  elements.resultPanel.classList.toggle("is-success", success);
  elements.resultPanel.classList.toggle("is-failure", !success);
  elements.resultTag.textContent = success ? result.successTag : result.failureTag;
  elements.resultTitle.textContent = success ? result.successTitle : result.failureTitle;
  elements.resultSpeech.textContent = model.speechText;
  elements.resultReward.hidden = !success;
  if (success && lastReward) {
    const tokenText = lastReward.tokenGain > 0 ? ` · +${lastReward.tokenGain} żeton` : "";
    elements.resultReward.textContent = lastReward.gained > 0
      ? `★ +${lastReward.gained} Punktów Sprytu${tokenText}`
      : `★ ${lastReward.score} · rekord tego poziomu już zapisany`;
  }
  elements.whatIfButton.hidden = success || !model.previousShot;
  elements.whatIfButton.textContent = `WHAT IF? · ${modifierName(model.suggestedModifier)}`;
  elements.againButton.textContent = success && currentLevelIndex < LEVELS.length - 1
    ? "NASTĘPNA MISJA →"
    : success
      ? "↻ JESZCZE RAZ"
      : "↻ AGAIN";
}

function hideResult() {
  clearTimeout(resultTimer);
  elements.resultPanel.hidden = true;
}

function instructionForState() {
  if (model.mode === GameMode.ONE_MOVE && model.phase === GamePhase.READY && !model.moveUsed) {
    return { icon: "↔", title: "Przesuń trampolinę dokładnie raz" };
  }
  if (model.mode === GameMode.QUICK && model.phase === GamePhase.READY && model.attempts === 0 && model.level.tutorial) {
    return { icon: "↙", title: model.level.tutorial.title };
  }
  if (model.mode === GameMode.QUICK && model.phase === GamePhase.READY && model.activeHint) {
    return { icon: "✦", title: model.activeHint.title };
  }
  if (model.phase === GamePhase.AIMING) return { icon: "◎", title: "Wybierz kierunek i puść" };
  if (model.phase === GamePhase.FLYING) return { icon: "⚡", title: "Teraz fizyka robi swoje" };
  if (model.phase === GamePhase.SUCCEEDED) return { icon: "★", title: "Sukces — ale styl też się liczy" };
  if (model.phase === GamePhase.FAILED) return { icon: "↻", title: "Powtórz albo zmień fizykę" };
  return { icon: "☝", title: "Złap bohatera i pociągnij" };
}

function updateUi() {
  const quick = model.mode === GameMode.QUICK;
  elements.quickMode.classList.toggle("pill--active", quick);
  elements.oneMoveMode.classList.toggle("pill--active", !quick);
  elements.quickMode.setAttribute("aria-pressed", String(quick));
  elements.oneMoveMode.setAttribute("aria-pressed", String(!quick));

  elements.modeBadge.textContent = quick ? "⚡ QUICK SLING" : "◇ ONE MOVE";
  elements.modeBadge.classList.toggle("mission-badge--violet", quick);
  elements.modeBadge.classList.toggle("mission-badge--coral", !quick);
  const preparing = model.phase === GamePhase.READY || model.phase === GamePhase.AIMING;
  elements.shotBadge.textContent = `SHOT ${Math.max(1, model.attempts + (preparing ? 1 : 0))}`;
  elements.scoreBadge.textContent = `★ ${progress.score}`;

  const instruction = instructionForState();
  elements.instructionIcon.textContent = instruction.icon;
  elements.instructionTitle.textContent = instruction.title;
  elements.statusText.textContent = model.statusText;

  const controlsEnabled = model.phase !== GamePhase.FLYING && model.phase !== GamePhase.AIMING;
  const stages = model.level.hints?.stages ?? [];
  const nextHintNumber = model.hintStage + 1;
  const nextHint = stages[nextHintNumber - 1];
  const freeStages = model.level.hints?.policy?.freeStages ?? 0;
  const hintCost = nextHintNumber <= freeStages ? 0 : nextHint?.cost ?? 0;
  elements.hintButton.disabled = !controlsEnabled || !nextHint;
  elements.hintButton.textContent = nextHint
    ? hintCost > 0
      ? `💡 PODPOWIEDŹ · ${hintCost} / ${progress.hintTokens}`
      : "💡 PODPOWIEDŹ · GRATIS"
    : "💡 WSZYSTKO ODKRYTE";
  elements.hintButton.title = nextHint?.text ?? "Wszystkie podpowiedzi wykorzystane";
  elements.quickMode.disabled = !controlsEnabled;
  elements.oneMoveMode.disabled = !controlsEnabled;
  elements.personality.disabled = !controlsEnabled;
  elements.faceButton.disabled = !controlsEnabled;
  updateLevelNavigation();
}

function frame(now) {
  const deltaSeconds = Math.min((now - lastFrame) / 1000, 1 / 20);
  lastFrame = now;
  model.update(deltaSeconds);
  renderer.update(deltaSeconds);
  renderer.render();
  requestAnimationFrame(frame);
}

elements.canvas.addEventListener("pointerdown", beginPointer);
elements.canvas.addEventListener("pointermove", movePointer);
elements.canvas.addEventListener("pointerup", endPointer);
elements.canvas.addEventListener("pointercancel", cancelPointer);
elements.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

elements.quickMode.addEventListener("click", () => setMode(GameMode.QUICK));
elements.oneMoveMode.addEventListener("click", () => setMode(GameMode.ONE_MOVE));
elements.previousLevel.addEventListener("click", () => setLevelIndex(currentLevelIndex - 1));
elements.nextLevel.addEventListener("click", () => setLevelIndex(currentLevelIndex + 1));
elements.personality.addEventListener("change", (event) => {
  model.setPersonality(event.target.value);
  updateUi();
});
elements.faceButton.addEventListener("click", () => faceStudio.openEditor());
elements.faceInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await faceStudio.openFile(file);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Nie udało się otworzyć zdjęcia.", true);
  } finally {
    event.target.value = "";
  }
});
elements.soundButton.addEventListener("click", () => {
  const muted = audio.toggleMuted();
  elements.soundButton.textContent = muted ? "×" : "♪";
  elements.soundButton.setAttribute("aria-pressed", String(muted));
  elements.soundButton.title = muted ? "Włącz dźwięk" : "Wycisz dźwięk";
});
elements.fullscreenButton.addEventListener("click", () => enterFullscreen().catch(() => openFullscreenGuide()));
elements.fullscreenBackdrop.addEventListener("click", closeFullscreenGuide);
elements.fullscreenStart.addEventListener("click", () => startFullscreenFromGuide().catch(() => {
  elements.fullscreenGuide.dataset.fallback = "true";
  showToast("Nie udało się włączyć pełnego ekranu. Użyj instrukcji poniżej.", true);
}));
elements.fullscreenClose.addEventListener("click", closeFullscreenGuide);
document.addEventListener("fullscreenchange", updateFullscreenUi);
window.addEventListener("orientationchange", () => requestAnimationFrame(syncGameViewport));
window.visualViewport?.addEventListener("resize", () => requestAnimationFrame(syncGameViewport));
if ("ResizeObserver" in window) {
  new ResizeObserver(syncGameViewport).observe(elements.stage);
} else {
  window.addEventListener("resize", syncGameViewport);
}
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});
elements.restartButton.addEventListener("click", () => model.resetLevel(true));
elements.hintButton.addEventListener("click", requestHint);
elements.againButton.addEventListener("click", () => {
  if (model.phase === GamePhase.SUCCEEDED && currentLevelIndex < LEVELS.length - 1) {
    setLevelIndex(currentLevelIndex + 1);
    return;
  }
  model.resetLevel(false);
});
elements.whatIfButton.addEventListener("click", () => {
  const modifier = model.suggestedModifier;
  hideResult();
  model.replayWith(modifier);
});

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("./sw.js?v=0.12.0").catch(() => {});
  }
  scheduleFullscreenSuggestion();
  syncGameViewport();
});

updateMissionUi();
syncGameViewport();
updateFullscreenUi();

renderer
  .load()
  .catch(() => {})
  .finally(() => {
    elements.loading.classList.add("is-hidden");
    updateUi();
    requestAnimationFrame(frame);
  });
