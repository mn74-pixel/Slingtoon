import { DEFAULT_LEVEL, WORLD } from "./levels.js?v=0.11.0";

export { DEFAULT_LEVEL, LEVELS, WORLD, getLevel } from "./levels.js?v=0.11.0";

export const GameMode = Object.freeze({
  QUICK: "quickSling",
  ONE_MOVE: "oneMoveChallenge",
});

export const GamePhase = Object.freeze({
  READY: "ready",
  AIMING: "aiming",
  FLYING: "flying",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
});

export const Modifier = Object.freeze({
  NONE: "none",
  STRONGER_FAN: "strongerFan",
  LOW_GRAVITY: "lowGravity",
  SUPER_BOUNCY: "superBouncy",
  GIANT_HEAD: "giantHead",
});

export const Personality = Object.freeze({
  DRAMA_QUEEN: "dramaQueen",
  TOUGH_GUY: "toughGuy",
  PANIC: "panic",
  ZEN: "zen",
});

const BASE_RADIUS = 35;
const MAX_PULL = 132;
const MIN_LAUNCH_SPEED = 85;
const LAUNCH_MULTIPLIER = 6.15;
const MODIFIERS = [
  Modifier.STRONGER_FAN,
  Modifier.LOW_GRAVITY,
  Modifier.SUPER_BOUNCY,
  Modifier.GIANT_HEAD,
];

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const copyPoint = (point) => ({ x: point.x, y: point.y });
const length = (vector) => Math.hypot(vector.x, vector.y);
const distanceSquared = (a, b) => {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return x * x + y * y;
};

export class GameModel {
  constructor(onEvent = () => {}, level = DEFAULT_LEVEL) {
    this.onEvent = onEvent;
    this.level = level ?? DEFAULT_LEVEL;
    this.mode = GameMode.QUICK;
    this.phase = GamePhase.READY;
    this.modifier = Modifier.NONE;
    this.personality = Personality.DRAMA_QUEEN;
    this.previousShot = null;
    this.attempts = 0;
    this.resetLevel(true);
  }

  emit(type, detail = {}) {
    this.onEvent({ type, ...detail });
  }

  setMode(mode) {
    if (!Object.values(GameMode).includes(mode)) return;
    this.mode = mode;
    this.resetLevel(true);
    this.emit("mode", { mode });
  }

  setPersonality(personality) {
    if (!Object.values(Personality).includes(personality)) return;
    this.personality = personality;
    this.emit("personality", { personality });
  }

  setLevel(level) {
    if (!level?.id || !level?.anchor || !level?.goal) return false;
    this.level = level;
    this.resetLevel(true);
    this.emit("level", { levelId: level.id });
    return true;
  }

  resetLevel(resetAttempts = false) {
    this.phase = GamePhase.READY;
    this.modifier = Modifier.NONE;
    this.avatarPosition = copyPoint(this.anchor);
    this.avatarVelocity = { x: 0, y: 0 };
    this.rotation = 0;
    this.trampolineX = this.level.trampoline.x;
    this.trampolineGrabOffset = 0;
    this.movingTrampoline = false;
    this.moveUsed = false;
    this.impactFlash = 0;
    this.flightTime = 0;

    if (resetAttempts) {
      this.attempts = 0;
      this.previousShot = null;
    }

    this.emit("reset", { resetAttempts });
  }

  canAim() {
    const correctPhase = this.phase === GamePhase.READY || this.phase === GamePhase.AIMING;
    return correctPhase && (this.mode === GameMode.QUICK || this.moveUsed);
  }

  beginSling(point) {
    if (!this.canAim()) return false;
    const grabRadius = this.avatarGrabRadius;
    if (distanceSquared(point, this.avatarPosition) > grabRadius * grabRadius) return false;

    this.phase = GamePhase.AIMING;
    this.dragSling(point);
    this.emit("aim-start");
    return true;
  }

  dragSling(point) {
    if (this.phase !== GamePhase.AIMING) return;
    this.avatarPosition = this.clampedSlingPoint(point);
    const direction = {
      x: this.anchor.x - this.avatarPosition.x,
      y: this.anchor.y - this.avatarPosition.y,
    };
    this.rotation = Math.atan2(direction.y, direction.x);
  }

  releaseSling() {
    if (this.phase !== GamePhase.AIMING) return false;

    const pull = {
      x: this.anchor.x - this.avatarPosition.x,
      y: this.anchor.y - this.avatarPosition.y,
    };
    const launchVelocity = {
      x: pull.x * LAUNCH_MULTIPLIER,
      y: pull.y * LAUNCH_MULTIPLIER,
    };

    if (length(launchVelocity) < MIN_LAUNCH_SPEED) {
      this.phase = GamePhase.READY;
      this.avatarPosition = copyPoint(this.anchor);
      this.rotation = 0;
      this.emit("cancel-shot");
      return false;
    }

    this.previousShot = {
      launchVelocity: copyPoint(launchVelocity),
      launchPosition: copyPoint(this.avatarPosition),
      trampolineX: this.trampolineX,
      levelId: this.level.id,
    };
    this.startFlight(launchVelocity, true, this.avatarPosition);
    return true;
  }

  beginTrampolineMove(point) {
    if (!this.level.trampoline.enabled || this.mode !== GameMode.ONE_MOVE || this.phase !== GamePhase.READY || this.moveUsed) return false;
    const bounds = this.trampolineBounds;
    const hitArea = {
      x: bounds.x - 24,
      y: bounds.y - 28,
      width: bounds.width + 48,
      height: bounds.height + 56,
    };
    if (!this.rectContains(hitArea, point)) return false;

    this.movingTrampoline = true;
    this.trampolineGrabOffset = point.x - this.trampolineX;
    this.emit("move-start");
    return true;
  }

  dragTrampoline(point) {
    if (!this.movingTrampoline) return;
    this.trampolineX = clamp(
      point.x - this.trampolineGrabOffset,
      this.level.trampoline.minX,
      this.level.trampoline.maxX,
    );
  }

  endTrampolineMove() {
    if (!this.movingTrampoline) return false;
    this.movingTrampoline = false;
    this.moveUsed = true;
    this.emit("move-complete", { trampolineX: this.trampolineX });
    return true;
  }

  startFlight(velocity, countsAsNewAttempt, startPosition = this.avatarPosition) {
    this.phase = GamePhase.FLYING;
    this.modifier = Modifier.NONE;
    this.avatarPosition = copyPoint(startPosition);
    this.avatarVelocity = copyPoint(velocity);
    this.rotation = Math.atan2(velocity.y, velocity.x);
    this.flightTime = 0;
    this.impactFlash = 0;
    this.movingTrampoline = false;

    if (countsAsNewAttempt) this.attempts += 1;
    this.emit("launch", {
      position: copyPoint(this.avatarPosition),
      velocity: copyPoint(this.avatarVelocity),
      replay: !countsAsNewAttempt,
    });
  }

  replayWith(modifier) {
    if (
      this.phase !== GamePhase.FAILED
      || !this.previousShot
      || this.previousShot.levelId !== this.level.id
      || modifier === Modifier.NONE
    ) return false;

    const shot = this.previousShot;
    this.modifier = modifier;
    this.phase = GamePhase.FLYING;
    this.avatarPosition = copyPoint(shot.launchPosition);
    this.avatarVelocity = copyPoint(shot.launchVelocity);
    this.trampolineX = shot.trampolineX;
    this.rotation = Math.atan2(this.avatarVelocity.y, this.avatarVelocity.x);
    this.flightTime = 0;
    this.impactFlash = 0;
    this.movingTrampoline = false;
    this.moveUsed = this.mode === GameMode.ONE_MOVE;
    this.attempts += 1;
    this.emit("what-if", { modifier, velocity: copyPoint(this.avatarVelocity) });
    return true;
  }

  update(deltaSeconds) {
    const dt = clamp(deltaSeconds, 0, 1 / 30);
    this.impactFlash = Math.max(0, this.impactFlash - dt);
    if (this.phase !== GamePhase.FLYING) return;

    this.flightTime += dt;
    this.avatarVelocity.y += 725 * this.gravityScale * dt;

    const fan = this.fanBounds;
    if (fan && (fan.enabled || this.modifier === Modifier.STRONGER_FAN)) {
      const fanInfluence = {
        x: fan.x - 125,
        y: fan.y - 70,
        width: fan.width + 250,
        height: fan.height + 95,
      };
      if (this.rectContains(fanInfluence, this.avatarPosition)) {
        const closeness = 1 - clamp(Math.abs(this.avatarPosition.x - (fan.x + fan.width * 0.5)) / 215, 0, 1);
        this.avatarVelocity.y -= (530 + 250 * closeness) * this.fanScale * dt;
        this.avatarVelocity.x += 92 * this.fanScale * dt;
      }
    }

    const drag = Math.pow(0.9982, dt * 60);
    this.avatarVelocity.x *= drag;
    this.avatarVelocity.y *= drag;
    this.avatarPosition.x += this.avatarVelocity.x * dt;
    this.avatarPosition.y += this.avatarVelocity.y * dt;
    this.rotation = Math.atan2(this.avatarVelocity.y, this.avatarVelocity.x) + Math.PI * 0.04;

    this.resolveWorldCollisions();

    if (this.goalReached()) {
      this.finishAttempt(true);
      return;
    }

    const outOfWorld =
      this.avatarPosition.x < -145 ||
      this.avatarPosition.x > WORLD.width + 145 ||
      this.avatarPosition.y > WORLD.height + 145;

    if (outOfWorld || this.flightTime > 8.5) {
      this.finishAttempt(false);
      return;
    }

    if (
      this.flightTime > 2 &&
      this.avatarPosition.y + this.avatarRadius >= this.groundY - 1 &&
      length(this.avatarVelocity) < 42
    ) {
      this.finishAttempt(false);
    }
  }

  finishAttempt(success) {
    this.phase = success ? GamePhase.SUCCEEDED : GamePhase.FAILED;
    this.avatarVelocity = { x: 0, y: 0 };
    this.movingTrampoline = false;
    this.emit(success ? "success" : "failure", {
      position: copyPoint(this.avatarPosition),
      attempt: this.attempts,
      levelId: this.level.id,
      goalKind: this.level.goal.kind,
    });
  }

  resolveWorldCollisions() {
    const radius = this.avatarRadius;

    if (this.avatarPosition.y + radius > this.groundY) {
      this.avatarPosition.y = this.groundY - radius;
      if (this.avatarVelocity.y > 0) {
        const speed = Math.abs(this.avatarVelocity.y);
        this.avatarVelocity.y = -speed * 0.52 * this.bounceScale;
        this.avatarVelocity.x *= 0.83;
        if (Math.abs(this.avatarVelocity.y) < 31) this.avatarVelocity.y = 0;
        this.triggerImpact(speed, this.avatarPosition.x, this.groundY);
      }
    }

    const trampoline = this.trampolineBounds;
    if (trampoline?.enabled) {
      const withinTrampoline =
        this.avatarPosition.x + radius >= trampoline.x &&
        this.avatarPosition.x - radius <= trampoline.x + trampoline.width;
      const hittingFromAbove =
        this.avatarPosition.y + radius >= trampoline.y &&
        this.avatarPosition.y - radius < trampoline.y &&
        this.avatarVelocity.y > 0;

      if (withinTrampoline && hittingFromAbove) {
        const speed = Math.abs(this.avatarVelocity.y);
        this.avatarPosition.y = trampoline.y - radius;
        this.avatarVelocity.y = -Math.max(545, speed * 1.08) * this.bounceScale;
        this.avatarVelocity.x += 172;
        this.triggerImpact(Math.max(speed, 480), this.avatarPosition.x, trampoline.y, "trampoline");
      }
    }

    if (this.crateBounds?.enabled) {
      this.collideCircleWithRect(this.crateBounds, 0.66 * this.bounceScale, true, "crate");
    }
    if (this.wallBounds?.enabled) {
      this.collideCircleWithRect(this.wallBounds, 0.72 * this.bounceScale, false, "wall");
    }
  }

  goalReached() {
    const goal = this.level.goal;
    const velocitySafe = Math.abs(this.avatarVelocity.x) < 900 && Math.abs(this.avatarVelocity.y) < 1000;
    if (!velocitySafe) return false;

    if (goal.shape === "rect" || goal.shape === "zone") {
      const closestX = clamp(this.avatarPosition.x, goal.x, goal.x + goal.width);
      const closestY = clamp(this.avatarPosition.y, goal.y, goal.y + goal.height);
      return distanceSquared(this.avatarPosition, { x: closestX, y: closestY }) <= this.avatarRadius ** 2;
    }

    const goalDistance = this.avatarRadius + this.goalRadius;
    return distanceSquared(this.avatarPosition, this.goalCentre) <= goalDistance * goalDistance;
  }

  collideCircleWithRect(obstacle, restitution, addForwardKick, surface) {
    const radius = this.avatarRadius;
    const closestX = clamp(this.avatarPosition.x, obstacle.x, obstacle.x + obstacle.width);
    const closestY = clamp(this.avatarPosition.y, obstacle.y, obstacle.y + obstacle.height);
    let difference = {
      x: this.avatarPosition.x - closestX,
      y: this.avatarPosition.y - closestY,
    };
    let distanceSq = difference.x * difference.x + difference.y * difference.y;
    if (distanceSq >= radius * radius) return false;

    if (distanceSq < 0.0001) {
      const penetrations = [
        { value: Math.abs(this.avatarPosition.x - obstacle.x), normal: { x: -1, y: 0 } },
        { value: Math.abs(obstacle.x + obstacle.width - this.avatarPosition.x), normal: { x: 1, y: 0 } },
        { value: Math.abs(this.avatarPosition.y - obstacle.y), normal: { x: 0, y: -1 } },
        { value: Math.abs(obstacle.y + obstacle.height - this.avatarPosition.y), normal: { x: 0, y: 1 } },
      ].sort((a, b) => a.value - b.value);
      difference = penetrations[0].normal;
      distanceSq = 1;
    }

    const distance = Math.sqrt(distanceSq);
    const normal = { x: difference.x / distance, y: difference.y / distance };
    const penetration = radius - distance;
    this.avatarPosition.x += normal.x * (penetration + 0.5);
    this.avatarPosition.y += normal.y * (penetration + 0.5);

    const dot = this.avatarVelocity.x * normal.x + this.avatarVelocity.y * normal.y;
    const impactSpeed = Math.abs(dot);
    if (dot < 0) {
      this.avatarVelocity.x -= (1 + restitution) * dot * normal.x;
      this.avatarVelocity.y -= (1 + restitution) * dot * normal.y;
    }
    if (addForwardKick) this.avatarVelocity.x += 118;
    this.triggerImpact(Math.max(impactSpeed, 180), this.avatarPosition.x, this.avatarPosition.y, surface);
    return true;
  }

  triggerImpact(speed, x, y, surface = "ground") {
    this.impactFlash = 0.2;
    this.emit("impact", { speed, x, y, surface });
  }

  predictShot(numberOfDots = 20) {
    if (this.phase !== GamePhase.AIMING || numberOfDots <= 0) {
      return { points: [], reachesGoal: false };
    }

    const signature = [
      numberOfDots,
      this.level.id,
      this.avatarPosition.x.toFixed(2),
      this.avatarPosition.y.toFixed(2),
      this.trampolineX.toFixed(2),
      this.goalCentre.x,
      this.goalCentre.y,
      this.goalRadius,
    ].join(":");
    if (this.trajectoryCache?.signature === signature) return this.trajectoryCache.result;

    const velocity = {
      x: (this.anchor.x - this.avatarPosition.x) * LAUNCH_MULTIPLIER,
      y: (this.anchor.y - this.avatarPosition.y) * LAUNCH_MULTIPLIER,
    };

    const simulation = new GameModel(() => {}, this.level);
    simulation.mode = this.mode;
    simulation.trampolineX = this.trampolineX;
    simulation.avatarPosition = copyPoint(this.avatarPosition);
    simulation.startFlight(velocity, false, this.avatarPosition);

    const points = [];
    for (let frame = 0; frame < 360 && simulation.phase === GamePhase.FLYING; frame += 1) {
      simulation.update(1 / 60);
      if (frame % 6 === 5 && points.length < numberOfDots) points.push(copyPoint(simulation.avatarPosition));
    }

    const result = Object.freeze({
      points: Object.freeze(points),
      reachesGoal: simulation.phase === GamePhase.SUCCEEDED,
    });
    this.trajectoryCache = { signature, result };
    return result;
  }

  predictedTrajectory(numberOfDots = 20) {
    return this.predictShot(numberOfDots).points;
  }

  clampedSlingPoint(point) {
    const offset = { x: point.x - this.anchor.x, y: point.y - this.anchor.y };
    const offsetLength = length(offset);
    if (offsetLength > MAX_PULL && offsetLength > Number.EPSILON) {
      offset.x *= MAX_PULL / offsetLength;
      offset.y *= MAX_PULL / offsetLength;
    }
    offset.x = Math.min(offset.x, 48);
    return { x: this.anchor.x + offset.x, y: this.anchor.y + offset.y };
  }

  rectContains(rect, point) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  get avatarRadius() {
    return BASE_RADIUS * (this.modifier === Modifier.GIANT_HEAD ? 1.42 : 1);
  }

  get avatarGrabRadius() {
    return Math.max(this.avatarRadius + 34, BASE_RADIUS * 2.65);
  }

  get anchor() {
    return this.level.anchor;
  }

  get groundY() {
    return this.level.groundY;
  }

  get trampolineBounds() {
    const trampoline = this.level.trampoline;
    return {
      x: this.trampolineX,
      y: trampoline.y,
      width: trampoline.width,
      height: trampoline.height,
      enabled: trampoline.enabled,
    };
  }

  get fanBounds() {
    return this.level.fan;
  }

  get crateBounds() {
    return this.level.crate;
  }

  get wallBounds() {
    return this.level.wall;
  }

  get goalCentre() {
    const goal = this.level.goal;
    if (goal.shape === "rect" || goal.shape === "zone") {
      return { x: goal.x + goal.width * 0.5, y: goal.y + goal.height * 0.5 };
    }
    return { x: goal.x, y: goal.y };
  }

  get goalRadius() {
    return this.level.goal.radius ?? Math.max(this.level.goal.width, this.level.goal.height) * 0.5;
  }

  get gravityScale() {
    return this.modifier === Modifier.LOW_GRAVITY ? 0.43 : 1;
  }

  get bounceScale() {
    return this.modifier === Modifier.SUPER_BOUNCY ? 1.43 : 1;
  }

  get fanScale() {
    return this.modifier === Modifier.STRONGER_FAN ? 2 : 1;
  }

  get suggestedModifier() {
    return MODIFIERS[Math.max(0, this.attempts - 1) % MODIFIERS.length];
  }

  get expression() {
    if (this.impactFlash > 0) return "impact";
    if (this.phase === GamePhase.SUCCEEDED) return "victory";
    if (this.phase === GamePhase.FAILED) return this.personality === Personality.TOUGH_GUY ? "suspicious" : "defeat";
    if (this.phase === GamePhase.AIMING) return this.personality === Personality.ZEN ? "neutral" : "nervous";
    if (this.phase === GamePhase.FLYING) {
      if (this.personality === Personality.DRAMA_QUEEN) return this.flightTime > 0.75 ? "panic" : "airborne";
      if (this.personality === Personality.TOUGH_GUY) return "suspicious";
      if (this.personality === Personality.PANIC) return "panic";
      return "neutral";
    }
    return this.personality === Personality.PANIC ? "nervous" : "neutral";
  }

  get statusText() {
    if (this.mode === GameMode.ONE_MOVE && this.phase === GamePhase.READY && !this.moveUsed) {
      return `ONE MOVE: przesuń trampolinę raz. Potem: ${this.level.mission.title.toLocaleLowerCase("pl-PL")}.`;
    }
    if (this.mode === GameMode.QUICK && this.phase === GamePhase.READY && this.attempts === 0) {
      return this.level.tutorial?.status ?? this.level.status?.ready ?? "Pociągnij bohatera i znajdź właściwy tor.";
    }
    if (this.mode === GameMode.QUICK && this.phase === GamePhase.READY && this.attempts >= 2 && this.level.assistPull) {
      return "Mała podpowiedź: pociągnij w stronę strzałki i puść, gdy tor zrobi się miętowy.";
    }
    return this.level.status?.[this.phase] ?? {
      [GamePhase.READY]: "Złap bohatera. Budzik sam się nie uciszy.",
      [GamePhase.AIMING]: "Naciągnij. Godność odzyskamy później.",
      [GamePhase.FLYING]: "SLING → BANG → SNOOZE → AGAIN",
      [GamePhase.SUCCEEDED]: "SNOOZE! Poranek oficjalnie przełożony.",
      [GamePhase.FAILED]: "Budzik 1 : Ty 0. Fizyka prosi o rewanż.",
    }[this.phase];
  }

  get speechText() {
    const levelLine = this.level.speech?.[this.phase]?.[this.personality];
    if (levelLine) return levelLine;
    const lines = {
      [GamePhase.SUCCEEDED]: {
        [Personality.DRAMA_QUEEN]: "NATURALNY TALENT DO SPANIA!",
        [Personality.TOUGH_GUY]: "SNOOZE ZNEUTRALIZOWANY.",
        [Personality.PANIC]: "ŻYJĘ! I MOGĘ SPAĆ?!",
        [Personality.ZEN]: "PORANEK MOŻE POCZEKAĆ.",
      },
      [GamePhase.FAILED]: {
        [Personality.DRAMA_QUEEN]: "BUDZIK ZNISZCZYŁ MI KARIERĘ!",
        [Personality.TOUGH_GUY]: "SPRAWDZAŁEM PODŁOGĘ.",
        [Personality.PANIC]: "WIEDZIAŁEM, ŻE RANO JEST ŹLE!",
        [Personality.ZEN]: "BUDZIK TEŻ POTRZEBUJE CZASU.",
      },
      [GamePhase.FLYING]: {
        [Personality.DRAMA_QUEEN]: "TO NIE BYŁO W UMOWIE!",
        [Personality.TOUGH_GUY]: "PEŁNA KONTROLA.",
        [Personality.PANIC]: "JA JUŻ ŻAŁUJĘ!",
        [Personality.ZEN]: "GRAWITACJA MA UCZUCIA.",
      },
      [GamePhase.AIMING]: {
        [Personality.DRAMA_QUEEN]: "TYLKO NIE W TWARZ!",
        [Personality.TOUGH_GUY]: "MOCNIEJ.",
        [Personality.PANIC]: "MOŻEMY TO OMÓWIĆ?",
        [Personality.ZEN]: "JESTEM PROCĄ.",
      },
    };
    return lines[this.phase]?.[this.personality] ?? "";
  }
}

export function modifierName(modifier) {
  return {
    [Modifier.STRONGER_FAN]: "WENTYLATOR 2×?",
    [Modifier.LOW_GRAVITY]: "LOW GRAVITY?",
    [Modifier.SUPER_BOUNCY]: "SUPER BOUNCY?",
    [Modifier.GIANT_HEAD]: "GIANT HEAD?",
    [Modifier.NONE]: "BEZ ZMIAN",
  }[modifier];
}
