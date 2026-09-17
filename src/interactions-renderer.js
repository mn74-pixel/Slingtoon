// Visual language: mint = active/entry, coral = obstacle, gold = optional reward,
// crimson + spikes = the one thing that ends the flight on touch.
import { movedBody, pendulumAngle, pendulumBob } from "./physics.js?v=0.27.0";
const ink = "#19142d", cream = "#fff5d9", mint = "#5ce1bd", coral = "#ff6078", gold = "#ffd35f", violet = "#a28bff", danger = "#d6002f";
function box(ctx, x, y, w, h, color, radius = 12) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.stroke();
}
function circle(ctx, x, y, r, color, width = 5) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = width; ctx.stroke();
}
function label(ctx, text, x, y, color = cream, size = 13) {
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  const width = ctx.measureText(text).width + 24;
  box(ctx, x - width / 2, y - 14, width, 28, color, 9);
  ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}
function arrow(ctx, x, y, angle, color = cream) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.strokeStyle = color; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(7, -10); ctx.moveTo(18, 0); ctx.lineTo(7, 10); ctx.stroke(); ctx.restore();
}

function motionTrack(ctx, item) {
  if (!item.motion) return;
  const horizontal = item.motion.axis === "x";
  const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
  const reach = item.motion.amplitude;
  ctx.strokeStyle = "rgba(255,245,217,.4)"; ctx.lineWidth = 3; ctx.setLineDash([5, 9]);
  ctx.beginPath();
  if (horizontal) { ctx.moveTo(cx - reach, cy); ctx.lineTo(cx + reach, cy); }
  else { ctx.moveTo(cx, cy - reach); ctx.lineTo(cx, cy + reach); }
  ctx.stroke(); ctx.setLineDash([]);
  for (const sign of [-1, 1]) {
    arrow(ctx, horizontal ? cx + reach * sign : cx, horizontal ? cy : cy + reach * sign, horizontal ? (sign > 0 ? 0 : Math.PI) : (sign > 0 ? Math.PI / 2 : -Math.PI / 2), cream);
  }
}

export function drawInteractions(ctx, model, time) {
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const item of model.interactions) {
    const used = model.objectState[item.id];
    const body = movedBody(item, model.flightTime);
    if (item.type === "hazard") {
      motionTrack(ctx, item);
      box(ctx, body.x, body.y, body.width, body.height, danger, 10);
      ctx.save(); ctx.beginPath(); ctx.rect(body.x, body.y, body.width, body.height); ctx.clip();
      ctx.strokeStyle = "rgba(25,20,45,.55)"; ctx.lineWidth = 9;
      for (let y = body.y - 40; y < body.y + body.height + 40; y += 34) {
        ctx.beginPath(); ctx.moveTo(body.x - 10, y); ctx.lineTo(body.x + body.width + 10, y + 26); ctx.stroke();
      }
      ctx.restore();
      // Spikes along both long edges: danger needs a silhouette, not just a colour.
      ctx.fillStyle = danger; ctx.strokeStyle = ink; ctx.lineWidth = 3;
      for (let y = body.y + 13; y < body.y + body.height - 6; y += 30) {
        for (const [tipX, edgeX] of [[body.x - 15, body.x], [body.x + body.width + 15, body.x + body.width]]) {
          ctx.beginPath(); ctx.moveTo(edgeX, y - 10); ctx.lineTo(tipX, y + 3); ctx.lineTo(edgeX, y + 13); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      ctx.globalAlpha = .75 + Math.sin(time * 6) * .25;
      label(ctx, item.label ?? "NIE DOTYKAJ", body.x + body.width / 2, body.y - 24, danger);
      ctx.globalAlpha = 1;
    }
    if (item.type === "breakable") {
      if (used) {
        ctx.fillStyle = "#c88765";
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(item.x - 18 + i * 24, 582); ctx.lineTo(item.x + i * 24, 555 - (i % 2) * 15); ctx.lineTo(item.x + 22 + i * 24, 585); ctx.fill(); }
      } else {
        box(ctx, item.x, item.y, item.width, item.height, "#f4b783");
        ctx.fillStyle = gold; ctx.fillRect(item.x + item.width * .39, item.y + 3, item.width * .22, item.height - 6);
        for (let y = item.y + 55; y < item.y + item.height; y += 78) {
          ctx.strokeStyle = "#a36257"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(item.x + 6, y); ctx.lineTo(item.x + item.width - 6, y); ctx.stroke();
        }
        circle(ctx, item.x + item.width / 2, item.y + 70, 22, cream, 3);
        ctx.fillStyle = ink; ctx.font = "900 24px system-ui"; ctx.textAlign = "center"; ctx.fillText("!", item.x + item.width / 2, item.y + 79);
        label(ctx, "PRZEBIJ →", item.x + item.width / 2, item.y - 22, coral);
        label(ctx, item.label, item.x + item.width / 2, item.y + item.height - 36, cream, 11);
      }
    }
    if (item.type === "portal") {
      const portals = [{ ...item.entry, color: mint, text: "WEJŚCIE" }, { ...item.exit, color: violet, text: "WYJŚCIE" }];
      for (const portal of portals) {
        box(ctx, portal.x - item.radius - 12, portal.y - item.radius - 22, (item.radius + 12) * 2, (item.radius + 16) * 2, cream, 21);
        circle(ctx, portal.x, portal.y, item.radius, portal.color, 6);
        circle(ctx, portal.x, portal.y, item.radius - 12, "#3b295c", 3);
        ctx.save(); ctx.translate(portal.x, portal.y); ctx.rotate(time * (portal.text === "WEJŚCIE" ? 1 : -1));
        ctx.strokeStyle = portal.color; ctx.lineWidth = 5;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 20 + i * 11, i * 2.1, i * 2.1 + 3.7); ctx.stroke(); }
        ctx.restore();
        label(ctx, portal.text, portal.x, portal.y - item.radius - 40, portal.color);
        arrow(ctx, portal.x, portal.y, 0);
        for (let i = 0; i < 3; i++) circle(ctx, portal.x - 35 + i * 20, portal.y + item.radius + 2, 3, coral, 1);
      }
    }
    if (item.type === "cushion") {
      const dx = item.b.x - item.a.x, dy = item.b.y - item.a.y, length = Math.hypot(dx, dy);
      ctx.save(); ctx.translate(item.a.x, item.a.y); ctx.rotate(Math.atan2(dy, dx));
      box(ctx, 0, -item.thickness, length, item.thickness * 2, violet, item.thickness);
      ctx.setLineDash([7, 8]); ctx.strokeStyle = cream; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(15, -item.thickness + 6); ctx.lineTo(length - 15, -item.thickness + 6); ctx.stroke(); ctx.setLineDash([]);
      for (let x = 30; x < length; x += 50) circle(ctx, x, 0, 3, ink, 1);
      ctx.restore();
      label(ctx, model.mode === "oneMoveChallenge" && !model.moveUsed ? "↔ PRZESUŃ RAZ" : "KĄT = KIERUNEK", (item.a.x + item.b.x) / 2, Math.min(item.a.y, item.b.y) - 33, violet);
    }
    // A spring is drawn as a coil under a plate, because it has to look like the
    // thing that stores what you give it — not like the cushion, which returns
    // the same fraction whatever you bring.
    if (item.type === "spring") {
      const dx = item.b.x - item.a.x, dy = item.b.y - item.a.y, length = Math.hypot(dx, dy);
      ctx.save(); ctx.translate(item.a.x, item.a.y); ctx.rotate(Math.atan2(dy, dx));
      ctx.strokeStyle = gold; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i <= 18; i += 1) {
        const x = 12 + (length - 24) * (i / 18);
        const y = 16 + (i % 2 ? -9 : 9);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      box(ctx, 0, -item.thickness, length, item.thickness * 1.5, gold, item.thickness);
      ctx.restore();
      label(ctx, "SPRĘŻYNA ↑", (item.a.x + item.b.x) / 2, Math.min(item.a.y, item.b.y) - 38, gold);
    }
    // A pendulum shows its own rope and pivot, so the arc it will travel is
    // readable before the first shot, and two of different lengths visibly keep
    // different time.
    if (item.type === "pendulum") {
      const bob = pendulumBob(item, model.flightTime);
      ctx.strokeStyle = "rgba(255,245,217,.8)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(item.pendulum.x, item.pendulum.y); ctx.lineTo(bob.x, bob.y); ctx.stroke();
      // The path it sweeps, so timing is a decision rather than a surprise.
      ctx.strokeStyle = "rgba(255,96,120,.5)"; ctx.lineWidth = 3; ctx.setLineDash([9, 9]);
      ctx.beginPath();
      ctx.arc(item.pendulum.x, item.pendulum.y, item.pendulum.length, Math.PI / 2 - item.pendulum.swing, Math.PI / 2 + item.pendulum.swing);
      ctx.stroke(); ctx.setLineDash([]);
      // A bracket, not a bare dot, so it reads as something bolted to the ceiling.
      box(ctx, item.pendulum.x - 26, item.pendulum.y - 12, 52, 16, cream, 6);
      circle(ctx, item.pendulum.x, item.pendulum.y + 4, 7, ink, 3);
      ctx.save(); ctx.translate(bob.x, bob.y); ctx.rotate(pendulumAngle(item, model.flightTime));
      // A rotated square reads as an abstract diamond. A rounded weight with a
      // hook and a band reads as a thing hanging on a rope, which is what it is.
      circle(ctx, 0, -item.height / 2 - 4, 7, cream, 4);
      box(ctx, -item.width / 2, -item.height / 2, item.width, item.height, coral, item.width * 0.42);
      ctx.strokeStyle = ink; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-item.width / 2 + 6, 0); ctx.lineTo(item.width / 2 - 6, 0); ctx.stroke();
      ctx.restore();
      // Short label: the long one collided with every other sign on the board.
      label(ctx, "WAHADŁO", item.pendulum.x, item.pendulum.y - 30, coral);
    }
    if (item.type === "steam" || item.type === "current") {
      const gradient = ctx.createLinearGradient(0, item.y, 0, item.y + item.height);
      gradient.addColorStop(0, "rgba(92,225,189,.03)"); gradient.addColorStop(1, item.type === "current" ? "rgba(86,190,222,.38)" : "rgba(92,225,189,.5)");
      ctx.fillStyle = gradient; ctx.fillRect(item.x, item.y, item.width, item.height);
      ctx.strokeStyle = mint; ctx.lineWidth = 2; ctx.setLineDash([5, 10]); ctx.strokeRect(item.x, item.y, item.width, item.height); ctx.setLineDash([]);
      for (let i = 0; i < 12; i++) {
        const y = item.y + item.height - ((time * 105 + i * 39) % item.height);
        ctx.globalAlpha = .25 + .5 * (y - item.y) / item.height;
        arrow(ctx, item.x + 34 + (i % 3) * 82, y, Math.atan2(item.force.y, item.force.x), mint);
      }
      ctx.globalAlpha = 1;
      box(ctx, item.x + 23, item.y + item.height - 8, item.width - 46, 40, coral, 9);
      ctx.fillStyle = ink; ctx.fillRect(item.x + 8, item.y + item.height, 20, 10); ctx.fillRect(item.x + item.width - 27, item.y + item.height, 20, 10);
      label(ctx, item.label, item.x + item.width / 2, item.y + item.height + 12, cream);
    }
    if (item.type === "bubble") {
      const pulse = Math.sin(time * 3 + item.x) * 5;
      ctx.fillStyle = "rgba(130,232,239,.18)"; ctx.strokeStyle = mint; ctx.lineWidth = 4; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.arc(item.x, item.y, item.radius + pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4, r = 28 + (i * 31 + time * 24) % Math.max(35, item.radius - 18);
        circle(ctx, item.x + Math.cos(a) * r, item.y + Math.sin(a) * r, 5 + i % 5, "rgba(255,245,217,.3)", 2);
      }
      arrow(ctx, item.x, item.y, -Math.PI / 2, cream); label(ctx, item.label, item.x, item.y + item.radius + 24, mint);
    }
    if (item.type === "gravity") {
      ctx.strokeStyle = "rgba(162,139,255,.55)"; ctx.lineWidth = 3; ctx.setLineDash([7, 11]);
      ctx.beginPath(); ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      const glow = ctx.createRadialGradient(item.x - 10, item.y - 12, 3, item.x, item.y, item.coreRadius + 16);
      glow.addColorStop(0, gold); glow.addColorStop(1, violet);
      circle(ctx, item.x, item.y, item.coreRadius, glow, 5);
      for (let i = 0; i < 5; i++) circle(ctx, item.x - 12 + i * 7, item.y - 8 + (i % 2) * 10, 3 + i % 3, "rgba(25,20,45,.35)", 0);
      label(ctx, item.label, item.x, item.y - item.radius - 22, violet, 11);
    }
    if (item.type === "switch") {
      const gate = model.interactions.find((entry) => entry.switchId === item.id || entry.switchIds?.includes(item.id));
      if (gate) {
        ctx.strokeStyle = used ? mint : "#a28bff"; ctx.lineWidth = 4; ctx.setLineDash(used ? [] : [8, 7]);
        ctx.beginPath(); ctx.moveTo(item.x, item.y); ctx.bezierCurveTo(item.x + 160, item.y + 190, gate.x - 100, gate.y + gate.height - 20, gate.x, gate.y + gate.height - 20); ctx.stroke(); ctx.setLineDash([]);
      }
      circle(ctx, item.x, item.y, item.radius + 8, cream);
      circle(ctx, item.x, item.y + (used ? 3 : -3), item.radius - 3, used ? gold : mint);
      label(ctx, used ? "OTWARTE ✓" : "DZYŃ!", item.x, item.y, cream, 16);
    }
    if (item.type === "gate") {
      const open = (item.switchIds ?? [item.switchId]).every((id) => model.objectState[id]);
      if (open) {
        box(ctx, body.x - 8, body.y - 9, body.width + 16, 25, mint);
        label(ctx, "ZAPRASZAMY →", body.x + 15, body.y - 33, mint);
      } else {
        motionTrack(ctx, item);
        box(ctx, body.x, body.y, body.width, body.height, coral, 7);
        ctx.save(); ctx.beginPath(); ctx.rect(body.x, body.y, body.width, body.height); ctx.clip();
        ctx.strokeStyle = ink; ctx.lineWidth = 12;
        for (let y = body.y; y < body.y + body.height + 45; y += 46) { ctx.beginPath(); ctx.moveTo(body.x, y); ctx.lineTo(body.x + body.width, y - 30); ctx.stroke(); }
        ctx.restore(); label(ctx, "BRAMKA", body.x + body.width / 2, body.y - 22, coral);
      }
    }
    if (item.type === "solid") {
      motionTrack(ctx, item);
      box(ctx, body.x, body.y, body.width, body.height, "#2cae9d", 19);
      ctx.strokeStyle = mint; ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) { const x = body.x + 14 + (i % 3) * 30, y = body.y + 26 + Math.floor(i / 3) * 42; ctx.beginPath(); ctx.moveTo(x - 5, y + 4); ctx.lineTo(x, y - 5); ctx.lineTo(x + 5, y + 4); ctx.stroke(); }
      label(ctx, item.motion ? (item.motion.axis === "x" ? "RUCHOMA ↔" : "RUCHOMA ↕") : "OMIŃ ↑", body.x + body.width / 2, body.y - 22, cream);
    }
  }
  ctx.restore();
}

export function drawObjective(ctx, model, time) {
  ctx.save();
  const goal = model.goalCentre;
  const motion = model.level.goal.motion;
  // Chapter scenery sits at fixed coordinates and can land right behind a
  // mission goal. This halo knocks the decoration back so the one object the
  // player must hit always reads first, without flattening the whole scene.
  const haloRadius = Math.max(model.goalRadius, 74) + 108;
  const halo = ctx.createRadialGradient(goal.x, goal.y, haloRadius * 0.32, goal.x, goal.y, haloRadius);
  halo.addColorStop(0, "rgba(20,13,34,.28)");
  halo.addColorStop(1, "rgba(20,13,34,0)");
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(goal.x, goal.y, haloRadius, 0, Math.PI * 2); ctx.fill();
  if (motion) {
    ctx.strokeStyle = "rgba(255,245,217,.45)"; ctx.lineWidth = 3; ctx.setLineDash([4, 10]);
    ctx.beginPath(); ctx.moveTo(model.level.goal.x, model.level.goal.y - motion.amplitude); ctx.lineTo(model.level.goal.x, model.level.goal.y + motion.amplitude); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.strokeStyle = model.objectiveMet ? mint : coral;
  ctx.lineWidth = 3; ctx.globalAlpha = .55 + Math.sin(time * 3) * .12; ctx.setLineDash([7, 7]);
  ctx.beginPath(); ctx.arc(goal.x, goal.y, model.goalRadius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  // The caption used to repeat the requirement at the goal while the object it
  // described stood elsewhere on screen — an instruction pointing at the wrong
  // thing. Each required object already labels its own action, so the goal only
  // states whether it is open. The full sentence lives in the UI strip.
  // The collider may sit inside the drawn object, so the caption clears the
  // artwork rather than the hit circle.
  const captionLift = Math.max(model.goalRadius, 74) + 28;
  label(ctx, model.objectiveMet ? "TRAF TUTAJ" : "CEL ZAMKNIĘTY", goal.x, goal.y - captionLift, model.objectiveMet ? mint : coral, 11);
  const star = model.level.star;
  if (star && !model.collectedStar) {
    ctx.save(); ctx.translate(star.x, star.y); ctx.rotate(Math.sin(time * 2) * .13);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 12 : 25; if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = gold; ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.fill(); ctx.stroke();
    circle(ctx, -5, -2, 2, ink, 1); circle(ctx, 5, -2, 2, ink, 1); ctx.restore();
  }
  ctx.restore();
}
