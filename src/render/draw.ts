import type { Entity, PlayerState, SceneTheme, BossDef } from "../game/types";
import { W, H } from "../game/types";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Immersive corridor / mansion exploration backdrop. `rail` scrolls the path forward. */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  theme: SceneTheme,
  t: number,
  shake = 0,
  rail = 0,
  exploring = false,
) {
  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;
  ctx.save();
  ctx.translate(sx, sy);

  // Sky / far atmosphere
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  if (theme === "drive" || theme === "courtyard") {
    sky.addColorStop(0, "#0c1210");
    sky.addColorStop(1, "#1a2820");
  } else if (theme === "lab") {
    sky.addColorStop(0, "#080c12");
    sky.addColorStop(1, "#121c28");
  } else if (theme === "cave") {
    sky.addColorStop(0, "#080604");
    sky.addColorStop(1, "#14100c");
  } else if (theme === "sanctum") {
    sky.addColorStop(0, "#100608");
    sky.addColorStop(1, "#1c0c12");
  } else {
    sky.addColorStop(0, "#0a080c");
    sky.addColorStop(1, "#18141a");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  drawCorridorPerspective(ctx, theme, t, rail, exploring);

  if (theme === "drive") {
    drawApproachGate(ctx, rail, t);
  } else if (theme === "courtyard") {
    drawCourtyardFacade(ctx, rail, t);
  } else if (theme === "mansion") {
    drawGrandHall(ctx, rail, t);
  } else if (theme === "lab") {
    drawLabCorridor(ctx, rail, t);
  } else if (theme === "cave") {
    drawCaveTunnel(ctx, rail, t);
  } else {
    drawSanctumChamber(ctx, rail, t);
  }

  // Ground fog / dust
  const fog = ctx.createLinearGradient(0, H * 0.5, 0, H);
  fog.addColorStop(0, "rgba(30,40,35,0)");
  fog.addColorStop(0.4, "rgba(30,40,35,0.2)");
  fog.addColorStop(1, "rgba(10,12,10,0.55)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, H * 0.48, W, H * 0.52);

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.15, W / 2, H * 0.5, H * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Exploring hint ribbon
  if (exploring) {
    ctx.fillStyle = "rgba(143,179,90,0.15)";
    ctx.fillRect(0, H * 0.78, W, 28);
    ctx.fillStyle = "rgba(242,230,201,0.75)";
    ctx.font = "11px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("EXPLORING THE HOUSE…", W / 2, H * 0.78 + 18);
  }

  ctx.restore();
}

function drawCorridorPerspective(
  ctx: CanvasRenderingContext2D,
  theme: SceneTheme,
  t: number,
  rail: number,
  exploring: boolean,
) {
  const vanishY = H * 0.38;
  const scroll = (rail * 80) % 120;
  const sway = exploring ? Math.sin(t * 1.2) * 4 : 0;

  // Floor
  const floorGrad = ctx.createLinearGradient(0, vanishY, 0, H);
  floorGrad.addColorStop(0, theme === "lab" ? "#15202a" : "#1a1614");
  floorGrad.addColorStop(1, "#0a0808");
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.moveTo(W * 0.42 + sway, vanishY);
  ctx.lineTo(W * 0.58 + sway, vanishY);
  ctx.lineTo(W + 40, H);
  ctx.lineTo(-40, H);
  ctx.closePath();
  ctx.fill();

  // Floor boards / tiles rushing toward camera
  ctx.strokeStyle = "rgba(232,220,200,0.07)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const p = (i / 14 + scroll / 120) % 1;
    const y = vanishY + Math.pow(p, 1.6) * (H - vanishY);
    const half = lerp(20, W * 0.55, p);
    ctx.beginPath();
    ctx.moveTo(W / 2 - half + sway, y);
    ctx.lineTo(W / 2 + half + sway, y);
    ctx.stroke();
  }
  // Center aisle
  ctx.strokeStyle = "rgba(196,60,43,0.12)";
  ctx.beginPath();
  ctx.moveTo(W / 2 + sway * 0.5, vanishY);
  ctx.lineTo(W / 2 - 30, H);
  ctx.moveTo(W / 2 + sway * 0.5, vanishY);
  ctx.lineTo(W / 2 + 30, H);
  ctx.stroke();

  // Left / right walls in perspective
  const wallColor = theme === "lab" ? "#121820" : theme === "cave" ? "#161210" : "#141018";
  ctx.fillStyle = wallColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W * 0.42 + sway, vanishY);
  ctx.lineTo(-40, H);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, 0);
  ctx.lineTo(W * 0.58 + sway, vanishY);
  ctx.lineTo(W + 40, H);
  ctx.closePath();
  ctx.fill();

  // Wall panel lines scrolling
  ctx.strokeStyle = "rgba(232,220,200,0.08)";
  for (let i = 0; i < 10; i++) {
    const p = (i / 10 + scroll / 120) % 1;
    const y0 = lerp(20, vanishY, 1 - p);
    const xL0 = lerp(0, W * 0.42 + sway, 1 - Math.pow(1 - p, 1.2));
    const xL1 = lerp(0, W * 0.42 + sway, 1 - Math.pow(1 - (p + 0.08), 1.2));
    ctx.beginPath();
    ctx.moveTo(xL0, y0);
    ctx.lineTo(xL1, y0 + 40);
    ctx.stroke();
    const xR0 = lerp(W, W * 0.58 + sway, 1 - Math.pow(1 - p, 1.2));
    ctx.beginPath();
    ctx.moveTo(xR0, y0);
    ctx.lineTo(lerp(W, W * 0.58 + sway, 1 - Math.pow(1 - (p + 0.08), 1.2)), y0 + 40);
    ctx.stroke();
  }

  // Ceiling
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W * 0.58 + sway, vanishY);
  ctx.lineTo(W * 0.42 + sway, vanishY);
  ctx.closePath();
  ctx.fill();
}

function drawApproachGate(ctx: CanvasRenderingContext2D, rail: number, t: number) {
  const zoom = Math.min(1.35, 0.75 + rail * 0.02);
  ctx.save();
  ctx.translate(W / 2, H * 0.36);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H * 0.36);

  // Distant trees
  for (let i = 0; i < 6; i++) {
    const x = 60 + i * 160 + ((rail * 40) % 160);
    ctx.fillStyle = "#0a100c";
    ctx.fillRect(x, H * 0.22, 14, H * 0.28);
    ctx.beginPath();
    ctx.ellipse(x + 7, H * 0.22, 32, 44, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mansion growing closer
  ctx.fillStyle = "#0c0a0e";
  ctx.fillRect(W * 0.3, H * 0.14, W * 0.4, H * 0.36);
  ctx.beginPath();
  ctx.moveTo(W * 0.27, H * 0.16);
  ctx.lineTo(W / 2, H * 0.04);
  ctx.lineTo(W * 0.73, H * 0.16);
  ctx.closePath();
  ctx.fill();
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const flick = 0.25 + Math.sin(t * 3 + r * 2 + c) * 0.15;
      ctx.fillStyle = `rgba(196,60,43,${flick})`;
      ctx.fillRect(W * 0.36 + c * 55, H * 0.2 + r * 42, 22, 28);
    }
  }
  // Gate
  ctx.strokeStyle = "#2a2420";
  ctx.lineWidth = 4;
  ctx.strokeRect(W * 0.44, H * 0.36, W * 0.12, H * 0.14);
  ctx.restore();
}

function drawCourtyardFacade(ctx: CanvasRenderingContext2D, rail: number, t: number) {
  const scroll = (rail * 60) % 200;
  ctx.fillStyle = "#121016";
  ctx.fillRect(W * 0.18, H * 0.1, W * 0.64, H * 0.4);
  // Columns
  for (let i = 0; i < 5; i++) {
    const x = W * 0.22 + i * 130 - scroll * 0.3;
    ctx.fillStyle = "#1c181c";
    ctx.fillRect(x, H * 0.12, 22, H * 0.36);
    ctx.fillStyle = "#2a2228";
    ctx.fillRect(x - 4, H * 0.12, 30, 12);
  }
  // Doorway ahead
  ctx.fillStyle = "#08060a";
  ctx.fillRect(W * 0.44, H * 0.28, W * 0.12, H * 0.22);
  ctx.fillStyle = `rgba(196,60,43,${0.15 + Math.sin(t * 2) * 0.08})`;
  ctx.fillRect(W * 0.46, H * 0.3, W * 0.08, H * 0.08);
}

function drawGrandHall(ctx: CanvasRenderingContext2D, rail: number, t: number) {
  const scroll = (rail * 70) % 160;
  // Side doors rushing past
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 4; i++) {
      const p = (i / 4 + scroll / 160) % 1;
      const y = H * 0.18 + p * H * 0.35;
      const depth = 1 - p;
      const w = 28 + depth * 40;
      const h = 50 + depth * 70;
      const x = side === 0 ? lerp(40, W * 0.38, depth) : lerp(W - 40, W * 0.62, depth) - w;
      ctx.fillStyle = "#0e0c10";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = `rgba(180,120,60,${0.1 + depth * 0.15})`;
      ctx.fillRect(x + w * 0.3, y + h * 0.25, w * 0.15, h * 0.2);
    }
  }
  // Grand stairs ahead
  ctx.fillStyle = "#1a1418";
  for (let i = 0; i < 7; i++) {
    const y = H * 0.5 - i * 10;
    const ww = 160 + i * 36;
    ctx.fillRect(W / 2 - ww / 2, y, ww, 9);
  }
  // Chandelier glow
  ctx.fillStyle = `rgba(220,180,100,${0.08 + Math.sin(t * 2) * 0.03})`;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.2, 50, 0, Math.PI * 2);
  ctx.fill();
}

function drawLabCorridor(ctx: CanvasRenderingContext2D, rail: number, t: number) {
  const scroll = (rail * 90) % 140;
  for (let i = 0; i < 6; i++) {
    const p = (i / 6 + scroll / 140) % 1;
    const depth = 1 - p;
    const y = H * 0.2 + p * H * 0.28;
    const h = 40 + depth * 70;
    const w = 30 + depth * 45;
    // left tanks
    let x = lerp(30, W * 0.36, depth);
    ctx.strokeStyle = `rgba(80,200,180,${0.15 + depth * 0.25})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = `rgba(60,160,140,${0.06 + Math.sin(t * 3 + i) * 0.03})`;
    ctx.fillRect(x + 4, y + 8, w - 8, h - 16);
    // right
    x = lerp(W - 30, W * 0.64, depth) - w;
    ctx.strokeRect(x, y, w, h);
    ctx.fillRect(x + 4, y + 8, w - 8, h - 16);
  }
  ctx.fillStyle = "rgba(100,180,200,0.08)";
  ctx.fillRect(W * 0.46, H * 0.22, W * 0.08, H * 0.28);
}

function drawCaveTunnel(ctx: CanvasRenderingContext2D, rail: number, t: number) {
  const scroll = (rail * 55) % 100;
  ctx.fillStyle = "#0c0a08";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.15);
  ctx.quadraticCurveTo(W * 0.5, H * 0.05 + Math.sin(rail) * 8, W, H * 0.15);
  ctx.lineTo(W, 0);
  ctx.lineTo(0, 0);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const p = (i / 8 + scroll / 100) % 1;
    const x = lerp(80, W / 2, 1 - p) + (i % 2 === 0 ? -40 : 40);
    const y = H * 0.12 + p * H * 0.35;
    ctx.fillStyle = "#181410";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 12, y + 50 * (1 - p * 0.5));
    ctx.lineTo(x - 12, y + 50 * (1 - p * 0.5));
    ctx.fill();
  }
  ctx.fillStyle = `rgba(100,80,40,${0.05 + Math.sin(t) * 0.02})`;
  ctx.fillRect(W * 0.45, H * 0.3, W * 0.1, H * 0.15);
}

function drawSanctumChamber(ctx: CanvasRenderingContext2D, rail: number, t: number) {
  const pulse = 0.18 + Math.sin(t * 2.2) * 0.1;
  ctx.fillStyle = "#120810";
  ctx.fillRect(W * 0.22, H * 0.1, W * 0.56, H * 0.42);
  // Ritual circle
  ctx.strokeStyle = `rgba(196,60,43,${0.35 + pulse})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.36, 55 + Math.min(20, rail), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(196,60,43,${pulse})`;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.36, 28, 0, Math.PI * 2);
  ctx.fill();
  // Pillars
  ctx.fillStyle = "#1a1014";
  ctx.fillRect(W * 0.24, H * 0.12, 28, H * 0.38);
  ctx.fillRect(W * 0.72, H * 0.12, 28, H * 0.38);
  ctx.fillStyle = "rgba(232,220,200,0.15)";
  ctx.font = "10px Orbitron, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("THE HEART OF THE DEAD HOUSE", W / 2, H * 0.14);
}

export function drawEntity(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const dying = e.dying ?? 0;
  if (!e.alive && e.kind !== "breakable" && dying <= 0) return;

  const bob = e.alive ? Math.sin(time * 4 + e.id) * 3 : 0;
  const recoil = e.recoil ?? 0;
  const recoilDir = e.recoilDir ?? 0;
  const knock = recoil > 0 ? Math.sin(recoil * 20) * 6 * recoilDir : 0;
  const lean = recoil > 0 ? recoilDir * recoil * 0.35 : 0;
  const deathLean = dying > 0 ? dying * 1.1 : 0;
  const deathDrop = dying > 0 ? dying * 40 : 0;

  ctx.save();
  ctx.translate(e.x + knock, e.y + bob + deathDrop);
  ctx.rotate(lean + (recoilDir >= 0 ? deathLean : -deathLean));
  const s = e.scale * lerp(0.7, 1.35, e.z) * (dying > 0 ? 1 - dying * 0.15 : 1);
  ctx.scale(s, s);
  if (e.hitFlash > 0) {
    ctx.filter = "brightness(2.8) saturate(1.4)";
  }
  if (dying > 0) {
    ctx.globalAlpha = 1 - dying * 0.85;
  }

  if (e.kind === "enemy") drawEnemy(ctx, e, time);
  else if (e.kind === "civilian") drawCivilian(ctx, e);
  else if (e.kind === "breakable") drawCrate(ctx, e);
  else if (e.kind === "item") drawItem(ctx, e);
  else if (e.kind === "boss") drawBoss(ctx, e, time);

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Entity, time: number) {
  const v = e.variant ?? "walker";
  const rage = e.hitFlash && e.hitFlash > 0;
  if (v === "crawler") {
    ctx.fillStyle = rage ? "#5a3a2a" : "#3a4a2a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a3220";
    ctx.beginPath();
    ctx.arc(18, -8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff3b2f";
    ctx.beginPath();
    ctx.arc(24, -10, 3.5, 0, Math.PI * 2);
    ctx.arc(20, -14, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (rage) {
      ctx.strokeStyle = "rgba(196,60,43,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(22, 8);
      ctx.stroke();
    }
    return;
  }

  const armSwing = Math.sin(time * 6 + e.id) * (v === "runner" ? 10 : 5);
  // legs
  ctx.fillStyle = "#2a3028";
  ctx.fillRect(-14, 10, 10, 36);
  ctx.fillRect(4, 10, 10, 36);
  // body
  ctx.fillStyle = rage
    ? "#5a3828"
    : v === "brute"
      ? "#3a2820"
      : v === "runner"
        ? "#2e3a28"
        : "#34382e";
  ctx.fillRect(-22, -28, 44, 44);
  // torn cloth detail
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(-18, -10, 12, 20);
  // arms reaching
  ctx.fillStyle = "#2a2820";
  ctx.save();
  ctx.translate(-28, -12);
  ctx.rotate((-20 + armSwing) * (Math.PI / 180));
  ctx.fillRect(-8, 0, 14, 36);
  ctx.restore();
  ctx.save();
  ctx.translate(28, -12);
  ctx.rotate((20 - armSwing) * (Math.PI / 180));
  ctx.fillRect(-6, 0, 14, 36);
  ctx.restore();
  // head
  ctx.fillStyle = rage ? "#6a4a38" : "#4a5a40";
  ctx.beginPath();
  ctx.arc(0, -42, 16, 0, Math.PI * 2);
  ctx.fill();
  // jaw
  ctx.fillStyle = "#3a4030";
  ctx.fillRect(-8, -36, 16, 8);
  // eyes
  ctx.fillStyle = "#ff3b2f";
  ctx.beginPath();
  ctx.arc(-6, -44, rage ? 4 : 3, 0, Math.PI * 2);
  ctx.arc(6, -44, rage ? 4 : 3, 0, Math.PI * 2);
  ctx.fill();
  if (v === "brute") {
    ctx.strokeStyle = "#1a1010";
    ctx.lineWidth = 4;
    ctx.strokeRect(-24, -30, 48, 20);
  }
  // snarl when hit
  if (rage) {
    ctx.strokeStyle = "#c43c2b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -32);
    ctx.lineTo(0, -28);
    ctx.lineTo(6, -32);
    ctx.stroke();
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
  const bestMult = Math.max(
    1,
    ...players.filter((p) => p.active).map((p) => p.multiplier),
  );
  ctx.fillText(`SCORE ${String(totalScore).padStart(6, "0")}`, W / 2, 24);
  if (bestMult > 1) {
    ctx.fillStyle = bestMult >= 5 ? "#ffd36a" : "#8fb35a";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText(`x${bestMult}`, W / 2 + 118, 24);
  }
  ctx.fillStyle = "#f2e6c9";
  ctx.font = "12px 'Press Start 2P', monospace";
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
    const multLabel = p.multiplier > 1 ? ` x${p.multiplier}` : "";
    ctx.fillText(`${left ? "1P" : "2P"}${multLabel}`, bx + 10, H - 50);

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

/** Timed cancel / defend target when a boss winds up an attack. */
export function drawDefendPrompt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  timeLeft: number,
  timeMax: number,
  hitsLeft: number,
  hitsNeed: number,
  time: number,
) {
  const pct = Math.max(0, timeLeft / timeMax);
  const pulse = 1 + Math.sin(time * 14) * 0.08;
  const danger = pct < 0.35;

  ctx.save();
  ctx.translate(x, y);

  // Outer warning ring
  ctx.strokeStyle = danger ? "rgba(255,59,47,0.85)" : "rgba(242,230,201,0.7)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.35 * pulse, 0, Math.PI * 2);
  ctx.stroke();

  // Timer arc
  ctx.strokeStyle = danger ? "#ff3b2f" : "#8fb35a";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.stroke();

  // Target disc
  ctx.fillStyle = danger ? "rgba(196,60,43,0.55)" : "rgba(143,179,90,0.45)";
  ctx.beginPath();
  ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f2e6c9";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Crosshair inside
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, 0);
  ctx.lineTo(r * 0.55, 0);
  ctx.moveTo(0, -r * 0.55);
  ctx.lineTo(0, r * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = danger ? "#ff3b2f" : "#f2e6c9";
  ctx.font = "14px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText("DEFEND!", x, y - r - 28);
  ctx.font = "10px Orbitron, sans-serif";
  ctx.fillStyle = "#f2e6c9";
  ctx.fillText(
    hitsNeed > 1 ? `${hitsLeft} HIT${hitsLeft > 1 ? "S" : ""} LEFT` : "SHOOT THE MARK",
    x,
    y + r + 26,
  );
}
