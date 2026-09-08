// Visual language: mint = active/entry, coral = obstacle, gold = optional reward.
const ink = "#19142d", cream = "#fff5d9", mint = "#5ce1bd", coral = "#ff6078", gold = "#ffd35f", violet = "#a28bff";
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

export function drawInteractions(ctx, model, time) {
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const item of model.interactions) {
    const used = model.objectState[item.id];
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
        box(ctx, item.x - 8, item.y - 9, item.width + 16, 25, mint);
        label(ctx, "ZAPRASZAMY →", item.x + 15, item.y - 33, mint);
      } else {
        box(ctx, item.x, item.y, item.width, item.height, coral, 7);
        ctx.save(); ctx.beginPath(); ctx.rect(item.x, item.y, item.width, item.height); ctx.clip();
        ctx.strokeStyle = ink; ctx.lineWidth = 12;
        for (let y = item.y; y < item.y + item.height + 45; y += 46) { ctx.beginPath(); ctx.moveTo(item.x, y); ctx.lineTo(item.x + item.width, y - 30); ctx.stroke(); }
        ctx.restore(); label(ctx, "BRAMKA", item.x + item.width / 2, item.y - 22, coral);
      }
    }
    if (item.type === "solid") {
      box(ctx, item.x, item.y, item.width, item.height, "#2cae9d", 19);
      ctx.strokeStyle = mint; ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) { const x = item.x + 14 + (i % 3) * 30, y = item.y + 26 + Math.floor(i / 3) * 42; ctx.beginPath(); ctx.moveTo(x - 5, y + 4); ctx.lineTo(x, y - 5); ctx.lineTo(x + 5, y + 4); ctx.stroke(); }
      label(ctx, "OMIŃ ↑", item.x + item.width / 2, item.y - 22, cream);
    }
  }
  ctx.restore();
}

export function drawObjective(ctx, model, time) {
  ctx.save();
  const goal = model.goalCentre;
  const motion = model.level.goal.motion;
  if (motion) {
    ctx.strokeStyle = "rgba(255,245,217,.45)"; ctx.lineWidth = 3; ctx.setLineDash([4, 10]);
    ctx.beginPath(); ctx.moveTo(model.level.goal.x, model.level.goal.y - motion.amplitude); ctx.lineTo(model.level.goal.x, model.level.goal.y + motion.amplitude); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.strokeStyle = model.objectiveMet ? mint : coral;
  ctx.lineWidth = 3; ctx.globalAlpha = .55 + Math.sin(time * 3) * .12; ctx.setLineDash([7, 7]);
  ctx.beginPath(); ctx.arc(goal.x, goal.y, model.goalRadius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  const required = model.interactions.find((item) => model.level.required.includes(item.id));
  const requirement = { breakable: "PRZEBIJ PACZKĘ", portal: "NAJPIERW PORTAL", cushion: "ODBIJ SIĘ", steam: "PRZELEĆ PRZEZ PODMUCH", current: "ZŁAP PRĄD", bubble: "WEJDŹ W BĄBEL", gravity: "OKRĄŻ PLANETĘ", switch: "WCIŚNIJ PRZYCISK", water: "NAJPIERW ŚLIZG" }[required?.type];
  label(ctx, model.objectiveMet ? "TRAF TUTAJ" : requirement, goal.x, goal.y - model.goalRadius - 28, model.objectiveMet ? mint : cream, 11);
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
