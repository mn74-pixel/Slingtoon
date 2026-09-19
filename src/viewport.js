const finitePositive = (value, fallback) => Number.isFinite(value) && value > 0 ? value : fallback;

/**
 * Builds a crop-free logical camera for any stage aspect ratio.
 *
 * The 1280x640 gameplay world is always fully visible. Wider screens reveal
 * extra room at the sides; taller screens reveal extra room above and below.
 * Gameplay coordinates and physics stay unchanged.
 */
export function createCropFreeViewport(cssWidth, cssHeight, worldWidth = 1280, worldHeight = 640) {
  const safeWorldWidth = finitePositive(worldWidth, 1280);
  const safeWorldHeight = finitePositive(worldHeight, 640);
  const width = finitePositive(cssWidth, safeWorldWidth);
  const height = finitePositive(cssHeight, safeWorldHeight);
  const stageAspect = width / height;
  const worldAspect = safeWorldWidth / safeWorldHeight;

  let viewWidth = safeWorldWidth;
  let viewHeight = safeWorldHeight;

  if (stageAspect > worldAspect) {
    viewWidth = Math.ceil(safeWorldHeight * stageAspect);
  } else if (stageAspect < worldAspect) {
    viewHeight = Math.ceil(safeWorldWidth / stageAspect);
  }

  return Object.freeze({
    width: viewWidth,
    height: viewHeight,
    offsetX: (viewWidth - safeWorldWidth) * 0.5,
    offsetY: (viewHeight - safeWorldHeight) * 0.5,
    worldWidth: safeWorldWidth,
    worldHeight: safeWorldHeight,
  });
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
  const left = -viewport.offsetX;
  const top = -viewport.offsetY;
  const right = left + viewport.width;
  const bottom = top + viewport.height;
  if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) return null;
  // The inset keeps the marker fully inside the frame; on a very small frame
  // it must not cross over itself.
  const padX = Math.min(inset, viewport.width / 2 - 1);
  const padY = Math.min(inset, viewport.height / 2 - 1);
  const x = Math.min(Math.max(point.x, left + padX), right - padX);
  const y = Math.min(Math.max(point.y, top + padY), bottom - padY);
  const dx = point.x - x, dy = point.y - y;
  return { x, y, angle: Math.atan2(dy, dx), distance: Math.hypot(dx, dy) };
}
