import { GameModel, GameMode, GamePhase, LEVELS, modifierName } from "./game.js?v=0.33.0";
import { GameRenderer } from "./render.js?v=0.33.0";
import { GameAudio } from "./audio.js?v=0.33.0";
import { FaceStudio } from "./face-studio.js?v=0.33.0";
import { CHARACTER_UNLOCKS, PROGRESS_KEY, TOKEN_SCORE_STEP, characterLock, countMastered, countStars, isMastered, readProgress, hintOffer, purchaseHint, recordStreak, rewardSuccess, medalText } from "./progress.js?v=0.33.0";
import { STREAK_MAX_SHOTS, STREAK_MIN_POOL, canStartStreak, clearStreakMission, createStreakRun, drawStreakMission, spendStreakShot, streakSummary } from "./streak.js?v=0.33.0";
import { CHAPTERS } from "./levels.js?v=0.33.0";

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
  faceButtonThumb: $("#faceButtonThumb"),
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
  streakHud: $("#streakHud"),
  streakCount: $("#streakCount"),
  streakShots: $("#streakShots"),
  streakQuit: $("#streakQuit"),
  startStreak: $("#startStreak"),
  streakNote: $("#streakNote"),
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
  faceMimic: $("#faceMimic"),
  faceMimicStrip: $("#faceMimicStrip"),
  faceMimicStrength: $("#faceMimicStrength"),
  faceMimicValue: $("#faceMimicValue"),
  faceStyleHeading: $("#faceStyleHeading"),
  faceStyleNote: $("#faceStyleNote"),
  facePipelineStep: $("#facePipelineStep"),
  faceStudioTitle: $("#faceStudioTitle"),
  faceModeCutout: $("#faceModeCutout"),
  faceModeToon: $("#faceModeToon"),
  faceStatus: $("#faceStatus"),
  fullscreenGuide: $("#fullscreenGuide"),
  fullscreenBackdrop: $("#fullscreenBackdrop"),
  fullscreenStart: $("#fullscreenStart"),
  fullscreenClose: $("#fullscreenClose"),
  toast: $("#toast"),
  airMove: $("#airMoveButton"),
  diveMove: $("#diveMoveButton"),
  objective: $("#objectiveStatus"),
  missions: $("#missionMap"),
  missionList: $("#missionList"),
  closeMissions: $("#closeMissions"),
  chapterSelect: $("#chapterSelect"),
  chapterSummary: $("#chapterSummary"),
  campaignSummary: $("#campaignSummary"),
  resumeMission: $("#resumeMission"),
  resetProgress: $("#resetProgress"),
  resetConfirm: $("#resetConfirm"),
  resetCancel: $("#resetCancel"),
  resetConfirmYes: $("#resetConfirmYes"),
};

const audio = new GameAudio();
const model = new GameModel();
const renderer = new GameRenderer(elements.canvas, model);

let activePointer = null;
let interaction = null;
let lastFrame = performance.now();
let resultTimer = null;
let toastTimer = null;
let installPrompt = null;
let currentLevelIndex = 0;
let progress = loadProgress();
let highestUnlockedLevel = progress.highestUnlockedLevel;
let mapChapterIndex = 0;
let lastReward = null;
const FULLSCREEN_TIP_KEY = "slingtoon-fullscreen-tip-0.33.0";

function loadProgress() {
  try {
    return readProgress(window.localStorage, LEVELS);
  } catch { return readProgress({ getItem: () => null }, LEVELS); }
}

function saveProgress() {
  progress.highestUnlockedLevel = highestUnlockedLevel;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Progress persistence is optional in private browsing modes.
  }
}

// Seria runs beside the campaign, never through it: a run never awards medals,
// points or unlocks, so a record chased here cannot inflate campaign progress.
let streakRun = null;
let streakResult = null;

function inStreak() {
  return Boolean(streakRun) && !streakRun.over;
}

function updateStreakHud() {
  elements.streakHud.hidden = !inStreak();
  if (!inStreak()) return;
  elements.streakCount.textContent = String(streakRun.cleared);
  // Dots, not a number: the budget has to be readable in the corner of an eye
  // mid-shot, and the count is small enough to read as a shape.
  elements.streakShots.textContent = "●".repeat(streakRun.shots) + "○".repeat(Math.max(0, STREAK_MAX_SHOTS - streakRun.shots));
  elements.streakShots.title = `Zostało strzałów: ${streakRun.shots}`;
}

function nextStreakMission() {
  const level = drawStreakMission(streakRun);
  currentLevelIndex = LEVELS.indexOf(level);
  hideResult();
  model.setLevel(level);
  updateStreakHud();
  updateMissionUi();
}

function startStreak() {
  streakResult = null;
  const gate = canStartStreak(progress, LEVELS);
  if (!gate.ok) {
    showToast(`Ukończ jeszcze ${gate.missing} ${gate.missing === 1 ? "misję" : "misje"}, żeby odblokować Serię.`, true);
    return;
  }
  streakRun = createStreakRun(progress, LEVELS, Math.random);
  streakResult = null;
  lastReward = null;
  elements.missions.close();
  nextStreakMission();
  showToast("Seria! Budżet strzałów na cały bieg. Trafienie zwraca dwa.");
  elements.canvas.focus({ preventScroll: true });
  updateUi();
}

function endStreak(quit = false) {
  if (!streakRun) return;
  const cleared = streakRun.cleared;
  const { best, record } = recordStreak(progress, cleared);
  saveProgress();
  streakResult = { cleared, best, record, quit };
  streakRun = null;
  updateStreakHud();
  // Back to where the campaign was left, so quitting a run costs nothing.
  const resume = LEVELS.findIndex((level) => level.id === progress.resumeLevelId);
  currentLevelIndex = Math.max(0, resume);
  model.setLevel(LEVELS[currentLevelIndex]);
  showStreakResult();
  updateUi();
}

function scoreSuccess() {
  const starsBefore = countStars(progress, LEVELS);
  lastReward = rewardSuccess(progress, { id: model.level.id, attempts: model.attempts, star: model.collectedStar, mode: model.mode, hintStage: model.hintStage, modifier: model.modifier });
  if (announceUnlocks(starsBefore)) refreshCharacters();
}

function requestHint() {
  if (model.phase !== GamePhase.READY) return;
  const unlocked = progress.hints[model.level.id] ?? 0;
  if (!hintOffer(progress, model.level, model.attempts) && unlocked > 0) {
    if (model.hintStage < unlocked) model.revealHint(unlocked);
    else model.hintStage = 0;
    updateUi();
    return;
  }
  const { ok, offer } = purchaseHint(progress, model.level, model.attempts);
  if (!ok) {
    showToast(offer ? `Żetony: ${progress.hintTokens}. Co ${TOKEN_SCORE_STEP} punktów dostajesz kolejny. Po ${model.level.hints.policy.autoAfterAttempts + 2} próbach pomoc jest darmowa.` : model.activeHint?.text ?? "Wszystkie sekrety są odkryte.", Boolean(offer));
    return;
  }
  model.revealHint(offer.stage);
  saveProgress();
  const layoutNote = offer.stage === 3 && model.mode === GameMode.ONE_MOVE ? " Poduszka wraca na pozycję startową." : "";
  showToast(`${offer.hint.text}${layoutNote} ${offer.cost ? `(−${offer.cost} żet.)` : "(gratis)"}`);
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

// The button shows the player's own head once there is one: no glyph explains
// "your face goes here" as clearly as the face itself.
// The character list is the reward wall: a locked entry states its price so the
// player knows what the next stars buy before spending a shot on them.
function refreshCharacters() {
  const stars = countStars(progress, LEVELS);
  const selected = model.personality;
  elements.personality.replaceChildren();
  for (const unlock of CHARACTER_UNLOCKS) {
    const lock = characterLock(unlock.personality, stars);
    const option = document.createElement("option");
    option.value = unlock.personality;
    option.disabled = lock.locked;
    option.textContent = lock.locked ? `🔒 ${unlock.name} · ★${lock.stars}` : unlock.name;
    elements.personality.append(option);
  }
  elements.personality.value = characterLock(selected, stars).locked ? CHARACTER_UNLOCKS[0].personality : selected;
  if (elements.personality.value !== selected) model.setPersonality(elements.personality.value);
  const next = CHARACTER_UNLOCKS.find((unlock) => characterLock(unlock.personality, stars).locked);
  elements.personality.title = next
    ? `Jeszcze ${characterLock(next.personality, stars).missing} ★ do postaci ${next.name}. Każda ma własny zestaw manewrów w locie.`
    : "Wszystkie postacie odblokowane. Każda ma własny zestaw manewrów w locie.";
}

function announceUnlocks(before) {
  const stars = countStars(progress, LEVELS);
  const fresh = CHARACTER_UNLOCKS.filter((unlock) => unlock.stars > before && unlock.stars <= stars);
  for (const unlock of fresh) showToast(`★ ${unlock.stars} gwiazdek — odblokowano ${unlock.name}!`);
  return fresh.length > 0;
}

function setFaceButton(portrait) {
  const hasFace = Boolean(portrait?.image);
  elements.faceButton.classList.toggle("has-face", hasFace);
  const label = hasFace ? "Zmień swoją twarz" : "Dodaj swoją twarz";
  elements.faceButton.title = label;
  elements.faceButton.setAttribute("aria-label", label);
  elements.faceButtonThumb.hidden = !hasFace;
  if (hasFace) elements.faceButtonThumb.src = portrait.image.toDataURL("image/png");
  else elements.faceButtonThumb.removeAttribute("src");
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
    mimic: elements.faceMimic,
    mimicStrip: elements.faceMimicStrip,
    mimicStrength: elements.faceMimicStrength,
    mimicValue: elements.faceMimicValue,
    styleHeading: elements.faceStyleHeading,
    styleNote: elements.faceStyleNote,
    pipelineStep: elements.facePipelineStep,
    title: elements.faceStudioTitle,
    cutoutMode: elements.faceModeCutout,
    toonMode: elements.faceModeToon,
  },
  {
    onApply: (portrait) => {
      renderer.setFaceImage(portrait);
      setFaceButton(portrait);
      showToast(portrait.metadata?.mode === "toon"
        ? "Rysunkowa głowa gotowa — bez okrągłej czaszki."
        : "Twoje zdjęcie w grze — wycięte z tła, bez przerysowania.");
    },
    onRemove: () => {
      renderer.setFaceImage(null);
      setFaceButton(null);
      showToast("Twarz usunięta z tej sesji.");
    },
    onError: (message) => showToast(message, true),
  },
);

model.onEvent = (event) => {
  renderer.handleGameEvent(event);
  audio.handleGameEvent(event);

  if (["reset", "mode", "launch", "what-if"].includes(event.type)) hideResult();
  if (event.type === "launch" && inStreak()) {
    spendStreakShot(streakRun);
    updateStreakHud();
  }
  if ((event.type === "reset" && event.resetAttempts) || event.type === "mode") {
    lastReward = null;
    model.hintStage = Math.min(1, progress.hints[model.level.id] ?? 0);
  }
  if (event.type === "level") {
    lastReward = null;
    model.hintStage = Math.min(1, progress.hints[model.level.id] ?? 0);
    updateMissionUi();
    updateLevelNavigation();
  }
  if (event.type === "hint" && event.automatic) {
    const hint = model.activeHint;
    if (hint) showToast(`Darmowa wskazówka: ${hint.text}`);
  }
  if (event.type === "hint") {
    progress.hints[model.level.id] = Math.max(progress.hints[model.level.id] ?? 0, model.hintStage);
    saveProgress();
  }
  if (event.type === "hint-layout-reset") showToast("Pełna trasa przywraca poduszkę na pozycję startową.");
  if (event.type === "reset" && model.hintStage === 3 && model.mode === GameMode.ONE_MOVE) model.moveUsed = true;
  if ((event.type === "success" || event.type === "failure") && streakRun) {
    // A run neither scores nor unlocks: the campaign record stays something you
    // earned in the campaign. The run only moves its own budget.
    if (event.type === "success") clearStreakMission(streakRun);
    updateStreakHud();
    clearTimeout(resultTimer);
    resultTimer = window.setTimeout(() => {
      if (streakRun?.over) endStreak();
      else if (event.type === "success") nextStreakMission();
      else model.resetLevel(false);
      updateUi();
    }, event.type === "success" ? 720 : 520);
    updateUi();
    return;
  }
  if (event.type === "success" || event.type === "failure") {
    if (event.type === "success") scoreSuccess();
    if (event.type === "success" && currentLevelIndex < LEVELS.length - 1) {
      highestUnlockedLevel = Math.max(highestUnlockedLevel, currentLevelIndex + 1);
      progress.resumeLevelId = LEVELS[currentLevelIndex + 1].id;
      updateLevelNavigation();
    }
    saveProgress();
    clearTimeout(resultTimer);
    resultTimer = window.setTimeout(() => {
      if (model.phase === GamePhase.SUCCEEDED || model.phase === GamePhase.FAILED) showResult();
    }, event.type === "success" ? 720 : 240);
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
  elements.oneMoveMode.hidden = !model.level.editable;
  elements.levelIndicator.textContent = `${currentLevelIndex + 1} / ${LEVELS.length}`;
}

function updateLevelNavigation() {
  const controlsEnabled = model.phase !== GamePhase.FLYING && model.phase !== GamePhase.AIMING;
  const isLastLevel = currentLevelIndex >= LEVELS.length - 1;
  const nextLevelLocked = currentLevelIndex >= highestUnlockedLevel;
  elements.previousLevel.disabled = !controlsEnabled || currentLevelIndex === 0;
  elements.nextLevel.disabled = !controlsEnabled || nextLevelLocked || isLastLevel;
  elements.nextLevel.title = isLastLevel
    ? "Finał całej przygody"
    : nextLevelLocked
      ? "Ukończ tę misję, aby odblokować następną"
      : "Następny poziom";
  elements.levelIndicator.textContent = `${currentLevelIndex + 1} / ${LEVELS.length}`;
}

function setLevelIndex(index) {
  if (inStreak()) return false; // The run picks the missions; the arrows do not.
  streakResult = null;
  const nextIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
  if (nextIndex > highestUnlockedLevel || nextIndex === currentLevelIndex) return false;
  currentLevelIndex = nextIndex;
  hideResult();
  model.setLevel(LEVELS[currentLevelIndex]);
  progress.resumeLevelId = model.level.id;
  saveProgress();
  return true;
}

// Wiping the campaign is the one irreversible thing the game can do to the
// player, so it asks in the same place it shows what would be lost.
function showResetConfirm(asking) {
  elements.resetConfirm.hidden = !asking;
  elements.resetProgress.hidden = asking;
}

function wipeProgress() {
  for (const key of [PROGRESS_KEY, "slingtoon-progress-v2", "slingtoon-progress-v1"]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // A blocked storage simply has nothing to clear.
    }
  }
  streakRun = null;
  streakResult = null;
  updateStreakHud();
  progress = readProgress({ getItem: () => null }, LEVELS);
  highestUnlockedLevel = 0;
  currentLevelIndex = 0;
  mapChapterIndex = 0;
  lastReward = null;
  hideResult();
  model.setLevel(LEVELS[0]);
  saveProgress();
  refreshCharacters();
  showResetConfirm(false);
  elements.missions.close();
  elements.canvas.focus({ preventScroll: true });
  showToast("Przygoda skasowana. Zaczynamy od misji 1.");
  updateUi();
}

function openMissionMap() {
  if ([GamePhase.AIMING, GamePhase.FLYING].includes(model.phase)) return;
  showResetConfirm(false);
  mapChapterIndex = Math.floor(currentLevelIndex / 8);
  elements.chapterSelect.replaceChildren();
  for (const chapter of CHAPTERS) {
    const option = document.createElement("option");
    option.value = String(chapter.number - 1);
    const perfect = LEVELS.slice(chapter.first - 1, chapter.last).every((level) => isMastered(progress.medals[level.id]));
    option.textContent = `${String(chapter.number).padStart(2, "0")} · ${chapter.name} · ${chapter.first}–${chapter.last}`
      + (chapter.first - 1 > highestUnlockedLevel ? " · 🔒" : perfect ? " · ✦" : "");
    elements.chapterSelect.append(option);
  }
  elements.chapterSelect.value = String(mapChapterIndex);
  const finished = LEVELS.filter((level) => progress.medals[level.id] & 1).length;
  const stars = countStars(progress, LEVELS);
  const mastered = countMastered(progress, LEVELS);
  const nextCharacter = CHARACTER_UNLOCKS.find((unlock) => characterLock(unlock.personality, stars).locked);
  elements.campaignSummary.textContent = `Przygoda: ${finished} / ${LEVELS.length} misji · ★ ${stars} / ${LEVELS.length} gwiazdek · ✦ ${mastered} opanowanych`
    + (nextCharacter ? ` · jeszcze ${characterLock(nextCharacter.personality, stars).missing} ★ do postaci ${nextCharacter.name}` : " · wszystkie postacie odblokowane");
  const gate = canStartStreak(progress, LEVELS);
  elements.startStreak.disabled = !gate.ok;
  elements.startStreak.textContent = gate.ok ? "⚡ SERIA" : `🔒 SERIA · ${gate.missing}`;
  elements.streakNote.textContent = gate.ok
    ? `Seria: losowe ukończone misje pod rząd, wspólny budżet strzałów na cały bieg — trafienie zwraca dwa. Rekord: ${progress.bestStreak ?? 0}. Bieg nie zmienia postępu kampanii.`
    : `Seria odblokuje się po ukończeniu ${STREAK_MIN_POOL} misji (zostało ${gate.missing}).`;
  const resume = LEVELS.find((level) => level.id === progress.resumeLevelId) ?? LEVELS[highestUnlockedLevel];
  elements.resumeMission.textContent = `KONTYNUUJ · MISJA ${resume.number} →`;
  renderMissionChapter();
  elements.missions.showModal();
}

function renderMissionChapter() {
  const chapterData = CHAPTERS[mapChapterIndex];
  const chapterLevels = LEVELS.slice(chapterData.first - 1, chapterData.last);
  const finished = chapterLevels.filter((level) => progress.medals[level.id] & 1).length;
  const mastered = chapterLevels.filter((level) => isMastered(progress.medals[level.id])).length;
  elements.chapterSummary.textContent = `${chapterData.subtitle} · ${finished} / 8 ukończonych · ✦ ${mastered} / 8 opanowanych`;
  elements.missionList.replaceChildren();
  for (const level of chapterLevels) {
    const index = level.number - 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mission-tile";
    button.disabled = index > highestUnlockedLevel;
    button.setAttribute("aria-current", String(index === currentLevelIndex));
    const chapter = document.createElement("span");
    const title = document.createElement("strong");
    const mechanic = document.createElement("span");
    const medals = document.createElement("small");
    const mastered = isMastered(progress.medals[level.id]);
    button.classList.toggle("mission-tile--mastered", mastered);
    chapter.textContent = `MISJA ${String(index + 1).padStart(2, "0")}${mastered ? " · ✦ OPANOWANA" : level.pacing === "breather" ? " · CHWILA ODDECHU" : ""}`;
    title.textContent = level.name;
    mechanic.textContent = level.mechanic;
    medals.textContent = button.disabled ? "Ukończ poprzednią misję, by odblokować" : medalText(progress.medals[level.id]);
    button.append(chapter, title, mechanic, medals);
    button.addEventListener("click", () => {
      if (index === currentLevelIndex) model.resetLevel(true);
      else setLevelIndex(index);
      elements.missions.close();
      elements.canvas.focus({ preventScroll: true });
    });
    elements.missionList.append(button);
  }
}

function beginPointer(event) {
  event.preventDefault();
  audio.unlock().catch(() => {});
  if (!elements.faceStudio.hidden || !elements.fullscreenGuide.hidden || elements.missions.open) return;
  if (model.phase === GamePhase.FLYING) { model.useAirMove(); return; }
  if (model.phase === GamePhase.FAILED) model.resetLevel(false);
  if (activePointer !== null) return;

  const point = pointFromPointer(event);
  if (model.beginObjectMove(point)) interaction = "object";
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
  if (interaction === "object") model.dragObject(point);
  if (interaction === "sling") model.dragSling(point);
}

function endPointer(event) {
  if (event.pointerId !== activePointer) return;
  event.preventDefault();
  if (interaction === "object") model.endObjectMove();
  if (interaction === "sling") model.releaseSling();
  if (elements.canvas.hasPointerCapture(event.pointerId)) elements.canvas.releasePointerCapture(event.pointerId);
  activePointer = null;
  interaction = null;
  elements.canvas.classList.remove("is-dragging");
  updateUi();
}

function cancelPointer(event) {
  if (event.pointerId !== activePointer) return;
  if (interaction === "object") model.endObjectMove(true);
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

function showStreakResult() {
  const { cleared, best, record, quit } = streakResult;
  elements.resultPanel.hidden = false;
  elements.resultPanel.classList.toggle("is-success", record || cleared > 0);
  elements.resultPanel.classList.toggle("is-failure", !record && cleared === 0);
  elements.resultTag.textContent = record ? "NOWY REKORD" : quit ? "SERIA ZAKOŃCZONA" : "KONIEC SERII";
  elements.resultTitle.textContent = cleared === 1 ? "1 misja pod rząd" : `${cleared} misji pod rząd`;
  elements.resultSpeech.textContent = streakSummary({ cleared }, record ? Math.max(0, cleared - 1) : best);
  elements.resultReward.hidden = false;
  elements.resultReward.textContent = `⚡ Rekord: ${best} · bieg nie zmienia postępu kampanii`;
  elements.whatIfButton.hidden = true;
  elements.againButton.textContent = "⚡ JESZCZE JEDNA SERIA";
}

function showResult() {
  if (streakResult && !streakRun) { showStreakResult(); return; }
  const success = model.phase === GamePhase.SUCCEEDED;
  const result = model.level.result;
  elements.resultPanel.hidden = false;
  elements.resultPanel.classList.toggle("is-success", success);
  elements.resultPanel.classList.toggle("is-failure", !success);
  elements.resultTag.textContent = success ? result.successTag : result.failureTag;
  elements.resultTitle.textContent = success ? result.successTitle : result.failureTitle;
  elements.resultSpeech.textContent = success ? model.speechText : model.failureReason;
  const chapterEnd = success && model.level.number % 8 === 0;
  const nextChapter = CHAPTERS[Math.floor(currentLevelIndex / 8) + 1];
  if (chapterEnd) elements.resultSpeech.textContent = nextChapter
    ? `Rozdział ukończony! Dalej: ${nextChapter.name}. ${nextChapter.subtitle}`
    : "Całe 88 misji za Tobą! Budzik ocalał, godność w regeneracji. Wróć po gwiazdki, kiedy zechcesz.";
  elements.resultReward.hidden = !success;
  if (success && lastReward) {
    const tokenText = lastReward.tokenGain > 0 ? ` · +${lastReward.tokenGain} żeton` : "";
    elements.resultReward.textContent = (lastReward.gained > 0
      ? `★ +${lastReward.gained} Punktów Sprytu${tokenText}`
      : `★ ${lastReward.score} · rekord tego poziomu już zapisany`) + `\n${medalText(progress.medals[model.level.id])}`;
  }
  elements.whatIfButton.hidden = !success && !model.previousShot;
  elements.whatIfButton.textContent = success ? model.collectedStar ? "↻ POPRAW STYL" : "☆ ZDOBĄD GWIAZDKĘ" : `WHAT IF? · ${modifierName(model.suggestedModifier)}`;
  elements.againButton.textContent = success && currentLevelIndex < LEVELS.length - 1
    ? chapterEnd ? "NASTĘPNY ROZDZIAŁ →" : "NASTĘPNA MISJA →"
    : success
      ? "MAPA PRZYGODY →"
      : "↻ JESZCZE RAZ";
}

function hideResult() {
  clearTimeout(resultTimer);
  elements.resultPanel.hidden = true;
}

function instructionForState() {
  if (model.mode === GameMode.ONE_MOVE && model.phase === GamePhase.READY && !model.moveUsed) {
    return { icon: "↔", title: "Przesuń ukośną poduszkę raz" };
  }
  if (model.mode === GameMode.QUICK && model.phase === GamePhase.READY && model.attempts === 0 && model.level.tutorial) {
    return { icon: "↙", title: model.level.tutorial.title };
  }
  if (model.mode === GameMode.QUICK && model.phase === GamePhase.READY && model.activeHint) {
    return { icon: "✦", title: model.activeHint.title };
  }
  if (model.phase === GamePhase.AIMING) return { icon: "◎", title: "Wybierz kierunek i puść" };
  if (model.phase === GamePhase.FLYING) {
    if (!model.level.airMove && !model.level.diveMove) return { icon: "⚡", title: "Obserwuj tor — następny strzał będzie Twój" };
    const left = [];
    if (model.airMovesLeft > 0) left.push(`↗ FIK ×${model.airMovesLeft}`);
    if (model.canDive) left.push(`↓ KAMIEŃ ×${model.diveMovesLeft}`);
    else if (model.diveMovesLeft > 0) left.push("↓ KAMIEŃ tylko na wznoszeniu");
    return { icon: "⚡", title: left.length ? `W powietrzu: ${left.join(" · ")}` : "Manewry zużyte — trzymamy kciuki" };
  }
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

  if (!characterLock(model.personality, countStars(progress, LEVELS)).locked) elements.personality.value = model.personality;
  const instruction = instructionForState();
  elements.instructionIcon.textContent = instruction.icon;
  elements.instructionTitle.textContent = instruction.title;
  elements.statusText.textContent = model.statusText;

  const controlsEnabled = model.phase !== GamePhase.FLYING && model.phase !== GamePhase.AIMING;
  const offer = hintOffer(progress, model.level, model.attempts);
  elements.hintButton.disabled = model.phase !== GamePhase.READY;
  elements.hintButton.textContent = offer
    ? offer.cost > 0
      ? `💡 PODPOWIEDŹ ${offer.stage}/3 · ${offer.cost} żeton`
      : `💡 PODPOWIEDŹ ${offer.stage}/3 · ${offer.rescue ? "RATUNKOWA" : "GRATIS"}`
    : model.hintStage < (progress.hints[model.level.id] ?? 0) ? "💡 POKAŻ ODKRYTE" : "💡 UKRYJ PODPOWIEDŹ";
  elements.hintButton.title = offer
    ? `Masz ${progress.hintTokens} żetonów. Odkryj zasadę, kierunek, a na końcu pełną trasę. Odkrycia zostają zapisane.`
    : model.activeHint?.text ?? "Wszystkie podpowiedzi wykorzystane";
  const flying = model.phase === GamePhase.FLYING;
  elements.airMove.hidden = !model.level.airMove || !flying;
  elements.airMove.disabled = !flying || model.airMovesLeft <= 0 || model.replaying;
  elements.airMove.textContent = model.airMovesLeft > 0 ? `↗ FIK! · ${model.airMovesLeft}` : "✓ FIK ZUŻYTY";
  elements.diveMove.hidden = !model.level.diveMove || !flying;
  elements.diveMove.disabled = !flying || !model.canDive || model.replaying;
  elements.diveMove.textContent = model.diveMovesLeft <= 0
    ? "✓ KAMIEŃ ZUŻYTY"
    : model.canDive ? `↓ KAMIEŃ! · ${model.diveMovesLeft}` : "↓ JUŻ SPADASZ";
  // The plate above the board carries the full requirement, so the board itself
  // does not have to spell it out next to the wrong object.
  elements.objective.textContent = `${model.objectiveMet ? "✓ Cel odblokowany" : model.level.required.length ? model.level.requirement : model.level.mechanic} · ${model.collectedStar ? "★ Gwiazdka!" : "☆ Gwiazdka opcjonalna"}`;
  elements.levelIndicator.disabled = !controlsEnabled;
  elements.quickMode.disabled = !controlsEnabled;
  elements.oneMoveMode.disabled = !controlsEnabled || !model.level.editable;
  elements.personality.disabled = !controlsEnabled;
  elements.faceButton.disabled = !controlsEnabled;
  updateLevelNavigation();
}

function frame(now) {
  const deltaSeconds = Math.min((now - lastFrame) / 1000, .1);
  lastFrame = now;
  if (document.hidden) { requestAnimationFrame(frame); return; }
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
elements.levelIndicator.addEventListener("click", openMissionMap);
elements.closeMissions.addEventListener("click", () => elements.missions.close());
elements.resetProgress.addEventListener("click", () => showResetConfirm(true));
elements.resetCancel.addEventListener("click", () => showResetConfirm(false));
elements.resetConfirmYes.addEventListener("click", wipeProgress);
elements.chapterSelect.addEventListener("change", () => {
  mapChapterIndex = Math.max(0, Math.min(CHAPTERS.length - 1, Number(elements.chapterSelect.value) || 0));
  renderMissionChapter();
});
elements.resumeMission.addEventListener("click", () => {
  const index = LEVELS.findIndex((level) => level.id === progress.resumeLevelId);
  if (index === currentLevelIndex) model.resetLevel(true);
  else setLevelIndex(index < 0 ? highestUnlockedLevel : index);
  elements.missions.close();
  elements.canvas.focus({ preventScroll: true });
});
elements.airMove.addEventListener("click", () => { audio.unlock().catch(() => {}); model.useAirMove(); });
elements.diveMove.addEventListener("click", () => { audio.unlock().catch(() => {}); model.useDiveMove(); });
elements.personality.addEventListener("change", (event) => {
  model.setPersonality(event.target.value);
  const style = model.flightStyle;
  showToast(`${style.air} · ${style.dive}${style.charges > 1 ? ` · ${style.charges} ładunki każdego` : ""}`);
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
elements.startStreak.addEventListener("click", startStreak);
elements.streakQuit.addEventListener("click", () => endStreak(true));
elements.restartButton.addEventListener("click", () => model.resetLevel(false));
elements.hintButton.addEventListener("click", requestHint);
elements.againButton.addEventListener("click", () => {
  if (streakResult && !streakRun) { streakResult = null; startStreak(); return; }
  if (model.phase === GamePhase.SUCCEEDED && currentLevelIndex === LEVELS.length - 1) { openMissionMap(); return; }
  if (model.phase === GamePhase.SUCCEEDED && currentLevelIndex < LEVELS.length - 1) {
    setLevelIndex(currentLevelIndex + 1);
    return;
  }
  model.resetLevel(false);
});
elements.whatIfButton.addEventListener("click", () => {
  if (model.phase === GamePhase.SUCCEEDED) { model.resetLevel(true); return; }
  const modifier = model.suggestedModifier;
  hideResult();
  model.replayWith(modifier);
});

document.addEventListener("visibilitychange", () => { lastFrame = performance.now(); });
window.addEventListener("keydown", (event) => {
  if ((event.repeat && !event.key.startsWith("Arrow")) || event.ctrlKey || event.metaKey || event.altKey || !elements.faceStudio.hidden || !elements.fullscreenGuide.hidden || elements.missions.open) return;
  if (event.target.closest("input, select, textarea")) return;
  if (event.code === "KeyR") { event.preventDefault(); model.resetLevel(false); return; }
  if (event.target.closest("button")) return;
  if (event.code === "Space") {
    event.preventDefault();
    audio.unlock().catch(() => {});
    if (model.phase === GamePhase.FLYING) model.useAirMove();
    else if (model.phase === GamePhase.AIMING) model.releaseSling();
    else if (model.phase === GamePhase.FAILED) model.resetLevel(false);
    else if (model.phase === GamePhase.SUCCEEDED) elements.againButton.click();
    else if (model.beginSling(model.anchor)) model.dragSling({ x: model.anchor.x - 80, y: model.anchor.y + 40 });
  }
  if (event.code === "ArrowDown" && model.phase === GamePhase.FLYING) {
    event.preventDefault();
    audio.unlock().catch(() => {});
    model.useDiveMove();
    return;
  }
  if (event.key.startsWith("Arrow") && model.phase === GamePhase.AIMING) {
    event.preventDefault();
    const step = event.shiftKey ? 10 : 4;
    const offsets = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const [dx, dy] = offsets[event.key];
    model.dragSling({ x: model.avatarPosition.x + dx, y: model.avatarPosition.y + dy });
  }
  if (event.key === "Escape" && model.phase === GamePhase.AIMING) model.resetLevel(false);
});

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("./sw.js?v=0.33.0").catch(() => {});
  }
  scheduleFullscreenSuggestion();
  syncGameViewport();
});

currentLevelIndex = Math.max(0, LEVELS.findIndex((level) => level.id === progress.resumeLevelId));
if (currentLevelIndex > 0) model.setLevel(LEVELS[currentLevelIndex]);
model.hintStage = Math.min(1, progress.hints[model.level.id] ?? 0);
refreshCharacters();
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
