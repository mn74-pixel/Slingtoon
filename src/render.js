import { GameMode, GamePhase, Modifier, Personality, WORLD } from "./game.js?v=0.18.0";
import { clientPointToWorld, createCropFreeViewport } from "./viewport.js?v=0.18.0";
import { drawInteractions, drawObjective } from "./interactions-renderer.js?v=0.18.0";
import { drawCampaignGoal, drawCampaignScene, drawWorldCompanion } from "./world-renderer.js?v=0.18.0";

const PALETTE = Object.freeze({
  ink: "#19142d",
  cream: "#fff5d9",
  creamDim: "#eadfca",
  violet: "#7c63e7",
  violetBright: "#a28bff",
  coral: "#ff6078",
  coralDark: "#d83e67",
  gold: "#ffd35f",
  mint: "#5ce1bd",
  teal: "#2cae9d",
  skin: "#f4b783",
  skinShadow: "#d98868",
  white: "#fffdf4",
});

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
// Keep the face readable after the complete 1280×640 room is reduced to a
// phone screen. This is deliberately visual-only: GameModel still uses the
// original avatar radius for aiming and collisions.
const CUSTOM_HEAD_SCALE = 1.92;
const CUSTOM_HEAD_LIFT = -17;

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) * 0.5, Math.abs(height) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function strokeFill(ctx, fill, stroke = PALETTE.ink, width = 5) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

// An offscreen surface for the stretched scene backdrop. The browser has two
// ways to make one; the offline QA renderer passes its own.
function defaultSurface(width, height) {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
  if (typeof document === "undefined") return null;
  const surface = document.createElement("canvas");
  surface.width = width;
  surface.height = height;
  return surface;
}

export class GameRenderer {
  constructor(canvas, model, createSurface = defaultSurface) {
    this.createSurface = createSurface;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    this.model = model;
    this.viewport = createCropFreeViewport(canvas.width, canvas.height, WORLD.width, WORLD.height);
    this.background = null;
    this.backgroundSource = null;
    this.faceImage = null;
    this.faceMetadata = null;
    this.particles = [];
    this.callouts = [];
    this.trail = [];
    this.lastTrailPoint = null;
    // The path of the last finished attempt, kept so a retry corrects a shot
    // the player can still see instead of guessing blind.
    this.flightPath = [];
    this.ghost = null;
    this.shake = 0;
    this.clockWobble = 0;
    this.successPulse = 0;
    this.fanAngle = 0;
    this.time = 0;
  }

  async load() {
    const source = this.model.level.background;
    if (!source) {
      this.background = null;
      this.backgroundSource = null;
      return;
    }
    if (this.background && this.backgroundSource === source) return;
    const loaded = await loadImage(source);
    if (this.model.level.background === source) {
      this.background = loaded;
      this.backgroundSource = source;
    }
  }

  resizeView(cssWidth, cssHeight) {
    const viewport = createCropFreeViewport(cssWidth, cssHeight, WORLD.width, WORLD.height);
    this.viewport = viewport;
    if (this.canvas.width !== viewport.width) this.canvas.width = viewport.width;
    if (this.canvas.height !== viewport.height) this.canvas.height = viewport.height;
  }

  clientPoint(clientX, clientY, rect = this.canvas.getBoundingClientRect()) {
    return clientPointToWorld(clientX, clientY, rect, this.viewport);
  }

  setFaceImage(portrait) {
    if (portrait?.image) {
      this.faceImage = portrait.image;
      this.faceMetadata = portrait.metadata ?? portrait.image.slingtoonPortrait ?? null;
      return;
    }
    this.faceImage = portrait ?? null;
    this.faceMetadata = portrait?.slingtoonPortrait ?? null;
  }

  handleGameEvent(event) {
    if (event.type === "reset" || event.type === "mode") {
      this.particles.length = 0;
      this.callouts.length = 0;
      this.trail.length = 0;
      this.lastTrailPoint = null;
      this.successPulse = 0;
      if (event.resetAttempts || event.type === "mode") this.ghost = null;
    }

    if (event.type === "level") {
      this.ghost = null;
      this.background = null;
      this.backgroundSource = null;
      this.load().catch(() => {});
    }

    if (event.type === "launch" || event.type === "what-if") {
      this.trail.length = 0;
      this.lastTrailPoint = null;
      this.flightPath = [{ x: this.model.avatarPosition.x, y: this.model.avatarPosition.y }];
      this.spawnDust(event.position?.x ?? this.model.avatarPosition.x, event.position?.y ?? this.model.avatarPosition.y, 10);
    }

    if (event.type === "impact") {
      const intensity = clamp(event.speed / 620, 0.25, 1);
      this.shake = Math.max(this.shake, 1 + intensity * 5);
      this.clockWobble = event.x > 1010 ? 1 : this.clockWobble;
      this.spawnImpact(event.x, event.y, 12 + Math.round(intensity * 16));
      this.callouts.push({
        x: event.x,
        y: event.y - 24,
        text: event.surface === "water" ? "KACZKA!" : event.surface === "cushion" ? "PLOF!" : "BĘC!",
        age: 0,
        life: 0.72,
        angle: (Math.random() - 0.5) * 0.18,
      });
    }

    if (event.type === "success") {
      this.shake = 7;
      this.clockWobble = 1.6;
      this.successPulse = 1;
      this.spawnConfetti(event.position.x, event.position.y, 64);
      const goal = this.model.goalCentre;
      this.callouts.push({ x: goal.x, y: goal.y - 100, text: this.model.level.result.successTag, age: 0, life: 1.6, angle: -0.08 });
    }

    if (event.type === "success" || event.type === "failure") {
      this.ghost = this.flightPath.length > 2
        ? { path: this.flightPath.slice(), end: { ...this.model.avatarPosition }, won: event.type === "success" }
        : null;
    }
    if (event.type === "failure") {
      this.callouts.push({
        x: event.position.x,
        y: event.position.y - 52,
        text: this.model.level.result.failureTag,
        failure: true,
        age: 0,
        life: 1.05,
        angle: 0.07,
      });
    }
    if (["interaction", "air-move", "dive-move", "collect"].includes(event.type)) {
      const words = { break: "NIE RZUCAĆ… UPS!", portal: "WIROWANIE!", steam: "PODMUCH!", current: "Z PRĄDEM!", bubble: "BUL-BUL!", gravity: "CIĄGNIE!", switch: "SEZAM!", cushion: "PEŁNA KULTURA.", water: "KWAK?" };
      const moveText = { "air-move": "FIK!", "dive-move": "KAMIEŃ!", collect: "STYL +1!" };
      this.spawnImpact(event.x, event.y, event.type === "collect" ? 14 : 9);
      this.callouts.push({ x: event.x, y: event.y - 50, text: moveText[event.type] ?? words[event.kind], age: 0, life: .85, angle: -.05 });
      if (event.kind === "portal") { this.trail.length = 0; this.lastTrailPoint = null; }
    }
    // The drop reads as weight, so it gets a shake the upward FIK does not.
    if (event.type === "dive-move") {
      this.shake = Math.max(this.shake, 9);
      this.trail.length = 0;
      this.lastTrailPoint = null;
    }
    if (this.particles.length > 140) this.particles.splice(0, this.particles.length - 140);
    if (this.callouts.length > 4) this.callouts.splice(0, this.callouts.length - 4);
  }

  update(deltaSeconds) {
    const dt = Math.min(deltaSeconds, .1);
    this.time += dt;
    this.fanAngle += dt * (this.model.modifier === Modifier.STRONGER_FAN ? 15 : 7.5);
    this.shake = Math.max(0, this.shake - dt * 42);
    this.clockWobble = Math.max(0, this.clockWobble - dt * 3.1);
    this.successPulse = Math.max(0, this.successPulse - dt * 0.7);

    if (this.model.phase === GamePhase.FLYING) {
      const point = this.model.avatarPosition;
      if (!this.lastTrailPoint || Math.hypot(point.x - this.lastTrailPoint.x, point.y - this.lastTrailPoint.y) > 14) {
        this.trail.push({ x: point.x, y: point.y, age: 0 });
        this.lastTrailPoint = { x: point.x, y: point.y };
        if (this.flightPath.length < 400) this.flightPath.push({ x: point.x, y: point.y });
      }
    }

    for (const point of this.trail) point.age += dt;
    this.trail = this.trail.filter((point) => point.age < 0.75);

    for (const particle of this.particles) {
      particle.age += dt;
      particle.velocity.y += particle.gravity * dt;
      particle.x += particle.velocity.x * dt;
      particle.y += particle.velocity.y * dt;
      particle.rotation += particle.spin * dt;
    }
    this.particles = this.particles.filter((particle) => particle.age < particle.life);

    for (const callout of this.callouts) callout.age += dt;
    this.callouts = this.callouts.filter((callout) => callout.age < callout.life);
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawViewportBackdrop(ctx);
    ctx.save();
    ctx.translate(this.viewport.offsetX, this.viewport.offsetY);

    if (this.shake > 0) {
      const x = (Math.random() - 0.5) * this.shake;
      const y = (Math.random() - 0.5) * this.shake * 0.72;
      ctx.translate(x, y);
    }

    this.drawBackground(ctx);
    drawObjective(ctx, this.model, this.time);
    this.drawModifierAtmosphere(ctx);
    this.drawGhostPath(ctx);
    this.drawSpeedTrail(ctx);
    this.drawSlingBack(ctx);
    this.drawTrajectory(ctx);
    this.drawPhysicalObjects(ctx);
    drawWorldCompanion(ctx, this.model, this.time);
    this.drawAvatarShadow(ctx);
    this.drawAvatar(ctx);
    this.drawSlingFront(ctx);
    this.drawParticles(ctx);
    this.drawCallouts(ctx);
    this.drawWorldHints(ctx);
    this.drawVignette(ctx);
    ctx.restore();
  }

  // A screen wider than 2:1 reveals world beyond the 1280x640 the scenes paint,
  // and that margin used to be a flat purple band framing the board. Filling it
  // with a stretched, pushed-back copy of the scene makes the room read as if it
  // simply continues past the edges.
  sceneBackdrop() {
    if (this.viewport.offsetX < 2 && this.viewport.offsetY < 2) return null;
    const key = `${this.model.level.id}:${this.background ? 1 : 0}`;
    if (this.backdrop?.key !== key) {
      // Cached small on purpose: stretching a low-resolution copy back up blurs
      // it for free, so the margin reads as ambience instead of a mirrored
      // duplicate of the room, and costs one cheap draw per mission.
      const surface = this.createSurface(WORLD.width / 8, WORLD.height / 8);
      if (!surface) return null;
      const context = surface.getContext("2d");
      context.scale(1 / 8, 1 / 8);
      this.drawBackground(context);
      this.backdrop = { key, surface };
    }
    return this.backdrop.surface;
  }

  drawViewportBackdrop(ctx) {
    const scene = this.sceneBackdrop();
    if (scene) {
      ctx.drawImage(scene, 0, 0, scene.width, scene.height, 0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = "rgba(18, 11, 30, 0.58)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, "#302451");
    gradient.addColorStop(0.5, "#655185");
    gradient.addColorStop(1, "#704565");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = PALETTE.cream;
    for (let index = 0; index < 18; index += 1) {
      const x = (index * 173 + 41) % this.canvas.width;
      const y = (index * 97 + 29) % this.canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 2 + index % 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBackground(ctx) {
    if (this.background) {
      ctx.drawImage(this.background, 0, 0, WORLD.width, WORLD.height);
    } else {
      this.drawProceduralScene(ctx);
    }

    const visual = this.model.level.visual;
    ctx.fillStyle = "rgba(49,34,75,.23)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    if (visual?.wash) {
      ctx.fillStyle = visual.wash;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
    if (visual?.gag) this.drawSceneGag(ctx, visual.gag, visual.accent, visual.gagX, visual.gagY);
  }

  drawProceduralScene(ctx) {
    if (drawCampaignScene(ctx, this.model.level)) return;
    const scenes = {
      laundry: () => this.drawLaundryScene(ctx),
      "living-room": () => this.drawLivingRoomScene(ctx),
      kitchen: () => this.drawKitchenScene(ctx),
      garden: () => this.drawGardenScene(ctx),
      park: () => this.drawParkScene(ctx),
      lake: () => this.drawLakeScene(ctx),
    };
    (scenes[this.model.level.scene] ?? scenes.laundry)();
  }

  drawRoomBase(ctx, wallTop, wallBottom, floorTop, floorBottom) {
    const wall = ctx.createLinearGradient(0, 0, 0, 510);
    wall.addColorStop(0, wallTop);
    wall.addColorStop(1, wallBottom);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, WORLD.width, 510);
    ctx.fillStyle = floorTop;
    ctx.fillRect(0, 510, WORLD.width, 76);
    ctx.fillStyle = floorBottom;
    ctx.fillRect(0, 586, WORLD.width, 54);
    ctx.fillStyle = "rgba(25, 20, 45, 0.14)";
    ctx.fillRect(0, 496, WORLD.width, 14);
  }

  drawLaundryScene(ctx) {
    this.drawRoomBase(ctx, "#b9f0df", "#77cbbd", "#e7d9bb", "#7e6688");
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    for (let x = 0; x < WORLD.width; x += 72) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 510); ctx.stroke();
    }
    for (let y = 0; y < 510; y += 72) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.width, y); ctx.stroke();
    }
    ctx.restore();
    for (const x of [350, 520]) {
      roundedRect(ctx, x, 238, 145, 258, 20);
      strokeFill(ctx, x === 350 ? "#fff4d8" : "#a28bff", PALETTE.ink, 7);
      ctx.beginPath(); ctx.arc(x + 72, 363, 48, 0, Math.PI * 2); strokeFill(ctx, "#302a52", PALETTE.ink, 7);
      ctx.beginPath(); ctx.arc(x + 72, 363, 34, 0, Math.PI * 2); strokeFill(ctx, "#75d8df", PALETTE.ink, 4);
      ctx.fillStyle = PALETTE.coral; ctx.beginPath(); ctx.arc(x + 39, 274, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(65, 120); ctx.quadraticCurveTo(360, 180, 650, 120); ctx.stroke();
    for (const [x, colour] of [[132, PALETTE.gold], [245, PALETTE.coral], [575, PALETTE.violet]]) {
      ctx.fillStyle = colour; ctx.fillRect(x, 128, 70, 68); ctx.strokeRect(x, 128, 70, 68);
    }
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "900 38px system-ui, sans-serif";
    ctx.fillText("PRALNIA", 55, 75);
  }

  drawLivingRoomScene(ctx) {
    this.drawRoomBase(ctx, "#d9c9f7", "#9b82c3", "#d5a56c", "#604a6f");
    ctx.fillStyle = "rgba(255,245,217,.14)";
    for (let x = 0; x < WORLD.width; x += 105) ctx.fillRect(x, 510, 5, 76);
    roundedRect(ctx, 368, 278, 405, 232, 38);
    strokeFill(ctx, "#6250a1", PALETTE.ink, 8);
    roundedRect(ctx, 400, 315, 160, 133, 28); strokeFill(ctx, "#8b72d9", PALETTE.ink, 5);
    roundedRect(ctx, 580, 315, 160, 133, 28); strokeFill(ctx, "#8b72d9", PALETTE.ink, 5);
    ctx.fillStyle = PALETTE.gold; ctx.beginPath(); ctx.arc(548, 458, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    roundedRect(ctx, 73, 98, 228, 142, 17); strokeFill(ctx, PALETTE.cream, PALETTE.ink, 7);
    ctx.fillStyle = PALETTE.coral; ctx.font = "900 35px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("SZTUKA", 187, 158); ctx.fillStyle = PALETTE.ink; ctx.font = "900 16px system-ui, sans-serif"; ctx.fillText("(podobno)", 187, 191);
    ctx.textAlign = "start";
    ctx.fillStyle = "rgba(25,20,45,.55)"; ctx.font = "900 27px system-ui, sans-serif"; ctx.fillText("SALON · STREFA ZAGINIĘĆ", 55, 65);
  }

  drawKitchenScene(ctx) {
    this.drawRoomBase(ctx, "#ffe4b5", "#eea780", "#d8c7a8", "#62485f");
    ctx.fillStyle = "rgba(255,255,255,.23)";
    for (let y = 48; y < 430; y += 70) for (let x = (y / 70) % 2 * 35; x < WORLD.width; x += 70) ctx.fillRect(x, y, 66, 66);
    ctx.fillStyle = "#49385f"; ctx.fillRect(300, 295, 600, 28);
    for (const x of [315, 510, 705]) {
      roundedRect(ctx, x, 323, 178, 176, 10); strokeFill(ctx, x === 510 ? "#ff8b79" : "#7c63e7", PALETTE.ink, 6);
      ctx.fillStyle = PALETTE.gold; ctx.beginPath(); ctx.arc(x + 89, 350, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(100, 120); ctx.lineTo(100, 205); ctx.moveTo(170, 120); ctx.lineTo(170, 205); ctx.stroke();
    ctx.fillStyle = PALETTE.coral; ctx.beginPath(); ctx.arc(100, 218, 25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(25,20,45,.58)"; ctx.font = "900 28px system-ui, sans-serif"; ctx.fillText("KUCHNIA · BHP WYSZŁO", 55, 65);
  }

  drawOutdoorBase(ctx, skyTop, skyBottom, grass) {
    const sky = ctx.createLinearGradient(0, 0, 0, 520);
    sky.addColorStop(0, skyTop); sky.addColorStop(1, skyBottom);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, WORLD.width, 586);
    ctx.fillStyle = "#fff4d8";
    for (const [x, y, s] of [[180, 120, 1], [540, 75, .8], [935, 140, 1.2]]) {
      ctx.beginPath(); ctx.arc(x, y, 32 * s, 0, Math.PI * 2); ctx.arc(x + 40 * s, y - 10, 42 * s, 0, Math.PI * 2); ctx.arc(x + 80 * s, y + 3, 30 * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = grass; ctx.beginPath(); ctx.moveTo(0, 430); ctx.quadraticCurveTo(310, 350, 610, 440); ctx.quadraticCurveTo(960, 330, 1280, 420); ctx.lineTo(1280, 640); ctx.lineTo(0, 640); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2f7d67"; ctx.fillRect(0, 574, WORLD.width, 66);
  }

  drawGardenScene(ctx) {
    this.drawOutdoorBase(ctx, "#7dd7e8", "#d5f4dd", "#67bd76");
    ctx.fillStyle = "#a86552"; ctx.fillRect(330, 335, 520, 250);
    ctx.fillStyle = "#fff2cf"; for (let x = 345; x < 845; x += 85) ctx.fillRect(x, 352, 70, 48);
    ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 6; ctx.strokeRect(330, 335, 520, 250);
    for (const [x, colour] of [[65, PALETTE.gold], [250, PALETTE.coral], [900, PALETTE.violet]]) {
      ctx.fillStyle = "#74513f"; ctx.fillRect(x + 36, 300, 20, 150);
      ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(x + 45, 275, 70, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "rgba(25,20,45,.58)"; ctx.font = "900 28px system-ui, sans-serif"; ctx.fillText("OGRÓD · STREFA GNOMA", 55, 65);
  }

  drawParkScene(ctx) {
    this.drawOutdoorBase(ctx, "#79c8ea", "#f3d6bd", "#67ad68");
    for (const x of [70, 315, 790, 1035]) {
      ctx.fillStyle = "#6f4a3f"; ctx.fillRect(x + 38, 245, 27, 240);
      ctx.fillStyle = x % 2 ? "#5ce1bd" : "#438d67"; ctx.beginPath(); ctx.arc(x + 50, 205, 92, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "#d8bd8b"; ctx.beginPath(); ctx.moveTo(350, 586); ctx.quadraticCurveTo(610, 440, 990, 586); ctx.closePath(); ctx.fill();
    roundedRect(ctx, 860, 426, 210, 65, 9); strokeFill(ctx, "#9b684d", PALETTE.ink, 6);
    ctx.fillStyle = "rgba(25,20,45,.6)"; ctx.font = "900 28px system-ui, sans-serif"; ctx.fillText("PARK · GOŁĘBIE URZĘDUJĄ", 55, 65);
  }

  drawLakeScene(ctx) {
    this.drawOutdoorBase(ctx, "#5bc6e8", "#d6f4e1", "#73ba78");
    ctx.fillStyle = "#ae865b"; ctx.fillRect(0, 510, 515, 76);
    ctx.strokeStyle = "#6d4d44"; ctx.lineWidth = 7;
    for (let x = 20; x < 500; x += 65) { ctx.beginPath(); ctx.moveTo(x, 510); ctx.lineTo(x, 586); ctx.stroke(); }
    ctx.fillStyle = "#4bbbd0"; ctx.fillRect(515, 515, 765, 71);
    ctx.fillStyle = "#327a91"; ctx.fillRect(0, 586, WORLD.width, 54);
    for (let i = 0; i < 9; i += 1) {
      const y = 530 + i % 3 * 17;
      ctx.strokeStyle = i % 2 ? "rgba(255,245,217,.6)" : "rgba(25,20,45,.2)";
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(535 + i * 73, y); ctx.quadraticCurveTo(560 + i * 73, y - 8, 590 + i * 73, y); ctx.stroke();
    }
    ctx.fillStyle = "rgba(25,20,45,.6)"; ctx.font = "900 28px system-ui, sans-serif"; ctx.fillText("JEZIORO · RATOWNIK: KACZKA", 55, 65);
  }

  drawSceneGag(ctx, text, accent = PALETTE.gold, x = 914, y = 90) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.035);
    roundedRect(ctx, -126, -18, 252, 36, 15);
    ctx.fillStyle = "rgba(27, 20, 45, 0.78)";
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = PALETTE.cream;
    ctx.font = "900 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 1, 228);
    ctx.restore();
  }

  drawModifierAtmosphere(ctx) {
    const modifier = this.model.modifier;
    if (modifier === Modifier.NONE) return;

    ctx.save();
    if (modifier === Modifier.LOW_GRAVITY) {
      const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
      gradient.addColorStop(0, "rgba(75, 89, 222, 0.28)");
      gradient.addColorStop(1, "rgba(105, 245, 225, 0.05)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.globalAlpha = 0.43;
      ctx.fillStyle = PALETTE.cream;
      for (let index = 0; index < 24; index += 1) {
        const x = (index * 167 + 43) % WORLD.width;
        const y = (index * 89 + this.time * 22) % 430;
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (index % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (modifier === Modifier.STRONGER_FAN) {
      ctx.fillStyle = "rgba(92, 225, 189, 0.075)";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    } else if (modifier === Modifier.SUPER_BOUNCY) {
      ctx.fillStyle = "rgba(255, 96, 120, 0.075)";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    } else if (modifier === Modifier.GIANT_HEAD) {
      ctx.fillStyle = "rgba(255, 211, 95, 0.07)";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
    ctx.restore();
  }

  drawPhysicalObjects(ctx) {
    if (this.model.waterBounds?.enabled) this.drawWater(ctx);
    drawInteractions(ctx, this.model, this.time);
    this.drawGoalTarget(ctx);
  }

  drawGoalTarget(ctx) {
    if (drawCampaignGoal(ctx, this.model, this.time, this.successPulse)) return;
    const drawers = {
      alarm: () => this.drawAlarmClock(ctx),
      coffee: () => this.drawCoffee(ctx),
      sock: () => this.drawSock(ctx),
      remote: () => this.drawRemote(ctx),
      toaster: () => this.drawToaster(ctx),
      gnome: () => this.drawGnome(ctx),
      "ice-cream": () => this.drawIceCream(ctx),
      duck: () => this.drawDuck(ctx),
    };
    (drawers[this.model.level.goal.kind] ?? drawers.alarm)();
  }

  drawWater(ctx) {
    const box = this.model.waterBounds;
    const wave = Math.sin(this.time * 4) * 5;
    ctx.save();
    const gradient = ctx.createLinearGradient(0, box.y, 0, box.y + box.height);
    gradient.addColorStop(0, "rgba(92, 225, 221, 0.88)");
    gradient.addColorStop(1, "rgba(40, 118, 164, 0.96)");
    ctx.fillStyle = gradient;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(box.x, box.y);
    for (let x = box.x; x <= box.x + box.width; x += 24) {
      ctx.quadraticCurveTo(x + 12, box.y - 8 - wave, x + 24, box.y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(25,20,45,.72)";
    ctx.font = "900 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PŁASKO = ŚLIZG · STROMO = PLUMS", box.x + box.width * 0.5, box.y + 34);
    ctx.restore();
  }

  drawAlarmClock(ctx) {
    const centre = this.model.goalCentre;
    const displayScale = this.model.level.goal.displayScale ?? 1;
    const wobble = Math.sin(this.time * 26) * (0.025 + this.clockWobble * 0.11);
    const pulse = 1 + Math.sin(this.time * 5) * 0.015 + this.successPulse * 0.08;
    ctx.save();
    ctx.translate(centre.x, centre.y);
    ctx.rotate(wobble);
    ctx.scale(pulse * displayScale, pulse * displayScale);
    ctx.shadowColor = "rgba(17, 10, 28, 0.52)";
    ctx.shadowBlur = 19;
    ctx.shadowOffsetY = 10;

    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-44, -48);
    ctx.lineTo(-62, -68);
    ctx.moveTo(44, -48);
    ctx.lineTo(62, -68);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-65, -71, 15, Math.PI * 0.1, Math.PI * 1.55);
    ctx.arc(65, -71, 15, Math.PI * 1.45, Math.PI * 0.9);
    ctx.stroke();

    roundedRect(ctx, -66, -52, 132, 104, 27);
    const body = ctx.createLinearGradient(-60, -52, 58, 52);
    body.addColorStop(0, PALETTE.coral);
    body.addColorStop(1, "#df3d73");
    strokeFill(ctx, body, PALETTE.ink, 8);
    ctx.shadowColor = "transparent";
    roundedRect(ctx, -49, -32, 98, 51, 13);
    ctx.fillStyle = "#211a36";
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = "900 28px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.model.phase === GamePhase.SUCCEEDED ? "Z Z Z" : "7:03", 0, -7);
    roundedRect(ctx, -38, 27, 76, 19, 9);
    ctx.fillStyle = PALETTE.gold;
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = "900 10px system-ui, sans-serif";
    ctx.fillText(this.model.phase === GamePhase.SUCCEEDED ? "SILENCE" : "SNOOZE", 0, 36);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-37, 50);
    ctx.lineTo(-48, 66);
    ctx.moveTo(37, 50);
    ctx.lineTo(48, 66);
    ctx.stroke();

    if (this.model.phase !== GamePhase.SUCCEEDED) {
      ctx.fillStyle = PALETTE.cream;
      ctx.font = "900 12px system-ui, sans-serif";
      ctx.fillText("HIT ME", 0, 79);
    }
    ctx.restore();
  }

  drawCoffee(ctx) {
    const centre = this.model.goalCentre;
    const displayScale = this.model.level.goal.displayScale ?? 1;
    const wobble = Math.sin(this.time * 5.4) * 0.018 + this.clockWobble * 0.04;
    ctx.save();
    ctx.translate(centre.x, centre.y);
    ctx.rotate(wobble);
    ctx.scale(displayScale, displayScale);
    ctx.shadowColor = "rgba(17, 10, 28, 0.48)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    ctx.ellipse(0, 52, 67, 14, 0, 0, Math.PI * 2);
    strokeFill(ctx, "#f5d39a", PALETTE.ink, 6);
    roundedRect(ctx, -52, -45, 96, 92, 20);
    const mug = ctx.createLinearGradient(-45, -40, 45, 45);
    mug.addColorStop(0, PALETTE.gold);
    mug.addColorStop(1, "#ee8f5c");
    strokeFill(ctx, mug, PALETTE.ink, 7);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.arc(49, 1, 27, -Math.PI * 0.5, Math.PI * 0.55);
    ctx.stroke();
    ctx.fillStyle = "#4a2631";
    ctx.beginPath();
    ctx.ellipse(-4, -29, 37, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath(); ctx.arc(-19, 4, 4, 0, Math.PI * 2); ctx.arc(13, 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(-3, 14, 14, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    for (let index = -1; index <= 1; index += 1) {
      const sway = Math.sin(this.time * 2.3 + index) * 7;
      ctx.beginPath();
      ctx.moveTo(index * 22, -53);
      ctx.bezierCurveTo(index * 18 + sway, -72, index * 25 - sway, -87, index * 18, -105);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.font = "900 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.model.phase === GamePhase.SUCCEEDED ? "HUMAN MODE" : "NO TALK", -4, 36);
    ctx.restore();
  }

  drawSock(ctx) {
    const centre = this.model.goalCentre;
    const displayScale = this.model.level.goal.displayScale ?? 1;
    const float = Math.sin(this.time * 3.1) * 8;
    ctx.save();
    ctx.translate(centre.x, centre.y + float);
    ctx.rotate(-0.22 + Math.sin(this.time * 2.4) * 0.08 + this.clockWobble * 0.06);
    ctx.scale(displayScale, displayScale);
    ctx.shadowColor = "rgba(17, 10, 28, 0.42)";
    ctx.shadowBlur = 17;
    ctx.shadowOffsetY = 9;
    ctx.beginPath();
    ctx.moveTo(-38, -73);
    ctx.lineTo(32, -73);
    ctx.lineTo(28, 8);
    ctx.quadraticCurveTo(67, 12, 69, 43);
    ctx.quadraticCurveTo(67, 72, 35, 72);
    ctx.lineTo(-24, 72);
    ctx.quadraticCurveTo(-55, 67, -51, 39);
    ctx.lineTo(-38, -73);
    ctx.closePath();
    strokeFill(ctx, "#5ce1bd", PALETTE.ink, 7);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = PALETTE.coral;
    ctx.fillRect(-35, -52, 66, 17);
    ctx.fillRect(-48, 33, 40, 22);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 5;
    ctx.strokeRect(-35, -52, 66, 17);
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath(); ctx.arc(-15, -4, 4, 0, Math.PI * 2); ctx.arc(12, -4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-1, 11, 11, 0.12, Math.PI - 0.12); ctx.stroke();
    ctx.fillStyle = PALETTE.cream;
    ctx.font = "900 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.model.phase === GamePhase.SUCCEEDED ? "REUNITED" : "SOLO TOUR", 0, -61);
    ctx.restore();
  }

  drawRemote(ctx) {
    const centre = this.model.goalCentre;
    const displayScale = this.model.level.goal.displayScale ?? 1;
    ctx.save();
    ctx.translate(centre.x, centre.y);
    ctx.rotate(0.16 + Math.sin(this.time * 4) * 0.02 + this.clockWobble * 0.05);
    ctx.scale(displayScale, displayScale);
    ctx.shadowColor = "rgba(17, 10, 28, 0.5)";
    ctx.shadowBlur = 19;
    ctx.shadowOffsetY = 10;
    roundedRect(ctx, -45, -78, 90, 156, 24);
    const body = ctx.createLinearGradient(-42, -74, 40, 75);
    body.addColorStop(0, "#a28bff");
    body.addColorStop(1, "#5c45b7");
    strokeFill(ctx, body, PALETTE.ink, 8);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = PALETTE.coral;
    ctx.beginPath(); ctx.arc(0, -48, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    for (const [x, y] of [[-19, -14], [19, -14], [-19, 16], [19, 16], [-19, 46], [19, 46]]) {
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = PALETTE.ink;
    ctx.font = "900 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.model.phase === GamePhase.SUCCEEDED ? "BATTERY?" : "LOST", 0, 69);
    ctx.restore();
  }

  drawToaster(ctx) {
    const centre = this.model.goalCentre;
    const displayScale = this.model.level.goal.displayScale ?? 1;
    const angry = this.model.phase !== GamePhase.SUCCEEDED;
    ctx.save();
    ctx.translate(centre.x, centre.y);
    ctx.rotate(Math.sin(this.time * 15) * (angry ? 0.018 : 0.006) + this.clockWobble * 0.05);
    ctx.scale(displayScale, displayScale);
    ctx.shadowColor = "rgba(17, 10, 28, 0.5)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 11;
    roundedRect(ctx, -72, -29, 144, 91, 26);
    const body = ctx.createLinearGradient(-65, -25, 65, 58);
    body.addColorStop(0, "#ff7c8f");
    body.addColorStop(1, "#d93f70");
    strokeFill(ctx, body, PALETTE.ink, 8);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-43, 62); ctx.lineTo(-51, 76); ctx.moveTo(43, 62); ctx.lineTo(51, 76); ctx.stroke();
    roundedRect(ctx, -48, -43, 96, 18, 8);
    ctx.fillStyle = "#2c203d"; ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-36, -40); ctx.lineTo(-29, -99); ctx.quadraticCurveTo(0, -116, 30, -98); ctx.lineTo(38, -40); ctx.closePath();
    strokeFill(ctx, angry ? "#9a552f" : PALETTE.gold, PALETTE.ink, 7);
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath(); ctx.arc(-13, -78, 4, 0, Math.PI * 2); ctx.arc(14, -78, 4, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (angry) { ctx.moveTo(-15, -64); ctx.lineTo(15, -64); }
    else { ctx.arc(0, -70, 14, 0.12, Math.PI - 0.12); }
    ctx.stroke();
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = 5;
    for (let index = 0; index < 3; index += 1) {
      ctx.globalAlpha = 0.5 - index * 0.1;
      ctx.beginPath();
      ctx.moveTo(-25 + index * 25, -110);
      ctx.bezierCurveTo(-38 + index * 25, -128, -10 + index * 25, -139, -24 + index * 25, -155);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.cream;
    ctx.font = "900 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(angry ? "BURN MODE" : "CRUNCH OK", 0, 43);
    ctx.restore();
  }

  drawGnome(ctx) {
    const centre = this.model.goalCentre;
    const scale = this.model.level.goal.displayScale ?? 1;
    const bob = Math.sin(this.time * 3.4) * 3;
    ctx.save();
    ctx.translate(centre.x, centre.y + bob);
    ctx.scale(scale, scale);
    ctx.shadowColor = "rgba(17,10,28,.45)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 9;
    ctx.beginPath();
    ctx.moveTo(0, -108); ctx.lineTo(-54, -24); ctx.lineTo(55, -24); ctx.closePath();
    strokeFill(ctx, PALETTE.coral, PALETTE.ink, 8);
    ctx.beginPath(); ctx.ellipse(0, -6, 48, 42, 0, 0, Math.PI * 2);
    strokeFill(ctx, PALETTE.skin, PALETTE.ink, 7);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath(); ctx.arc(-17, -14, 5, 0, Math.PI * 2); ctx.arc(17, -14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-42, 10); ctx.quadraticCurveTo(0, 82, 42, 10); ctx.quadraticCurveTo(0, 43, -42, 10); ctx.fillStyle = PALETTE.cream; ctx.fill(); ctx.stroke();
    roundedRect(ctx, -51, 45, 102, 80, 24); strokeFill(ctx, PALETTE.violet, PALETTE.ink, 7);
    ctx.fillStyle = PALETTE.gold; ctx.font = "900 11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(this.model.phase === GamePhase.SUCCEEDED ? "SZEF OGRODU" : "DO URATOWANIA", 0, 91);
    ctx.restore();
  }

  drawIceCream(ctx) {
    const centre = this.model.goalCentre;
    const scale = this.model.level.goal.displayScale ?? 1;
    ctx.save();
    ctx.translate(centre.x, centre.y + Math.sin(this.time * 4) * 5);
    ctx.rotate(-0.08 + Math.sin(this.time * 2.7) * 0.04);
    ctx.scale(scale, scale);
    ctx.shadowColor = "rgba(17,10,28,.45)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 9;
    ctx.beginPath(); ctx.moveTo(-39, 4); ctx.lineTo(39, 4); ctx.lineTo(0, 112); ctx.closePath();
    strokeFill(ctx, "#d99b58", PALETTE.ink, 7);
    ctx.beginPath(); ctx.arc(-23, -20, 35, 0, Math.PI * 2); strokeFill(ctx, PALETTE.coral, PALETTE.ink, 6);
    ctx.beginPath(); ctx.arc(18, -25, 39, 0, Math.PI * 2); strokeFill(ctx, PALETTE.mint, PALETTE.ink, 6);
    ctx.beginPath(); ctx.arc(0, -59, 38, 0, Math.PI * 2); strokeFill(ctx, PALETTE.gold, PALETTE.ink, 6);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(-12, -58, 4, 0, Math.PI * 2); ctx.arc(14, -58, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(1, -48, 14, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.fillStyle = PALETTE.cream; ctx.font = "900 11px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("NIE DLA PTAKA", 0, 89);
    ctx.restore();
    this.drawPigeon(ctx, centre.x + 68, centre.y - 95);
  }

  drawPigeon(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y + Math.sin(this.time * 7) * 3);
    ctx.fillStyle = "#6d6482"; ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 27, -.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(27, -19, 21, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PALETTE.coral; ctx.beginPath(); ctx.moveTo(47, -21); ctx.lineTo(70, -14); ctx.lineTo(47, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PALETTE.white; ctx.beginPath(); ctx.arc(33, -25, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(36, -25, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8, 25); ctx.lineTo(-10, 42); ctx.moveTo(10, 25); ctx.lineTo(12, 42); ctx.stroke();
    ctx.restore();
  }

  drawDuck(ctx) {
    const centre = this.model.goalCentre;
    const scale = this.model.level.goal.displayScale ?? 1;
    ctx.save();
    ctx.translate(centre.x, centre.y + Math.sin(this.time * 2.8) * 7);
    ctx.scale(scale, scale);
    ctx.shadowColor = "rgba(17,10,28,.42)"; ctx.shadowBlur = 17; ctx.shadowOffsetY = 10;
    ctx.beginPath(); ctx.ellipse(0, 28, 75, 43, -.08, 0, Math.PI * 2); strokeFill(ctx, PALETTE.gold, PALETTE.ink, 8);
    ctx.beginPath(); ctx.arc(44, -24, 45, 0, Math.PI * 2); strokeFill(ctx, PALETTE.gold, PALETTE.ink, 7);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = PALETTE.coral; ctx.beginPath(); ctx.moveTo(79, -28); ctx.lineTo(118, -14); ctx.lineTo(78, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PALETTE.white; ctx.beginPath(); ctx.arc(52, -33, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PALETTE.ink; ctx.beginPath(); ctx.arc(56, -33, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -65); ctx.lineTo(65, -64); ctx.lineTo(45, -104); ctx.closePath(); strokeFill(ctx, PALETTE.ink, PALETTE.ink, 4);
    ctx.fillStyle = PALETTE.coral; ctx.beginPath(); ctx.moveTo(43, -98); ctx.quadraticCurveTo(77, -111, 82, -79); ctx.quadraticCurveTo(62, -87, 43, -77); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = PALETTE.cream; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 78, 64, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = PALETTE.cream; ctx.font = "900 11px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("KAPITAN KWAK", 0, 34);
    ctx.restore();
  }

  drawSlingBack(ctx) {
    const avatar = this.model.avatarPosition;
    const aiming = this.model.phase === GamePhase.AIMING;
    ctx.save();
    ctx.lineCap = "round";
    if (aiming) {
      ctx.strokeStyle = "#2b1833";
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(154, 442);
      ctx.lineTo(avatar.x, avatar.y);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.coral;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(131, 551);
    ctx.lineTo(150, 446);
    ctx.lineTo(168, 405);
    ctx.moveTo(150, 446);
    ctx.lineTo(121, 415);
    ctx.stroke();
    ctx.strokeStyle = "#b86647";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.restore();
  }

  drawSlingFront(ctx) {
    if (this.model.phase !== GamePhase.AIMING) return;
    const avatar = this.model.avatarPosition;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2b1833";
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(169, 409);
    ctx.lineTo(avatar.x, avatar.y);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.coral;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  }

  drawTrajectory(ctx) {
    const prediction = this.model.predictShot(24);
    const points = prediction.points;
    if (points.length === 0) return;
    ctx.save();
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      if (point.x < 0 || point.x > WORLD.width || point.y < 0 || point.y > WORLD.height) continue;
      const t = index / points.length;
      ctx.globalAlpha = 0.88 - t * 0.63;
      ctx.fillStyle = prediction.reachesGoal
        ? index % 4 === 0 ? PALETTE.white : PALETTE.mint
        : index % 4 === 0 ? PALETTE.gold : PALETTE.cream;
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(2.5, 6.5 - t * 3.6), 0, Math.PI * 2);
      ctx.fill();
    }

    if (prediction.reachesGoal) {
      const goal = this.model.goalCentre;
      const pulse = 1 + Math.sin(this.time * 8) * 0.08;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = PALETTE.mint;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, (this.model.goalRadius + 13) * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.mint;
      roundedRect(ctx, goal.x - 48, goal.y - this.model.goalRadius - 48, 96, 34, 15);
      ctx.fill();
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = PALETTE.ink;
      ctx.font = "900 16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PUŚĆ!", goal.x, goal.y - this.model.goalRadius - 31);
    }
    ctx.restore();
  }

  drawAvatarShadow(ctx) {
    const avatar = this.model.avatarPosition;
    const distance = Math.max(0, this.model.groundY - avatar.y);
    const scale = clamp(1 - distance / 700, 0.28, 1);
    ctx.save();
    ctx.globalAlpha = 0.28 * scale;
    ctx.fillStyle = "#130d25";
    ctx.beginPath();
    ctx.ellipse(avatar.x, this.model.groundY + 4, 46 * scale, 11 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawAvatar(ctx) {
    const model = this.model;
    const position = model.avatarPosition;
    const speed = Math.hypot(model.avatarVelocity.x, model.avatarVelocity.y);
    const baseScale = model.avatarRadius / 35;
    const motionStretch = model.phase === GamePhase.FLYING ? clamp(speed / 1350, 0, 0.18) : 0;
    const impactSquash = model.impactFlash > 0 ? Math.sin((model.impactFlash / 0.2) * Math.PI) * 0.19 : 0;
    const stretchX = 1 + motionStretch - impactSquash;
    const stretchY = 1 - motionStretch * 0.55 + impactSquash;
    const idleBob = model.phase === GamePhase.READY ? Math.sin(this.time * 3.4) * 2.1 : 0;

    ctx.save();
    ctx.translate(position.x, position.y + idleBob);
    ctx.rotate(model.phase === GamePhase.FLYING ? model.rotation : Math.sin(this.time * 2.1) * 0.018);
    ctx.scale(baseScale * stretchX, baseScale * stretchY);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    this.drawPersonalityBack(ctx, model.personality);
    this.drawLimbs(ctx, model.personality, model.phase);
    this.drawBody(ctx, model.personality);
    this.drawHead(ctx, model.expression, model.personality);
    this.drawPersonalityFront(ctx, model.personality);
    ctx.restore();

    if (model.speechText && (model.phase === GamePhase.AIMING || model.phase === GamePhase.FLYING)) {
      const headClearance = this.faceImage ? 102 : model.avatarRadius;
      this.drawSpeechBubble(ctx, position.x, position.y - headClearance - 39, model.speechText);
    }
  }

  drawPersonalityBack(ctx, personality) {
    if (personality === Personality.DRAMA_QUEEN) {
      ctx.beginPath();
      ctx.moveTo(-25, 16);
      ctx.bezierCurveTo(-58, 30, -63, 66, -27, 72);
      ctx.bezierCurveTo(-10, 54, 5, 34, 17, 20);
      strokeFill(ctx, PALETTE.coral, PALETTE.ink, 5);
    }
    if (personality === Personality.ZEN) {
      ctx.beginPath();
      ctx.arc(0, -46, 12, 0, Math.PI * 2);
      strokeFill(ctx, "#382344", PALETTE.ink, 4);
    }
  }

  drawLimbs(ctx, personality, phase) {
    const flying = phase === GamePhase.FLYING;
    const panic = personality === Personality.PANIC && flying;
    const armLift = panic ? -27 : flying ? -14 : 5;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-20, 14);
    ctx.quadraticCurveTo(-40, armLift, -49, panic ? -30 : 25);
    ctx.moveTo(20, 14);
    ctx.quadraticCurveTo(42, armLift + 4, 50, panic ? -24 : 27);
    ctx.moveTo(-13, 48);
    ctx.quadraticCurveTo(-23, 64, -30, 76);
    ctx.moveTo(13, 48);
    ctx.quadraticCurveTo(24, 64, 32, 76);
    ctx.stroke();

    ctx.fillStyle = PALETTE.cream;
    for (const [x, y] of [[-49, panic ? -30 : 25], [50, panic ? -24 : 27]]) {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      strokeFill(ctx, PALETTE.cream, PALETTE.ink, 4);
    }

    ctx.save();
    ctx.translate(-32, 77);
    ctx.rotate(-0.14);
    roundedRect(ctx, -15, -7, 30, 15, 7);
    strokeFill(ctx, PALETTE.gold, PALETTE.ink, 4);
    ctx.restore();
    ctx.save();
    ctx.translate(34, 77);
    ctx.rotate(0.14);
    roundedRect(ctx, -15, -7, 30, 15, 7);
    strokeFill(ctx, PALETTE.gold, PALETTE.ink, 4);
    ctx.restore();
  }

  drawBody(ctx, personality) {
    const colors = {
      [Personality.DRAMA_QUEEN]: [PALETTE.violet, "#5a3fbd"],
      [Personality.TOUGH_GUY]: ["#3a425e", "#202a42"],
      [Personality.PANIC]: [PALETTE.mint, PALETTE.teal],
      [Personality.ZEN]: ["#f0d98a", "#d49c5f"],
    }[personality];
    const gradient = ctx.createLinearGradient(-25, 3, 27, 58);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    roundedRect(ctx, -27, 3, 54, 57, 20);
    strokeFill(ctx, gradient, PALETTE.ink, 6);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundedRect(ctx, -15, 11, 12, 37, 6);
    ctx.fill();

    ctx.fillStyle = personality === Personality.TOUGH_GUY ? PALETTE.coral : PALETTE.ink;
    ctx.font = "900 21px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(personality === Personality.DRAMA_QUEEN ? "★" : personality === Personality.TOUGH_GUY ? "T" : personality === Personality.PANIC ? "!" : "○", 1, 32);
  }

  drawHead(ctx, expression, personality) {
    ctx.save();
    ctx.translate(0, -16);

    if (this.faceImage) {
      // A segmented portrait contains transparent space around the natural
      // head contour. Scale the complete custom-head layer so facial details
      // stay readable on a phone without changing the physics body.
      ctx.translate(0, CUSTOM_HEAD_LIFT);
      ctx.scale(CUSTOM_HEAD_SCALE, CUSTOM_HEAD_SCALE);
      ctx.save();
      ctx.shadowColor = "rgba(18, 11, 29, 0.38)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      // The portrait is a transparent, naturally shaped head. It is never
      // clipped to the stock character's circular skull.
      ctx.drawImage(this.faceImage, -48, -48, 96, 96);
      ctx.restore();
      this.drawPhotoReaction(ctx, expression);

      if (personality === Personality.PANIC) {
        ctx.strokeStyle = PALETTE.gold;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-13, -38);
        ctx.quadraticCurveTo(-20, -55, -5, -49);
        ctx.moveTo(0, -40);
        ctx.quadraticCurveTo(7, -58, 13, -45);
        ctx.moveTo(14, -36);
        ctx.quadraticCurveTo(27, -49, 25, -32);
        ctx.stroke();
      }

      // On the stock skull this band sits on the forehead. Over a photo that
      // crosses the player's eyes, so it rides the crown instead.
      if (personality === Personality.TOUGH_GUY) {
        ctx.strokeStyle = PALETTE.coral;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(0, -6, 45, Math.PI * 1.18, Math.PI * 1.82);
        ctx.stroke();
        ctx.fillStyle = PALETTE.coral;
        ctx.beginPath();
        ctx.moveTo(37, -32);
        ctx.lineTo(57, -24);
        ctx.lineTo(38, -14);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    ctx.shadowColor = "rgba(18, 11, 29, 0.32)";
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    strokeFill(ctx, PALETTE.skin, PALETTE.ink, 6);
    ctx.shadowColor = "transparent";

    const shade = ctx.createLinearGradient(-26, -20, 28, 27);
    shade.addColorStop(0, "rgba(255,255,255,0.20)");
    shade.addColorStop(1, "rgba(143,64,73,0.18)");
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.fill();

    this.drawExpression(ctx, expression);

    if (personality === Personality.PANIC) {
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-11, -33);
      ctx.quadraticCurveTo(-17, -53, -4, -46);
      ctx.moveTo(0, -35);
      ctx.quadraticCurveTo(7, -55, 12, -42);
      ctx.moveTo(12, -31);
      ctx.quadraticCurveTo(25, -46, 23, -31);
      ctx.stroke();
    }

    if (personality === Personality.TOUGH_GUY) {
      ctx.strokeStyle = PALETTE.coral;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, -1, 34, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = PALETTE.coral;
      ctx.beginPath();
      ctx.moveTo(29, -19);
      ctx.lineTo(46, -8);
      ctx.lineTo(28, -2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawExpression(ctx, expression) {
    ctx.strokeStyle = PALETTE.ink;
    ctx.fillStyle = PALETTE.ink;
    ctx.lineWidth = 4.5;
    ctx.lineCap = "round";

    const shocked = expression === "panic" || expression === "impact";
    const victory = expression === "victory";
    const defeat = expression === "defeat";
    const suspicious = expression === "suspicious";
    const nervous = expression === "nervous" || expression === "airborne";

    if (victory) {
      ctx.beginPath();
      ctx.arc(-12, -4, 7, Math.PI * 0.12, Math.PI * 0.88);
      ctx.arc(12, -4, 7, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
    } else if (shocked) {
      for (const x of [-12, 12]) {
        ctx.fillStyle = PALETTE.white;
        ctx.beginPath();
        ctx.ellipse(x, -4, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = PALETTE.ink;
        ctx.beginPath();
        ctx.arc(x, -3, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (suspicious) {
      ctx.beginPath();
      ctx.moveTo(-20, -8);
      ctx.lineTo(-5, -5);
      ctx.moveTo(5, -4);
      ctx.lineTo(20, -9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-12, 0, 2.8, 0, Math.PI * 2);
      ctx.arc(12, 0, 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(-12, -3, nervous ? 4 : 3, 0, Math.PI * 2);
      ctx.arc(12, -3, nervous ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    if (victory) {
      ctx.arc(0, 6, 13, 0.08 * Math.PI, 0.92 * Math.PI);
    } else if (shocked) {
      ctx.ellipse(0, 14, 7, 10, 0, 0, Math.PI * 2);
    } else if (defeat || nervous) {
      ctx.arc(0, 21, 10, 1.15 * Math.PI, 1.85 * Math.PI);
    } else if (suspicious) {
      ctx.moveTo(-8, 13);
      ctx.lineTo(9, 11);
    } else {
      ctx.arc(0, 7, 9, 0.16 * Math.PI, 0.84 * Math.PI);
    }
    ctx.stroke();
  }

  drawPhotoReaction(ctx, expression) {
    const shocked = expression === "panic" || expression === "impact";
    const victory = expression === "victory";
    const defeat = expression === "defeat";
    const nervous = expression === "nervous" || expression === "airborne";

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 4;

    if (shocked || nervous) {
      ctx.fillStyle = shocked ? PALETTE.violetBright : "#87e7f5";
      ctx.beginPath();
      ctx.moveTo(27, -28);
      ctx.quadraticCurveTo(41, -14, 30, -6);
      ctx.quadraticCurveTo(18, -12, 27, -28);
      ctx.fill();
      ctx.stroke();
    }

    if (shocked) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 4.5;
      for (const [x1, y1, x2, y2] of [[-38, -26, -48, -35], [-42, 1, -55, 2], [37, 9, 50, 15]]) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else if (victory) {
      ctx.fillStyle = PALETTE.gold;
      for (const [x, y, radius] of [[-31, -27, 8], [32, -19, 6]]) {
        ctx.beginPath();
        for (let point = 0; point < 8; point += 1) {
          const r = point % 2 === 0 ? radius : radius * 0.42;
          const angle = -Math.PI / 2 + (point * Math.PI) / 4;
          const px = x + Math.cos(angle) * r;
          const py = y + Math.sin(angle) * r;
          if (point === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (defeat) {
      ctx.strokeStyle = PALETTE.coral;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-24, 32);
      ctx.quadraticCurveTo(-12, 39, 0, 32);
      ctx.quadraticCurveTo(13, 25, 25, 33);
      ctx.stroke();
    }
    ctx.restore();
  }

  // These accents are positioned against the 36 px stock skull. A custom head is
  // a photo of a real person drawn at CUSTOM_HEAD_SCALE, so anything authored for
  // the stock head lands on the player's face: the star sat on an eye. Accents
  // that only make sense as drawn features are dropped for a photo head, and the
  // rest move clear of it. Personality still reads from the torso badge, the
  // cape and the hair bun.
  drawPersonalityFront(ctx, personality) {
    const photoHead = Boolean(this.faceImage);
    if (personality === Personality.DRAMA_QUEEN) {
      const centreX = photoHead ? 88 : 24;
      const centreY = photoHead ? -98 : -40;
      const outer = photoHead ? 16 : 12;
      ctx.fillStyle = PALETTE.gold;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const radius = point % 2 === 0 ? outer : outer * 0.42;
        const angle = -Math.PI * 0.5 + (point * Math.PI) / 5;
        const x = centreX + Math.cos(angle) * radius;
        const y = centreY + Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    if (personality === Personality.ZEN && !photoHead) {
      ctx.strokeStyle = PALETTE.coral;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-28, -25);
      ctx.quadraticCurveTo(0, -17, 28, -25);
      ctx.stroke();
    }
  }

  drawSpeechBubble(ctx, anchorX, anchorY, text) {
    const width = clamp(text.length * 8.2 + 34, 125, 260);
    const x = clamp(anchorX - width * 0.5, 12, WORLD.width - width - 12);
    const y = clamp(anchorY - 36, 18, WORLD.height - 95);
    ctx.save();
    ctx.shadowColor = "rgba(15,10,27,0.30)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    roundedRect(ctx, x, y, width, 39, 16);
    ctx.fillStyle = PALETTE.cream;
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    const pointerX = clamp(anchorX, x + 24, x + width - 24);
    ctx.moveTo(pointerX - 9, y + 36);
    ctx.lineTo(pointerX, y + 50);
    ctx.lineTo(pointerX + 8, y + 36);
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = PALETTE.ink;
    ctx.font = "900 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + width * 0.5, y + 20);
    ctx.restore();
  }

  // Shown only while the next shot is being prepared: during flight it would
  // just clutter the screen the player is reading.
  drawGhostPath(ctx) {
    const aiming = this.model.phase === GamePhase.READY || this.model.phase === GamePhase.AIMING;
    if (!this.ghost || !aiming) return;
    const { path, end, won } = this.ghost;
    ctx.save();
    ctx.setLineDash([3, 13]);
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = won ? "rgba(92, 225, 189, 0.5)" : "rgba(255, 245, 217, 0.42)";
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let index = 1; index < path.length; index += 1) ctx.lineTo(path[index].x, path[index].y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = won ? "rgba(92, 225, 189, 0.75)" : "rgba(255, 96, 120, 0.75)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(end.x, end.y, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end.x - 7, end.y - 7);
    ctx.lineTo(end.x + 7, end.y + 7);
    ctx.moveTo(end.x + 7, end.y - 7);
    ctx.lineTo(end.x - 7, end.y + 7);
    ctx.stroke();
    ctx.restore();
  }

  drawSpeedTrail(ctx) {
    if (this.trail.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    for (let index = 1; index < this.trail.length; index += 1) {
      const previous = this.trail[index - 1];
      const point = this.trail[index];
      const alpha = clamp(1 - point.age / 0.75, 0, 1) * 0.48;
      ctx.strokeStyle = `rgba(255, 245, 217, ${alpha})`;
      ctx.lineWidth = 13 * alpha + 1;
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 211, 95, ${alpha * 0.7})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  }

  spawnDust(x, y, count) {
    for (let index = 0; index < count; index += 1) {
      this.particles.push({
        kind: "circle",
        x: x + (Math.random() - 0.5) * 28,
        y: y + (Math.random() - 0.5) * 20,
        velocity: { x: -70 - Math.random() * 90, y: -25 + (Math.random() - 0.5) * 80 },
        gravity: 50,
        size: 4 + Math.random() * 7,
        color: PALETTE.cream,
        age: 0,
        life: 0.38 + Math.random() * 0.24,
        rotation: 0,
        spin: 0,
      });
    }
  }

  spawnImpact(x, y, count) {
    const colors = [PALETTE.gold, PALETTE.coral, PALETTE.cream, PALETTE.mint];
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 340;
      this.particles.push({
        kind: index % 3 === 0 ? "spark" : "circle",
        x,
        y,
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        gravity: 520,
        size: 4 + Math.random() * 9,
        color: colors[index % colors.length],
        age: 0,
        life: 0.35 + Math.random() * 0.52,
        rotation: angle,
        spin: (Math.random() - 0.5) * 14,
      });
    }
  }

  spawnConfetti(x, y, count) {
    const colors = [PALETTE.gold, PALETTE.coral, PALETTE.mint, PALETTE.violetBright, PALETTE.cream];
    for (let index = 0; index < count; index += 1) {
      const angle = -Math.PI * (0.15 + Math.random() * 0.7);
      const speed = 170 + Math.random() * 460;
      this.particles.push({
        kind: "confetti",
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 35,
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        gravity: 430,
        size: 6 + Math.random() * 8,
        color: colors[index % colors.length],
        age: 0,
        life: 1.2 + Math.random() * 1.3,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 12,
      });
    }
  }

  drawParticles(ctx) {
    ctx.save();
    for (const particle of this.particles) {
      const alpha = clamp(1 - particle.age / particle.life, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      if (particle.kind === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.kind === "spark") {
        ctx.beginPath();
        ctx.moveTo(-particle.size * 1.7, -2);
        ctx.lineTo(particle.size * 1.7, 0);
        ctx.lineTo(-particle.size * 1.7, 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-particle.size * 0.5, -particle.size * 0.8, particle.size, particle.size * 1.6);
        ctx.strokeRect(-particle.size * 0.5, -particle.size * 0.8, particle.size, particle.size * 1.6);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  drawCallouts(ctx) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const callout of this.callouts) {
      const progress = callout.age / callout.life;
      const scale = progress < 0.18 ? lerp(0.55, 1.14, progress / 0.18) : lerp(1.14, 0.92, (progress - 0.18) / 0.82);
      ctx.save();
      ctx.translate(callout.x, callout.y - progress * 27);
      ctx.rotate(callout.angle);
      ctx.scale(scale, scale);
      ctx.globalAlpha = clamp(1 - Math.max(0, progress - 0.67) / 0.33, 0, 1);
      ctx.font = "900 33px Impact, system-ui, sans-serif";
      ctx.lineJoin = "round";
      ctx.lineWidth = 9;
      ctx.strokeStyle = PALETTE.ink;
      ctx.strokeText(callout.text, 0, 0);
      ctx.fillStyle = callout.failure ? PALETTE.coral : PALETTE.gold;
      ctx.fillText(callout.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  drawWorldHints(ctx) {
    if (this.model.phase !== GamePhase.READY) return;
    if (this.model.level.number > 1 && this.model.hintStage < 3) return;
    ctx.save();
    const pulse = 0.72 + Math.sin(this.time * 4) * 0.18;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    ctx.setLineDash([9, 8]);
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    const hintRadius = this.faceImage ? this.model.avatarGrabRadius : this.model.avatarRadius + 15;
    const hintLift = this.faceImage ? -9 : 0;
    ctx.arc(this.model.anchor.x, this.model.anchor.y + hintLift, hintRadius, 0, Math.PI * 2);
    ctx.stroke();

    const tutorial = this.model.level.tutorial;
    const activeHint = this.model.activeHint;
    const showFirstGuide = this.model.mode === GameMode.QUICK && this.model.attempts === 0 && tutorial?.pull;
    const showHintGuide = this.model.hintStage === 3 && activeHint?.pull;
    const pullGuide = showFirstGuide ? tutorial.pull : showHintGuide ? activeHint.pull : null;
    const showPullGuide = Boolean(pullGuide);
    if (showPullGuide) {
      const anchor = this.model.anchor;
      const pull = pullGuide;
      const goal = this.model.goalCentre;
      const goalRadius = this.model.level.goal.shape === "circle" ? this.model.level.goal.radius + 10 : 62;
      ctx.globalAlpha = 0.44 + Math.sin(this.time * 4) * 0.12;
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 6;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, goalRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.86;
      ctx.strokeStyle = PALETTE.coral;
      ctx.lineWidth = 5;
      ctx.setLineDash([11, 9]);
      ctx.beginPath();
      ctx.moveTo(anchor.x - 12, anchor.y + 10);
      ctx.lineTo(pull.x, pull.y);
      ctx.stroke();

      const angle = Math.atan2(pull.y - anchor.y, pull.x - anchor.x);
      ctx.setLineDash([]);
      ctx.fillStyle = PALETTE.coral;
      ctx.beginPath();
      ctx.moveTo(pull.x, pull.y);
      ctx.lineTo(pull.x - Math.cos(angle - 0.55) * 20, pull.y - Math.sin(angle - 0.55) * 20);
      ctx.lineTo(pull.x - Math.cos(angle + 0.55) * 20, pull.y - Math.sin(angle + 0.55) * 20);
      ctx.closePath();
      ctx.fill();

      if (this.model.hintStage >= 3 && activeHint?.pull) {
        const path = this.model.trajectoryForPull(activeHint.pull, 28);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = PALETTE.mint;
        for (let index = 0; index < path.length; index += 1) {
          const dot = path[index];
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, Math.max(3, 7 - index * 0.11), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const travel = 0.12 + ((this.time * 0.58) % 1) * 0.88;
      const fingerX = lerp(anchor.x, pull.x, travel);
      const fingerY = lerp(anchor.y, pull.y, travel);
      ctx.globalAlpha = 0.94 - travel * 0.2;
      ctx.fillStyle = PALETTE.white;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(fingerX, fingerY, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.globalAlpha = showPullGuide ? 0.96 : pulse;
    ctx.fillStyle = PALETTE.cream;
    const labelX = showPullGuide ? 276 : 270;
    const labelWidth = showPullGuide ? 206 : 184;
    roundedRect(ctx, labelX, 342, labelWidth, 40, 17);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = PALETTE.ink;
    ctx.font = `900 ${showPullGuide ? 15 : 11}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const hintText = showPullGuide
      ? showHintGuide
        ? this.model.hintStage >= 3 ? "PEŁNY TOR ODKRYTY" : "KIERUNEK ODKRYTY ↙"
        : "CIĄGNIJ TUTAJ ↙"
      : this.model.canAim()
        ? "ZŁAP · NACIĄGNIJ · PUŚĆ"
        : "NAJPIERW ONE MOVE";
    ctx.fillText(hintText, labelX + labelWidth * 0.5, 362);
    ctx.restore();
  }

  drawVignette(ctx) {
    const gradient = ctx.createRadialGradient(640, 300, 210, 640, 300, 760);
    gradient.addColorStop(0, "rgba(15, 10, 28, 0)");
    gradient.addColorStop(0.73, "rgba(15, 10, 28, 0.03)");
    gradient.addColorStop(1, "rgba(15, 10, 28, 0.28)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }

  drawImageCover(ctx, image, x, y, width, height) {
    const imageRatio = image.width / image.height;
    const targetRatio = width / height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.width;
    let sourceHeight = image.height;
    if (imageRatio > targetRatio) {
      sourceWidth = image.height * targetRatio;
      sourceX = (image.width - sourceWidth) * 0.5;
    } else {
      sourceHeight = image.width / targetRatio;
      sourceY = (image.height - sourceHeight) * 0.5;
    }
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }
}
