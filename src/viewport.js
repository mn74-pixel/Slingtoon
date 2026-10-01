const finitePositive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;

/**
 * Builds a crop-free logical camera for any stage aspect ratio.
 *
 * The 1280x640 gameplay world is always fully visible. Wider screens reveal
 * extra room at the sides; taller screens reveal extra room above and below.
 * Gameplay coordinates and physics stay unchanged.
 *
 * `inset` is how much of the stage, in CSS pixels on each side, is covered by
 * interface laid OVER the canvas — the translucent mission strip and status
 * row on a landscape phone. The world is fitted inside what is left, and the
 * scenery keeps painting underneath. Without it, measured on an 844x390
 * phone, 91 world pixels at the bottom sat under the status row — the floor,
 * the hero's feet and the foot of the sling — and 76 at the top under the
 * mission strip, exactly where the lifted targets of 0.44.0 now fly. The
 * inset is applied symmetrically (the larger of the two edges) so the world
 * stays centred and every scene's "offset on both sides" bleed still holds.
 */
export function createCropFreeViewport(cssWidth, cssHeight, worldWidth = 1280, worldHeight = 640, inset = {}) {
  const safeWorldWidth = finitePositive(worldWidth, 1280);
  const safeWorldHeight = finitePositive(worldHeight, 640);
  const width = finitePositive(cssWidth, safeWorldWidth);
  const height = finitePositive(cssHeight, safeWorldHeight);
  // An inset may never eat more than a third of the stage, or a broken
  // measurement could shrink the world to nothing.
  const insetX = Math.min(Math.max(0, Number(inset.x) || 0), width / 3);
  const insetY = Math.min(Math.max(0, Number(inset.y) || 0), height / 3);
  const scale = Math.min((width - insetX * 2) / safeWorldWidth, (height - insetY * 2) / safeWorldHeight);
  // 1e-6 so float noise on the fitted axis (640.0000000001) never adds a pixel.
  const viewWidth = Math.max(safeWorldWidth, Math.ceil(width / scale - 1e-6));
  const viewHeight = Math.max(safeWorldHeight, Math.ceil(height / scale - 1e-6));

  return Object.freeze({
    width: viewWidth,
    height: viewHeight,
    offsetX: (viewWidth - safeWorldWidth) * 0.5,
    offsetY: (viewHeight - safeWorldHeight) * 0.5,
    worldWidth: safeWorldWidth,
    worldHeight: safeWorldHeight,
    // The covered band, in world units: what the player cannot really see.
    safeX: (insetX * viewWidth) / width,
    safeY: (insetY * viewHeight) / height,
  });
}

// How much of the stage is covered by interface laid over it. On landscape
// phones the mission strip and the status row float over the canvas as frosted
// glass; the camera fits the world inside what they leave, and the scenery
// keeps painting underneath. Measured from the live layout, so a CSS change
// can never quietly put the floor back under the status row.
export function overlayInset(stage, overlays, styleOf = (element) => globalThis.getComputedStyle(element)) {
  let top = 0, bottom = 0;
  for (const element of overlays) {
    if (!element) continue;
    const style = styleOf(element);
    if (style.position !== "absolute" || style.display === "none" || style.visibility === "hidden") continue;
    const box = element.getBoundingClientRect();
    if (box.height <= 0 || box.bottom <= stage.top || box.top >= stage.bottom) continue;
    if (box.top + box.height / 2 < stage.top + stage.height / 2) top = Math.max(top, box.bottom - stage.top);
    else bottom = Math.max(bottom, stage.bottom - box.top);
  }
  return { x: 0, y: Math.max(top, bottom) };
}

// How many canvas pixels to spend on one world unit.
//
// The canvas used to be exactly as many pixels as the logical view (about
// 1280 wide) whatever the screen, and the browser stretched it to fit. On a
// 1440x900 Retina laptop that stretched every pixel 2.6x; on a 3x phone 1.4x —
// every outline in the game was soft. Now the backing store follows the
// screen's own pixels (CSS size x devicePixelRatio), capped so the fill cost
// stays bounded: no more than RENDER_MAX_PIXELS per frame and never past 3x.
// On a small screen the ratio can drop below 1, which is fewer pixels to fill
// than before — the same sharpness the screen can show, for less work.
export const RENDER_MAX_PIXELS = 4_200_000;
export const RENDER_MAX_RATIO = 3;

export function renderScale(cssWidth, viewport, devicePixelRatio = 1, maxPixels = RENDER_MAX_PIXELS) {
  const css = finitePositive(cssWidth, viewport.width);
  const dpr = finitePositive(devicePixelRatio, 1);
  const wanted = Math.min((css / viewport.width) * dpr, RENDER_MAX_RATIO);
  const budget = Math.sqrt(maxPixels / (viewport.width * viewport.height));
  return Math.max(0.25, Math.min(wanted, budget));
}

// Adaptive sharpness. Full device resolution is a gift to a GPU and a tax on
// a slow one: in a CPU-rendered Chromium the 1440x900@2 frame went from 16.7
// to 66.7 ms. So the budget starts at the full RENDER_MAX_PIXELS and, whenever
// the median frame of a sampled window runs slower than SLOW_FRAME_MS, steps
// down by BUDGET_STEP — never below `floor`, which the caller sets to the
// pixel count the game used before this change. The worst case is therefore
// exactly the old picture at the old cost, reached within a few seconds. It
// never steps back up: oscillating resolution reads as a flicker.
export const SLOW_FRAME_MS = 20.5;
export const BUDGET_STEP = 0.7;

export function nextPixelBudget(budget, frameIntervals, floor) {
  const samples = [];
  for (const interval of frameIntervals) if (Number.isFinite(interval) && interval > 0 && interval < 250) samples.push(interval);
  if (samples.length < 30) return budget;
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  if (median <= SLOW_FRAME_MS || budget <= floor) return budget;
  return Math.max(floor, budget * BUDGET_STEP);
}

export function clientPointToWorld(clientX, clientY, rect, viewport) {
  const rectWidth = finitePositive(rect?.width, 1);
  const rectHeight = finitePositive(rect?.height, 1);
  const localX = (clientX - (rect?.left ?? 0)) / rectWidth;
  const localY = (clientY - (rect?.top ?? 0)) / rectHeight;

  return {
    x: localX * viewport.width - viewport.offsetX,
    y: localY * viewport.height - viewport.offsetY,
  };
}

export function worldPointToClient(worldX, worldY, rect, viewport) {
  return {
    x: (rect?.left ?? 0) + ((worldX + viewport.offsetX) / viewport.width) * finitePositive(rect?.width, 1),
    y: (rect?.top ?? 0) + ((worldY + viewport.offsetY) / viewport.height) * finitePositive(rect?.height, 1),
  };
}

// Where to pin a marker for something that has left the visible frame.
//
// Measured on the real solver over 12 672 shots: 34% pass the right edge of
// the world, 16% fly above it, 3% leave to the left. The hero is then simply
// gone — median 1.58s with nothing on screen, 3.76s at the 90th percentile.
// A player cannot learn from a shot they cannot see, and "one more try" needs
// them to understand what just happened.
//
// Returns null while the point is visible, so the caller draws nothing.
// The inset has to clear the badge AND the pointer beyond it, or the arrow is
// drawn past the frame edge and only the badge is visible.
export function edgeMarker(point, viewport, inset = 62) {
  if (!point || !viewport) return null;
  // The frame the player can actually see: under the overlaying strips the
  // hero is behind frosted glass, so the marker has to stand clear of them.
  const left = -viewport.offsetX + (viewport.safeX ?? 0);
  const top = -viewport.offsetY + (viewport.safeY ?? 0);
  const right = -viewport.offsetX + viewport.width - (viewport.safeX ?? 0);
  const bottom = -viewport.offsetY + viewport.height - (viewport.safeY ?? 0);
  if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) return null;
  // The inset keeps the marker fully inside the frame; on a very small frame
  // it must not cross over itself.
  const padX = Math.min(inset, (right - left) / 2 - 1);
  const padY = Math.min(inset, (bottom - top) / 2 - 1);
  const x = Math.min(Math.max(point.x, left + padX), right - padX);
  const y = Math.min(Math.max(point.y, top + padY), bottom - padY);
  const dx = point.x - x, dy = point.y - y;
  return { x, y, angle: Math.atan2(dy, dx), distance: Math.hypot(dx, dy) };
}
