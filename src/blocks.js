// Towers: a small rigid-body world of boxes that stand, topple and break.
//
// Everything else in SlingToon is the hero against fixed furniture. A tower is
// the other half of a slingshot game: a stack the hero hits, which leans,
// slides, falls over and takes its neighbours with it. That needs real rigid
// bodies — rotation, stacking contact, friction — so this is a compact port of
// the sequential-impulse solver from Erin Catto's Box2D-Lite: box-versus-box
// contact by clipping, accumulated impulses with warm starting (which is what
// lets a stack stand still instead of jittering apart), Coulomb friction, and
// sleeping. It runs on the solver's own fixed 1/120 step and uses no clock and
// no randomness, so a replay, the trajectory preview and an offline render all
// see exactly the same collapse.
//
// The hero takes part as a heavy disc: it pushes blocks and blocks push it
// back, with friction, so a shot that buries itself in a wall stops there.

// Box2D-Lite's tuning, scaled to pixels and to the 1/120 step.
const ITERATIONS = 12;
const BAUMGARTE = 0.2;
const SLOP = 0.6;               // px of overlap allowed before position correction
const RESTITUTION_SPEED = 90;   // px/s: slower impacts do not bounce at all
const SLEEP_SPEED = 6;          // px/s
const SLEEP_SPIN = 0.06;        // rad/s
const SLEEP_SECONDS = 0.45;

// Densities are per square pixel; a 110x22 wooden plank weighs about 1.
export const MATERIALS = Object.freeze({
  // Strength is in px/s of closing speed beyond DAMAGE_SPEED, summed over
  // blows: glass gives way to one solid hit, wood to two or three, stone
  // shrugs off almost anything the hero can deliver.
  wood: { density: 0.0004, friction: 0.55, restitution: 0.12, strength: 900, colour: "#c98a4a" },
  glass: { density: 0.00025, friction: 0.25, restitution: 0.08, strength: 300, colour: "#9fe3f0" },
  stone: { density: 0.0011, friction: 0.7, restitution: 0.05, strength: 2600, colour: "#8f8aa6" },
  // A direct, hard hit breaks the target; at 900 only a fall to the floor did,
  // and a fort with walls (mission 94) could not be won by a clean shot at all.
  target: { density: 0.0005, friction: 0.6, restitution: 0.1, strength: 450, colour: "#ff6078" },
});

// The hero is dense compared with a plank: a full-power shot has to be able to
// shove a stone block, and a plank must not stop it dead.
export const HERO_MASS = 4.2;
const HERO_FRICTION = 0.45;

// Below this closing speed a contact is resting or nudging, not a blow.
const DAMAGE_SPEED = 110;

const cross = (ax, ay, bx, by) => ax * by - ay * bx;

export function createBody(spec, id) {
  const material = MATERIALS[spec.material] ?? MATERIALS.wood;
  const mass = material.density * spec.width * spec.height * (spec.massScale ?? 1);
  const inertia = (mass * (spec.width * spec.width + spec.height * spec.height)) / 12;
  return {
    id: spec.id ?? `block-${id}`,
    material: spec.material ?? "wood",
    target: Boolean(spec.target),
    kind: spec.kind,
    width: spec.width,
    height: spec.height,
    x: spec.x,
    y: spec.y,
    angle: spec.angle ?? 0,
    vx: 0, vy: 0, spin: 0,
    invMass: 1 / mass,
    invInertia: 1 / inertia,
    friction: material.friction,
    restitution: material.restitution,
    strength: spec.strength ?? material.strength,
    health: spec.strength ?? material.strength,
    asleep: true,
    still: SLEEP_SECONDS,
    broken: false,
  };
}

export function createWorld(specs = [], groundY = 586) {
  return { bodies: specs.map(createBody), groundY, contacts: new Map(), time: 0, breaks: [], hits: [] };
}

// The four corners of a box, in world coordinates, counter-clockwise from the
// local (+x, +y) corner.
function corners(body) {
  const c = Math.cos(body.angle), s = Math.sin(body.angle), hx = body.width / 2, hy = body.height / 2;
  return [[hx, hy], [-hx, hy], [-hx, -hy], [hx, -hy]].map(([lx, ly]) => ({ x: body.x + lx * c - ly * s, y: body.y + lx * s + ly * c }));
}

// Separating-axis test with Box2D-Lite style clipping: the reference face is
// the face of least penetration, the incident edge is the other box's edge
// most anti-parallel to it, clipped to the reference face's side planes.
// Returns up to two contact points with a feature key for warm starting.
function boxBox(a, b) {
  let best = null;
  for (const [ref, inc, flip] of [[a, b, false], [b, a, true]]) {
    const c = Math.cos(ref.angle), s = Math.sin(ref.angle);
    const axes = [{ x: c, y: s, half: ref.width / 2, face: 0 }, { x: -s, y: c, half: ref.height / 2, face: 1 }];
    const incCorners = corners(inc);
    for (const axis of axes) {
      for (const sign of [1, -1]) {
        const nx = axis.x * sign, ny = axis.y * sign;
        // Deepest incident point along -n relative to the reference face plane.
        const plane = nx * ref.x + ny * ref.y + axis.half;
        let deepest = Infinity;
        for (const p of incCorners) deepest = Math.min(deepest, nx * p.x + ny * p.y - plane);
        if (deepest > 0) return null; // a separating axis: no contact
        if (!best || deepest > best.separation) best = { separation: deepest, nx, ny, ref, inc, flip, face: axis.face * 2 + (sign > 0 ? 0 : 1), half: axis.half, axis };
      }
    }
  }
  const { ref, inc, nx, ny, flip } = best;
  // Incident edge: the one whose normal is most opposed to n.
  const ic = corners(inc);
  let edge = 0, most = Infinity;
  for (let i = 0; i < 4; i += 1) {
    const p = ic[i], q = ic[(i + 1) % 4];
    const ex = q.x - p.x, ey = q.y - p.y, len = Math.hypot(ex, ey);
    const enx = ey / len, eny = -ex / len; // outward for counter-clockwise corners
    const dot = enx * nx + eny * ny;
    if (dot < most) { most = dot; edge = i; }
  }
  let points = [ic[edge], ic[(edge + 1) % 4]];
  // Side planes of the reference face.
  const tx = -ny, ty = nx;
  const sideHalf = best.axis.face === 0 ? ref.height / 2 : ref.width / 2;
  const centreT = tx * ref.x + ty * ref.y;
  for (const [sign, limit] of [[1, centreT + sideHalf], [-1, -(centreT - sideHalf)]]) {
    const out = [];
    const d0 = sign * (tx * points[0].x + ty * points[0].y) - limit;
    const d1 = sign * (tx * points[1].x + ty * points[1].y) - limit;
    if (d0 <= 0) out.push(points[0]);
    if (d1 <= 0) out.push(points[1]);
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1);
      out.push({ x: points[0].x + (points[1].x - points[0].x) * t, y: points[0].y + (points[1].y - points[0].y) * t });
    }
    if (out.length < 2) { if (!out.length) return null; points = [out[0], out[0]]; } else points = out.slice(0, 2);
  }
  const plane = nx * ref.x + ny * ref.y + best.half;
  const contacts = [];
  points.forEach((p, i) => {
    const separation = nx * p.x + ny * p.y - plane;
    if (separation > 0) return;
    if (i === 1 && points[1] === points[0]) return;
    // Normal points from A to B for the solver.
    const sign = flip ? -1 : 1;
    contacts.push({ x: p.x - nx * separation * 0.5, y: p.y - ny * separation * 0.5, nx: nx * sign, ny: ny * sign, separation, key: `${flip ? 1 : 0}:${best.face}:${edge}:${i}` });
  });
  return contacts;
}

function boxGround(body, groundY) {
  const contacts = [];
  corners(body).forEach((p, i) => {
    const separation = groundY - p.y;
    if (separation <= 0) contacts.push({ x: p.x, y: groundY, nx: 0, ny: -1, separation, key: `g${i}` });
  });
  // A box resting flat touches with two corners; keep the deepest two so a
  // sinking edge never gets four competing points.
  return contacts.sort((a, b) => a.separation - b.separation).slice(0, 2);
}

function circleBox(circle, body) {
  const c = Math.cos(body.angle), s = Math.sin(body.angle);
  const dx = circle.x - body.x, dy = circle.y - body.y;
  const lx = dx * c + dy * s, ly = -dx * s + dy * c;
  const hx = body.width / 2, hy = body.height / 2;
  const cx = Math.max(-hx, Math.min(hx, lx)), cy = Math.max(-hy, Math.min(hy, ly));
  let px = lx - cx, py = ly - cy, distance = Math.hypot(px, py);
  let nlx, nly, separation;
  if (distance > 1e-6) {
    separation = distance - circle.radius;
    if (separation > 0) return null;
    nlx = px / distance; nly = py / distance;
  } else {
    // Centre inside the box: push out through the nearest face.
    const ex = hx - Math.abs(lx), ey = hy - Math.abs(ly);
    if (ex < ey) { nlx = Math.sign(lx) || 1; nly = 0; separation = -(ex + circle.radius); } else { nlx = 0; nly = Math.sign(ly) || 1; separation = -(ey + circle.radius); }
  }
  // Normal from box (A) to circle (B), in world space.
  const nx = nlx * c - nly * s, ny = nlx * s + nly * c;
  const wx = body.x + cx * c - cy * s, wy = body.y + cx * s + cy * c;
  return { x: wx, y: wy, nx, ny, separation, key: "c" };
}

function wake(body) { if (body && body.asleep) { body.asleep = false; body.still = 0; } }

// One fixed step. `hero` is { x, y, vx, vy, radius } or null; it is moved by
// the caller's own integrator, so here it only exchanges impulses and is
// pushed out of what it overlaps. Returns the hero's updated velocity.
export function stepWorld(world, dt, gravity, hero = null) {
  world.time += dt;
  world.breaks = [];
  world.hits = [];
  const bodies = world.bodies.filter((body) => !body.broken);
  for (const body of bodies) {
    if (body.asleep) continue;
    body.vy += gravity * dt;
    // A little air: towers settle instead of rocking forever.
    body.vx *= Math.exp(-0.05 * dt); body.vy *= Math.exp(-0.05 * dt); body.spin *= Math.exp(-0.6 * dt);
  }

  // Collect contacts. Pairs are keyed so last step's impulses warm-start this one.
  const heroBody = hero ? { id: "hero", x: hero.x, y: hero.y, angle: 0, vx: hero.vx, vy: hero.vy, spin: 0, invMass: 1 / HERO_MASS, invInertia: 0, friction: HERO_FRICTION, restitution: 0.25, asleep: false } : null;
  const ground = { id: "ground", x: 0, y: 0, vx: 0, vy: 0, spin: 0, invMass: 0, invInertia: 0, friction: 0.8, restitution: 0.1, asleep: false };
  const manifolds = [];
  for (let i = 0; i < bodies.length; i += 1) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j += 1) {
      const b = bodies[j];
      if (a.asleep && b.asleep) continue;
      if (Math.abs(a.x - b.x) > (a.width + a.height + b.width + b.height) / 2 || Math.abs(a.y - b.y) > (a.width + a.height + b.width + b.height) / 2) continue;
      const points = boxBox(a, b);
      if (points?.length) manifolds.push({ a, b, points, key: `${a.id}|${b.id}` });
    }
    if (!a.asleep) {
      const points = boxGround(a, world.groundY);
      if (points.length) manifolds.push({ a: ground, b: a, points, key: `ground|${a.id}` });
    }
    if (heroBody) {
      const point = circleBox({ x: hero.x, y: hero.y, radius: hero.radius }, a);
      if (point) {
        wake(a);
        manifolds.push({ a, b: heroBody, points: [point], key: `${a.id}|hero` });
      }
    }
  }
  // A moving body wakes what it touches, so a hit travels through the stack.
  // Only a MOVING one: two settling neighbours used to wake each other in turn
  // forever, and a fallen tower never came to rest.
  const moving = (body) => !body.asleep && (Math.hypot(body.vx, body.vy) > SLEEP_SPEED || Math.abs(body.spin) > SLEEP_SPIN);
  for (const m of manifolds) {
    if (moving(m.a) && m.b.asleep && m.b.invMass) wake(m.b);
    if (moving(m.b) && m.a.asleep && m.a.invMass) wake(m.a);
  }

  const previous = world.contacts, next = new Map();
  for (const m of manifolds) {
    const { a, b } = m;
    const friction = Math.sqrt(a.friction * b.friction);
    for (const p of m.points) {
      const ra = { x: p.x - a.x, y: p.y - a.y }, rb = { x: p.x - b.x, y: p.y - b.y };
      const rnA = cross(ra.x, ra.y, p.nx, p.ny), rnB = cross(rb.x, rb.y, p.nx, p.ny);
      const normalMass = 1 / (a.invMass + b.invMass + a.invInertia * rnA * rnA + b.invInertia * rnB * rnB);
      const tx = -p.ny, ty = p.nx;
      const rtA = cross(ra.x, ra.y, tx, ty), rtB = cross(rb.x, rb.y, tx, ty);
      const tangentMass = 1 / (a.invMass + b.invMass + a.invInertia * rtA * rtA + b.invInertia * rtB * rtB);
      const relN = (b.vx - b.spin * rb.y - a.vx + a.spin * ra.y) * p.nx + (b.vy + b.spin * rb.x - a.vy - a.spin * ra.x) * p.ny;
      const bounce = relN < -RESTITUTION_SPEED ? -Math.max(a.restitution, b.restitution) * relN : 0;
      const bias = -(BAUMGARTE / dt) * Math.min(0, p.separation + SLOP);
      const key = `${m.key}#${p.key}`;
      const warm = previous.get(key);
      const contact = { a, b, p, ra, rb, tx, ty, normalMass, tangentMass, friction, bias: Math.max(bias, bounce), pn: warm ? warm.pn : 0, pt: warm ? warm.pt : 0, impact: -relN };
      next.set(key, contact);
      // Warm start.
      const ix = p.nx * contact.pn + tx * contact.pt, iy = p.ny * contact.pn + ty * contact.pt;
      a.vx -= a.invMass * ix; a.vy -= a.invMass * iy; a.spin -= a.invInertia * cross(ra.x, ra.y, ix, iy);
      b.vx += b.invMass * ix; b.vy += b.invMass * iy; b.spin += b.invInertia * cross(rb.x, rb.y, ix, iy);
    }
  }
  world.contacts = next;
  const contacts = [...next.values()];
  const struck = new Map();
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    for (const c of contacts) {
      const { a, b, p, ra, rb, tx, ty } = c;
      // Normal.
      const dvx = b.vx - b.spin * rb.y - a.vx + a.spin * ra.y, dvy = b.vy + b.spin * rb.x - a.vy - a.spin * ra.x;
      const vn = dvx * p.nx + dvy * p.ny;
      const old = c.pn;
      c.pn = Math.max(old + c.normalMass * (-vn + c.bias), 0);
      const dn = c.pn - old;
      a.vx -= a.invMass * p.nx * dn; a.vy -= a.invMass * p.ny * dn; a.spin -= a.invInertia * cross(ra.x, ra.y, p.nx * dn, p.ny * dn);
      b.vx += b.invMass * p.nx * dn; b.vy += b.invMass * p.ny * dn; b.spin += b.invInertia * cross(rb.x, rb.y, p.nx * dn, p.ny * dn);
      // Friction, bounded by the normal impulse.
      const tvx = b.vx - b.spin * rb.y - a.vx + a.spin * ra.y, tvy = b.vy + b.spin * rb.x - a.vy - a.spin * ra.x;
      const vt = tvx * tx + tvy * ty;
      const limit = c.friction * c.pn;
      const oldT = c.pt;
      c.pt = Math.max(-limit, Math.min(limit, oldT - c.tangentMass * vt));
      const dt2 = c.pt - oldT;
      a.vx -= a.invMass * tx * dt2; a.vy -= a.invMass * ty * dt2; a.spin -= a.invInertia * cross(ra.x, ra.y, tx * dt2, ty * dt2);
      b.vx += b.invMass * tx * dt2; b.vy += b.invMass * ty * dt2; b.spin += b.invInertia * cross(rb.x, rb.y, tx * dt2, ty * dt2);
    }
  }
  // Blows: damage comes from how fast two things met, never from how much
  // they press on each other — the bottom of a stack carries the whole tower
  // and must not wear out under it.
  for (const c of contacts) {
    if (c.impact <= DAMAGE_SPEED) continue;
    // Measured in closing speed, not momentum: weighting by mass meant a
    // light glass pillar barely noticed a full-speed hero (520 px/s took 192
    // of its 520), which is exactly backwards for glass.
    const blow = c.impact - DAMAGE_SPEED;
    for (const body of [c.a, c.b]) if (body.material) struck.set(body, (struck.get(body) ?? 0) + blow);
    if (c.a.id === "hero" || c.b.id === "hero" || c.impact > 160) {
      world.hits.push({ x: c.p.x, y: c.p.y, speed: c.impact, nx: c.p.nx, ny: c.p.ny, hero: c.a.id === "hero" || c.b.id === "hero" });
    }
  }
  for (const [body, blow] of struck) {
    body.health -= blow;
    if (body.health <= 0 && !body.broken) {
      body.broken = true;
      world.breaks.push({ id: body.id, x: body.x, y: body.y, material: body.material, target: body.target, width: body.width, height: body.height, angle: body.angle });
    }
  }

  // Integrate.
  for (const body of bodies) {
    if (body.asleep || body.broken) continue;
    body.x += body.vx * dt; body.y += body.vy * dt; body.angle += body.spin * dt;
    const quiet = Math.hypot(body.vx, body.vy) < SLEEP_SPEED && Math.abs(body.spin) < SLEEP_SPIN;
    body.still = quiet ? body.still + dt : 0;
    if (body.still >= SLEEP_SECONDS) { body.asleep = true; body.vx = body.vy = body.spin = 0; }
  }
  if (!heroBody) return null;
  // The hero is moved by its own integrator; push it out of what it is in.
  for (const c of contacts) {
    if (c.b !== heroBody || c.p.separation >= -SLOP) continue;
    heroBody.x -= c.p.nx * (c.p.separation + SLOP) * 0.8;
    heroBody.y -= c.p.ny * (c.p.separation + SLOP) * 0.8;
  }
  return { x: heroBody.x, y: heroBody.y, vx: heroBody.vx, vy: heroBody.vy, touched: contacts.some((c) => c.b === heroBody) };
}

export const worldAsleep = (world) => world.bodies.every((body) => body.broken || body.asleep);
export const bodyCorners = corners;

// A copy for the trajectory preview: the same bodies in the same state, with
// no contact history (the preview only has to show where the hero goes).
export function cloneWorld(world) {
  return { bodies: world.bodies.map((body) => ({ ...body })), groundY: world.groundY, contacts: new Map(), time: world.time, breaks: [], hits: [] };
}
