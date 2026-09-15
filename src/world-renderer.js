// Lightweight vector art for the travel chapters. Decorative silhouettes stay
// behind the gameplay wash; interactive geometry is drawn by interactions-renderer.
const C = { ink: "#19142d", cream: "#fff5d9", mint: "#5ce1bd", coral: "#ff6078", gold: "#ffd35f", violet: "#a28bff", teal: "#2cae9d" };
const TAU = Math.PI * 2;
// Decoration and gameplay used the same hard ink outline, so a painted parasol
// read exactly like a solid obstacle. Scenery now strokes in a muted tint while
// goals and colliders keep full ink — the outline itself says what is real.
const DECOR_STROKE = "rgba(25, 20, 45, 0.34)";
let outline = C.ink;

// How far past the authored 1280x640 the scenery must reach. A screen wider than
// 2:1 reveals world the scenes never painted; the old answer was a second,
// zoomed, blurred copy of the scene in the margin, which read as a band because
// the SCALE and SHARPNESS broke at the world edge — not because it was darker.
// Bands, gradients and horizons now simply extend, so the picture is one drawing
// from edge to edge. Props stay inside 0..1280: they carry the gameplay reading,
// and the margin does not exist at 2:1 or on an iPad.
let bleed = { left: 0, right: 0, top: 0, bottom: 0 };
export function setSceneBleed(left = 0, right = 0, top = 0, bottom = 0) {
  bleed = { left: Math.max(0, left), right: Math.max(0, right), top: Math.max(0, top), bottom: Math.max(0, bottom) };
}
const spanX = () => -bleed.left;
const spanW = () => 1280 + bleed.left + bleed.right;
// A horizontal band of scenery (sea, quay, floor) drawn across everything visible.
function band(ctx, y, height, fill) { ctx.fillStyle = fill; ctx.fillRect(spanX(), y, spanW(), height); }
// A ground silhouette: the authored profile, carried out flat to both edges and
// closed below the bottom of the screen.
function ground(ctx, points, fill) {
  const first = points[0], last = points[points.length - 1];
  path(ctx, [[spanX(), first[1]], ...points, [spanX() + spanW(), last[1]], [spanX() + spanW(), 640 + bleed.bottom], [spanX(), 640 + bleed.bottom]], fill, 0);
}
function finish(ctx, fill, width = 5, stroke = outline) { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = width; if (width) ctx.stroke(); }
function box(ctx, x, y, w, h, fill, r = 12, width = 5) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); finish(ctx, fill, width); }
function oval(ctx, x, y, rx, ry, fill, width = 5) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); finish(ctx, fill, width); }
function path(ctx, points, fill, width = 5) { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); finish(ctx, fill, width); }
function line(ctx, points, color = C.ink, width = 5) { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
function text(ctx, value, x, y, size = 16, color = C.cream) { ctx.fillStyle = color; ctx.font = `900 ${size}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.fillText(value, x, y); }
function eyes(ctx, x = 0, y = 0, happy = false, size = 5) {
  if (happy) {
    line(ctx, [[x - 17, y + 2], [x - 11, y - 4], [x - 5, y + 2]], C.ink, 4);
    line(ctx, [[x + 5, y + 2], [x + 11, y - 4], [x + 17, y + 2]], C.ink, 4);
  } else { oval(ctx, x - 11, y, size, size + 1, C.ink, 0); oval(ctx, x + 11, y, size, size + 1, C.ink, 0); }
  ctx.beginPath(); ctx.arc(x, y + 9, 10, .1, Math.PI - .1); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
}
function gradient(ctx, top, bottom, height = 586) { const g = ctx.createLinearGradient(0, 0, 0, height); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(spanX(), -bleed.top, spanW(), 640 + bleed.top + bleed.bottom); }
function clouds(ctx, tint = "#fff5d9") { for (const [x, y, r] of [[190, 100, 30], [535, 120, 24], [1050, 105, 35], [-150, 132, 27], [1430, 118, 31]]) { if (x < spanX() - r * 2 || x > spanX() + spanW() + r * 2) continue; oval(ctx, x, y, r * 2, r, tint, 0); oval(ctx, x + 28, y - 12, r, r, tint, 0); } }
function stars(ctx, variant = 0) {
  const seed = 41 + variant * 173, step = 197 + variant * 31;
  const count = Math.round((48 + variant * 3) * (spanW() / 1280));
  for (let i = 0; i < count; i++) {
    const x = spanX() + (i * step + seed) % spanW(), y = -bleed.top + (i * (89 + variant * 7) + 33 + variant * 19) % (460 + bleed.top);
    oval(ctx, x, y, i % 5 ? 1.5 : 3, i % 5 ? 1.5 : 3, "#e3d7ed", 0);
  }
}
// Eight missions share a chapter, so each one gets its own hour of the day and
// its own arrangement of scenery. Without this the whole chapter reads as one
// level replayed eight times.
const pick = (variant, list) => list[variant % list.length];
function waves(ctx, y, tint = "#b2eddf") { const from = Math.floor(spanX() / 95), to = Math.ceil((spanX() + spanW()) / 95); for (let i = from; i < to; i++) { ctx.beginPath(); ctx.moveTo(i * 95, y + i % 2 * 14); ctx.quadraticCurveTo(i * 95 + 22, y - 8, i * 95 + 48, y + 7); ctx.strokeStyle = tint; ctx.lineWidth = 3; ctx.stroke(); } }
function palm(ctx, x, y, lean) {
  line(ctx, [[x, y], [x + lean, y - 120], [x + lean * .8, y - 235]], "#8f6371", 20);
  const px = x + lean * .8, py = y - 235;
  for (const sign of [-1, 1]) for (let n = 0; n < 3; n++) {
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + sign * 100, py - 65 + n * 25, px + sign * (115 - n * 15), py + n * 26); ctx.quadraticCurveTo(px + sign * 50, py - 14, px, py); finish(ctx, "#4c9d8b", 3);
  }
}
function coral(ctx, x, y, color, size = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size); ctx.lineCap = "round";
  line(ctx, [[0, 0], [0, -110], [18, -140]], color, 17);
  line(ctx, [[0, -45], [-37, -65], [-42, -105]], color, 14);
  line(ctx, [[0, -70], [40, -93], [43, -130]], color, 12); ctx.restore();
}
function fish(ctx, x, y, scale, color, happy = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  path(ctx, [[35, -5], [70, -32], [70, 30]], color);
  oval(ctx, 0, 0, 46, 30, color); path(ctx, [[-8, -23], [8, -47], [23, -19]], color, 3);
  eyes(ctx, -12, -3, happy, 4); ctx.restore();
}
export function drawCampaignScene(ctx, level) {
  const variant = level.visual?.variant ?? 0, scene = level.scene;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  outline = DECOR_STROKE;
  if (scene === "beach") {
    const [skyTop, skyBottom, sand] = pick(variant, [
      ["#73cfdc", "#efd6b9", "#dfb884"], ["#8ed9e3", "#f4e0c6", "#e5c091"],
      ["#e59a83", "#f6d3a6", "#d7ab7c"], ["#5fbcd5", "#e9d0b0", "#dab57f"],
    ]);
    gradient(ctx, skyTop, skyBottom); clouds(ctx);
    const sunX = pick(variant, [1140, 960, 240, 1210]), sunY = pick(variant, [135, 96, 168, 118]);
    oval(ctx, sunX, sunY, 55, 55, "#ffe4a0", 0);
    const seaTop = 325 + pick(variant, [0, 16, -12, 8]);
    band(ctx, seaTop, 555 - seaTop, "#499fab"); waves(ctx, seaTop + 35); waves(ctx, seaTop + 84);
    path(ctx, [[0, 480], [260, 452], [560, 486], [830, 470], [1280, 480], [1280, 640], [0, 640]], sand, 0);
    for (const [x, y, lean] of pick(variant, [
      [[1200, 480, -40], [72, 400, 25]], [[1160, 492, -26], [118, 414, 18], [995, 470, -14]],
      [[60, 396, 30]], [[1215, 474, -44], [150, 420, 22]],
    ])) palm(ctx, x, y, lean);
    const hutX = pick(variant, [915, 840, 960, 890]);
    // Decorative words sit at gameplay altitude and compete for the player's
    // reading, so the hut keeps its silhouette and loses its sign.
    box(ctx, hutX, 355, 155, 125, "#b77882", 7, 3); path(ctx, [[hutX - 20, 355], [hutX + 75, 302], [hutX + 170, 355]], "#e9c18e", 3);
    line(ctx, [[hutX + 30, 400], [hutX + 125, 400]], "#96616e", 5); line(ctx, [[hutX + 30, 432], [hutX + 125, 432]], "#96616e", 5);
    const parasolX = 215 + variant * 26;
    line(ctx, [[parasolX + 65, 465], [parasolX + 95, 350]], "#ad7880", 7);
    path(ctx, [[parasolX, 360], [parasolX + 95, 305], [parasolX + 165, 375]], "#b690ad", 3);
  } else if (scene === "reef" || scene === "wreck") {
    const [top, bottom] = scene === "reef"
      ? pick(variant, [["#469fac", "#366b8c"], ["#3f95a8", "#2f6285"], ["#52a8b0", "#3b7390"], ["#3c8ea3", "#2b5b80"]])
      : pick(variant, [["#4a769b", "#3c416c"], ["#436c92", "#353a64"], ["#517fa3", "#424775"], ["#3d6489", "#31365d"]]);
    gradient(ctx, top, bottom);
    ctx.globalAlpha = .09;
    const shaftLean = pick(variant, [195, 150, 245, 120]);
    for (let i = 0; i < 5; i++) path(ctx, [[i * 310 - variant * 18, 0], [i * 310 + 95 - variant * 18, 0], [i * 310 + shaftLean + 95, 586], [i * 310 + shaftLean, 586]], C.cream, 0);
    ctx.globalAlpha = 1;
    ground(ctx, [[200, 535], [425, 568], [765, 544], [1030, 556]], "#9b9190");
    for (const [x, y, tint, size] of pick(variant, [
      [[80, 555, "#9f688c", 1.3], [1180, 550, "#bc867e", 1.55], [930, 576, "#5d9b99", .8]],
      [[145, 560, "#bc867e", 1.1], [1215, 545, "#9f688c", 1.4]],
      [[40, 548, "#5d9b99", 1.5], [1100, 566, "#9f688c", .95], [835, 572, "#bc867e", 1.15]],
      [[210, 570, "#9f688c", .9], [1240, 552, "#5d9b99", 1.45]],
    ])) coral(ctx, x, y, tint, size);
    for (let i = 0; i < 18; i++) oval(ctx, (i * (109 + variant * 13) + 47) % 1280, (i * 67 + 100 + variant * 23) % 540, 5 + i % 6, 5 + i % 6, "#83b5bd", 1);
    if (scene === "wreck") {
      ctx.save(); ctx.translate(615 + pick(variant, [0, -70, 55, -25]), 395); ctx.rotate(pick(variant, [-.08, .06, -.13, .02]));
      box(ctx, -230, -195, 460, 345, "#6f6487", 25, 4);
      for (const x of [-145, 0, 145]) { box(ctx, x - 43, -120, 86, 100, "#3a4c72", 22, 4); oval(ctx, x, -68, 24, 24, "#4e8998", 2); }
      box(ctx, -87, -184, 174, 42, "#b28d92", 9, 3); text(ctx, "HOTEL PLUMS", 0, -157, 17, "#3d345e");
      line(ctx, [[-255, 135], [255, 135]], "#a18a88", 14); ctx.restore();
    } else {
      const shoal = pick(variant, [4, 6, 3, 5]);
      for (let i = 0; i < shoal; i++) fish(ctx, 350 + i * 145 - variant * 22, 130 + i % 2 * 50 + variant * 9, .35, "#79a6ad");
      path(ctx, [[370, 568], [440, 465], [530, 565], [650, 485], [730, 580]], "#618a98", 3);
    }
  } else if (scene === "harbour") {
    const [skyTop, skyBottom] = pick(variant, [["#a69ac6", "#efc0ac"], ["#9a8fc0", "#e8b6a4"], ["#b3a4cd", "#f5d0b6"], ["#8d84b6", "#dfa896"]]);
    gradient(ctx, skyTop, skyBottom); clouds(ctx, "#e6d2db");
    const quay = 397 + pick(variant, [0, 14, -10, 6]);
    band(ctx, quay, 586 - quay, "#6d9cac"); waves(ctx, quay + 28); waves(ctx, quay + 68);
    const stackBase = pick(variant, [650, 590, 700, 630]);
    for (let i = 0; i < pick(variant, [3, 4, 2, 3]); i++) { box(ctx, stackBase + i * 165, 350 - i % 2 * 82, 153, 145, ["#9689ae", "#b88f91", "#819da6", "#a08fa6"][i % 4], 3, 3); for (let x = stackBase + 15 + i * 165; x < stackBase + 140 + i * 165; x += 23) line(ctx, [[x, 360 - i % 2 * 82], [x, 480 - i % 2 * 82]], "#6a6287", 2); }
    const craneX = pick(variant, [320, 245, 395, 290]);
    line(ctx, [[craneX, 505], [craneX, 125], [craneX + 410, 125]], "#99848e", 20); line(ctx, [[craneX + 2, 150], [craneX + 190, 126]], "#665974", 5);
    line(ctx, [[craneX + 330, 125], [craneX + 330, 250]], "#625770", 4); box(ctx, craneX + 315, 245, 30, 40, "#b99b8b", 7, 3);
    band(ctx, 542, 98, "#b08f89");
    for (let i = 0; i < 16; i++) line(ctx, [[i * 90, 545], [i * 90 - 25, 640]], "#8b727e", 3);
  } else if (scene === "fairground") {
    const [skyTop, skyBottom] = pick(variant, [["#70659d", "#d194a7"], ["#655b93", "#c489a0"], ["#7d71a8", "#dba0ad"], ["#5c5389", "#b87e98"]]);
    gradient(ctx, skyTop, skyBottom);
    const wheelX = pick(variant, [910, 985, 845, 930]), wheelY = pick(variant, [283, 246, 310, 265]), wheelR = pick(variant, [175, 150, 196, 163]);
    ctx.strokeStyle = "#9f96ba"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(wheelX, wheelY, wheelR, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + variant * .19; line(ctx, [[wheelX, wheelY], [wheelX + Math.cos(a) * wheelR, wheelY + Math.sin(a) * wheelR]], "#9186ab", 5); box(ctx, wheelX - 18 + Math.cos(a) * wheelR, wheelY - 10 + Math.sin(a) * wheelR, 40, 48, "#b69ba8", 10, 3); }
    line(ctx, [[wheelX - 85, 540], [wheelX, wheelY], [wheelX + 90, 540]], "#8d7fa0", 13);
    const tentX = pick(variant, [185, 120, 240, 160]);
    path(ctx, [[tentX, 515], [tentX + 45, 340], [tentX + 330, 340], [tentX + 370, 515]], "#ae839e", 4);
    path(ctx, [[tentX, 345], [tentX + 180, 165], [tentX + 375, 345]], "#ba9ab2", 4);
    path(ctx, [[tentX + 130, 340], [tentX + 180, 180], [tentX + 235, 340]], "#c6b0a1", 0);
    box(ctx, tentX + 135, 413, 85, 102, "#665375", 35, 3);
    line(ctx, [[spanX(), 115], [spanX() + spanW(), 140]], "#81748f", 3);
    for (let i = 0; i < 18; i++) path(ctx, [[i * 78 - variant * 9, 116 + i], [i * 78 + 50 - variant * 9, 117 + i], [i * 78 + 23 - variant * 9, 150 + i]], (i + variant) % 2 ? "#bea290" : "#a883a4", 0);
    band(ctx, 552, 88, "#80657e");
  } else if (["spaceport", "moon", "station", "comet"].includes(scene)) {
    gradient(ctx, scene === "spaceport" ? pick(variant, ["#78669b", "#6d5c92", "#8271a4", "#63548a"]) : pick(variant, ["#30284e", "#2a2346", "#372e57", "#251f40"]), scene === "moon" ? "#635576" : "#605281");
    stars(ctx, variant);
    const moonX = pick(variant, [1120, 205, 940, 1180]), moonY = pick(variant, [140, 112, 175, 96]), moonR = pick(variant, [80, 62, 95, 71]);
    oval(ctx, moonX, moonY, moonR, moonR, "#89799b", 0); oval(ctx, moonX - moonR * .25, moonY - moonR * .25, moonR * .2, moonR * .13, "#75668e", 0);
    if (scene === "spaceport") {
      const rocketX = pick(variant, [670, 600, 720, 645]);
      box(ctx, rocketX, 185, 112, 350, "#a993a9", 45, 4); path(ctx, [[rocketX, 215], [rocketX + 55, 112], [rocketX + 112, 215]], "#b2849e", 4);
      path(ctx, [[rocketX + 4, 415], [rocketX - 45, 520], [rocketX + 11, 500]], "#ad8398", 3); path(ctx, [[rocketX + 105, 415], [rocketX + 155, 520], [rocketX + 100, 500]], "#ad8398", 3);
      oval(ctx, rocketX + 56, 300, 28, 35, "#667891", 4);
      const gantryX = pick(variant, [430, 360, 475, 405]);
      line(ctx, [[gantryX, 540], [gantryX, 155], [gantryX + 150, 155], [gantryX + 150, 540]], "#8f819c", 12);
      for (let y = 175; y < 515; y += 65) line(ctx, [[gantryX, y], [gantryX + 150, y + 65], [gantryX, y + 65]], "#8f819c", 4);
      band(ctx, 542, 98, "#968396");
    } else if (scene === "station") {
      const hullTop = pick(variant, [125, 108, 142, 118]);
      box(ctx, 35, hullTop, 1210, 395, "#51466c", 45, 5);
      for (let i = 0; i < 4; i++) { box(ctx, 85 + i * 302 - variant * 7, hullTop + 33, 234, 202, "#352e54", 28, 6); oval(ctx, 150 + i * 302 - variant * 7, hullTop + 110, 30, 30, pick(variant, ["#827099", "#8d7ba3", "#7a698f", "#93809f"]), 0); }
      box(ctx, pick(variant, [340, 275, 400, 315]), 425, 575, 89, "#716582", 15, 4);
      for (let i = 0; i < 7; i++) { oval(ctx, 380 + i * 80, 452, 7, 7, (i + variant) % 2 ? "#a09487" : "#839c98", 0); line(ctx, [[370 + i * 80, 480], [400 + i * 80, 480]], "#9b8c9c", 4); }
      band(ctx, 553, 87, "#675774");
    } else {
      ground(ctx, [[165, 515], [380, 550], [545, 530], [840, 560], [1100, 535]], "#928198");
      for (let i = 0; i < 8; i++) oval(ctx, 80 + i * 170 - variant * 14, 573 + i % 2 * 30, 48 - variant * 2, 11, "#75617f", 2);
      if (scene === "comet") {
        const cometX = pick(variant, [505, 415, 590, 460]), cometY = pick(variant, [140, 108, 172, 124]);
        path(ctx, [[cometX - 35, cometY + 15], [cometX - 375, cometY - 52], [cometX - 5, cometY - 25]], "#887dad", 0);
        oval(ctx, cometX, cometY, 44, 23, "#bca4a1", 3);
      } else {
        const flagX = pick(variant, [308, 235, 380, 275]);
        line(ctx, [[flagX, 545], [flagX, 347]], "#aa929c", 5); path(ctx, [[flagX + 2, 350], [flagX + 83, 355], [flagX + 62, 405], [flagX + 2, 399]], "#b695a1", 3);
      }
    }
  } else { outline = C.ink; ctx.restore(); return false; }
  outline = C.ink;
  ctx.restore(); return true;
}

const GOALS = new Set(["sandwich", "umbrella", "buoy", "suitcase", "bottle", "fish", "shell", "octopus", "treasure", "submarine", "ticket", "balloon", "bear", "rocket", "helmet", "flag", "satellite", "alien", "bell"]);
export function drawCampaignGoal(ctx, model, time, pulse = 0) {
  const kind = model.level.goal.kind;
  if (!GOALS.has(kind)) return false;
  const happy = model.phase === "succeeded", pos = model.goalCentre;
  ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(Math.sin(time * 3) * .025 + (happy ? Math.sin(pulse * 12) * pulse * .12 : 0));
  const size = .9 + pulse * .12; ctx.scale(size, size); ctx.lineCap = "round"; ctx.lineJoin = "round";
  oval(ctx, 0, 61, 62, 10, "rgba(25,20,45,.18)", 0);
  if (kind === "sandwich") {
    box(ctx, -55, -36, 110, 88, "#da8d69", 22); box(ctx, -59, -30, 118, 65, C.cream, 22);
    path(ctx, [[-59, 18], [-36, 27], [-8, 16], [17, 28], [59, 17], [59, 31], [-59, 37]], C.mint, 3);
    line(ctx, [[-52, 40], [49, 40]], C.coral, 8); eyes(ctx, 0, -4, happy);
  } else if (kind === "umbrella") {
    line(ctx, [[0, -35], [0, 58], [20, 58], [25, 43]], C.gold, 7);
    ctx.beginPath(); ctx.arc(0, 0, 63, Math.PI, 0); ctx.closePath(); finish(ctx, C.coral);
    path(ctx, [[0, -62], [-23, -1], [23, -1]], C.cream, 3); eyes(ctx, 0, -24, happy, 4);
  } else if (kind === "buoy") {
    oval(ctx, 0, 0, 62, 62, C.cream); oval(ctx, 0, 0, 31, 31, "#4cb8c5");
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 2); box(ctx, -15, -61, 30, 29, C.coral, 6, 3); ctx.restore(); }
    eyes(ctx, 0, -3, happy, 3);
  } else if (kind === "suitcase") {
    box(ctx, -23, -65, 46, 23, C.gold, 8); box(ctx, -62, -44, 124, 96, C.violet, 17);
    box(ctx, -40, -44, 10, 96, C.gold, 4, 2); box(ctx, 30, -44, 10, 96, C.gold, 4, 2);
    eyes(ctx, 0, -2, happy, 4); oval(ctx, -40, 57, 8, 8, C.ink, 0); oval(ctx, 40, 57, 8, 8, C.ink, 0);
  } else if (kind === "bottle") {
    box(ctx, -16, -68, 32, 38, C.mint, 7); box(ctx, -36, -35, 72, 90, C.mint, 24); box(ctx, -20, -77, 40, 18, "#d99b6e", 4, 3);
    box(ctx, -29, -9, 58, 43, C.cream, 5, 2); eyes(ctx, 0, 3, happy, 3);
  } else if (kind === "fish") fish(ctx, 0, 0, 1.1, C.gold, happy);
  else if (kind === "shell") {
    ctx.beginPath(); ctx.moveTo(0, 47); ctx.bezierCurveTo(-96, 0, -60, -77, 0, -46); ctx.bezierCurveTo(60, -77, 96, 0, 0, 47); finish(ctx, C.coral);
    for (const x of [-35, -15, 15, 35]) line(ctx, [[0, 42], [x, -38]], "#f59eaa", 3);
    eyes(ctx, 0, -7, happy, 4); oval(ctx, 0, 44, 23, 13, C.gold, 3);
  } else if (kind === "octopus" || kind === "alien" || kind === "bear") {
    if (kind === "octopus") for (let i = 0; i < 8; i++) { const x = -49 + i * 14; line(ctx, [[x * .65, 24], [x, 52 + Math.sin(time * 4 + i) * (happy ? 14 : 4)], [x + 6, 42]], C.ink, 16); line(ctx, [[x * .65, 24], [x, 52 + Math.sin(time * 4 + i) * (happy ? 14 : 4)], [x + 6, 42]], C.violet, 10); }
    if (kind === "bear") { oval(ctx, -38, -45, 20, 20, "#d69a75"); oval(ctx, 38, -45, 20, 20, "#d69a75"); oval(ctx, 0, 35, 38, 30, "#d69a75"); }
    if (kind === "alien") { line(ctx, [[-20, -40], [-32, -65]], C.ink, 5); line(ctx, [[20, -40], [32, -65]], C.ink, 5); oval(ctx, -32, -65, 7, 7, C.gold, 3); oval(ctx, 32, -65, 7, 7, C.gold, 3); }
    oval(ctx, 0, -5, 49, 49, kind === "octopus" ? C.violet : kind === "alien" ? C.mint : "#edb48b"); eyes(ctx, 0, -9, happy, kind === "alien" ? 8 : 5);
    if (kind === "bear") { oval(ctx, 0, 12, 14, 10, C.cream, 2); oval(ctx, 0, 6, 6, 4, C.ink, 0); }
    if (kind === "octopus") { box(ctx, -28, -60, 56, 18, C.gold, 5, 3); text(ctx, "HOTEL", 0, -47, 10, C.ink); }
  } else if (kind === "treasure") {
    box(ctx, -62, -40, 124, 94, "#c78664", 17); box(ctx, -67, -45, 134, 45, C.gold, 17);
    box(ctx, -14, -10, 28, 34, C.cream, 6, 3); eyes(ctx, 0, 17, happy, 4); text(ctx, "SKARB (PODOBNO)", 0, -18, 10, C.ink);
  } else if (kind === "submarine") {
    line(ctx, [[0, -33], [0, -65], [25, -65]], C.ink, 13); line(ctx, [[0, -33], [0, -65], [25, -65]], C.gold, 7);
    oval(ctx, 0, 4, 78, 43, C.gold); oval(ctx, -20, 0, 26, 26, C.mint, 5); eyes(ctx, -20, -5, happy, 4); box(ctx, 68, -19, 24, 48, C.coral, 8);
    line(ctx, [[-12, 55], [44, 55]], C.ink, 6);
  } else if (kind === "ticket") {
    box(ctx, -64, -39, 128, 78, C.gold, 9); line(ctx, [[30, -32], [30, 32]], "#b08762", 3);
    for (let i = 0; i < 5; i++) oval(ctx, -63, -29 + i * 14, 4, 4, C.cream, 0);
    eyes(ctx, -10, -8, happy, 4); text(ctx, "JEDEN LOT", -8, 29, 11, C.ink);
  } else if (kind === "balloon") {
    ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(25, 55, -15, 65, 10, 82); ctx.strokeStyle = C.cream; ctx.lineWidth = 3; ctx.stroke();
    oval(ctx, 0, -15, 44, 57, C.coral); path(ctx, [[0, 33], [-8, 48], [10, 48]], C.coral, 3); eyes(ctx, 0, -20, happy, 4);
  } else if (kind === "rocket") {
    if (happy) path(ctx, [[-21, 52], [0, 95 + Math.sin(time * 18) * 15], [21, 52]], C.gold, 3);
    path(ctx, [[-32, 6], [-63, 56], [-30, 47]], C.coral); path(ctx, [[32, 6], [63, 56], [30, 47]], C.coral);
    box(ctx, -32, -50, 64, 109, C.cream, 25); path(ctx, [[-32, -33], [0, -85], [32, -33]], C.coral);
    oval(ctx, 0, -5, 24, 26, C.mint, 4); eyes(ctx, 0, -8, happy, 3); line(ctx, [[-21, 52], [21, 52]], C.violet, 7);
  } else if (kind === "helmet") {
    oval(ctx, 0, -1, 57, 59, C.cream); oval(ctx, 0, -3, 43, 41, C.mint); eyes(ctx, 0, -9, happy); box(ctx, -38, 40, 76, 22, C.violet, 7); oval(ctx, 48, -10, 12, 20, C.gold, 4);
  } else if (kind === "flag") {
    line(ctx, [[-20, 62], [-20, -69]], C.ink, 7); path(ctx, [[-17, -66], [66, -50], [48, -10], [-17, -23]], C.coral); eyes(ctx, 19, -44, happy, 3); oval(ctx, -20, 61, 43, 11, C.violet, 3);
  } else if (kind === "satellite") {
    for (const sign of [-1, 1]) { box(ctx, sign < 0 ? -95 : 38, -30, 57, 65, C.violet, 5, 4); for (let i = 1; i < 3; i++) line(ctx, [[sign < 0 ? -95 : 38, -30 + i * 21], [sign < 0 ? -38 : 95, -30 + i * 21]], C.cream, 2); }
    box(ctx, -33, -35, 66, 77, C.cream, 14); eyes(ctx, 0, -6, happy, 4); line(ctx, [[0, -38], [14, -64]], C.ink, 5); oval(ctx, 15, -67, 9, 9, C.gold, 3);
  } else if (kind === "bell") {
    oval(ctx, 0, -56, 12, 12, C.gold, 4); path(ctx, [[-24, -47], [24, -47], [40, 27], [55, 43], [-55, 43], [-40, 27]], C.gold); oval(ctx, 0, 51, 13, 10, C.coral, 3); eyes(ctx, 0, -5, happy, 4);
  }
  ctx.restore(); return true;
}

export function drawWorldCompanion(ctx, model, time) {
  if (!model.level.chapterId || model.level.number < 9) return;
  const id = model.level.chapterId, happy = model.phase === "succeeded";
  const x = 290, y = 558 - (happy ? Math.abs(Math.sin(time * 9)) * 13 : 0);
  ctx.save(); ctx.globalAlpha = .8;
  if (id === "reef" || id === "wreck") fish(ctx, x, 180 + Math.sin(time * 1.8) * 9, .44, C.coral, happy);
  else {
    ctx.translate(x, y); ctx.rotate(model.phase === "failed" ? .15 : Math.sin(time * 2) * .025);
    oval(ctx, 0, 10, 33, 20, id === "beach" || id === "harbour" ? C.gold : C.mint, 3);
    oval(ctx, 13, -9, 22, 22, id === "beach" || id === "harbour" ? C.gold : C.mint, 3);
    if (id === "beach" || id === "harbour") { oval(ctx, 34, -5, 12, 7, C.coral, 3); box(ctx, -6, -32, 38, 8, C.cream, 3, 2); }
    else { line(ctx, [[2, -24], [-3, -41]], C.ink, 3); oval(ctx, -3, -42, 5, 5, C.gold, 2); }
    oval(ctx, 17, -12, 3, happy ? 1 : 4, C.ink, 0);
    // A tiny mug is dropped on a miss and raised on success: a visual punchline.
    box(ctx, happy ? -23 : -38, happy ? -23 : model.phase === "failed" ? 18 : 0, 18, 19, C.cream, 5, 2);
  }
  ctx.restore();
}
