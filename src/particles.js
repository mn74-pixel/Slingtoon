// The effects obeyed half a physics.
//
// Impact sparks sprayed a full circle, so half of every burst flew INTO the
// wall the hero had just hit; nothing stopped at the floor, so sparks and
// confetti fell straight through it and out of the bottom of the screen;
// confetti dropped like gravel because paper had no air to fall through; and
// every particle came from Math.random, so no two offline renders of the same
// flight agreed. This module is the other half: a cone around the contact
// normal, a floor, air drag, flutter, and a seeded random so the same flight
// throws the same sparks. Pure functions, no canvas — tests/particles.test.mjs
// holds every rule without drawing a pixel.

// mulberry32: tiny, fast, good enough for sparks, and identical everywhere.
export function createRng(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Half-angle of the spray cone. A hit throws debris back off the surface, a
// little along it, never through it.
export const SPRAY_HALF_ANGLE = 1.15;   // ~66 degrees each side of the normal
export const FLOOR_BOUNCE = 0.32;       // a spark keeps a third of its fall
export const FLOOR_GRIP = 6;            // 1/s: debris skids to a stop, it does not glide
const REST_SPEED = 40;                  // px/s: below this a bounce is a landing

export function sprayAngle(random, normal) {
  if (!normal || !(Math.abs(normal.x) + Math.abs(normal.y) > 0)) return random() * Math.PI * 2;
  return Math.atan2(normal.y, normal.x) + (random() * 2 - 1) * SPRAY_HALF_ANGLE;
}

export function stepParticle(particle, dt, floorY = Infinity) {
  particle.age += dt;
  const v = particle.velocity;
  if (particle.drag) {
    const keep = Math.exp(-particle.drag * dt);
    v.x *= keep;
    v.y *= keep;
  }
  v.y += particle.gravity * dt;
  // Paper does not fall, it wanders down: a sideways push that swings with the
  // flake's own clock.
  if (particle.sway) v.x += Math.sin(particle.age * particle.flutter + particle.phase) * particle.sway * dt;
  particle.x += v.x * dt;
  particle.y += v.y * dt;
  // A spark is a streak along its motion, so it points where it is going.
  if (particle.kind === "spark") particle.rotation = Math.atan2(v.y, v.x);
  else particle.rotation += particle.spin * dt;
  const bottom = floorY - particle.size * 0.5;
  if (particle.y > bottom) {
    particle.y = bottom;
    if (v.y > 0) v.y = v.y < REST_SPEED ? 0 : -v.y * FLOOR_BOUNCE;
    v.x *= Math.exp(-FLOOR_GRIP * dt);
    particle.spin *= Math.exp(-FLOOR_GRIP * dt);
    particle.grounded = true;
  }
  return particle;
}
