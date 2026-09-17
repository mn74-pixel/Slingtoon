import test from "node:test";
import assert from "node:assert/strict";

import {
  MIMIC_EXPRESSIONS,
  MIMIC_GRID,
  applyMatrix,
  buildMimicMesh,
  displaceNodes,
  expressionGeometry,
  expressionTravel,
  headCentre,
  mimicAnchors,
  poseFit,
  poseMatrix,
  warpedBounds,
} from "../src/face-mimic.js";

// Rozmiar portretu i realny rozmiar głowy w świecie gry — render.js rysuje
// ją przez drawImage(..., 96, 96). Wszystkie progi czytelności są liczone po
// przeskalowaniu do tych 96 px, bo tyle widzi gracz.
const SIZE = 512;
const HEAD_IN_GAME = 96;
const SCALE = HEAD_IN_GAME / SIZE;

// Syntetyczna twarz: owal plus punkty cech, w układzie portretu.
function syntheticLandmarks() {
  const landmarks = [];
  const put = (index, x, y) => { landmarks[index] = { x, y }; };
  const oval = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
    378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
  ];
  oval.forEach((index, position) => {
    const angle = (position / oval.length) * Math.PI * 2;
    put(index, 0.5 + 0.21 * Math.sin(angle), 0.5 - 0.29 * Math.cos(angle));
  });
  put(70, 0.37, 0.37); put(105, 0.41, 0.355); put(107, 0.46, 0.36);
  put(300, 0.63, 0.37); put(334, 0.59, 0.355); put(336, 0.54, 0.36);
  put(33, 0.36, 0.43); put(159, 0.41, 0.415); put(145, 0.41, 0.45); put(133, 0.46, 0.43);
  put(263, 0.64, 0.43); put(386, 0.59, 0.415); put(374, 0.59, 0.45); put(362, 0.54, 0.43);
  put(61, 0.42, 0.62); put(291, 0.58, 0.62); put(13, 0.5, 0.605); put(14, 0.5, 0.625);
  put(0, 0.5, 0.585); put(17, 0.5, 0.65);
  put(4, 0.5, 0.52); put(152, 0.5, 0.79);
  put(205, 0.4, 0.55); put(425, 0.6, 0.55);
  return landmarks;
}

const LANDMARKS = syntheticLandmarks();
const MAP = (point) => ({ x: point.x * SIZE, y: point.y * SIZE });
const ANCHORS = mimicAnchors(LANDMARKS, MAP);
// Owal ma wysokość 0.58 kadru — tyle samo, ile mierzy deriveHeadBounds.
const FACE_HEIGHT = 0.58 * SIZE;
const MESH = buildMimicMesh(SIZE);

// Kadr, jaki daje prawdziwe zdjęcie po wycięciu: ok. 10% marginesu z boków.
const BOUNDS = { left: 52, right: SIZE - 54, top: 28, bottom: SIZE - 36 };

function geometryOf(expression, strength = 1) {
  return expressionGeometry(MESH, ANCHORS, expression, FACE_HEIGHT, BOUNDS, SIZE, strength);
}

function travelOf(expression, strength = 1) {
  return expressionTravel(MESH, geometryOf(expression, strength), SIZE, HEAD_IN_GAME);
}

function largestMove(expression) {
  const destination = displaceNodes(MESH.nodes, ANCHORS, expression, FACE_HEIGHT, 1);
  let most = 0;
  for (let i = 0; i < MESH.nodes.length; i += 1) {
    most = Math.max(most, Math.hypot(destination[i].x - MESH.nodes[i].x, destination[i].y - MESH.nodes[i].y));
  }
  return most;
}

test("anchors carry every feature and pin the whole face oval", () => {
  const pinned = ANCHORS.filter((anchor) => anchor.pinned);
  const named = ANCHORS.filter((anchor) => anchor.name);
  assert.equal(pinned.length, 36);
  assert.equal(named.length, 24);
  assert.ok(named.every((anchor) => anchor.x > 0 && anchor.y > 0));
});

// To jest właściwy test tej funkcji: nie „czy coś się rusza”, tylko „czy widać
// to przy 96 px”. Mierzy całą geometrię — mimikę razem z pozą — bo dwa razy
// zmierzyłem tu nie to co trzeba: sama mimika daje przy „podejrzliwym” 0,6 px,
// a mina i tak jest czytelna, bo niesie ją przechylenie głowy.
test("every expression moves the photo enough to read at the size the game draws it", () => {
  for (const expression of MIMIC_EXPRESSIONS) {
    if (expression === "neutral") continue;
    const travel = travelOf(expression);
    assert.ok(travel >= 2.5, `${expression} przesuwa tylko ${travel.toFixed(2)} px przy głowie ${HEAD_IN_GAME} px`);
  }
});

// Dokładnie tam, gdzie ląduje piksel: warpTriangle odwzorowuje każdy trójkąt
// afinicznie, więc obraz punktu to jego współrzędne barycentryczne wymnożone
// przez przesunięte wierzchołki. Bez tego mierzyłem oszacowanie oszacowania i
// test krzyczał na kadr, który w rzeczywistości się mieścił.
function warpPoint(destination, x, y) {
  const step = SIZE / MIMIC_GRID;
  const column = Math.min(MIMIC_GRID - 1, Math.floor(x / step));
  const row = Math.min(MIMIC_GRID - 1, Math.floor(y / step));
  const u = (x - column * step) / step;
  const v = (y - row * step) / step;
  const at = (r, c) => destination[r * (MIMIC_GRID + 1) + c];
  const blend = (weights, points) => ({
    x: weights.reduce((sum, weight, i) => sum + weight * points[i].x, 0),
    y: weights.reduce((sum, weight, i) => sum + weight * points[i].y, 0),
  });
  if (u + v <= 1) {
    return blend([1 - u - v, u, v], [at(row, column), at(row, column + 1), at(row + 1, column)]);
  }
  const t = 1 - u, sBary = v - t;
  return blend([1 - sBary - t, sBary, t], [at(row, column + 1), at(row + 1, column + 1), at(row + 1, column)]);
}

test("no expression pushes the photo out of the frame, even at full strength", () => {
  for (const expression of MIMIC_EXPRESSIONS) {
    const { destination } = geometryOf(expression, 2);
    for (let y = BOUNDS.top; y <= BOUNDS.bottom; y += 4) {
      for (let x = BOUNDS.left; x <= BOUNDS.right; x += 4) {
        const point = warpPoint(destination, x, y);
        assert.ok(point.x >= 0 && point.y >= 0 && point.x <= SIZE - 1 && point.y <= SIZE - 1,
          `${expression}: ${x},${y} ląduje na ${point.x.toFixed(1)},${point.y.toFixed(1)}`);
      }
    }
  }
});

test("neutral is the untouched photo", () => {
  assert.equal(largestMove("neutral"), 0);
});

test("the pinned outline keeps the silhouette still while the face moves", () => {
  const destination = displaceNodes(MESH.nodes, ANCHORS, "panic", FACE_HEIGHT, 1);
  const centre = { x: SIZE / 2, y: SIZE / 2 };
  for (let i = 0; i < MESH.nodes.length; i += 1) {
    const node = MESH.nodes[i];
    const distance = Math.hypot(node.x - centre.x, node.y - centre.y);
    if (distance < SIZE * 0.42) continue;
    const moved = Math.hypot(destination[i].x - node.x, destination[i].y - node.y);
    assert.ok(moved < 6, `węzeł przy krawędzi przesunął się o ${moved.toFixed(1)} px`);
  }
});

test("strength scales the movement and zero switches mimicry off", () => {
  const destination = displaceNodes(MESH.nodes, ANCHORS, "panic", FACE_HEIGHT, 0);
  assert.deepEqual(destination, MESH.nodes);
  const single = largestMove("panic");
  const doubled = displaceNodes(MESH.nodes, ANCHORS, "panic", FACE_HEIGHT, 2);
  let most = 0;
  for (let i = 0; i < MESH.nodes.length; i += 1) {
    most = Math.max(most, Math.hypot(doubled[i].x - MESH.nodes[i].x, doubled[i].y - MESH.nodes[i].y));
  }
  assert.ok(Math.abs(most - single * 2) < 0.001);
});

test("the pose pivots on the chin, not on the middle of the frame", () => {
  const centre = headCentre(ANCHORS, SIZE);
  const chin = Math.max(...ANCHORS.filter((anchor) => anchor.pinned).map((anchor) => anchor.y));
  assert.equal(centre.y, chin);
  assert.ok(Math.abs(centre.x - SIZE / 2) < 2);
});

test("an identity pose leaves every point where it was", () => {
  const matrix = poseMatrix(null, { x: 100, y: 200 }, FACE_HEIGHT, 1);
  assert.deepEqual(applyMatrix(matrix, { x: 37, y: 91 }), { x: 37, y: 91 });
});

// Strażnik kadru. Rozciągnięcie, którego nikt nie przycina, ścina czubek
// kapelusza — gracz widzi obcięte włosy, nie minę.
test("the pose is eased back until the head fits inside the frame", () => {
  const centre = { x: SIZE / 2, y: SIZE - 30 };
  const bounds = { left: 40, right: SIZE - 40, top: 10, bottom: SIZE - 20 };
  const pose = { sy: 1.6, sx: 1.4 };
  const fit = poseFit(pose, centre, bounds, SIZE, SIZE, FACE_HEIGHT, 1);
  assert.ok(fit > 0 && fit < 1, `dopasowanie ${fit}`);
  const matrix = poseMatrix(pose, centre, FACE_HEIGHT, fit);
  for (const corner of [[bounds.left, bounds.top], [bounds.right, bounds.top],
    [bounds.left, bounds.bottom], [bounds.right, bounds.bottom]]) {
    const { x, y } = applyMatrix(matrix, { x: corner[0], y: corner[1] });
    assert.ok(x >= 0 && y >= 0 && x <= SIZE - 1 && y <= SIZE - 1, `róg wyszedł poza kadr: ${x}, ${y}`);
  }
});

test("a pose that already fits is used whole", () => {
  const centre = { x: SIZE / 2, y: SIZE / 2 };
  const bounds = { left: 200, right: 300, top: 200, bottom: 300 };
  assert.equal(poseFit({ sy: 1.05 }, centre, bounds, SIZE, SIZE, FACE_HEIGHT, 1), 1);
});

// warpedBounds jest górnym ograniczeniem wyginanego zdjęcia. Jeśli kiedykolwiek
// przestanie nim być, strażnik kadru przepuści obcięty kapelusz.
test("warped bounds contain every point the warp can produce", () => {
  const bounds = { left: 60, right: SIZE - 60, top: 30, bottom: SIZE - 30 };
  for (const expression of MIMIC_EXPRESSIONS) {
    const destination = displaceNodes(MESH.nodes, ANCHORS, expression, FACE_HEIGHT, 2);
    const box = warpedBounds(bounds, MESH.nodes, destination, SIZE);
    const step = SIZE / MIMIC_GRID;
    // Środki komórek wewnątrz prostokąta: każdy musi wylądować w wyliczonym boksie.
    for (let row = 0; row < MIMIC_GRID; row += 1) {
      for (let column = 0; column < MIMIC_GRID; column += 1) {
        const x = (column + 0.5) * step, y = (row + 0.5) * step;
        if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) continue;
        const corners = [
          row * (MIMIC_GRID + 1) + column, row * (MIMIC_GRID + 1) + column + 1,
          (row + 1) * (MIMIC_GRID + 1) + column, (row + 1) * (MIMIC_GRID + 1) + column + 1,
        ];
        const dx = corners.reduce((sum, index) => sum + (destination[index].x - MESH.nodes[index].x), 0) / 4;
        const dy = corners.reduce((sum, index) => sum + (destination[index].y - MESH.nodes[index].y), 0) / 4;
        assert.ok(x + dx >= box.left - 1e-6 && x + dx <= box.right + 1e-6, `${expression}: x poza boksem`);
        assert.ok(y + dy >= box.top - 1e-6 && y + dy <= box.bottom + 1e-6, `${expression}: y poza boksem`);
      }
    }
  }
});

// Portret gwarantuje 26 px zapasu przy każdej krawędzi (fitInsideFrame), więc
// to jest najciaśniejszy kadr, jaki mina kiedykolwiek dostanie. Bez tego
// zapasu kołnierz dochodzący do dołu kadru zabijał przechylenia: „podejrzliwy”
// spadał z 6,7 px do 0,6 px, czyli z miny do nieruchomego zdjęcia.
test("expressions stay readable in the tightest frame a portrait can hand them", () => {
  const tight = { left: 26, right: SIZE - 27, top: 26, bottom: SIZE - 27 };
  for (const expression of MIMIC_EXPRESSIONS) {
    if (expression === "neutral") continue;
    const geometry = expressionGeometry(MESH, ANCHORS, expression, FACE_HEIGHT, tight, SIZE, 1);
    const travel = expressionTravel(MESH, geometry, SIZE, HEAD_IN_GAME);
    assert.ok(travel >= 2.5, `${expression} przesuwa tylko ${travel.toFixed(2)} px w ciasnym kadrze`);
  }
});
