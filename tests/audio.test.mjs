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
