// The scenes were frozen.
//
// `drawCampaignScene(ctx, level)` never took a clock, so in every one of the
// 88 boards the sky, the sea and the room were a still picture: only the target
// and the companion moved. On the sparser scenes — the moon, the station — the
// right-hand half of the board held a flat colour and one crater.
//
// This is the layer that breathes: motes drifting through a bedroom, bubbles
// rising off a reef, gulls gliding over a beach, satellites crossing a station
// window. It is decoration and nothing else — no collider, no physics, no
// state. The flight cannot touch it and it cannot touch the flight.
//
// Three rules it obeys, because the brief does:
//
//   * "Tło ma niższy kontrast niż obiekt interaktywny." Every element is
//     drawn below a measured contrast ceiling against its own scene, so a mote
//     can never be mistaken for a prop. tests/scene-life.test.mjs holds it.
//   * No allocation per frame. The elements are generated once per scene from
//     a seed and then only read; a frame does arithmetic, not `new`.
//   * Deterministic. Same scene, same clock, same picture — replays and the
//     offline renders have to agree with the game.

const TAU = Math.PI * 2;

// A tiny deterministic hash, so a scene's life is stable across reloads and
// identical in the browser and in the offline renderer.
const hash = (seed, salt) => {
  let value = (seed * 374761393 + salt * 668265263) >>> 0;
  value = ((value ^ (value >>> 13)) * 1274126177) >>> 0;
  return (value ^ (value >>> 16)) / 4294967296;
};

// depth 0 is far away — small, faint and slow; 1 is close. Nothing here moves
// fast enough to pull the eye off the hero.
//
// The tint follows the board, not the taste: a measured mean luminance of every
// scene's own painting splits them in two. On a bright board (laundry 161,
// beach 162, kitchen 174) a cream mote is invisible, so those scenes get INK
// specks; on a dark one (moon 57, station 56, bedroom 83) they get light ones.
// Painting cream on cream was the first version of this file and it showed up
// in the renders as nothing at all.
const INK = "25, 20, 45";
const LIFE = Object.freeze({
  bedroom: [
    { kind: "mote", count: 26, depth: 0.3, speed: 9, band: [60, 560], size: [1.6, 3.4], tint: "255, 245, 217" },
    { kind: "mote", count: 9, depth: 0.7, speed: 17, band: [120, 480], size: [2.4, 4.6], tint: "255, 245, 217" },
  ],
  laundry: [
    { kind: "mote", count: 22, depth: 0.3, speed: 11, band: [70, 540], size: [1.8, 3.6], tint: INK },
    { kind: "bubble", count: 7, depth: 0.6, speed: 21, band: [330, 570], size: [3, 6], tint: INK },
  ],
  beach: [
    { kind: "gull", count: 4, depth: 0.4, speed: 26, band: [65, 200], size: [8, 13], tint: INK },
    { kind: "mote", count: 14, depth: 0.5, speed: 15, band: [200, 520], size: [1.6, 3], tint: INK },
  ],
  reef: [
    { kind: "bubble", count: 22, depth: 0.35, speed: 26, band: [320, 620], size: [2.4, 5.5], tint: "205, 245, 255" },
    { kind: "fish", count: 5, depth: 0.6, speed: 19, band: [140, 480], size: [5, 9], tint: "255, 176, 120" },
  ],
  wreck: [
    { kind: "bubble", count: 19, depth: 0.3, speed: 22, band: [320, 620], size: [2.2, 5], tint: "205, 245, 255" },
    { kind: "fish", count: 4, depth: 0.55, speed: 16, band: [150, 460], size: [5, 8], tint: "160, 225, 255" },
  ],
  harbour: [
    { kind: "gull", count: 4, depth: 0.4, speed: 22, band: [60, 205], size: [7, 12], tint: INK },
    { kind: "mote", count: 12, depth: 0.5, speed: 13, band: [230, 520], size: [1.8, 3.2], tint: INK },
  ],
  fairground: [
    { kind: "balloon", count: 6, depth: 0.4, speed: 17, band: [390, 600], size: [6, 11], tint: "255, 150, 190" },
    { kind: "spark", count: 18, depth: 0.6, speed: 12, band: [60, 300], size: [1.8, 3.4], tint: "255, 211, 95" },
  ],
  spaceport: [
    { kind: "spark", count: 36, depth: 0.25, speed: 8, band: [40, 430], size: [1.6, 3.2], tint: "255, 245, 217" },
    { kind: "spark", count: 12, depth: 0.55, speed: 13, band: [40, 360], size: [2.6, 4.8], tint: "255, 245, 217" },
    { kind: "satellite", count: 2, depth: 0.6, speed: 24, band: [70, 240], size: [5, 8], tint: "200, 220, 255" },
  ],
  moon: [
    { kind: "spark", count: 44, depth: 0.22, speed: 6, band: [30, 430], size: [1.6, 3.4], tint: "255, 245, 217" },
    { kind: "spark", count: 14, depth: 0.55, speed: 11, band: [40, 380], size: [2.6, 5], tint: "255, 245, 217" },
    { kind: "satellite", count: 2, depth: 0.6, speed: 21, band: [60, 220], size: [5, 8], tint: "200, 220, 255" },
    { kind: "dust", count: 14, depth: 0.5, speed: 14, band: [470, 580], size: [2.4, 5], tint: "228, 214, 230" },
  ],
  station: [
    { kind: "spark", count: 38, depth: 0.25, speed: 7, band: [40, 440], size: [1.6, 3.2], tint: "255, 245, 217" },
    { kind: "mote", count: 18, depth: 0.6, speed: 12, band: [120, 540], size: [2.2, 4.2], tint: "210, 235, 255" },
  ],
  "living-room": [
    { kind: "mote", count: 21, depth: 0.3, speed: 10, band: [70, 540], size: [1.7, 3.4], tint: INK },
    { kind: "mote", count: 8, depth: 0.65, speed: 16, band: [140, 470], size: [2.3, 4.4], tint: INK },
  ],
  kitchen: [
    { kind: "mote", count: 18, depth: 0.3, speed: 12, band: [70, 520], size: [1.8, 3.6], tint: INK },
    { kind: "bubble", count: 6, depth: 0.55, speed: 23, band: [330, 550], size: [3, 6], tint: INK },
  ],
  garden: [
    { kind: "mote", count: 20, depth: 0.35, speed: 13, band: [90, 540], size: [1.8, 3.6], tint: INK },
    { kind: "gull", count: 2, depth: 0.55, speed: 24, band: [60, 170], size: [6, 9], tint: INK },
  ],
  park: [
    { kind: "gull", count: 3, depth: 0.3, speed: 23, band: [60, 190], size: [6, 10], tint: INK },
    { kind: "mote", count: 16, depth: 0.5, speed: 14, band: [180, 530], size: [1.8, 3.4], tint: INK },
  ],
  lake: [
    { kind: "gull", count: 3, depth: 0.3, speed: 25, band: [60, 180], size: [6, 10], tint: INK },
    { kind: "bubble", count: 12, depth: 0.5, speed: 20, band: [430, 590], size: [2.4, 5], tint: INK },
  ],
  comet: [
    { kind: "spark", count: 40, depth: 0.25, speed: 9, band: [30, 430], size: [1.6, 3.4], tint: "255, 245, 217" },
    { kind: "spark", count: 12, depth: 0.5, speed: 14, band: [40, 340], size: [2.6, 4.6], tint: "255, 245, 217" },
    { kind: "streak", count: 4, depth: 0.6, speed: 46, band: [60, 320], size: [12, 24], tint: "255, 245, 217" },
  ],
});

// Built once per scene, then only read.
const built = new Map();
function elementsFor(scene) {
  if (built.has(scene)) return built.get(scene);
  const flocks = LIFE[scene] ?? LIFE.bedroom;
  const seed = [...scene].reduce((sum, letter) => sum + letter.charCodeAt(0), scene.length);
  const items = [];
  for (const [flockIndex, flock] of flocks.entries()) {
    for (let i = 0; i < flock.count; i += 1) {
      const salt = flockIndex * 977 + i;
      items.push({
        kind: flock.kind,
        depth: flock.depth,
        tint: flock.tint,
        offset: hash(seed, salt) * 2400,
        y: flock.band[0] + hash(seed, salt + 31) * (flock.band[1] - flock.band[0]),
        size: flock.size[0] + hash(seed, salt + 57) * (flock.size[1] - flock.size[0]),
        speed: flock.speed * (0.7 + hash(seed, salt + 83) * 0.6),
        sway: 6 + hash(seed, salt + 109) * 22,
        phase: hash(seed, salt + 131) * TAU,
      });
    }
  }
  built.set(scene, items);
  return items;
}

// Far things are fainter as well as slower: that is the whole depth cue on a
// board whose camera never moves.
const alphaFor = (depth) => 0.14 + depth * 0.3;

function drawOne(ctx, item, x, y) {
  const { kind, size } = item;
  ctx.beginPath();
  if (kind === "gull") {
    // Two strokes of a wing, the cheapest bird that still reads as one.
    ctx.moveTo(x - size, y);
    ctx.quadraticCurveTo(x - size * 0.4, y - size * 0.75, x, y);
    ctx.quadraticCurveTo(x + size * 0.4, y - size * 0.75, x + size, y);
    ctx.lineWidth = Math.max(1.2, size * 0.22);
    ctx.stroke();
    return;
  }
  if (kind === "fish") {
    ctx.ellipse(x, y, size, size * 0.62, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + size * 0.9, y);
    ctx.lineTo(x + size * 1.7, y - size * 0.55);
    ctx.lineTo(x + size * 1.7, y + size * 0.55);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (kind === "balloon") {
    ctx.ellipse(x, y, size * 0.8, size, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x, y + size * 2.1);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    return;
  }
  if (kind === "satellite") {
    ctx.rect(x - size * 0.5, y - size * 0.35, size, size * 0.7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - size * 1.6, y);
    ctx.lineTo(x + size * 1.6, y);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    return;
  }
  if (kind === "streak") {
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y + size * 0.42);
    ctx.lineWidth = Math.max(1.3, size * 0.16);
    ctx.stroke();
    return;
  }
  // mote, bubble, spark, dust
  ctx.arc(x, y, size, 0, TAU);
  if (kind === "bubble") {
    ctx.lineWidth = Math.max(1, size * 0.35);
    ctx.stroke();
    return;
  }
  ctx.fill();
}

// `span` is the visible world strip, which is wider than 1280 whenever the
// screen reveals more of it — the life has to fill what the player can see,
// not the nominal world.
export function drawSceneLife(ctx, scene, time, span = { left: 0, width: 1280 }) {
  const items = elementsFor(scene);
  const width = span.width + 160;
  ctx.save();
  ctx.lineCap = "round";
  for (const item of items) {
    const travel = item.offset + time * item.speed * (0.4 + item.depth);
    const x = span.left - 80 + ((travel % width) + width) % width;
    // Rising things rise; everything else sways.
    const rising = item.kind === "bubble" || item.kind === "balloon";
    const drift = rising ? -((time * item.speed * 0.9 + item.offset) % 320) : 0;
    const y = item.y + drift + Math.sin(time * 0.6 + item.phase) * item.sway * (rising ? 0.25 : 1);
    const alpha = alphaFor(item.depth) * (rising ? Math.max(0.15, 1 - Math.abs(drift) / 320) : 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(${item.tint}, 1)`;
    ctx.strokeStyle = `rgba(${item.tint}, 1)`;
    drawOne(ctx, item, x, y);
  }
  ctx.restore();
}

// Exposed so the tests can hold the contrast ceiling and the element budget.
export const sceneLifeElements = elementsFor;
export const SCENE_LIFE_ALPHA = alphaFor;
export const SCENE_LIFE_SCENES = Object.keys(LIFE);
