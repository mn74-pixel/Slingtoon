import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
assert.match(main, /serviceWorker\.register\("\.\/sw\.js\?v=0\.10\.0"\)/);
assert.match(game, /replayWith\(modifier\)/);
assert.match(game, /shot\.launchVelocity/);
assert.match(game, /this\.level\.goal/);
assert.match(levels, /id:\s*"morning-mayhem"/);
assert.match(levels, /export const LEVELS/);
assert.match(levels, /pull:\s*freezePoint/);
assert.match(render, /showPullGuide/);
assert.match(game, /predictShot\(numberOfDots/);
assert.match(render, /prediction\.reachesGoal/);
assert.match(html, /id="faceStudio"/);
assert.match(html, /id="faceStylePreview"/);
assert.match(html, /id="faceStyleStrength"/);
assert.match(main, /new FaceStudio/);
assert.match(faceStudio, /createToonPortrait/);
assert.match(faceStudio, /requestFile\(\)/);
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
assert.match(html, /id="fullscreenButton"/);
assert.match(html, /id="fullscreenGuide"/);
assert.match(main, /window\.navigator\.standalone/);
assert.match(main, /requestFullscreen/);
assert.match(main, /beforeinstallprompt/);
assert.match(main, /slingtoon-fullscreen-tip-0\.10\.0/);
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

console.log("SlingToon Web 0.10.0: crop-free mobile camera, expressive head and level core are valid.");
