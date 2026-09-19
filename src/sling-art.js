// Where the slingshot stands, and where it holds the hero.
//
// Two things were wrong at once, and a player named both.
//
// The bands ended at `avatarPosition` — which is the hero's NECK, not his
// hands and not a pouch. So the coral band was drawn straight across his face;
// over an uploaded photograph it ran from the forehead to the mouth. The sling
// holds a leather pouch now, the pouch cradles his seat, and nothing is ever
// drawn across the head.
//
// And the whole sling lived in the back layer, behind the hero. The stock head
// is 76 px wide, a photographed one is 184 px and reaches 125 px above his
// origin, so the hero simply stood in front of the slingshot and hid it. Two
// prongs and a band are the only picture that says "slingshot"; without them a
// first-time player sees a person standing next to a brown stick. The fork is
// on the camera side now and is drawn after the hero.
//
// Geometry only, no canvas: tests/sling-art.test.mjs measures the drawn bands
// against the head on a grid of pull positions.

// How far below the hero's origin the pouch cradles him — his seat, not his
// neck. No offset makes a straight band miss the head at every pull: drag him
// far enough and he passes the fork himself. Layer order is what guarantees a
// clear face, and tests/sling-art.test.mjs measures that instead.
export const SEAT_DROP = 62;
// A photographed hero is a large head on a small body, so his seat sits far
// lower than the stock character's. With one number for both, the pouch hung
// under a player's chin like a scarf.
export const PHOTO_SEAT_DROP = 84;
// Half the pouch's length. The bands attach at its two ends, not at one point,
// which is what keeps them clear of the body on a deep pull.
export const POUCH_HALF = 23;

// The fork stands where a slingshot physically stands: BETWEEN the hero and
// the target, opening to the right, with both tips on his launch side. The old
// fork stood around him, so with a photographed head he covered 74% of it and
// a first-time player saw a person next to a brown stick.
//
// The tips are one above the other, not left and right, because that is the
// shape a slingshot makes when you look along its line of fire — and because
// it is the only arrangement that keeps the whole fork out from behind a head
// that is 180 px wide.
export function slingFrame(anchor) {
  return {
    base: { x: anchor.x + 6, y: anchor.y + 118 },
    crotch: { x: anchor.x + 24, y: anchor.y + 92 },
    farTip: { x: anchor.x + 62, y: anchor.y - 84 },
    nearTip: { x: anchor.x + 114, y: anchor.y - 52 },
  };
}

// The point the pouch cradles, in world coordinates.
export const slingGrip = (position, scale = 1, photo = false) =>
  ({ x: position.x, y: position.y + (photo ? PHOTO_SEAT_DROP : SEAT_DROP) * scale });

// A slingshot at zero draw has its pouch at the fork, so a hero standing
// exactly on the anchor covers it — whatever shape the fork is. He rests
// leaning back into the band instead, the way a loaded sling actually sits.
// This is drawing only: the anchor the physics launches from never moves.
export const REST_LEAN = Object.freeze({ x: -46, y: 8 });
export const restPosition = (anchor, ease = 1) => ({
  x: anchor.x + REST_LEAN.x * ease,
  y: anchor.y + REST_LEAN.y * ease,
});

// The pouch lies across the line to the fork, so its ends — where the bands
// attach — spread sideways from the pull direction. Each tip gets the end on
// its own side of that line; matched the other way round, the two bands cross
// in an X halfway to the fork.
export function pouchEnds(grip, frame, scale = 1) {
  const towards = { x: (frame.farTip.x + frame.nearTip.x) / 2 - grip.x, y: (frame.farTip.y + frame.nearTip.y) / 2 - grip.y };
  const length = Math.hypot(towards.x, towards.y) || 1;
  const nx = -towards.y / length, ny = towards.x / length;
  const reach = POUCH_HALF * scale;
  // Which end is which depends on where the tips sit relative to the pull line,
  // so it is decided from the geometry rather than fixed.
  const side = (frame.farTip.x - grip.x) * nx + (frame.farTip.y - grip.y) * ny >= 0 ? 1 : -1;
  return {
    angle: Math.atan2(towards.y, towards.x),
    far: { x: grip.x + nx * reach * side, y: grip.y + ny * reach * side },
    near: { x: grip.x - nx * reach * side, y: grip.y - ny * reach * side },
  };
}

// Where the empty pouch hangs once the hero is gone: slack, just below the
// line between the tips and drawn back towards the crotch.
export function restingGrip(frame) {
  // Back down the line of fire, not jammed between the tips: with only 34 px
  // of drop the empty pouch read as a lozenge stuck between two sticks and the
  // bands were stubs.
  return {
    x: (frame.farTip.x + frame.nearTip.x) / 2 - 34,
    y: (frame.farTip.y + frame.nearTip.y) / 2 + 66,
  };
}

// The circle nothing may be painted on once the hero is drawn. A photographed
// head is the worst case: the game paints it 96 px wide at 1.92 scale, lifted
// 33 px above the origin.
export const headKeepOut = (position, scale = 1, photo = true) => ({
  x: position.x,
  y: position.y - (photo ? 33 : 16) * scale,
  radius: (photo ? 62 : 40) * scale,
});

// Roughly what the hero hides. Used to measure how much of the slingshot a
// player can actually see, which is the complaint this module answers: with
// the old fork a photographed hero covered 74% of it.
export const heroSilhouette = (position, scale = 1, photo = true) => ({
  head: headKeepOut(position, scale, photo),
  body: { left: position.x - 30 * scale, right: position.x + 30 * scale,
    top: position.y + 3 * scale, bottom: position.y + 62 * scale },
  legs: { left: position.x - 36 * scale, right: position.x + 38 * scale,
    top: position.y + 48 * scale, bottom: position.y + 86 * scale },
});

export const hiddenBy = (point, shape) =>
  Math.hypot(point.x - shape.head.x, point.y - shape.head.y) <= shape.head.radius
  || (point.x >= shape.body.left && point.x <= shape.body.right && point.y >= shape.body.top && point.y <= shape.body.bottom)
  || (point.x >= shape.legs.left && point.x <= shape.legs.right && point.y >= shape.legs.top && point.y <= shape.legs.bottom);

export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared)) : 0;
  return Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t));
}

// Every line the sling is built from, for one position of the hero.
export function slingStrokes(anchor, position, scale = 1, photo = false) {
  const frame = slingFrame(anchor);
  const ends = pouchEnds(slingGrip(position, scale, photo), frame, scale);
  return [
    [frame.base, frame.crotch], [frame.crotch, frame.farTip], [frame.crotch, frame.nearTip],
    [frame.farTip, ends.far], [frame.nearTip, ends.near],
  ];
}

// The fraction of the slingshot a player can see with the hero in the pouch.
export function visibleFraction(anchor, position, scale = 1, photo = true) {
  const shape = heroSilhouette(position, scale, photo);
  let seen = 0, total = 0;
  for (const [from, to] of slingStrokes(anchor, position, scale, photo)) {
    const steps = Math.max(2, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 2));
    for (let i = 0; i <= steps; i += 1) {
      const point = { x: from.x + (to.x - from.x) * (i / steps), y: from.y + (to.y - from.y) * (i / steps) };
      total += 1;
      if (!hiddenBy(point, shape)) seen += 1;
    }
  }
  return seen / total;
}
