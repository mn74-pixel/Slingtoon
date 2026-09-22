// FaceKit is the door other games will copy. A door that silently loses a
// handle is worse than no door, so the surface is pinned here — and so is the
// promise that matters most: the module depends on nothing in this game.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as faceKit from "../src/face-kit.js";

const MODULES = ["src/portrait.js", "src/face-vision.js", "src/face-mimic.js", "src/face-kit.js"];

test("the door opens onto everything a host needs", () => {
  for (const name of [
    "FaceVision", "FACE_CATEGORIES", "deriveHeadBounds", "isHeadPixel", "createHeadMaskCanvas",
    "createPortraitTransform", "createPortrait", "createCutoutPortrait", "createToonPortrait",
    "buildExpressionSheet", "mimicAnchors", "opaqueBounds", "MIMIC_EXPRESSIONS",
  ]) {
    assert.ok(name in faceKit, `FaceKit no longer exports ${name}; a host copying the module loses it`);
  }
});

test("the module leans on nothing else in this game", async () => {
  const allowed = /^\.\/(portrait|face-vision|face-mimic)\.js(\?v=[\d.]+)?$/;
  for (const file of MODULES) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    for (const match of source.matchAll(/from\s+"([^"]+)"/g)) {
      assert.match(match[1], allowed,
        `${file} imports ${match[1]} — the face module must stay portable to another game`);
    }
  }
});

test("nothing in the module can send the photo anywhere", async () => {
  // The privacy promise is not a comment: there must be no upload path at all.
  const forbidden = /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource)\b/;
  for (const file of ["src/portrait.js", "src/face-mimic.js"]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, forbidden, `${file} can reach the network; the photo must stay on the device`);
  }
  // face-vision.js loads MediaPipe's own task files, and only from this origin.
  const vision = await readFile(new URL("../src/face-vision.js", import.meta.url), "utf8");
  for (const match of vision.matchAll(/["'](https?:\/\/[^"']+)["']/g)) {
    assert.fail(`face-vision.js reaches a remote origin: ${match[1]}`);
  }
});

test("clothing can never become part of the head", () => {
  const { FACE_CATEGORIES, isHeadPixel } = faceKit;
  const face = { left: .4, right: .6, top: .3, bottom: .7, width: .2, height: .4 };
  const bounds = { left: .3, right: .7, top: .2, bottom: .8, face };
  // Dead centre of the face, where anything accepted would certainly show.
  assert.equal(isHeadPixel(FACE_CATEGORIES.CLOTHES, .5, .5, bounds), false,
    "a patterned collar would bleed into the cutout");
  assert.equal(isHeadPixel(FACE_CATEGORIES.BACKGROUND, .5, .5, bounds), false);
  assert.equal(isHeadPixel(FACE_CATEGORIES.HAIR, .5, .35, bounds), true);
  assert.equal(isHeadPixel(FACE_CATEGORIES.FACE_SKIN, .5, .5, bounds), true);
});

test("the porting note stays true: the version query is the only local convention", async () => {
  const kit = await readFile(new URL("../src/face-kit.js", import.meta.url), "utf8");
  assert.match(kit, /PORTING NOTE/, "the module must keep telling a host what to strip");
  assert.match(kit, /\?v=\d+\.\d+\.\d+/, "the note describes a version query that should still be there");
});
