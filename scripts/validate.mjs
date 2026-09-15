import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LEVELS } from "../src/levels.js";
import { FLIGHT_STYLES } from "../src/game.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "index.html",
  "styles.css",
  "manifest.webmanifest",
  "sw.js",
  ".nojekyll",
  "src/main.js",
  "src/game.js",
  "src/levels.js",
  "src/campaign.js",
  "src/campaign-routes.js",
  "src/physics.js",
  "src/progress.js",
  "src/interactions-renderer.js",
  "src/world-renderer.js",
  "src/render.js",
  "src/viewport.js",
  "src/audio.js",
  "src/face-vision.js",
  "src/portrait.js",
  "src/face-studio.js",
  "vendor/mediapipe/vision_bundle.mjs",
  "vendor/mediapipe/wasm/vision_wasm_internal.wasm",
  "vendor/mediapipe/wasm/vision_wasm_nosimd_internal.wasm",
  "models/face_landmarker.task",
  "models/selfie_multiclass_256x256.tflite",
  "assets/logo_slingtoon.svg",
  "assets/stage_morning_mayhem.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  ".github/workflows/validate.yml",
  ".github/workflows/deploy-pages.yml",
  ".github/pull_request_template.md",
  "01_WRZUC_DO_GITHUB.md",
  "CHANGELOG.md",
  "RELEASE_MANIFEST.md",
  "THIRD_PARTY_NOTICES.md",
  "docs/AUDIT_GUARDRAILS_PL.md",
  "docs/MIGRATION_PLAN_PL.md",
];

await Promise.all(requiredFiles.map((file) => access(resolve(root, file))));

const [html, css, manifestText, worker, main, game, levels, render, viewport, faceStudio, faceVision, portrait] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "styles.css"), "utf8"),
  readFile(resolve(root, "manifest.webmanifest"), "utf8"),
  readFile(resolve(root, "sw.js"), "utf8"),
  readFile(resolve(root, "src/main.js"), "utf8"),
  readFile(resolve(root, "src/game.js"), "utf8"),
  readFile(resolve(root, "src/levels.js"), "utf8"),
  readFile(resolve(root, "src/render.js"), "utf8"),
  readFile(resolve(root, "src/viewport.js"), "utf8"),
  readFile(resolve(root, "src/face-studio.js"), "utf8"),
  readFile(resolve(root, "src/face-vision.js"), "utf8"),
  readFile(resolve(root, "src/portrait.js"), "utf8"),
]);

const manifest = JSON.parse(manifestText);
const { version } = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
assert.ok(main.includes(`serviceWorker.register("./sw.js?v=${version}")`));
assert.ok(main.includes(`slingtoon-fullscreen-tip-${version}`));
for (const level of LEVELS) {
  assert.ok(Object.isFrozen(level));
  assert.ok(level.interactions.every((item) => ["breakable", "portal", "cushion", "steam", "current", "bubble", "gravity", "switch", "gate", "solid", "water", "hazard"].includes(item.type)));
  assert.ok(level.required.every((id) => level.interactions.some((item) => item.id === id)));
  // A hazard ends the flight, so it can never be an objective the player must visit.
  assert.ok(level.interactions.filter((item) => item.type === "hazard").every((item) => !level.required.includes(item.id)));
}
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.equal(manifest.display, "fullscreen");
assert.deepEqual(manifest.display_override, ["fullscreen", "standalone"]);
assert.equal(manifest.orientation, "landscape");
assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));

const modelChecksums = new Map([
  ["models/face_landmarker.task", "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff"],
  ["models/selfie_multiclass_256x256.tflite", "c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0"],
]);
for (const [file, expected] of modelChecksums) {
  const contents = await readFile(resolve(root, file));
  const actual = createHash("sha256").update(contents).digest("hex");
  assert.equal(actual, expected, `${file} checksum does not match the reviewed model`);
}

assert.match(html, /<canvas id="gameCanvas"/);
assert.match(html, /manifest\.webmanifest/);
assert.match(html, /src\/main\.js/);
assert.match(html, /connect-src 'self'/);
assert.doesNotMatch(html, /script-src[^;]*\s'unsafe-eval'/);
assert.doesNotMatch(html, /style-src[^;]*'unsafe-inline'/);
assert.match(game, /replayWith\(modifier\)/);
assert.match(game, /shot\.launchVelocity/);
assert.match(game, /this\.level\.goal/);
assert.match(levels, /id:\s*"morning-mayhem"/);
assert.match(levels, /id:\s*"coffee-consequences"/);
assert.match(levels, /id:\s*"sock-escape"/);
assert.match(levels, /id:\s*"remote-archaeology"/);
assert.match(levels, /id:\s*"toast-apocalypse"/);
assert.match(levels, /id:\s*"gnome-emergency"/);
assert.match(levels, /id:\s*"pigeon-protocol"/);
assert.match(levels, /id:\s*"duck-rescue"/);
assert.match(levels, /export const LEVELS/);
assert.equal(LEVELS.length, 80);
assert.equal(new Set(LEVELS.map((level) => level.id)).size, 80);
assert.match(levels, /assistPull:\s*point/g);
assert.match(levels, /scene:\s*"lake"/);
assert.match(levels, /freeStages/);
assert.match(html, /id="previousLevel"/);
assert.match(html, /id="nextLevel"/);
assert.match(main, /readProgress/);
assert.match(main, /highestUnlockedLevel/);
assert.match(main, /TOKEN_SCORE_STEP/);
assert.match(html, /id="hintButton"/);
assert.match(html, /id="scoreBadge"/);
assert.match(render, /drawCoffee/);
assert.match(render, /drawSock/);
assert.match(render, /drawRemote/);
assert.match(render, /drawToaster/);
assert.match(render, /drawGnome/);
assert.match(render, /drawIceCream/);
assert.match(render, /drawDuck/);
assert.match(render, /drawLakeScene/);
assert.match(render, /showPullGuide/);
assert.match(game, /predictShot\(numberOfDots/);
assert.match(render, /prediction\.reachesGoal/);
assert.match(html, /id="faceStudio"/);
assert.match(html, /id="faceStylePreview"/);
assert.match(html, /id="faceStyleStrength"/);
assert.match(main, /new FaceStudio/);
assert.match(faceStudio, /createPortrait/);
assert.match(faceStudio, /requestFile\(\)/);
assert.match(html, /id="faceModeCutout"/);
assert.match(html, /id="faceModeToon"/);
assert.match(html, /id="faceButtonThumb"/);
assert.match(portrait, /segmented-photo-cutout/);
assert.match(portrait, /createCutoutPortrait/);
assert.match(portrait, /PORTRAIT_MODES/);
assert.match(faceVision, /ImageSegmenter\.createFromOptions/);
assert.match(faceVision, /delegate:\s*"CPU"/);
assert.match(faceVision, /FACE_LANDMARKS_FACE_OVAL/);
assert.match(portrait, /segmented-vector-portrait/);
assert.match(portrait, /createPortraitTransform/);
assert.match(portrait, /autoFaceZoom:\s*true/);
assert.match(portrait, /FACE_CATEGORIES\.HAIR/);
assert.match(html, /AUTO ZOOM/);
assert.doesNotMatch(render, /ctx\.clip\(\);\s*this\.drawImageCover\(ctx, this\.faceImage/);
assert.match(render, /const CUSTOM_HEAD_SCALE = 1\.92;/);
assert.match(render, /ctx\.scale\(CUSTOM_HEAD_SCALE, CUSTOM_HEAD_SCALE\)/);
assert.match(game, /avatarGrabRadius/);
assert.match(game, /useDiveMove\(automatic/);
assert.match(game, /FLIGHT_STYLES/);
assert.match(html, /id="diveMoveButton"/);
// A retry has to correct a shot the player can still see, and a miss has to say
// which way it was wrong.
assert.match(render, /drawGhostPath\(ctx\)/);
// Restarting the campaign is irreversible, so it must be a two-step action.
assert.match(html, /id="resetProgress"/);
assert.match(html, /id="resetConfirm"/);
assert.match(html, /id="resetConfirmYes"/);
assert.match(main, /localStorage\.removeItem/);
assert.match(main, /function wipeProgress/);
// A screen wider than 2:1 must not frame the board with a flat purple band.
assert.match(render, /sceneBackdrop\(\)/);
assert.match(render, /this\.ghost = this\.flightPath\.length > 2/);
const physics = await readFile(resolve(root, "src/physics.js"), "utf8");
assert.match(physics, /export function describeMiss/);
assert.match(physics, /model\.closestGoalPoint = \{/);
// Scenery must never borrow the outline that marks a real collider, and the
// shell must never grow past the viewport — that is what clipped the footer.
const world = await readFile(resolve(root, "src/world-renderer.js"), "utf8");
assert.match(world, /const DECOR_STROKE/);
assert.match(world, /outline = DECOR_STROKE/);
assert.doesNotMatch(world, /chapterLabel/);
assert.match(css, /\.app-shell\s*\{[^}]*height:\s*100dvh/);
// The stage takes leftover height instead of deriving it from page width;
// a portrait breakpoint may still pin 2:1, the default rule may not.
assert.match(css, /\.stage\s*\{[^}]*flex:\s*1 1 auto/);
assert.match(main, /useDiveMove\(\)/);
// Personality is a real toolkit, so every character must differ on every dial
// while the launch itself stays shared.
for (const dial of ["lift", "push", "drop", "brake"]) {
  const values = Object.values(FLIGHT_STYLES).map((style) => style[dial]);
  assert.equal(new Set(values).size, values.length, `characters share the same ${dial}`);
}
assert.ok(Object.values(FLIGHT_STYLES).every((style) => style.charges >= 1 && style.brake > 0 && style.brake < 1));
for (const level of LEVELS) {
  assert.equal(level.airMove, level.number >= 5);
  assert.equal(level.diveMove, level.number >= 17);
}
assert.match(html, /id="fullscreenButton"/);
assert.match(html, /id="fullscreenGuide"/);
assert.match(main, /window\.navigator\.standalone/);
assert.match(main, /requestFullscreen/);
assert.match(main, /beforeinstallprompt/);
assert.match(main, /shouldSuggestFullscreen/);
assert.match(main, /requestGameFullscreen/);
assert.match(html, /id="fullscreenStart"/);
assert.match(html, /Graj pełny ekran/);
assert.match(css, /padding-right:\s*0;\s*padding-left:\s*0;/);
assert.match(css, /orientation:\s*landscape[^}]*max-height:\s*560px/);
assert.match(css, /min-aspect-ratio:\s*2\s*\/\s*1/);
assert.match(css, /object-fit:\s*fill/);
assert.doesNotMatch(css, /object-fit:\s*cover/);
assert.match(main, /ResizeObserver/);
assert.match(main, /visualViewport/);
assert.match(render, /createCropFreeViewport/);
assert.match(viewport, /viewWidth = Math\.ceil\(safeWorldHeight \* stageAspect\)/);
assert.match(viewport, /viewHeight = Math\.ceil\(safeWorldWidth \/ stageAspect\)/);
assert.match(viewport, /clientPointToWorld/);

// Nothing is drawn at head level on a photograph of a real person. The star on
// an eye, then the same star parked beside the head, then victory sparkles on
// the hair were all the same mistake: art authored against the 36 px stock
// skull reused over a portrait drawn at CUSTOM_HEAD_SCALE.
assert.ok(/drawPersonalityFront\(ctx, personality\) \{[\s\S]{0,400}?if \(this\.faceImage\) return;/.test(render),
  "drawPersonalityFront must bail out early for a photo head");
assert.ok(/drawPhotoReaction\(ctx, expression\) \{\s*this\.drawPhotoAccent\(ctx, expression\);\s*\}/.test(render),
  "every photo reaction must go through drawPhotoAccent, which draws clear of the portrait");
// Landing: the hero settles onto the goal instead of freezing against its edge.
assert.ok(render.includes("landingPose()"), "the renderer must compute a landing pose");
assert.ok(/LANDING_SECONDS = 0\.\d+/.test(render), "the landing tween needs a duration");
assert.ok(render.includes("ctx.clip()"), "the body below the rim is hidden by a clip, not by redrawing 27 goal sprites");
// The first landing read as a UI tween: straight diagonal, dead stop, perfectly
// upright, perfectly still. Each of these keeps one part of the fix honest.
assert.ok(/Math\.sin\(travel \* Math\.PI\) \* \d+/.test(render), "the landing path must arc, not slide along a straight line");
assert.ok(/Math\.exp\(-since \* \d+\)/.test(render), "arrival needs a damped bounce, or the hero stops dead on the mark");
assert.ok(/breath/.test(render) && /tilt:/.test(render), "a landed hero keeps breathing and swaying; a statue in a cup is the artificial look");
assert.ok(render.includes("spawnLandingPuff"), "touchdown needs its own symmetric puff: the launch spawner only blows left");
assert.ok(/const lean = clamp/.test(render), "landing dead centre every time reads as canned");

// Seria is a shot budget for a whole run. One shot per mission was measured and
// rejected: a blind shot wins about 20% of the time, so runs averaged a quarter
// of a mission. The budget, the refund and the cap are the whole design — if any
// of them drifts the mode stops expressing skill.
const streak = await readFile(resolve(root, "src/streak.js"), "utf8");
for (const name of ["STREAK_START_SHOTS", "STREAK_REFUND", "STREAK_MAX_SHOTS", "STREAK_MIN_POOL", "streakPool", "canStartStreak", "createStreakRun", "drawStreakMission", "spendStreakShot", "clearStreakMission"]) {
  assert.ok(new RegExp(`export (const|function) ${name}\\b`).test(streak), `streak.js must export ${name}`);
}
assert.ok(/STREAK_REFUND = 2\b/.test(streak), "a clear must refund two shots, or a first-try clear stops gaining ground");
assert.ok(/STREAK_START_SHOTS = 5\b/.test(streak), "the run starts on five shots");
assert.ok(/STREAK_MAX_SHOTS = 8\b/.test(streak), "the budget is capped, or a good run banks an unloseable buffer");
assert.ok(streak.includes("level.id !== run.lastLevelId"), "the same mission must not come up twice running");
// A run must never write campaign progress: the summary says so on screen.
assert.ok(/streakRun\) \{[\s\S]{0,400}?return;/.test(main), "the streak branch has to return before campaign scoring");
assert.ok(!/inStreak\(\)[\s\S]{0,80}rewardSuccess/.test(main), "a run must not award campaign points");
for (const id of ["streakHud", "streakCount", "streakShots", "streakQuit", "startStreak", "streakNote"]) {
  assert.ok(html.includes(`id="${id}"`), `index.html is missing #${id}`);
}
// The HUD is absolutely positioned, so it has to live inside the stage or it
// lands on the top bar and covers the character select.
const stageStart = html.indexOf('<div id="stage"');
const stageEnd = html.indexOf('id="rotateHint"', stageStart);
const hudAt = html.indexOf('id="streakHud"');
assert.ok(stageStart >= 0 && hudAt > stageStart && hudAt < stageEnd, "the streak HUD must sit inside #stage");

// The hero has to react to the world, not just to its own phase clock. An
// earlier build let personality short-circuit the expression getter, so Zen and
// Tough Guy showed two faces for a whole shot — and those are the characters
// stars now buy. Every reaction state must also be drawn, or it is a mood the
// player never sees.
for (const reaction of ["bracing", "hopeful", "dizzy", "serene"]) {
  assert.ok(game.includes(`"${reaction}"`), `game.js must be able to enter the ${reaction} reaction`);
  assert.ok(render.includes(`"${reaction}"`), `render.js must draw the ${reaction} reaction`);
}
assert.ok(/hazardGap < DANGER_GAP/.test(game), "a hazard within reach has to outrank the flight-time flavour");
assert.ok(/goalGap < HOPE_GAP/.test(game), "closing on the goal has to be visible on the hero");
assert.ok(physics.includes("model.hazardGap"), "physics must report the nearest danger each step");
assert.ok(physics.includes("model.goalGap"), "physics must report the live goal gap, not only the closest approach");
assert.ok(render.includes("drawPhotoAccent"), "a photo head needs accents drawn clear of the portrait");

// Stars buy characters, and mastery is the mark that proves a mission is done
// with. Both are rewards, so both have to be visible: the select must be
// rebuilt from CHARACTER_UNLOCKS, and the gold tile must actually win the
// cascade. An earlier build shipped a mastery rule declared before the base
// `.mission-tile` — same specificity, so the base overrode every property and
// the reward was invisible. These assertions pin the order and the specificity.
const progress = await readFile(resolve(root, "src/progress.js"), "utf8");
for (const name of ["CHARACTER_UNLOCKS", "countStars", "countMastered", "isMastered", "characterLock"]) {
  assert.match(progress, new RegExp(`export (const|function) ${name}\\b`), `progress.js must export ${name}`);
}
assert.match(main, /refreshCharacters\(\)/, "the character select is rebuilt from the unlock table");
assert.match(main, /announceUnlocks\(/, "crossing a star threshold has to be announced");
assert.doesNotMatch(html, /<option value="(zen|panic|toughGuy)"/, "locked characters must not be hardcoded into the markup");
const baseTile = css.indexOf(".mission-tile {");
const masteredTile = css.indexOf(".mission-tile--mastered {");
const hoverTile = css.indexOf('.mission-tile:hover:not(:disabled)');
assert.ok(baseTile >= 0 && masteredTile > baseTile, "the mastered tile must be declared after the base tile, or the base wins the tie");
assert.ok(hoverTile > masteredTile, "hover and current must still outrank mastery: gold is history, mint is where you are");
assert.ok(/\.mission-tile\.mission-tile--mastered span:first-of-type/.test(css), "the gilded eyebrow needs two classes to beat `.mission-tile span`");

for (const file of requiredFiles.filter((file) => !file.startsWith(".github") && !file.startsWith("docs/"))) {
  if (["package.json", ".gitignore", ".gitattributes"].includes(file)) continue;
  if (file === ".nojekyll") continue;
  const cachePath = file === "index.html" ? "./index.html" : `./${file}`;
  if (["index.html", "styles.css", "manifest.webmanifest", "sw.js", "src/main.js", "src/game.js", "src/levels.js", "src/render.js", "src/viewport.js", "src/audio.js", "src/face-vision.js", "src/portrait.js", "src/face-studio.js"].includes(file) || file.startsWith("assets/")) {
    const exactPath = worker.includes(`"${cachePath}"`);
    const versionedPath = worker.includes(`"${cachePath}?v=`);
    assert.ok(exactPath || versionedPath || file === "sw.js", `${file} is missing from the offline app shell`);
  }
}

for (const file of ["campaign", "campaign-routes", "physics", "progress", "streak", "interactions-renderer", "world-renderer"]) assert.ok(worker.includes(`./src/${file}.js?v=${version}`));
console.log(`SlingToon ${version}: campaign schema, privacy, mobile viewport and offline assets validated.`);
