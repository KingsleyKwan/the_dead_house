import type { Entity, PlayerState, SceneTheme, BossDef } from "../game/types";
import { W, H } from "../game/types";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  theme: SceneTheme,
  t: number,
  shake = 0,
) {
  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;
  ctx.save();
  ctx.translate(sx, sy);

  const palettes: Record<SceneTheme, [string, string, string]> = {
    drive: ["#1a2218", "#2d3a28", "#0d100c"],
    courtyard: ["#1c241c", "#334033", "#0e120e"],
    mansion: ["#1a1418", "#2a2228", "#0c0a0c"],
    lab: ["#121820", "#1e2a34", "#080c10"],
    cave: ["#141210", "#24201c", "#0a0806"],
    sanctum: ["#180c10", "#2a1418", "#0c0608"],
  };
  const [c0, c1, c2] = palettes[theme];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c0);
  g.addColorStop(0.55, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // parallax floor
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.62);
  ctx.lineTo(W, H * 0.62);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();

  // perspective lines
  ctx.strokeStyle = "rgba(232,220,200,0.06)";
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 18, H * 0.62);
    ctx.lineTo(W / 2 + i * 140, H);
    ctx.stroke();
  }

  if (theme === "drive" || theme === "courtyard") {
    drawTrees(ctx, t);
    drawMansionSilhouette(ctx, theme === "drive" ? 0.55 : 0.85);
  } else if (theme === "mansion") {
    drawHall(ctx, t);
  } else if (theme === "lab") {
    drawLab(ctx, t);
  } else if (theme === "cave") {
    drawCave(ctx, t);
  } else {
    drawSanctum(ctx, t);
  }

  // fog
  ctx.fillStyle = "rgba(40,50,45,0.15)";
  ctx.fillRect(0, H * 0.45, W, H * 0.25);

  ctx.restore();
}

function drawTrees(ctx: CanvasRenderingContext2D, t: number) {
  for (let i = 0; i < 8; i++) {
    const x = ((i * 140 + t * 30) % (W + 80)) - 40;
    ctx.fillStyle = "#0a0e0a";
    ctx.fillRect(x, H * 0.28, 18, H * 0.34);
    ctx.beginPath();
    ctx.ellipse(x + 9, H * 0.28, 40, 50, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMansionSilhouette(ctx: CanvasRenderingContext2D, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#0a080a";
  ctx.fillRect(W * 0.28, H * 0.18, W * 0.44, H * 0.44);
  // roof
  ctx.beginPath();
  ctx.moveTo(W * 0.25, H * 0.2);
  ctx.lineTo(W * 0.5, H * 0.06);
  ctx.lineTo(W * 0.75, H * 0.2);
  ctx.closePath();
  ctx.fill();
  // windows
  ctx.fillStyle = "#c43c2b";
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.globalAlpha = 0.35 + Math.sin(r + c) * 0.15;
      ctx.fillRect(W * 0.34 + c * 70, H * 0.26 + r * 50, 28, 34);
    }
  }
  ctx.restore();
}

function drawHall(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = "#161018";
  ctx.fillRect(W * 0.15, H * 0.1, W * 0.7, H * 0.52);
  ctx.fillStyle = "rgba(196,60,43,0.25)";
  for (let i = 0; i < 5; i++) {
    const flicker = 0.5 + Math.sin(t * 6 + i) * 0.2;
    ctx.globalAlpha = flicker;
    ctx.fillRect(W * 0.22 + i * 120, H * 0.2, 24, 40);
  }
  ctx.globalAlpha = 1;
  // stairs
  ctx.fillStyle = "#1c1618";
  for (let i = 0; i < 6; i++) {
    const y = H * 0.55 - i * 12;
    const w = 200 + i * 40;
    ctx.fillRect(W / 2 - w / 2, y, w, 10);
  }
}

function drawLab(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = "#101820";
  ctx.fillRect(0, H * 0.15, W, H * 0.4);
  ctx.strokeStyle = "rgba(100,180,200,0.25)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const x = 80 + i * 150;
    ctx.strokeRect(x, H * 0.22, 60, 90);
    ctx.fillStyle = `rgba(80,200,180,${0.08 + Math.sin(t * 3 + i) * 0.05})`;
    ctx.fillRect(x + 8, H * 0.28, 44, 50);
  }
}

function drawCave(ctx: CanvasRenderingContext2D, _t: number) {
  ctx.fillStyle = "#0e0c0a";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.55);
  ctx.quadraticCurveTo(W * 0.25, H * 0.1, W * 0.5, H * 0.2);
  ctx.quadraticCurveTo(W * 0.75, H * 0.08, W, H * 0.5);
  ctx.lineTo(W, 0);
  ctx.lineTo(0, 0);
  ctx.fill();
  ctx.fillStyle = "#1a1612";
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 130;
    ctx.beginPath();
    ctx.moveTo(x, H * 0.15);
    ctx.lineTo(x + 20, H * 0.45);
    ctx.lineTo(x - 20, H * 0.45);
    ctx.fill();
  }
}

function drawSanctum(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = "#140810";
  ctx.fillRect(W * 0.2, H * 0.08, W * 0.6, H * 0.5);
  const pulse = 0.2 + Math.sin(t * 2) * 0.1;
  ctx.fillStyle = `rgba(196,60,43,${pulse})`;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.32, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(232,220,200,0.2)";
  ctx.lineWidth = 3;
  ctx.strokeRect(W * 0.35, H * 0.48, W * 0.3, 20);
}

export function drawEntity(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  if (!e.alive && e.kind !== "breakable") return;
  const bob = Math.sin(time * 4 + e.id) * 3;
  ctx.save();
  ctx.translate(e.x, e.y + bob);
  const s = e.scale * lerp(0.7, 1.35, e.z);
  ctx.scale(s, s);
  if (e.hitFlash > 0) {
    ctx.filter = "brightness(2.5)";
  }

  if (e.kind === "enemy") drawEnemy(ctx, e);
  else if (e.kind === "civilian") drawCivilian(ctx, e);
  else if (e.kind === "breakable") drawCrate(ctx, e);
  else if (e.kind === "item") drawItem(ctx, e);
  else if (e.kind === "boss") drawBoss(ctx, e, time);

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Entity) {
  const v = e.variant ?? "walker";
  if (v === "crawler") {
    ctx.fillStyle = "#3a4a2a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a3220";
    ctx.beginPath();
    ctx.arc(18, -8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c43c2b";
    ctx.beginPath();
    ctx.arc(24, -10, 3, 0, Math.PI * 2);
    ctx.arc(20, -14, 3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // legs
  ctx.fillStyle = "#2a3028";
  ctx.fillRect(-14, 10, 10, 36);
  ctx.fillRect(4, 10, 10, 36);
  // body
  ctx.fillStyle = v === "brute" ? "#3a2820" : v === "runner" ? "#2e3a28" : "#34382e";
  ctx.fillRect(-22, -28, 44, 44);
  // arms
  ctx.fillStyle = "#2a2820";
  ctx.fillRect(-36, -20, 14, 34);
  ctx.fillRect(22, -20, 14, 34);
  // head
  ctx.fillStyle = "#4a5a40";
  ctx.beginPath();
  ctx.arc(0, -42, 16, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = "#c43c2b";
  ctx.beginPath();
  ctx.arc(-6, -44, 3, 0, Math.PI * 2);
  ctx.arc(6, -44, 3, 0, Math.PI * 2);
  ctx.fill();
  if (v === "brute") {
    ctx.strokeStyle = "#1a1010";
    ctx.lineWidth = 4;
    ctx.strokeRect(-24, -30, 48, 20);
  }
}

function drawCivilian(ctx: CanvasRenderingContext2D, e: Entity) {
  if (e.rescued) {
    ctx.fillStyle = "rgba(143,179,90,0.8)";
    ctx.font = "bold 14px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SAVED!", 0, -60);
    return;
  }
  ctx.fillStyle = "#2a4060";
  ctx.fillRect(-16, -24, 32, 40);
  ctx.fillStyle = "#e8dcc8";
  ctx.beginPath();
  ctx.arc(0, -38, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c43c2b";
  ctx.font = "bold 12px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("HELP!", 0, -58);
}

function drawCrate(ctx: CanvasRenderingContext2D, e: Entity) {
  if (e.broken) {
    ctx.fillStyle = "rgba(80,60,40,0.5)";
    ctx.fillRect(-20, 10, 16, 10);
    ctx.fillRect(4, 12, 18, 8);
    return;
  }
  ctx.fillStyle = "#6a4a28";
  ctx.fillRect(-28, -20, 56, 44);
  ctx.strokeStyle = "#3a2810";
  ctx.lineWidth = 3;
  ctx.strokeRect(-28, -20, 56, 44);
  ctx.beginPath();
  ctx.moveTo(-28, 0);
  ctx.lineTo(28, 0);
  ctx.moveTo(0, -20);
  ctx.lineTo(0, 24);
  ctx.stroke();
}

function drawItem(ctx: CanvasRenderingContext2D, e: Entity) {
  if (e.itemType === "life") {
    ctx.fillStyle = "#c43c2b";
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-18, -6, -10, -22, 0, -12);
    ctx.bezierCurveTo(10, -22, 18, -6, 0, 8);
    ctx.fill();
  } else if (e.itemType === "frog") {
    ctx.fillStyle = "#d4af37";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a7020";
    ctx.beginPath();
    ctx.arc(-6, -4, 3, 0, Math.PI * 2);
    ctx.arc(6, -4, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#8fb35a";
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Orbitron";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 0, 1);
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const name = e.label ?? "";
  if (name.includes("CHARIOT")) {
    ctx.fillStyle = "#2a2220";
    ctx.fillRect(-50, -40, 100, 90);
    ctx.fillStyle = "#3a3028";
    ctx.fillRect(-40, -90, 80, 50);
    ctx.fillStyle = "#1a1814";
    ctx.fillRect(-60, -100, 120, 18);
    ctx.fillStyle = "#c43c2b";
    ctx.fillRect(-8, -70, 16, 30);
    // axe
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(50, -20);
    ctx.lineTo(90, -80);
    ctx.stroke();
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.moveTo(80, -90);
    ctx.lineTo(110, -70);
    ctx.lineTo(95, -50);
    ctx.fill();
  } else if (name.includes("HANGED")) {
    ctx.fillStyle = "#2a3028";
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a2018";
    ctx.beginPath();
    ctx.moveTo(-40, -10);
    ctx.quadraticCurveTo(-100, -40, -70, 40);
    ctx.quadraticCurveTo(-40, 20, -40, -10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(40, -10);
    ctx.quadraticCurveTo(100, -40, 70, 40);
    ctx.quadraticCurveTo(40, 20, 40, -10);
    ctx.fill();
    ctx.fillStyle = "#c43c2b";
    ctx.beginPath();
    ctx.arc(-12, -20, 5, 0, Math.PI * 2);
    ctx.arc(12, -20, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (name.includes("HERMIT")) {
    ctx.fillStyle = "#3a2820";
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + time;
      ctx.strokeStyle = "#2a1c14";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 30);
      ctx.lineTo(Math.cos(a) * 90, Math.sin(a) * 60);
      ctx.stroke();
    }
    ctx.fillStyle = "#c43c2b";
    ctx.beginPath();
    ctx.arc(-15, -10, 8, 0, Math.PI * 2);
    ctx.arc(15, -10, 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Magician
    const hover = Math.sin(time * 3) * 8;
    ctx.translate(0, hover);
    ctx.fillStyle = "#201018";
    ctx.beginPath();
    ctx.moveTo(0, -90);
    ctx.lineTo(50, 50);
    ctx.lineTo(-50, 50);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c43c2b";
    ctx.globalAlpha = 0.5 + Math.sin(time * 5) * 0.3;
    ctx.beginPath();
    ctx.arc(0, -40, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e8dcc8";
    ctx.beginPath();
    ctx.arc(0, -50, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff3b2f";
    ctx.beginPath();
    ctx.arc(-7, -52, 4, 0, Math.PI * 2);
    ctx.arc(7, -52, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  flash: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = flash > 0 ? "#fff" : color;
  ctx.lineWidth = 2;
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(-5, 0);
  ctx.moveTo(5, 0);
  ctx.lineTo(r, 0);
  ctx.moveTo(0, -r);
  ctx.lineTo(0, -5);
  ctx.moveTo(0, 5);
  ctx.lineTo(0, r);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawHudCanvas(
  ctx: CanvasRenderingContext2D,
  players: PlayerState[],
  chapterTitle: string,
  civiliansSaved: number,
  civiliansTotal: number,
  boss?: Entity | null,
  bossDef?: BossDef | null,
  reloadFlash = false,
) {
  // score / chapter
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, 36);
  ctx.fillStyle = "#f2e6c9";
  ctx.font = "12px 'Press Start 2P', monospace";
  ctx.textAlign = "left";
  ctx.fillText(chapterTitle, 16, 24);
  ctx.textAlign = "center";
  const totalScore = players.reduce((s, p) => s + (p.active ? p.score : 0), 0);
  ctx.fillText(`SCORE ${String(totalScore).padStart(6, "0")}`, W / 2, 24);
  ctx.textAlign = "right";
  ctx.fillText(`SAVED ${civiliansSaved}/${civiliansTotal}`, W - 16, 24);

  // bottom player panels
  players.forEach((p, i) => {
    if (!p.active) return;
    const left = i === 0;
    const bx = left ? 16 : W - 220;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(bx, H - 70, 200, 54);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, H - 70, 200, 54);

    ctx.fillStyle = p.color;
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillText(left ? "1P" : "2P", bx + 10, H - 50);

    // lives as flame icons
    for (let L = 0; L < p.maxLives; L++) {
      ctx.globalAlpha = L < p.lives ? 1 : 0.2;
      drawLifeIcon(ctx, bx + 50 + L * 22, H - 56);
    }
    ctx.globalAlpha = 1;

    // ammo bullets
    for (let a = 0; a < p.maxAmmo; a++) {
      ctx.fillStyle = a < p.ammo ? "#f2e6c9" : "#333";
      ctx.fillRect(bx + 10 + a * 28, H - 30, 20, 8);
    }
  });

  if (reloadFlash) {
    ctx.fillStyle = Math.floor(performance.now() / 200) % 2 ? "#ff3b2f" : "#f2e6c9";
    ctx.font = "22px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("RELOAD", W / 2, H * 0.42);
  }

  if (boss && boss.alive && bossDef) {
    const pct = boss.hp / boss.maxHp;
    const bw = 360;
    const bx = (W - bw) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(bx - 4, 48, bw + 8, 36);
    ctx.fillStyle = "#f2e6c9";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(bossDef.name, W / 2, 62);
    ctx.fillStyle = "#331010";
    ctx.fillRect(bx, 70, bw, 10);
    ctx.fillStyle = "#c43c2b";
    ctx.fillRect(bx, 70, bw * pct, 10);
  }
}

function drawLifeIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#c43c2b";
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 16);
  ctx.quadraticCurveTo(x - 4, y + 4, x + 8, y - 4);
  ctx.quadraticCurveTo(x + 20, y + 4, x + 8, y + 16);
  ctx.fill();
  ctx.fillStyle = "#f2c14e";
  ctx.beginPath();
  ctx.arc(x + 8, y + 6, 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawMuzzleFlash(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(255,220,120,0.85)";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 18 : 8;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
