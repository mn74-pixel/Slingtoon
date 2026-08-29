const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export const DEFAULT_CARTOON_STRENGTH = 0.78;

export function normalizeCartoonStrength(value) {
  const numeric = Number(value);
  return clamp(Number.isFinite(numeric) ? numeric : DEFAULT_CARTOON_STRENGTH, 0.35, 1);
}

export function cartoonSettings(strength = DEFAULT_CARTOON_STRENGTH) {
  const amount = normalizeCartoonStrength(strength);
  return {
    amount,
    smoothingPasses: 1 + Math.round(amount * 2),
    colorLevels: Math.round(10 - amount * 5),
    quantizeMix: 0.45 + amount * 0.42,
    saturation: 1.06 + amount * 0.25,
    contrast: 1.02 + amount * 0.14,
    brightness: 2 + amount * 2,
    edgeThreshold: 140 - amount * 70,
    edgeSoftness: 180 - amount * 60,
    inkOpacity: 0.48 + amount * 0.38,
    dilateEdges: amount >= 0.62,
  };
}

function blurOnce(source, width, height) {
  const horizontal = new Uint8ClampedArray(source.length);
  const output = new Uint8ClampedArray(source.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const leftX = Math.max(0, x - 1);
      const rightX = Math.min(width - 1, x + 1);
      const index = (y * width + x) * 4;
      const left = (y * width + leftX) * 4;
      const right = (y * width + rightX) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        horizontal[index + channel] = (source[left + channel] + source[index + channel] * 2 + source[right + channel]) / 4;
      }
      horizontal[index + 3] = source[index + 3];
    }
  }

  for (let y = 0; y < height; y += 1) {
    const topY = Math.max(0, y - 1);
    const bottomY = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const top = (topY * width + x) * 4;
      const bottom = (bottomY * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        output[index + channel] = (horizontal[top + channel] + horizontal[index + channel] * 2 + horizontal[bottom + channel]) / 4;
      }
      output[index + 3] = horizontal[index + 3];
    }
  }

  return output;
}

function smoothstep(start, end, value) {
  const normalized = clamp((value - start) / Math.max(1, end - start), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function edgeMap(pixels, width, height, settings) {
  const luminance = new Float32Array(width * height);
  const edges = new Float32Array(width * height);

  for (let index = 0; index < luminance.length; index += 1) {
    const pixel = index * 4;
    luminance[index] = pixels[pixel] * 0.2126 + pixels[pixel + 1] * 0.7152 + pixels[pixel + 2] * 0.0722;
  }

  const sample = (x, y) => luminance[clamp(y, 0, height - 1) * width + clamp(x, 0, width - 1)];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = sample(x - 1, y - 1);
      const b = sample(x, y - 1);
      const c = sample(x + 1, y - 1);
      const d = sample(x - 1, y);
      const f = sample(x + 1, y);
      const g = sample(x - 1, y + 1);
      const h = sample(x, y + 1);
      const i = sample(x + 1, y + 1);
      const gradientX = -a + c - d * 2 + f * 2 - g + i;
      const gradientY = -a - b * 2 - c + g + h * 2 + i;
      const magnitude = Math.hypot(gradientX, gradientY);
      edges[y * width + x] = smoothstep(
        settings.edgeThreshold,
        settings.edgeThreshold + settings.edgeSoftness,
        magnitude,
      );
    }
  }

  if (!settings.dilateEdges) return edges;
  const expanded = new Float32Array(edges);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let strongest = edges[y * width + x];
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const sourceX = clamp(x + offsetX, 0, width - 1);
          const sourceY = clamp(y + offsetY, 0, height - 1);
          const neighbor = edges[sourceY * width + sourceX] * (offsetX === 0 && offsetY === 0 ? 1 : 0.82);
          strongest = Math.max(strongest, neighbor);
        }
      }
      expanded[y * width + x] = strongest;
    }
  }
  return expanded;
}

export function cartoonizePixels(source, width, height, strength = DEFAULT_CARTOON_STRENGTH) {
  if (!source || source.length !== width * height * 4) throw new Error("Nieprawidłowe dane obrazu Cartoon.");
  const settings = cartoonSettings(strength);
  let smoothed = new Uint8ClampedArray(source);
  for (let pass = 0; pass < settings.smoothingPasses; pass += 1) smoothed = blurOnce(smoothed, width, height);

  const edges = edgeMap(smoothed, width, height, settings);
  const output = new Uint8ClampedArray(smoothed.length);
  const step = 255 / Math.max(2, settings.colorLevels - 1);
  const ink = [29, 20, 43];

  for (let index = 0; index < width * height; index += 1) {
    const pixel = index * 4;
    const red = smoothed[pixel];
    const green = smoothed[pixel + 1];
    const blue = smoothed[pixel + 2];
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const edgeInk = edges[index] * settings.inkOpacity;

    for (let channel = 0; channel < 3; channel += 1) {
      const sourceValue = channel === 0 ? red : channel === 1 ? green : blue;
      let value = luminance + (sourceValue - luminance) * settings.saturation;
      value = (value - 128) * settings.contrast + 128 + settings.brightness;
      if (channel === 0) value += settings.amount * 3;
      if (channel === 2) value -= settings.amount * 2;
      const quantized = Math.round(clamp(value, 0, 255) / step) * step;
      const celShaded = value + (quantized - value) * settings.quantizeMix;
      output[pixel + channel] = celShaded + (ink[channel] - celShaded) * edgeInk;
    }
    output[pixel + 3] = source[pixel + 3];
  }

  return output;
}

export function cartoonizeCanvas(sourceCanvas, strength = DEFAULT_CARTOON_STRENGTH) {
  const output = document.createElement("canvas");
  output.width = sourceCanvas.width;
  output.height = sourceCanvas.height;
  const context = output.getContext("2d", { alpha: false, willReadFrequently: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(sourceCanvas, 0, 0);
  const image = context.getImageData(0, 0, output.width, output.height);
  image.data.set(cartoonizePixels(image.data, output.width, output.height, strength));
  context.putImageData(image, 0, 0);
  return output;
}
