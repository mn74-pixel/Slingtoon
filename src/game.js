import { DEFAULT_LEVEL, WORLD } from "./levels.js?v=0.16.1";
import { FIXED_STEP, clamp, contains, magnitude, stepPhysics } from "./physics.js?v=0.16.1";
export { DEFAULT_LEVEL, LEVELS, WORLD, getLevel } from "./levels.js?v=0.16.1";

export const GameMode = Object.freeze({ QUICK: "quickSling", ONE_MOVE: "oneMoveChallenge" });
export const GamePhase = Object.freeze({ READY: "ready", AIMING: "aiming", FLYING: "flying", SUCCEEDED: "succeeded", FAILED: "failed" });
export const Modifier = Object.freeze({ NONE: "none", STRONGER_FAN: "strongerFan", LOW_GRAVITY: "lowGravity", SUPER_BOUNCY: "superBouncy", GIANT_HEAD: "giantHead" });
export const Personality = Object.freeze({ DRAMA_QUEEN: "dramaQueen", TOUGH_GUY: "toughGuy", PANIC: "panic", ZEN: "zen" });

// Personality is the player's in-flight toolkit, not a skin. It deliberately
// leaves the launch and the free flight untouched: every mission's measured
// route is verified winnable without spending a single move, so changing
// character can open a new solution but can never take one away.
// lift/push shape the upward FIK, drop/brake shape the downward KAMIEŃ, and
// charges say how many of each you get per flight.
//
// KAMIEŃ steepens the arc; it deliberately does not stop the hero dead. A hard
// brake was measured rescuing three quarters of every bad pull, which made
// aiming pointless. Keeping most of the forward pace leaves it a real tool for
// an arc that sails too flat, and still demands the horizontal aim be close.
export const FLIGHT_STYLES = Object.freeze({
  [Personality.DRAMA_QUEEN]: { lift: 325, push: 40, drop: 285, brake: 0.88, charges: 1, air: "WYSOKI SKOK", dive: "STROME ŚCIĘCIE" },
  [Personality.TOUGH_GUY]: { lift: 205, push: 140, drop: 360, brake: 0.8, charges: 1, air: "NISKI TARAN", dive: "CIĘŻKI MŁOT" },
  [Personality.PANIC]: { lift: 175, push: 50, drop: 200, brake: 0.9, charges: 2, air: "DWA MACHNIĘCIA", dive: "DWA NURKOWANIA" },
  [Personality.ZEN]: { lift: 250, push: 80, drop: 235, brake: 0.72, charges: 1, air: "SPOKOJNY SKOK", dive: "WYHAMOWANIE" },
});

const MAX_PULL = 132;
const LAUNCH_MULTIPLIER = 7;
const copy = (p) => ({ x: p.x, y: p.y });

export class GameModel {
  constructor(onEvent = () => {}, level = DEFAULT_LEVEL) {
    this.onEvent = onEvent;
    this.level = level;
    this.mode = GameMode.QUICK;
    this.personality = Personality.DRAMA_QUEEN;
    this.resetLevel(true);
  }
  emit(type, detail = {}) { this.onEvent({ type, ...detail }); }
  setMode(mode) {
    if (!Object.values(GameMode).includes(mode) || (mode === GameMode.ONE_MOVE && !this.level.editable)) return false;
    this.mode = mode;
    this.resetLevel(false);
    this.emit("mode", { mode });
    return true;
  }
  setPersonality(personality) {
    if (!Object.values(Personality).includes(personality)) return;
    this.personality = personality;
    this.emit("personality", { personality });
  }
  setLevel(level) {
    if (!level?.id || !level.anchor || !level.goal) return false;
    this.level = level;
    if (!level.editable) this.mode = GameMode.QUICK;
    this.resetLevel(true);
    this.emit("level", { levelId: level.id });
    return true;
  }
  resetLevel(resetAttempts = false) {
    this.phase = GamePhase.READY;
    this.modifier = Modifier.NONE;
    this.avatarPosition = copy(this.anchor);
    this.avatarVelocity = { x: 0, y: 0 };
    this.rotation = 0;
    this.impactFlash = 0;
    this.flightTime = 0;
    this.accumulator = 0;
    this.layoutOffset = 0;
    this.movingObject = false;
    this.moveUsed = false;
    this.resetFlightObjects();
    this.trajectoryCache = null;
    this.hintCache = null;
    if (resetAttempts) {
      this.attempts = 0;
      this.previousShot = null;
      this.hintStage = 0;
    }
    this.emit("reset", { resetAttempts });
  }
  resetFlightObjects() {
    this.objectState = Object.create(null);
    this.visited = new Set();
    this.collectedStar = false;
    this.airMovesLeft = this.level.airMove ? this.flightStyle.charges : 0;
    this.diveMovesLeft = this.level.diveMove ? this.flightStyle.charges : 0;
    this.replayCursor = 0;
    this.replaying = false;
    this.portalCooldown = 0;
    this.waterSkips = 0;
    this.closestGoal = Infinity;
    this.settledTime = 0;
    this.failureReason = "";
    this.lastImpactTime = -1;
  }
  canAim() {
    return [GamePhase.READY, GamePhase.AIMING].includes(this.phase) && (this.mode === GameMode.QUICK || this.moveUsed);
  }
  beginSling(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
    if (!this.canAim() || Math.hypot(point.x - this.avatarPosition.x, point.y - this.avatarPosition.y) > this.avatarGrabRadius) return false;
    this.slingGrabOffset = { x: point.x - this.avatarPosition.x, y: point.y - this.avatarPosition.y };
    this.phase = GamePhase.AIMING;
    this.emit("aim-start");
    return true;
  }
  dragSling(point) {
    if (this.phase !== GamePhase.AIMING || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    this.avatarPosition = this.clampedSlingPoint({ x: point.x - this.slingGrabOffset.x, y: point.y - this.slingGrabOffset.y });
    this.rotation = Math.atan2(this.anchor.y - this.avatarPosition.y, this.anchor.x - this.avatarPosition.x);
  }
  releaseSling() {
    if (this.phase !== GamePhase.AIMING) return false;
    const velocity = this.velocityForPull(this.avatarPosition);
    if (magnitude(velocity) < 85) {
      this.phase = GamePhase.READY;
      this.avatarPosition = copy(this.anchor);
      this.rotation = 0;
      this.emit("cancel-shot");
      return false;
    }
    this.previousShot = { launchVelocity: copy(velocity), launchPosition: copy(this.avatarPosition), layoutOffset: this.layoutOffset, levelId: this.level.id, personality: this.personality, moves: [] };
    this.startFlight(velocity, true, this.avatarPosition);
    return true;
  }
  // One Move is offered only in missions with a genuinely editable interaction.
  beginObjectMove(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
    if (!this.level.editable || this.mode !== GameMode.ONE_MOVE || this.phase !== GamePhase.READY || this.moveUsed) return false;
    const item = this.interactions.find((entry) => entry.id === this.level.editable.id);
    const bounds = { x: Math.min(item.a.x, item.b.x) - 30, y: Math.min(item.a.y, item.b.y) - 30, width: Math.abs(item.a.x - item.b.x) + 60, height: Math.abs(item.a.y - item.b.y) + 60 };
    if (!contains(bounds, point)) return false;
    this.movingObject = true;
    this.moveStart = { pointerX: point.x, offset: this.layoutOffset };
    this.emit("move-start");
    return true;
  }
  dragObject(point) {
    if (!this.movingObject || !Number.isFinite(point.x)) return;
    this.layoutOffset = clamp(this.moveStart.offset + point.x - this.moveStart.pointerX, this.level.editable.minOffset, this.level.editable.maxOffset);
  }
  endObjectMove(cancelled = false) {
    if (!this.movingObject) return false;
    this.movingObject = false;
    if (cancelled || Math.abs(this.layoutOffset - this.moveStart.offset) < 8) {
      this.layoutOffset = this.moveStart.offset;
      return false;
    }
    this.moveUsed = true;
    this.emit("move-complete");
    return true;
  }
  startFlight(velocity, countsAsNewAttempt = true, startPosition = this.avatarPosition) {
    this.resetFlightObjects();
    this.phase = GamePhase.FLYING;
    this.modifier = Modifier.NONE;
    this.avatarPosition = copy(startPosition);
    this.avatarVelocity = copy(velocity);
    this.flightTime = 0;
    this.accumulator = 0;
    this.impactFlash = 0;
    this.movingObject = false;
    if (countsAsNewAttempt) this.attempts += 1;
    this.emit("launch", { position: copy(this.avatarPosition), velocity: copy(velocity) });
  }
  replayWith(modifier) {
    if (this.phase !== GamePhase.FAILED || !this.previousShot || this.previousShot.levelId !== this.level.id || !Object.values(Modifier).includes(modifier) || modifier === Modifier.NONE) return false;
    const shot = this.previousShot;
    this.layoutOffset = shot.layoutOffset;
    // What If promises the same shot with one law changed, so it has to replay
    // the character that made it — the moves were recorded at that toolkit.
    if (shot.personality && shot.personality !== this.personality) {
      this.personality = shot.personality;
      this.emit("personality", { personality: this.personality });
    }
    this.startFlight(shot.launchVelocity, true, shot.launchPosition);
    this.modifier = modifier;
    this.replaying = true;
    this.emit("what-if", { modifier, position: copy(this.avatarPosition) });
    return true;
  }
  useAirMove(automatic = false) {
    if (this.phase !== GamePhase.FLYING || this.airMovesLeft <= 0 || (this.replaying && !automatic)) return false;
    const style = this.flightStyle;
    this.airMovesLeft -= 1;
    this.avatarVelocity.y -= style.lift;
    this.avatarVelocity.x += style.push;
    this.recordMove("air", automatic);
    this.emit("air-move", { x: this.avatarPosition.x, y: this.avatarPosition.y, left: this.airMovesLeft });
    return true;
  }
  // The opposite correction to FIK: FIK saves a shot that falls short, KAMIEŃ
  // saves one that would sail past. Together they make the flight a decision
  // instead of a wait.
  // Only while the hero is still rising. Allowing it during the fall turned it
  // into a universal rescue — a drop into a circular goal works from almost any
  // arc — so the move is a commitment made early, in competition with FIK for
  // the same moment, instead of a button that fixes every miss.
  get canDive() { return this.diveMovesLeft > 0 && this.avatarVelocity.y < 0; }
  useDiveMove(automatic = false) {
    if (this.phase !== GamePhase.FLYING || !this.canDive || (this.replaying && !automatic)) return false;
    const style = this.flightStyle;
    this.diveMovesLeft -= 1;
    this.avatarVelocity.x *= style.brake;
    this.avatarVelocity.y += style.drop;
    this.recordMove("dive", automatic);
    this.emit("dive-move", { x: this.avatarPosition.x, y: this.avatarPosition.y, left: this.diveMovesLeft });
    return true;
  }
  recordMove(kind, automatic) {
    if (automatic || !this.previousShot) return;
    this.previousShot.moves.push({ kind, at: this.flightTime });
  }
  replayRecordedMoves() {
    const moves = this.previousShot?.moves;
    if (!moves) return;
    while (this.replayCursor < moves.length && this.flightTime + 1e-8 >= moves[this.replayCursor].at) {
      const move = moves[this.replayCursor];
      this.replayCursor += 1;
      if (move.kind === "dive") this.useDiveMove(true);
      else this.useAirMove(true);
    }
  }
  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const dt = Math.min(deltaSeconds, 0.1); // A resumed background tab must not fast-forward a shot.
    this.impactFlash = Math.max(0, this.impactFlash - dt);
    if (this.phase !== GamePhase.FLYING) { this.accumulator = 0; return; }
    this.accumulator += dt;
    while (this.accumulator + 1e-10 >= FIXED_STEP && this.phase === GamePhase.FLYING) {
      if (this.replaying) this.replayRecordedMoves();
      stepPhysics(this, FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }
  }
  markInteraction(item, kind) {
    if (this.visited.has(item.id)) return;
    this.visited.add(item.id);
    this.emit("interaction", { kind, id: item.id, x: this.avatarPosition.x, y: this.avatarPosition.y });
  }
  triggerImpact(speed, x, y, surface = "ground") {
    if (this.flightTime - this.lastImpactTime < 0.075) return;
    this.lastImpactTime = this.flightTime;
    this.impactFlash = 0.2;
    this.emit("impact", { speed, x, y, surface });
  }
  finishAttempt(success) {
    if (this.phase !== GamePhase.FLYING) return;
    this.phase = success ? GamePhase.SUCCEEDED : GamePhase.FAILED;
    this.avatarVelocity = { x: 0, y: 0 };
    if (!success && this.attempts >= this.level.hints.policy.autoAfterAttempts && this.hintStage === 0) this.revealHint(1, true);
    this.emit(success ? "success" : "failure", { position: copy(this.avatarPosition), attempt: this.attempts, levelId: this.level.id, goalKind: this.level.goal.kind, star: this.collectedStar });
  }
  simulate(pull, numberOfDots = 32, duration = 6) {
    const launch = this.clampedSlingPoint(pull);
    const simulation = new GameModel(() => {}, this.level);
    simulation.layoutOffset = this.layoutOffset;
    simulation.startFlight(this.velocityForPull(launch), false, launch);
    const allPoints = [];
    for (let frame = 0; frame < duration * 120 && simulation.phase === GamePhase.FLYING; frame += 1) {
      simulation.update(FIXED_STEP);
      if (frame % 6 === 0) allPoints.push(copy(simulation.avatarPosition));
    }
    const stride = Math.max(1, Math.ceil(allPoints.length / numberOfDots));
    const points = allPoints.filter((_, i) => i % stride === 0);
    if (points.length >= numberOfDots) points.pop();
    points.push(copy(simulation.avatarPosition));
    return { points, reachesGoal: simulation.phase === GamePhase.SUCCEEDED, star: simulation.collectedStar };
  }
  predictShot(numberOfDots = 24) {
    if (this.phase !== GamePhase.AIMING || numberOfDots <= 0) return { points: [], reachesGoal: false };
    const full = this.level.number === 1 || this.hintStage === 3;
    const signature = `${this.avatarPosition.x.toFixed(2)}:${this.avatarPosition.y.toFixed(2)}:${this.layoutOffset}:${numberOfDots}:${full}`;
    if (this.trajectoryCache?.signature === signature) return this.trajectoryCache.result;
    const result = this.simulate(this.avatarPosition, full ? numberOfDots : 9, full ? 6 : 0.65);
    if (!full) result.reachesGoal = false;
    this.trajectoryCache = { signature, result };
    return result;
  }
  predictedTrajectory(numberOfDots = 24) { return this.predictShot(numberOfDots).points; }
  trajectoryForPull(pull, numberOfDots = 32) {
    if (!pull || numberOfDots <= 0) return [];
    const signature = `${pull.x}:${pull.y}:${this.layoutOffset}:${numberOfDots}`;
    if (this.hintCache?.signature === signature) return this.hintCache.points;
    const points = this.simulate(pull, numberOfDots).points;
    this.hintCache = { signature, points };
    return points;
  }
  revealHint(stage = this.hintStage + 1, automatic = false) {
    if (!Number.isFinite(stage)) return false;
    const next = clamp(Math.round(stage), 0, this.level.hints.stages.length);
    if (next <= this.hintStage) return false;
    this.hintStage = next;
    if (next === 3 && this.mode === GameMode.ONE_MOVE) {
      this.layoutOffset = 0;
      this.moveUsed = true;
      this.emit("hint-layout-reset");
    }
    this.emit("hint", { stage: next, automatic });
    return true;
  }
  clampedSlingPoint(point) {
    const offset = { x: point.x - this.anchor.x, y: point.y - this.anchor.y };
    const distance = magnitude(offset);
    if (distance > MAX_PULL) { offset.x *= MAX_PULL / distance; offset.y *= MAX_PULL / distance; }
    offset.x = Math.min(offset.x, 48);
    return { x: this.anchor.x + offset.x, y: this.anchor.y + offset.y };
  }
  velocityForPull(point) { return { x: (this.anchor.x - point.x) * LAUNCH_MULTIPLIER, y: (this.anchor.y - point.y) * LAUNCH_MULTIPLIER }; }
  rectContains(rect, point) { return contains(rect, point); }
  get interactions() {
    if (this.interactionCache?.level === this.level && this.interactionCache.offset === this.layoutOffset) return this.interactionCache.items;
    const items = this.level.interactions.map((item) => item.id === this.level.editable?.id
      ? { ...item, a: { x: item.a.x + this.layoutOffset, y: item.a.y }, b: { x: item.b.x + this.layoutOffset, y: item.b.y } } : item);
    this.interactionCache = { level: this.level, offset: this.layoutOffset, items };
    return items;
  }
  get flightStyle() { return FLIGHT_STYLES[this.personality] ?? FLIGHT_STYLES[Personality.DRAMA_QUEEN]; }
  // "Used" means the player spent something this flight, so a mission that
  // never offers the move reports false rather than "all charges gone".
  get airMoveUsed() { return Boolean(this.level.airMove) && this.airMovesLeft < this.flightStyle.charges; }
  get diveMoveUsed() { return Boolean(this.level.diveMove) && this.diveMovesLeft < this.flightStyle.charges; }
  get objectiveMet() { return this.level.required.every((id) => this.visited.has(id)); }
  get activeHint() { return this.level.hints.stages[this.hintStage - 1] ?? null; }
  get anchor() { return this.level.anchor; }
  get groundY() { return this.level.groundY; }
  get avatarRadius() { return 35 * (this.modifier === Modifier.GIANT_HEAD ? 1.42 : 1); }
  get avatarGrabRadius() { return Math.max(this.avatarRadius + 34, 35 * 2.65); }
  get waterBounds() { return this.level.water; }
  get goalCentre() {
    const { x, y, motion } = this.level.goal;
    const centre = { x, y };
    if (motion) centre[motion.axis] += Math.sin(this.flightTime * motion.speed) * motion.amplitude;
    return centre;
  }
  get goalRadius() { return this.level.goal.radius; }
  get gravityScale() { return (this.level.environment?.gravity ?? 1) * (this.modifier === Modifier.LOW_GRAVITY ? 0.65 : 1); }
  get bounceScale() { return this.modifier === Modifier.SUPER_BOUNCY ? 1.3 : 1; }
  get fanScale() { return this.modifier === Modifier.STRONGER_FAN ? 1.65 : 1; }
  get suggestedModifier() {
    const variants = [Modifier.LOW_GRAVITY, Modifier.GIANT_HEAD];
    if (this.interactions.some((item) => item.type === "steam")) variants.unshift(Modifier.STRONGER_FAN);
    if (this.interactions.some((item) => item.type === "cushion")) variants.unshift(Modifier.SUPER_BOUNCY);
    return variants[Math.max(0, this.attempts - 1) % variants.length];
  }
  get expression() {
    if (this.impactFlash > 0) return "impact";
    if (this.phase === GamePhase.SUCCEEDED) return "victory";
    if (this.phase === GamePhase.FAILED) return "defeat";
    if (this.personality === Personality.ZEN) return "neutral";
    if (this.personality === Personality.TOUGH_GUY) return "suspicious";
    if (this.phase === GamePhase.AIMING) return "nervous";
    if (this.phase === GamePhase.FLYING) return this.flightTime > 0.7 ? "panic" : "airborne";
    return "neutral";
  }
  get statusText() {
    if (this.phase === GamePhase.READY && this.mode === GameMode.ONE_MOVE && !this.moveUsed) return "Przesuń ukośną poduszkę raz, potem wystrzel. Dotknięcie bez ruchu się nie liczy.";
    if (this.phase === GamePhase.READY && this.activeHint) return this.activeHint.text;
    if (this.phase === GamePhase.FAILED) return this.failureReason;
    return this.level.status[this.phase] ?? this.level.result.successTitle;
  }
  get speechText() {
    return this.level.speech?.[this.phase]?.[this.personality] ?? ({ aiming: "MAM PLAN. MNIEJ WIĘCEJ.", flying: this.airMoveUsed ? "TO BYŁ MANEWR TAKTYCZNY!" : "TO NIE BYŁO W UMOWIE!", failed: "GODNOŚĆ ODRADZA SIĘ PIERWSZA." }[this.phase] ?? "");
  }
}

export function modifierName(modifier) {
  return { none: "BEZ ZMIAN", strongerFan: "MOCNIEJSZA PARA?", lowGravity: "LŻEJSZY ŚWIAT?", superBouncy: "SPRĘŻYSTA PODUSZKA?", giantHead: "WIĘKSZA GŁOWA?" }[modifier];
}
