import { FaceVision } from "./face-vision.js?v=0.27.0";
import { DEFAULT_MIMIC_STRENGTH, MAX_MIMIC_STRENGTH, MIMIC_EXPRESSIONS } from "./face-mimic.js?v=0.27.0";
import {
  DEFAULT_OUTLINE_STRENGTH,
  DEFAULT_PORTRAIT_MODE,
  DEFAULT_PORTRAIT_STYLE,
  PORTRAIT_MODES,
  connectionPaths,
  createHeadMaskCanvas,
  createPortrait,
  deriveHeadBounds,
  normalizeOutlineStrength,
  normalizePortraitMode,
  normalizePortraitStyle,
} from "./portrait.js?v=0.27.0";

export const MODE_COPY = Object.freeze({
  [PORTRAIT_MODES.CUTOUT]: {
    title: "Wytnij swoje zdjęcie",
    heading: "GRUBOŚĆ KONTURU",
    note: "Zdjęcie zostaje takie, jakie jest — znika tylko tło. Zero na suwaku to czysty wycinek bez żadnego efektu.",
    ready: "Gotowe: tło usunięte, zdjęcie nietknięte. To nadal Twoja twarz.",
    idle: "Wybierz zdjęcie z przodu. Wytnę głowę z tłem, ale nie przerysuję twarzy.",
    step: "WYCINEK",
    slider: { min: 0, max: 1, step: 0.02 },
  },
  [PORTRAIT_MODES.TOON]: {
    title: "Zrób rysunkową głowę",
    heading: "SIŁA STYLIZACJI",
    note: "Twarz jest rysowana od nowa z 478 punktów. Wygląda komiksowo, ale mniej przypomina oryginał.",
    ready: "Gotowe: rysunkowy portret z osobnymi włosami i rysowanymi rysami.",
    idle: "Wybierz zdjęcie z przodu. Gra przerysuje twarz w stylu komiksowym.",
    step: "TOON",
    slider: { min: 0.45, max: 1, step: 0.01 },
  },
});

const MIMIC_LABELS = Object.freeze({
  neutral: "SPOKÓJ", nervous: "NERWY", airborne: "LOT", panic: "PANIKA",
  impact: "BĘC", suspicious: "PODEJRZLIWY", serene: "ZEN", bracing: "BRACE",
  hopeful: "NADZIEJA", dizzy: "ZAWROTY", victory: "WYGRANA", defeat: "PORAŻKA",
});
const normalizeMimicStrength = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(MAX_MIMIC_STRENGTH, number)) : DEFAULT_MIMIC_STRENGTH;
};

const PREVIEW_SIZE = 640;
// Poniżej tego wycinek jest pusty albo jest z niego skrawek — nie ma czego
// wystrzelić z procy. Prawdziwe zdjęcie daje tu 40–70%.
const MIN_PORTRAIT_COVERAGE = 0.04;
const MAX_ANALYSIS_EDGE = 1024;
const MAX_FILE_SIZE = 30 * 1024 * 1024;

export function isLikelyImageFile(file) {
  if (!file) return false;
  if (file.type?.startsWith("image/")) return true;
  return /\.(avif|gif|heic|heif|jpe?g|png|webp)$/i.test(file.name ?? "");
}

export function rotatedDimensions(width, height, quarterTurns = 0) {
  const normalizedTurns = ((quarterTurns % 4) + 4) % 4;
  return normalizedTurns % 2 === 0 ? { width, height } : { width: height, height: width };
}

export function containRect(sourceWidth, sourceHeight, targetWidth, targetHeight, padding = 0) {
  const availableWidth = Math.max(1, targetWidth - padding * 2);
  const availableHeight = Math.max(1, targetHeight - padding * 2);
  const scale = Math.min(availableWidth / Math.max(1, sourceWidth), availableHeight / Math.max(1, sourceHeight));
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
    scale,
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Nie udało się odczytać pliku."));
    reader.readAsDataURL(file);
  });
}

function imageFromSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Ten format zdjęcia nie jest obsługiwany przez przeglądarkę."));
    image.src = source;
  });
}

function imageFromFile(file) {
  const objectUrl = URL.createObjectURL(file);
  return imageFromSource(objectUrl).finally(() => URL.revokeObjectURL(objectUrl));
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Safari supports some camera formats only through HTMLImageElement.
    }
  }
  try {
    return await imageFromFile(file);
  } catch {
    return imageFromSource(await fileToDataUrl(file));
  }
}

function imageSize(image) {
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
}

export function createOrientedCanvas(image, quarterTurns = 0, maxEdge = MAX_ANALYSIS_EDGE) {
  const source = imageSize(image);
  const rotated = rotatedDimensions(source.width, source.height, quarterTurns);
  const scale = Math.min(1, maxEdge / Math.max(rotated.width, rotated.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rotated.width * scale));
  canvas.height = Math.max(1, Math.round(rotated.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#2c2146";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((((quarterTurns % 4) + 4) % 4) * Math.PI / 2);
  context.scale(scale, scale);
  context.drawImage(image, -source.width / 2, -source.height / 2, source.width, source.height);
  context.restore();
  return canvas;
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export class FaceStudio {
  constructor(elements, callbacks = {}, vision = new FaceVision()) {
    this.elements = elements;
    this.onApply = callbacks.onApply ?? (() => {});
    this.onRemove = callbacks.onRemove ?? (() => {});
    this.onError = callbacks.onError ?? (() => {});
    this.vision = vision;
    this.sourceImage = null;
    this.analysisCanvas = null;
    this.analysis = null;
    this.previewMask = null;
    this.portrait = null;
    this.quarterTurns = 0;
    this.mode = DEFAULT_PORTRAIT_MODE;
    this.styleStrength = normalizePortraitStyle(DEFAULT_PORTRAIT_STYLE);
    this.outlineStrength = normalizeOutlineStrength(DEFAULT_OUTLINE_STRENGTH);
    this.mimicStrength = DEFAULT_MIMIC_STRENGTH;
    this.hasAppliedFace = false;
    this.snapshot = null;
    this.analysisToken = 0;
    this.portraitTimer = null;
    this.bindEvents();
    this.render();
    this.renderPortraitPreview();
    this.updateStyleUi();
    this.updateMimicUi();
  }

  bindEvents() {
    const { backdrop, cancel, confirm, cutoutMode, mimicStrength, remove, replace, rotate, styleStrength, toonMode } = this.elements;
    replace.addEventListener("click", () => this.requestFile());
    rotate.addEventListener("click", () => this.rotatePhoto());
    confirm.addEventListener("click", () => this.apply());
    remove.addEventListener("click", () => this.remove());
    cancel.addEventListener("click", () => this.cancel());
    backdrop.addEventListener("click", () => this.cancel());
    cutoutMode.addEventListener("click", () => this.setMode(PORTRAIT_MODES.CUTOUT));
    toonMode.addEventListener("click", () => this.setMode(PORTRAIT_MODES.TOON));
    styleStrength.addEventListener("input", () => {
      if (this.mode === PORTRAIT_MODES.TOON) this.styleStrength = normalizePortraitStyle(styleStrength.value);
      else this.outlineStrength = normalizeOutlineStrength(styleStrength.value);
      this.updateStyleUi();
      this.schedulePortrait();
    });
    // The strip re-bakes on release, not on every pixel of the drag: twelve
    // warps per input event would stutter on a phone for no extra information.
    mimicStrength.addEventListener("input", () => {
      this.mimicStrength = normalizeMimicStrength(mimicStrength.value);
      this.updateMimicUi();
    });
    mimicStrength.addEventListener("change", () => this.schedulePortrait());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.elements.root.hidden) this.cancel();
    });
  }

  setMode(mode) {
    const next = normalizePortraitMode(mode);
    if (next === this.mode) return;
    this.mode = next;
    this.updateStyleUi();
    if (this.analysis) this.refreshPortrait();
    else this.setBusy(false, MODE_COPY[next].idle);
  }

  openEditor() {
    this.beginSession();
    this.show();
    this.setBusy(false, this.portrait ? MODE_COPY[this.mode].ready : MODE_COPY[this.mode].idle);
  }

  requestFile() {
    this.elements.input.value = "";
    this.elements.input.click();
  }

  async openFile(file) {
    if (!isLikelyImageFile(file)) throw new Error("Wybierz zdjęcie w formacie JPG, PNG, WebP lub HEIC.");
    if (file.size > MAX_FILE_SIZE) throw new Error("Zdjęcie jest za duże. Wybierz plik mniejszy niż 30 MB.");

    this.beginSession();
    this.show();
    this.setBusy(true, "Wczytuję zdjęcie…");
    const token = ++this.analysisToken;
    try {
      const image = await decodeImage(file);
      if (token !== this.analysisToken) {
        if (typeof image.close === "function") image.close();
        return;
      }
      const { width, height } = imageSize(image);
      if (!width || !height) throw new Error("Zdjęcie nie ma prawidłowych wymiarów.");
      if (this.sourceImage && this.sourceImage !== this.snapshot?.sourceImage && typeof this.sourceImage.close === "function") {
        this.sourceImage.close();
      }
      this.sourceImage = image;
      this.quarterTurns = 0;
      this.analysisCanvas = null;
      this.analysis = null;
      this.portrait = null;
      this.previewMask = null;
      this.updateReplaceLabel();
      this.render();
      this.renderPortraitPreview();
      await this.analyzeCurrentPhoto(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się przeanalizować zdjęcia.";
      this.setBusy(false, message);
      this.onError(message);
      throw error;
    }
  }

  async analyzeCurrentPhoto(existingToken = null) {
    if (!this.sourceImage) return;
    const token = existingToken ?? ++this.analysisToken;
    this.setBusy(true, "Przygotowuję zdjęcie do analizy…");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const analysisCanvas = createOrientedCanvas(this.sourceImage, this.quarterTurns);
    if (token !== this.analysisToken) return;
    this.analysisCanvas = analysisCanvas;
    this.render();
    const analysis = await this.vision.analyze(analysisCanvas, (message) => {
      if (token === this.analysisToken) this.elements.status.textContent = message;
    });
    if (token !== this.analysisToken) return;

    analysis.headBounds = deriveHeadBounds(analysis.landmarks, analysis.mask);
    this.analysisCanvas = analysisCanvas;
    this.analysis = analysis;
    this.previewMask = createHeadMaskCanvas(analysis.mask, analysis.headBounds, [92, 225, 189, 170]);
    const built = this.refreshPortrait();
    this.render();
    if (!built) {
      // Zdarza się, gdy MediaPipe znajdzie twarz, ale nie znajdzie człowieka:
      // maska wraca pusta, wycinek jest przezroczysty i gracz zatwierdza
      // niewidzialną głowę. Widziane na rysunku podanym jako zdjęcie.
      this.setBusy(false, "Znalazłem twarz, ale nie udało się oddzielić głowy od tła — wycinek wyszedł pusty. Spróbuj zdjęcia z aparatu, na którym widać ramiona.");
      this.elements.confirm.disabled = true;
      return;
    }
    this.setBusy(
      false,
      analysis.headBounds.foundHair
        ? MODE_COPY[this.mode].ready
        : `${MODE_COPY[this.mode].ready} Włosy są słabo widoczne, ale nie używam okrągłej maski.`,
    );
  }

  async rotatePhoto() {
    if (!this.sourceImage || this.elements.root.classList.contains("is-loading")) return;
    this.quarterTurns = (this.quarterTurns + 1) % 4;
    this.analysis = null;
    this.portrait = null;
    this.previewMask = null;
    this.render();
    this.renderPortraitPreview();
    try {
      await this.analyzeCurrentPhoto();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się obrócić i przeanalizować zdjęcia.";
      this.setBusy(false, message);
      this.onError(message);
    }
  }

  beginSession() {
    if (this.snapshot) return;
    this.snapshot = {
      sourceImage: this.sourceImage,
      analysisCanvas: this.analysisCanvas,
      analysis: this.analysis,
      previewMask: this.previewMask,
      portrait: this.portrait,
      quarterTurns: this.quarterTurns,
      mode: this.mode,
      styleStrength: this.styleStrength,
      outlineStrength: this.outlineStrength,
    };
  }

  show() {
    this.elements.root.hidden = false;
    document.body.classList.add("face-studio-open");
    this.elements.remove.hidden = !this.hasAppliedFace;
    this.updateReplaceLabel();
    requestAnimationFrame(() => {
      try {
        this.elements.cancel.focus({ preventScroll: true });
      } catch {
        this.elements.cancel.focus();
      }
    });
    this.render();
    this.renderPortraitPreview();
  }

  hide() {
    clearTimeout(this.portraitTimer);
    this.portraitTimer = null;
    this.elements.root.hidden = true;
    document.body.classList.remove("face-studio-open");
  }

  updateReplaceLabel() {
    this.elements.replace.textContent = this.sourceImage ? "▣ Inne zdjęcie" : "▣ Wybierz zdjęcie";
  }

  cancel() {
    this.analysisToken += 1;
    this.restoreSnapshot();
    this.snapshot = null;
    this.hide();
  }

  restoreSnapshot() {
    if (!this.snapshot) return;
    if (this.sourceImage && this.sourceImage !== this.snapshot.sourceImage && typeof this.sourceImage.close === "function") {
      this.sourceImage.close();
    }
    Object.assign(this, this.snapshot);
    this.updateStyleUi();
    this.render();
    this.renderPortraitPreview();
  }

  apply() {
    if (!this.portrait) return;
    if (this.snapshot?.sourceImage && this.snapshot.sourceImage !== this.sourceImage && typeof this.snapshot.sourceImage.close === "function") {
      this.snapshot.sourceImage.close();
    }
    this.hasAppliedFace = true;
    this.snapshot = null;
    this.onApply(this.portrait);
    this.hide();
  }

  remove() {
    this.analysisToken += 1;
    if (this.sourceImage && typeof this.sourceImage.close === "function") this.sourceImage.close();
    this.sourceImage = null;
    this.analysisCanvas = null;
    this.analysis = null;
    this.previewMask = null;
    this.portrait = null;
    this.hasAppliedFace = false;
    this.snapshot = null;
    this.quarterTurns = 0;
    this.render();
    this.renderPortraitPreview();
    this.onRemove();
    this.hide();
  }

  setBusy(isBusy, message) {
    this.elements.root.classList.toggle("is-loading", isBusy);
    this.elements.status.textContent = message;
    this.elements.confirm.disabled = isBusy || !this.portrait;
    this.elements.rotate.disabled = isBusy || !this.sourceImage;
    this.elements.replace.disabled = isBusy;
    this.elements.styleStrength.disabled = isBusy || !this.analysis;
    this.elements.cutoutMode.disabled = isBusy;
    this.elements.toonMode.disabled = isBusy;
  }

  updateStyleUi() {
    const cutout = this.mode === PORTRAIT_MODES.CUTOUT;
    const copy = MODE_COPY[this.mode];
    const slider = this.elements.styleStrength;
    slider.min = String(copy.slider.min);
    slider.max = String(copy.slider.max);
    slider.step = String(copy.slider.step);
    slider.value = String(cutout ? this.outlineStrength : this.styleStrength);
    slider.setAttribute("aria-label", copy.heading);
    this.elements.styleValue.textContent = `${Math.round((cutout ? this.outlineStrength : this.styleStrength) * 100)}%`;
    this.updateMimicUi();
    this.elements.styleHeading.textContent = copy.heading;
    this.elements.styleNote.textContent = copy.note;
    this.elements.title.textContent = copy.title;
    this.elements.pipelineStep.textContent = copy.step;
    for (const [button, isActive] of [[this.elements.cutoutMode, cutout], [this.elements.toonMode, !cutout]]) {
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
  }

  schedulePortrait(delay = 70) {
    clearTimeout(this.portraitTimer);
    if (!this.analysis) return;
    this.portraitTimer = setTimeout(() => {
      this.portraitTimer = null;
      this.refreshPortrait();
    }, delay);
  }

  refreshPortrait() {
    if (!this.analysisCanvas || !this.analysis) return false;
    this.portrait = createPortrait(this.analysisCanvas, this.analysis, {
      mode: this.mode,
      style: this.styleStrength,
      outline: this.outlineStrength,
      mimic: this.mimicStrength,
    });
    this.renderPortraitPreview();
    this.renderMimicStrip();
    const usable = (this.portrait.metadata.coverage ?? 1) >= MIN_PORTRAIT_COVERAGE;
    this.elements.confirm.disabled = !usable;
    return usable;
  }

  render() {
    const canvas = this.elements.canvas;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    gradient.addColorStop(0, "#493872");
    gradient.addColorStop(1, "#21172f");
    context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    context.fillStyle = gradient;
    context.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

    if (!this.analysisCanvas) {
      context.textAlign = "center";
      context.fillStyle = "rgba(255, 211, 95, 0.95)";
      context.font = "900 112px system-ui, sans-serif";
      context.fillText("☺", PREVIEW_SIZE / 2, PREVIEW_SIZE / 2 + 12);
      context.fillStyle = "rgba(255, 245, 217, 0.75)";
      context.font = "900 21px system-ui, sans-serif";
      context.fillText("WYBIERZ ZDJĘCIE Z PRZODU", PREVIEW_SIZE / 2, PREVIEW_SIZE / 2 + 82);
      return;
    }

    const fit = containRect(this.analysisCanvas.width, this.analysisCanvas.height, PREVIEW_SIZE, PREVIEW_SIZE, 22);
    context.drawImage(this.analysisCanvas, fit.x, fit.y, fit.width, fit.height);
    context.fillStyle = "rgba(20, 13, 34, 0.24)";
    context.fillRect(fit.x, fit.y, fit.width, fit.height);
    if (!this.analysis || !this.previewMask) return;

    context.save();
    context.globalAlpha = 0.72;
    context.drawImage(this.previewMask, fit.x, fit.y, fit.width, fit.height);
    context.restore();

    const oval = connectionPaths(this.analysis.contours.faceOval)[0] ?? [];
    context.beginPath();
    let didMove = false;
    for (const pointIndex of oval) {
      const point = this.analysis.landmarks[pointIndex];
      if (!point) continue;
      const x = fit.x + point.x * fit.width;
      const y = fit.y + point.y * fit.height;
      if (!didMove) {
        context.moveTo(x, y);
        didMove = true;
      } else context.lineTo(x, y);
    }
    context.closePath();
    context.strokeStyle = "#ffd35f";
    context.lineWidth = 7;
    context.stroke();

    const labelWidth = 218;
    const labelX = fit.x + 18;
    const labelY = fit.y + 18;
    roundedRect(context, labelX, labelY, labelWidth, 42, 21);
    context.fillStyle = "rgba(25, 20, 45, 0.88)";
    context.fill();
    context.strokeStyle = "rgba(92, 225, 189, 0.78)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "#5ce1bd";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "900 15px system-ui, sans-serif";
    context.fillText("GŁOWA + WŁOSY WYKRYTE", labelX + labelWidth / 2, labelY + 21);
  }

  updateMimicUi() {
    const { mimic, mimicStrength, mimicValue } = this.elements;
    mimicStrength.value = String(this.mimicStrength);
    mimicValue.textContent = `${Math.round(this.mimicStrength * 100)}%`;
    mimic.classList.toggle("is-off", this.mimicStrength <= 0);
    // Only a photo head warps. A drawn portrait already has drawn features.
    mimic.hidden = this.mode !== PORTRAIT_MODES.CUTOUT;
  }

  // Every expression the game can ask for, on the player's own face, before they
  // accept it. Nobody can judge this feature from a description of it.
  renderMimicStrip() {
    const strip = this.elements.mimicStrip;
    strip.replaceChildren();
    const sheet = this.portrait?.expressions;
    if (!sheet || this.mode !== PORTRAIT_MODES.CUTOUT) return;
    for (const name of MIMIC_EXPRESSIONS) {
      const source = sheet[name];
      if (!source) continue;
      const figure = document.createElement("figure");
      const canvas = document.createElement("canvas");
      canvas.width = 116;
      canvas.height = 116;
      canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
      const caption = document.createElement("figcaption");
      caption.textContent = MIMIC_LABELS[name] ?? name;
      figure.append(canvas, caption);
      strip.append(figure);
    }
  }

  renderPortraitPreview() {
    const canvas = this.elements.styleCanvas;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    const tile = Math.max(10, Math.round(canvas.width / 12));
    for (let y = 0; y < canvas.height; y += tile) {
      for (let x = 0; x < canvas.width; x += tile) {
        context.fillStyle = ((x / tile + y / tile) % 2 === 0) ? "#342750" : "#281e41";
        context.fillRect(x, y, tile, tile);
      }
    }
    if (this.portrait?.image) {
      const padding = Math.round(canvas.width * 0.035);
      context.drawImage(this.portrait.image, padding, padding, canvas.width - padding * 2, canvas.height - padding * 2);
    } else {
      context.fillStyle = "rgba(255, 211, 95, 0.9)";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `900 ${Math.round(canvas.width * 0.4)}px system-ui, sans-serif`;
      context.fillText("?", canvas.width / 2, canvas.height / 2);
    }
  }
}
