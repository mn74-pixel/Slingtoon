// Small DOM/Canvas test doubles shared by the main-module integration tests.
// Not a substitute for browser/mobile QA — it proves the wiring, not the pixels.
import { readFile } from "node:fs/promises";

class Element {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase(); this.hidden = false; this.disabled = false; this.open = false;
    this.dataset = {}; this.style = { setProperty() {} }; this.listeners = {}; this.attributes = {};
    this.textContent = ""; this.value = ""; this.children = []; this.width = 1280; this.height = 640;
    this.classes = new Set();
    this.classList = { add: (...v) => v.forEach((x) => this.classes.add(x)), remove: (...v) => v.forEach((x) => this.classes.delete(x)), toggle: (key, force) => { const set = force ?? !this.classes.has(key); if (set) this.classes.add(key); else this.classes.delete(key); }, contains: (key) => this.classes.has(key) };
    this.context = new Proxy({}, { get: (target, name) => target[name] ?? (name === "measureText" ? (s) => ({ width: s.length * 8 }) : name.startsWith("create") ? () => ({ addColorStop() {} }) : () => {}) });
  }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  dispatch(type, fields = {}) { for (const fn of this.listeners[type] ?? []) fn({ type, target: this, preventDefault() {}, ...fields }); }
  click() { if (!this.disabled) this.dispatch("click"); }
  getContext() { return this.context; }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 640 }; }
  setPointerCapture(id) { this.pointer = id; }
  hasPointerCapture(id) { return this.pointer === id; }
  releasePointerCapture() { this.pointer = null; }
  focus() {}
  closest(selector) { return selector.split(",").some((tag) => tag.trim().toUpperCase() === this.tagName) ? this : null; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

export async function bootMainModule({ saved = new Map() } = {}) {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const elements = {};
  for (const [, tag, attrs, id] of html.matchAll(/<(\w+)([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const element = elements[id] = new Element(tag);
    element.hidden = /\shidden\b/.test(attrs);
    element.value = attrs.match(/value="([^"]*)"/)?.[1] ?? "";
    for (const dim of ["width", "height"]) element[dim] = Number(attrs.match(new RegExp(`${dim}="(\\d+)"`))?.[1]) || element[dim];
  }
  const doc = new Element("document");
  doc.body = new Element("body"); doc.documentElement = new Element("html");
  doc.querySelector = (selector) => elements[selector.slice(1)] ?? null;
  doc.createElement = (tag) => new Element(tag);
  const win = new Element("window");
  win.localStorage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: (key) => saved.delete(key) };
  win.sessionStorage = win.localStorage;
  win.navigator = { userAgent: "Test", platform: "Test", maxTouchPoints: 0 };
  win.matchMedia = () => ({ matches: false, addEventListener() {} });
  win.visualViewport = { addEventListener() {} };
  let now = performance.now(), raf = [], timerId = 10000;
  const timers = new Map();
  win.setTimeout = (fn, delay) => { timers.set(++timerId, { fn, at: now + delay }); return timerId; };
  const nativeClearTimeout = globalThis.clearTimeout;
  globalThis.clearTimeout = (id) => { if (timers.has(id)) timers.delete(id); else nativeClearTimeout(id); };
  globalThis.document = doc; globalThis.window = win;
  globalThis.Image = class { constructor() { this.width = 1280; this.height = 640; } set src(_) { queueMicrotask(() => this.onload?.()); } };
  globalThis.requestAnimationFrame = (fn) => { raf.push(fn); return raf.length; };
  const advance = (frames) => {
    for (let frame = 0; frame < frames; frame++) {
      now += 1000 / 60;
      const callbacks = raf; raf = [];
      for (const fn of callbacks) fn(now);
      for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.fn(); }
    }
  };
  await import("../src/main.js");
  await new Promise((resolve) => setImmediate(resolve));
  advance(2);
  const shoot = (pull) => {
    elements.gameCanvas.dispatch("pointerdown", { clientX: 173, clientY: 455, pointerId: 1 });
    elements.gameCanvas.dispatch("pointermove", { clientX: pull.x, clientY: pull.y, pointerId: 1 });
    elements.gameCanvas.dispatch("pointerup", { clientX: pull.x, clientY: pull.y, pointerId: 1 });
  };
  const restoreTimers = () => { globalThis.clearTimeout = nativeClearTimeout; };
  return { elements, saved, advance, shoot, restoreTimers };
}
