// How the tower blocks look. One look per material, so a player reads the
// fort before the first shot: warm planks with grain take a beating, pale
// glass with a shine shatters, grey stone with flecks barely notices. A block
// shows cracks as it weakens, so the second hit is a decision, not a guess.
import { bodyCorners } from "./blocks.js?v=0.51.0";

const INK = "#19142d";
export const BLOCK_COLOURS = Object.freeze({
  wood: { fill: "#d39a5b", edge: "#a86b37", detail: "rgba(110,62,28,.45)" },
  glass: { fill: "rgba(178,236,246,.72)", edge: "#7fd0e0", detail: "rgba(255,255,255,.85)" },
  stone: { fill: "#9c97b3", edge: "#6f6a88", detail: "rgba(60,55,85,.45)" },
  target: { fill: "#ff6078", edge: "#c93b56", detail: "rgba(255,255,255,.6)" },
});

function roundedBox(ctx, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, r);
  else ctx.rect(-w / 2, -h / 2, w, h);
}

export function drawTowerBlocks(ctx, world) {
  for (const block of world.bodies) {
    if (block.broken || block.target) continue;
    const colour = BLOCK_COLOURS[block.material] ?? BLOCK_COLOURS.wood;
    const w = block.width, h = block.height, long = Math.max(w, h), short = Math.min(w, h);
    ctx.save();
    ctx.translate(block.x, block.y);
    ctx.rotate(block.angle);
    roundedBox(ctx, w, h, Math.min(5, short * 0.25));
    ctx.fillStyle = colour.fill;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.save();
    roundedBox(ctx, w - 3, h - 3, Math.min(4, short * 0.2));
    ctx.clip();
    const along = w >= h;
    ctx.strokeStyle = colour.detail;
    ctx.lineWidth = 2;
    if (block.material === "wood") {
      // Grain runs the length of the plank.
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        const offset = i * short * 0.26;
        if (along) { ctx.moveTo(-long / 2 + 6, offset); ctx.quadraticCurveTo(0, offset + 3, long / 2 - 6, offset - 1); } else { ctx.moveTo(offset, -long / 2 + 6); ctx.quadraticCurveTo(offset + 3, 0, offset - 1, long / 2 - 6); }
        ctx.stroke();
      }
    } else if (block.material === "glass") {
      // A highlight down one side reads as glass at any size.
      ctx.lineWidth = Math.max(2, short * 0.16);
      ctx.beginPath();
      if (along) { ctx.moveTo(-long / 2 + 8, -short * 0.18); ctx.lineTo(long / 2 - 14, -short * 0.18); } else { ctx.moveTo(-short * 0.18, -long / 2 + 8); ctx.lineTo(-short * 0.18, long / 2 - 14); }
      ctx.stroke();
    } else if (block.material === "stone") {
      ctx.fillStyle = colour.detail;
      for (let i = 0; i < Math.round((w * h) / 700); i += 1) {
        // Fixed flecks from the block's own size: no randomness, no flicker.
        const fx = ((i * 37) % 100) / 100 - 0.5, fy = ((i * 61) % 100) / 100 - 0.5;
        ctx.beginPath(); ctx.arc(fx * (w - 8), fy * (h - 8), 1.6 + (i % 3) * 0.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Cracks once it is past half its strength, more as it weakens.
    const wear = 1 - block.health / block.strength;
    if (wear > 0.45) {
      ctx.strokeStyle = "rgba(25,20,45,.75)";
      ctx.lineWidth = 1.8;
      const cracks = wear > 0.75 ? 2 : 1;
      for (let i = 0; i < cracks; i += 1) {
        const sx = (i ? 0.2 : -0.25) * w, sy = (i ? -0.2 : 0.15) * h;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + w * 0.12, sy - h * 0.1);
        ctx.lineTo(sx + w * 0.05, sy - h * 0.25);
        ctx.moveTo(sx + w * 0.12, sy - h * 0.1);
        ctx.lineTo(sx + w * 0.26, sy - h * 0.05);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.restore();
  }
}

export const towerBlockCorners = bodyCorners;
