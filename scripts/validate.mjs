import assert from "node:assert/strict";
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
  "src/render.js",
  "src/audio.js",
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
  "docs/AUDIT_GUARDRAILS_PL.md",
  "docs/MIGRATION_PLAN_PL.md",
];

await Promise.all(requiredFiles.map((file) => access(resolve(root, file))));

const [html, manifestText, worker, main, game] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "manifest.webmanifest"), "utf8"),
  readFile(resolve(root, "sw.js"), "utf8"),
  readFile(resolve(root, "src/main.js"), "utf8"),
  readFile(resolve(root, "src/game.js"), "utf8"),
]);

const manifest = JSON.parse(manifestText);
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.equal(manifest.display, "fullscreen");
assert.equal(manifest.orientation, "landscape");
assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));

assert.match(html, /<canvas id="gameCanvas"/);
assert.match(html, /manifest\.webmanifest/);
assert.match(html, /src\/main\.js/);
assert.match(main, /serviceWorker\.register\("\.\/sw\.js"\)/);
assert.match(game, /replayWith\(modifier\)/);
assert.match(game, /shot\.launchVelocity/);

for (const file of requiredFiles.filter((file) => !file.startsWith(".github") && !file.startsWith("docs/"))) {
  if (["package.json", ".gitignore", ".gitattributes"].includes(file)) continue;
  if (file === ".nojekyll") continue;
  const cachePath = file === "index.html" ? "./index.html" : `./${file}`;
  if (["index.html", "styles.css", "manifest.webmanifest", "sw.js", "src/main.js", "src/game.js", "src/render.js", "src/audio.js"].includes(file) || file.startsWith("assets/")) {
    assert.ok(worker.includes(`"${cachePath}"`) || file === "sw.js", `${file} is missing from the offline app shell`);
  }
}

console.log("SlingToon Web 0.5: structure, PWA metadata and offline shell are valid.");
