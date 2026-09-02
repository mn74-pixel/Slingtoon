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
