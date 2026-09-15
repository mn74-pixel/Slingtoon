import test from "node:test";
import assert from "node:assert/strict";
import { GameAudio } from "../src/audio.js";

function fakeContext() {
  const scheduled = [];
  const param = { setValueAtTime(value) { assert.ok(Number.isFinite(value)); }, exponentialRampToValueAtTime(value) { assert.ok(value > 0 && Number.isFinite(value)); } };
  return {
    scheduled, currentTime: 0, sampleRate: 8000, destination: {}, state: "running",
    createOscillator: () => ({ frequency: param, connect() {}, disconnect() {}, start(time) { scheduled.push({ type: "tone", time }); }, stop() {} }),
    createGain: () => ({ gain: param, connect() {}, disconnect() {} }),
    createBuffer: (_, count) => ({ getChannelData: () => new Float32Array(count) }),
    createBufferSource: () => ({ connect() {}, disconnect() {}, start(time) { scheduled.push({ type: "noise", time }); } }),
    suspend: async () => {}, resume: async () => {},
  };
}
test("each new important interaction schedules bounded audio and mute silences it", () => {
  const audio = new GameAudio(); audio.context = fakeContext();
  for (const event of [{ type: "air-move" }, { type: "collect" }, ...["break", "portal", "steam", "current", "bubble", "gravity", "switch"].map((kind) => ({ type: "interaction", kind }))]) {
    const before = audio.context.scheduled.length;
    audio.handleGameEvent(event);
    const count = audio.context.scheduled.length - before;
    assert.ok(count >= 1 && count <= 3);
  }
  audio.setMuted(true);
  const before = audio.context.scheduled.length;
  audio.handleGameEvent({ type: "air-move" });
  assert.equal(audio.context.scheduled.length, before);
});
test("impact spam is throttled and later contacts can sound again", () => {
  const audio = new GameAudio(); audio.context = fakeContext();
  for (let i = 0; i < 100; i++) audio.impact(400, "cushion");
  assert.equal(audio.context.scheduled.length, 2);
  audio.context.currentTime = .1; audio.impact(400, "water");
  assert.equal(audio.context.scheduled.length, 5);
});

// Records the exact pitch of every oscillator, so "it varies now" is a measured
// claim rather than a hopeful one.
function recordingContext() {
  const tones = [];
  let pending = null;
  const context = {
    tones, currentTime: 0, sampleRate: 8000, destination: {}, state: "running",
    createOscillator: () => {
      const entry = { start: null, end: null, at: null };
      pending = entry;
      return {
        frequency: {
          setValueAtTime(value) { entry.start = value; },
          exponentialRampToValueAtTime(value) { entry.end = value; },
        },
        connect() {}, disconnect() {},
        start(time) { entry.at = time; tones.push(entry); }, stop() {},
      };
    },
    createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
    createBuffer: (_, count) => ({ getChannelData: () => new Float32Array(count) }),
    createBufferSource: () => ({ connect() {}, disconnect() {}, start() {} }),
    suspend: async () => {}, resume: async () => {},
  };
  return context;
}

const fire = (event, times) => {
  const audio = new GameAudio();
  audio.context = recordingContext();
  for (let i = 0; i < times; i += 1) {
    audio.lastImpactAt = -999;
    audio.handleGameEvent(event);
  }
  return audio.context.tones;
};

test("no sound a player hears repeatedly is byte-identical twice running", () => {
  // The miss is the one you hear most, because missing is the default outcome.
  for (const event of [
    { type: "failure" }, { type: "air-move" }, { type: "dive-move" }, { type: "collect" },
    { type: "hint" }, { type: "move-complete" },
    ...["portal", "break", "steam", "current", "bubble", "gravity", "switch"].map((kind) => ({ type: "interaction", kind })),
  ]) {
    const tones = fire(event, 12).map((tone) => tone.start);
    assert.ok(tones.length > 0, `${event.kind ?? event.type} makes no tone at all`);
    const distinct = new Set(tones.map((value) => value.toFixed(4)));
    assert.ok(distinct.size > tones.length / 2, `${event.kind ?? event.type} repeats the same pitch: ${distinct.size} distinct out of ${tones.length}`);
  }
});

test("the variation is small enough to read as the same sound, not a wrong one", () => {
  // The miss is two layered tones. Spread has to be measured per layer: comparing
  // the low partial against the high one measures the chord, not the jitter.
  const runs = 400, all = fire({ type: "failure" }, runs);
  const perEvent = all.length / runs;
  assert.ok(Number.isInteger(perEvent) && perEvent >= 2, `expected a fixed layer count, got ${all.length} tones over ${runs} runs`);
  for (let layer = 0; layer < perEvent; layer += 1) {
    const pitches = all.filter((_, index) => index % perEvent === layer).map((tone) => tone.start);
    const cents = Math.abs(1200 * Math.log2(Math.max(...pitches) / Math.min(...pitches)));
    // 35 cents either way is about 2% — a mouth making the noise again.
    assert.ok(cents < 150, `layer ${layer} of the miss drifts ${cents.toFixed(0)} cents, which stops sounding like the same sound`);
    assert.ok(cents > 20, `layer ${layer} of the miss only drifts ${cents.toFixed(0)} cents, which nobody can hear`);
  }
});

test("the victory arpeggio transposes as a whole and never detunes against itself", () => {
  for (let run = 0; run < 40; run += 1) {
    const tones = fire({ type: "success", goalKind: "alarm" }, 1).slice(0, 4).map((tone) => tone.start);
    assert.equal(tones.length, 4);
    // G-C-E-G stays G-C-E-G: every interval must survive the transpose exactly.
    const intervals = [523.25 / 392, 659.25 / 523.25, 783.99 / 659.25];
    for (let i = 0; i < 3; i += 1) {
      assert.ok(Math.abs(tones[i + 1] / tones[i] - intervals[i]) < 1e-9,
        `run ${run} bent the chord: interval ${i} came out ${(tones[i + 1] / tones[i]).toFixed(6)}`);
    }
  }
  // ...and it is not the same key every time.
  const roots = new Set();
  for (let run = 0; run < 60; run += 1) roots.add(fire({ type: "success", goalKind: "alarm" }, 1)[0].start.toFixed(3));
  assert.ok(roots.size >= 4, `the win only ever plays in ${roots.size} key(s)`);
});
