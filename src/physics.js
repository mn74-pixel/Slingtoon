// One deterministic solver for the live game, previews and replays.
export const FIXED_STEP = 1 / 120;
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const magnitude = (p) => Math.hypot(p.x, p.y);
export const contains = (r, p) => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

export function segmentDistance(a, b, p) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
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

export function resolveContact(position, velocity, contact, restitution = 0.5) {
  if (!contact) return 0;
  position.x += contact.nx * (contact.depth + 0.01);
  position.y += contact.ny * (contact.depth + 0.01);
  const normalSpeed = velocity.x * contact.nx + velocity.y * contact.ny;
  if (normalSpeed >= 0) return 0; // Separating bodies never receive another kick.
  velocity.x -= (1 + restitution) * normalSpeed * contact.nx;
  velocity.y -= (1 + restitution) * normalSpeed * contact.ny;
  return -normalSpeed;
}

export function stepPhysics(model, dt = FIXED_STEP) {
  const p = model.avatarPosition, v = model.avatarVelocity, radius = model.avatarRadius;
  let before = { ...p };
  model.flightTime += dt;
  model.portalCooldown = Math.max(0, model.portalCooldown - dt);
  v.y += 620 * model.gravityScale * dt;
  for (const item of model.interactions) {
    if (item.type === "steam" && contains(item, p)) {
      v.x += item.force.x * model.fanScale * dt;
      v.y += item.force.y * model.fanScale * dt;
      model.markInteraction(item, "steam");
    }
  }
  const drag = Math.exp(-0.045 * dt);
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
        const speed = resolveContact(p, v, contact, 0.2);
        if (speed > 90) model.triggerImpact(speed, p.x, p.y, "cardboard");
      }
    }
    if (item.type === "solid" || (item.type === "gate" && !model.objectState[item.switchId])) {
      const speed = resolveContact(p, v, rectContact(p, radius, item), 0.4 * model.bounceScale);
      if (speed > 90) model.triggerImpact(speed, p.x, p.y, item.type);
    }
    if (item.type === "cushion") {
      const speed = resolveContact(p, v, lineContact(p, radius, item), 1.05 * model.bounceScale);
      if (speed > 70) {
        model.markInteraction(item, "cushion");
        model.triggerImpact(speed, p.x, p.y, "cushion");
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
        model.triggerImpact(Math.abs(v.y), p.x, item.y, "water");
      } else if (p.y > item.y + radius * 0.6) {
        model.failureReason = "Za stromo! Płaski lot pozwala zrobić kaczkę. Tę drugą.";
        model.finishAttempt(false);
        return;
      }
    }
  }

  if (p.y + radius > model.groundY) {
    const speed = resolveContact(p, v, { nx: 0, ny: -1, depth: p.y + radius - model.groundY }, 0.25 * model.bounceScale);
    if (speed > 90) model.triggerImpact(speed, p.x, model.groundY, "ground");
    if (Math.abs(v.y) < 35) v.y = 0;
    v.x *= Math.exp(-3.5 * dt);
  }

  const star = model.level.star;
  if (star && !model.collectedStar && segmentDistance(before, p, star) <= radius + 19) {
    model.collectedStar = true;
    model.emit("collect", { x: star.x, y: star.y });
  }
  model.closestGoal = Math.min(model.closestGoal, segmentDistance(before, p, model.goalCentre) - radius - model.goalRadius);
  if (model.objectiveMet && segmentDistance(before, p, model.goalCentre) <= radius + model.goalRadius) {
    model.finishAttempt(true);
    return;
  }
  model.rotation = Math.atan2(v.y, v.x);
  const grounded = p.y + radius >= model.groundY - 1 && magnitude(v) < 100;
  model.settledTime = grounded ? model.settledTime + dt : 0;
  if (p.x < -120 || p.x > 1410 || p.y > 760 || model.flightTime > 6 || model.settledTime > 0.28) {
    model.failureReason = !model.objectiveMet && model.closestGoal < 30
      ? model.level.requirement
      : model.closestGoal < 65 ? "O włos! Zmień naciągnięcie tylko odrobinę." : "Spróbuj innego kąta. Godność jest odnawialna.";
    model.finishAttempt(false);
  }
}
