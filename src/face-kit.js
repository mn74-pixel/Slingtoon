// FaceKit — the head-cutout module, as one door.
//
// Three files do the work and none of them knows anything about SlingToon:
//
//   face-vision.js  wraps MediaPipe: face landmarks + a per-pixel segmentation
//                   of hair / face skin / body skin / clothes / accessories.
//   portrait.js     turns that into a head: where the head ends, which pixels
//                   belong to it, how it is framed, outlined and scaled.
//   face-mimic.js   warps the finished head into a sheet of expressions, by
//                   moving the landmarks the photo already has.
//
// A game that wants the feature copies those three files and imports this one.
// Nothing else in this repository is involved.
//
// WHAT IT PROMISES
//
// * The photo never leaves the device. The models run locally; there is no
//   upload path in any of these files. The host page still has to say so and
//   enforce it — SlingToon does it with a Content-Security-Policy that has no
//   remote origin to post to.
// * Clothing is never part of the cutout. The segmentation classifies it, and
//   isHeadPixel refuses that class outright — a patterned collar cannot bleed
//   into the head. Guarded by tests/portrait.test.mjs.
// * An empty or near-empty cutout reports its coverage instead of passing as a
//   head, so a failed segmentation is visible rather than invisible.
//
// WHAT IT NEEDS FROM THE HOST
//
// * A canvas implementation. Every entry point takes the source canvas and,
//   where it creates one, a `createSurface(width, height)` factory — so the
//   same code runs in a browser and under @napi-rs/canvas in Node, which is how
//   the offline QA renders it.
// * MediaPipe's task files, served locally (see face-vision.js).
//
// PORTING NOTE
//
// The imports inside these files carry a `?v=0.39.0` query. That is this
// project's cache-busting convention for GitHub Pages, not part of the module:
// strip the query, or keep it and update it with your own version.
export {
  FACE_CATEGORIES,
  PORTRAIT_MODES,
  DEFAULT_PORTRAIT_MODE,
  DEFAULT_OUTLINE_STRENGTH,
  MAX_OUTLINE_WIDTH,
  // Where the head ends and which pixels belong to it.
  deriveHeadBounds,
  isHeadPixel,
  createHeadMaskCanvas,
  // Framing: a distant face and a close selfie come out the same size.
  createPortraitTransform,
  fitInsideFrame,
  // The finished head, in either style.
  createPortrait,
  createCutoutPortrait,
  createToonPortrait,
  normalizePortraitMode,
  normalizeOutlineStrength,
  normalizePortraitStyle,
  outlineWidthFor,
  boundsFromLandmarks,
  connectionPaths,
} from "./portrait.js?v=0.39.0";

export {
  DEFAULT_MIMIC_STRENGTH,
  MAX_MIMIC_STRENGTH,
  MIMIC_EXPRESSIONS,
  buildExpressionSheet,
  mimicAnchors,
  opaqueBounds,
} from "./face-mimic.js?v=0.39.0";

export { FaceVision } from "./face-vision.js?v=0.39.0";
