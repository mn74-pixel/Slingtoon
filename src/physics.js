// One deterministic solver for the live game, previews and replays.
export const FIXED_STEP = 1 / 120;
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const magnitude = (p) => Math.hypot(p.x, p.y);
export const contains = (r, p) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
export const gateIsOpen = (item, state) => (item.switchIds ?? [item.switchId]).every((id) => state[id]);

// Obstacles that move follow the shot clock, not the wall clock: they rest at
// their drawn position until launch, so a route stays learnable and replayable.
export function itemShift(item, time) {
  return item.motion ? Math.sin(time * item.motion.speed) * item.motion.amplitude : 0;
}

// A pendulum is not a body sliding back and forth: it swings on an arc and moves
// fastest at the bottom of it. The angle follows a real swing, so two pendulums
// of different lengths visibly keep different time — which is the whole lesson.
export function pendulumAngle(item, time) {
  return item.pendulum.swing * Math.cos(time * item.pendulum.speed + (item.pendulum.phase ?? 0));
}

export function pendulumBob(item, time) {
  const angle = pendulumAngle(item, time);
  return {
    x: item.pendulum.x + Math.sin(angle) * item.pendulum.length,
    y: item.pendulum.y + Math.cos(angle) * item.pendulum.length,
  };
}

export function movedBody(item, time) {
  if (item.pendulum) {
    const bob = pendulumBob(item, time);
    return { ...item, x: bob.x - item.width / 2, y: bob.y - item.height / 2 };
  }
  if (!item.motion) return item;
  const shift = itemShift(item, time);
  return item.motion.axis === "x"
    ? { ...item, x: item.x + shift }
    : { ...item, y: item.y + shift };
}

export function segmentDistance(a, b, p) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}

export function rectGap(p, radius, r) {
  const x = clamp(p.x, r.x, r.x + r.width), y = clamp(p.y, r.y, r.y + r.height);
  return Math.hypot(p.x - x, p.y - y) - radius;
}

export function rectContact(p, radius, r) {
  const x = clamp(p.x, r.x, r.x + r.width), y = clamp(p.y, r.y, r.y + r.height);
  const dx = p.x - x, dy = p.y - y, distance = Math.hypot(dx, dy);
  if (distance >= radius) return null;
  if (distance > 0.00001) return { nx: dx / distance, ny: dy / distance, depth: radius - distance };
  const faces = [
    { nx: -1, ny: 0, depth: radius + p.x - r.x },
    { nx: 1, ny: 0, depth: radius + r.x + r.width - p.x },
    { nx: 0, ny: -1, depth: radius + p.y - r.y },
    { nx: 0, ny: 1, depth: radius + r.y + r.height - p.y },
  ];
  return faces.reduce((nearest, face) => face.depth < nearest.depth ? face : nearest);
}

export function lineContact(p, radius, line) {
  const dx = line.b.x - line.a.x, dy = line.b.y - line.a.y;
  const t = clamp(((p.x - line.a.x) * dx + (p.y - line.a.y) * dy) / (dx * dx + dy * dy), 0, 1);
  const px = p.x - line.a.x - dx * t, py = p.y - line.a.y - dy * t;
  const distance = Math.hypot(px, py), totalRadius = radius + (line.thickness ?? 12);
  if (distance >= totalRadius) return null;
  if (distance < 0.00001) return { nx: dy / Math.hypot(dx, dy), ny: -dx / Math.hypot(dx, dy), depth: totalRadius };
  return { nx: px / distance, ny: py / distance, depth: totalRadius - distance };
}

export function resolveContact(position, velocity, contact, restitution = 0.5, body = null) {
  if (!contact) return 0;
  position.x += contact.nx * (contact.depth + 0.01);
  position.y += contact.ny * (contact.depth + 0.01);
  const normalSpeed = velocity.x * contact.nx + velocity.y * contact.ny;
  if (normalSpeed >= 0) return 0; // Separating bodies never receive another kick.
  if (body) {
    // Remembered so the impact can say which way the surface faced: the sparks
    // spray back off it instead of through it.
    body.contactNormal = { x: contact.nx, y: contact.ny };
    kickBody(body, contact, velocity, -normalSpeed);
  }
  velocity.x -= (1 + restitution) * normalSpeed * contact.nx;
  velocity.y -= (1 + restitution) * normalSpeed * contact.ny;
  return -normalSpeed;
}

// THE BODY. The hero used to be drawn at atan2(velocity): a bounce back to the
// left turned them upside down (7.8% of all flight frames, in 57 of 615 test
// flights) and every rebound spun the drawing 180 degrees in a single frame,
// 300 times across those flights. A person is not an arrow.
//
// So the body is a body: it faces the way it travels (and turns around rather
// than flipping over), leans into the arc but never past BODY_LEAN, and carries
// its own angular velocity. A hard hit sets it tumbling and the air rights it
// again, like a cat. All of it is angular state only: contacts stay
// frictionless, so not one trajectory in the campaign moves — the routes,
// previews and replays certified against this solver all still hold.
export const BODY_LEAN = 0.9;          // ~52 degrees: leaning, never lying down
export const BODY_RIGHTING = 55;       // how hard the air pulls the body to its lean (1/s^2)
export const BODY_DAMPING = 7;         // 1/s; ~0.47 of critical — one small overshoot, then still
export const BODY_GROUND_DAMPING = 16; // sliding along the floor is not a place to cartwheel
export const BODY_MAX_SPIN = 14;       // rad/s; a tumble, not a propeller
const FACING_SPEED = 60;               // px/s of sideways travel needed to turn around
const HIT_SPEED = 90;                  // the same line triggerImpact draws for a real hit

export function leanFor(velocity, facing) {
  return facing * clamp(Math.atan2(velocity.y, Math.abs(velocity.x)), -BODY_LEAN, BODY_LEAN);
}

export function startBody(model) {
  const v = model.avatarVelocity;
  model.facing = v.x < 0 ? -1 : 1;
  model.bodyAngle = leanFor(v, model.facing);
  model.spin = 0;
  model.turnedAt = -1;
}

// What a contact would do to the body if it had grip. The solver's contacts are
// frictionless — that keeps every route exactly where it was certified — so the
// spin is what the drawing would do, never something the trajectory feels.
export function kickBody(model, contact, velocity, hitSpeed) {
  if (hitSpeed <= HIT_SPEED) return;
  const along = velocity.x * contact.nx + velocity.y * contact.ny;
  const tx = velocity.x - along * contact.nx, ty = velocity.y - along * contact.ny;
  // Rolling direction: the normal crossed with the sliding velocity. Canvas y
  // points down, so positive is clockwise — a ball rolling right on a floor.
  const roll = (contact.nx * ty - contact.ny * tx) / model.avatarRadius;
  // A head-on hit pitches the head back, away from what it ran into.
  const recoil = -(model.facing ?? 1) * Math.abs(contact.nx) * hitSpeed / model.avatarRadius;
  model.spin = clamp((model.spin ?? 0) + roll * 0.35 + recoil * 0.12, -BODY_MAX_SPIN, BODY_MAX_SPIN);
}

export function stepBody(model, dt) {
  const v = model.avatarVelocity;
  if (model.facing === undefined) startBody(model);
  if (Math.abs(v.x) > FACING_SPEED && Math.sign(v.x) !== model.facing) {
    model.facing = Math.sign(v.x);
    // Turning around mirrors the drawing, so the lean mirrors with it: the
    // body keeps pointing where it pointed, it just looks the other way.
    model.bodyAngle = -model.bodyAngle;
    model.spin = -model.spin;
    model.turnedAt = model.flightTime;
  }
  const grounded = model.avatarPosition.y + model.avatarRadius >= model.groundY - 1;
  const target = grounded ? 0 : leanFor(v, model.facing);
  let offset = model.bodyAngle - target;
  // Tumbling past a full turn must come back the short way, not unwind.
  offset = Math.atan2(Math.sin(offset), Math.cos(offset));
  const damping = grounded ? BODY_GROUND_DAMPING : BODY_DAMPING;
  model.spin += (-offset * BODY_RIGHTING - model.spin * damping) * dt;
  model.spin = clamp(model.spin, -BODY_MAX_SPIN, BODY_MAX_SPIN);
  model.bodyAngle = Math.atan2(Math.sin(target + offset + model.spin * dt), Math.cos(target + offset + model.spin * dt));
}

export function stepPhysics(model, dt = FIXED_STEP) {
  const p = model.avatarPosition, v = model.avatarVelocity, radius = model.avatarRadius;
  let before = { ...p };
  model.flightTime += dt;
  model.portalCooldown = Math.max(0, model.portalCooldown - dt);
  v.y += 620 * model.gravityScale * dt;
  let resistance = model.level.environment?.drag ?? 0;
  // Nearest danger this step, so the hero can brace before the hit rather than
  // discover it afterwards. Reset each step: a hazard passed is no longer news.
  model.hazardGap = Infinity;
  for (const item of model.interactions) {
    if (item.type === "hazard") model.hazardGap = Math.min(model.hazardGap, rectGap(p, radius, movedBody(item, model.flightTime)));
    const distance = Math.hypot(p.x - item.x, p.y - item.y);
    const inFlow = (item.type === "steam" || item.type === "current") && contains(item, p);
    const inBubble = item.type === "bubble" && distance < item.radius;
    if (inFlow || inBubble) {
      const power = item.type === "steam" ? model.fanScale : 1;
      v.x += item.force.x * power * dt;
      v.y += item.force.y * power * dt;
      resistance += item.drag ?? 0;
      model.markInteraction(item, item.type);
    }
    if (item.type === "gravity" && distance < item.radius) {
      // A bounded, continuous field; its visible core is a real collider.
      const force = item.strength * (1 - distance / item.radius) / Math.max(distance, 30);
      v.x += (item.x - p.x) * force * dt;
      v.y += (item.y - p.y) * force * dt;
      model.markInteraction(item, "gravity");
      const core = (item.coreRadius ?? 26) + radius;
      if (distance < core) {
        const contact = distance > .001
          ? { nx: (p.x - item.x) / distance, ny: (p.y - item.y) / distance, depth: core - distance }
          : { nx: 0, ny: -1, depth: core };
        const speed = resolveContact(p, v, contact, .45, model);
        if (speed > 90) model.triggerImpact(speed, p.x, p.y, "planet");
      }
    }
  }
  const drag = Math.exp(-(.045 + resistance) * dt);
  v.x = clamp(v.x * drag, -1500, 1500);
  v.y = clamp(v.y * drag, -1500, 1500);
  p.x += v.x * dt;
  p.y += v.y * dt;

  for (const item of model.interactions) {
    const active = model.objectState[item.id];
    if (item.type === "portal" && model.portalCooldown === 0 && segmentDistance(before, p, item.entry) < radius + item.radius) {
      const angle = item.turn ?? 0, vx = v.x;
      v.x = vx * Math.cos(angle) - v.y * Math.sin(angle);
      v.y = vx * Math.sin(angle) + v.y * Math.cos(angle);
      p.x = item.exit.x; p.y = item.exit.y;
      before = { ...p }; // Never collide along the teleport jump.
      model.portalCooldown = 0.4;
      model.markInteraction(item, "portal");
    }
    if (item.type === "switch" && !active && segmentDistance(before, p, item) < radius + item.radius) {
      model.objectState[item.id] = true;
      model.markInteraction(item, "switch");
    }
    if (item.type === "breakable" && !active) {
      const contact = rectContact(p, radius, item);
      if (contact && magnitude(v) > 180) {
        model.objectState[item.id] = true;
        v.x *= 0.88; v.y *= 0.88;
        model.markInteraction(item, "break");
      } else if (contact) {
        const speed = resolveContact(p, v, contact, 0.2, model);
        if (speed > 90) model.triggerImpact(speed, p.x, p.y, "cardboard");
      }
    }
    // A hazard is the only object that ends a flight on touch. It is drawn in
    // danger coral with spikes so the rule is readable before the first shot.
    if (item.type === "hazard" && rectContact(p, radius, movedBody(item, model.flightTime))) {
      model.failureReason = item.failure ?? "Strefa zakazana! Poprowadź tor obok niej, nie przez nią.";
      model.finishAttempt(false);
      return;
    }
    if (item.type === "solid" || (item.type === "gate" && !gateIsOpen(item, model.objectState))) {
      const speed = resolveContact(p, v, rectContact(p, radius, movedBody(item, model.flightTime)), 0.4 * model.bounceScale, model);
      if (speed > 90) model.triggerImpact(speed, p.x, p.y, item.type);
    }
    if (item.type === "cushion") {
      const speed = resolveContact(p, v, lineContact(p, radius, item), 1.05 * model.bounceScale, model);
      if (speed > 70) {
        model.markInteraction(item, "cushion");
        model.triggerImpact(speed, p.x, p.y, "cushion");
      }
    }
    // A spring stores what it is given. Arriving gently it barely answers;
    // arriving fast it hands the energy back with interest, so the player learns
    // that the launch they get is the landing they brought.
    if (item.type === "spring") {
      const incoming = magnitude(v);
      const charge = clamp((incoming - (item.threshold ?? 180)) / 520, 0, 1);
      const bounce = (item.base ?? 0.55) + charge * (item.gain ?? 1.15);
      const speed = resolveContact(p, v, lineContact(p, radius, item), bounce * model.bounceScale, model);
      if (speed > 60) {
        model.markInteraction(item, "spring");
        model.triggerImpact(speed, p.x, p.y, "spring");
      }
    }
    if (item.type === "water" && p.x > item.x && p.x < item.x + item.width) {
      const crossesSurface = before.y + radius <= item.y + 1 && p.y + radius >= item.y && v.y > 0;
      if (crossesSurface && model.waterSkips < 2 && Math.abs(v.x) > 220 && v.y < 650) {
        p.y = item.y - radius - 0.1;
        v.y = -Math.abs(v.y) * 0.72;
        v.x *= 0.94;
        model.waterSkips += 1;
        model.markInteraction(item, "water");
        model.contactNormal = { x: 0, y: -1 };
        model.triggerImpact(Math.abs(v.y), p.x, item.y, "water");
      } else if (p.y > item.y + radius * 0.6) {
        model.failureReason = "Za stromo! Płaski lot pozwala zrobić kaczkę. Tę drugą.";
        model.finishAttempt(false);
        return;
      }
    }
  }

  if (p.y + radius > model.groundY) {
    const speed = resolveContact(p, v, { nx: 0, ny: -1, depth: p.y + radius - model.groundY }, 0.25 * model.bounceScale, model);
    if (speed > 90) model.triggerImpact(speed, p.x, model.groundY, "ground");
    if (Math.abs(v.y) < 35) v.y = 0;
    v.x *= Math.exp(-3.5 * dt);
  }

  const star = model.level.star;
  if (star && !model.collectedStar && segmentDistance(before, p, star) <= radius + 19) {
    model.collectedStar = true;
    model.emit("collect", { x: star.x, y: star.y });
  }
  const goalGap = segmentDistance(before, p, model.goalCentre) - radius - model.goalRadius;
  // The closest approach explains a miss after the fact; the live gap is what
  // the hero can react to while the shot is still in the air.
  model.goalGap = goalGap;
  if (goalGap < model.closestGoal) {
    model.closestGoal = goalGap;
    // Remember where the shot came closest, so a miss can say which way it was
    // wrong instead of offering the same shrug every time.
    model.closestGoalPoint = { x: p.x, y: p.y };
  }
  if (model.objectiveMet && segmentDistance(before, p, model.goalCentre) <= radius + model.goalRadius) {
    model.finishAttempt(true);
    return;
  }
  model.rotation = Math.atan2(v.y, v.x);
  stepBody(model, dt);
  const grounded = p.y + radius >= model.groundY - 1 && magnitude(v) < 100;
  model.settledTime = grounded ? model.settledTime + dt : 0;
  if (p.x < -120 || p.x > 1410 || p.y > 760 || model.flightTime > 6 || model.settledTime > 0.28) {
    model.failureReason = describeMiss(model);
    model.finishAttempt(false);
  }
}

// A player who retries a lot learns from the miss or from nothing at all. The
// closest approach says which way the shot was wrong, so the advice names a
// direction to correct rather than repeating "try another angle".
export function describeMiss(model) {
  if (!model.objectiveMet && model.closestGoal < 30) return model.level.requirement;
  const point = model.closestGoalPoint;
  if (!point) return "Lot skończył się daleko od celu. Spróbuj zupełnie innego naciągnięcia.";
  const goal = model.goalCentre;
  const dx = point.x - goal.x, dy = point.y - goal.y;
  const grazed = model.closestGoal < 45;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0
      ? grazed ? "Zabrakło kawałka w prawo. Naciągnij odrobinę mocniej." : "Za krótko. Naciągnij wyraźnie mocniej."
      : grazed ? "Minąłeś cel z prawej. Odpuść odrobinę naciągu." : "Za daleko. Naciągnij wyraźnie słabiej.";
  }
  return dy < 0
    ? grazed ? "Przeszedłeś tuż nad celem. Celuj odrobinę płasko." : "Za wysoko. Spłaszcz łuk."
    : grazed ? "Przeszedłeś tuż pod celem. Podnieś łuk odrobinę." : "Za nisko. Unieś łuk.";
}

// Where a shadow cast straight down from (x, y) lands: the top of the first
// thing the hero would actually stand on, or the floor. The shadow used to be
// painted on the floor line whatever was in between, so over a table or a
// crate it sat on the crate's front face — a depth cue pointing at the wrong
// surface. Only what the solver collides with counts; a portal or a fan does
// not catch a shadow.
export function surfaceBelow(model, x, y) {
  let best = model.groundY;
  for (const item of model.interactions) {
    const open = item.type === "gate" && gateIsOpen(item, model.objectState);
    const broken = item.type === "breakable" && model.objectState[item.id];
    if ((item.type === "solid" || item.type === "gate" || item.type === "breakable") && !open && !broken) {
      const body = movedBody(item, model.flightTime);
      if (x >= body.x && x <= body.x + body.width && body.y >= y && body.y < best) best = body.y;
    } else if (item.type === "cushion" || item.type === "spring") {
      const { a, b } = item;
      const low = Math.min(a.x, b.x), high = Math.max(a.x, b.x);
      if (high - low < 1 || x < low || x > high) continue;
      const top = a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x) - (item.thickness ?? 12);
      if (top >= y && top < best) best = top;
    } else if (item.type === "water" && x >= item.x && x <= item.x + item.width && item.y >= y && item.y < best) {
      best = item.y;
    }
  }
  return best;
}
