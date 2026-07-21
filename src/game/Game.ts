import {
  type Entity,
  type PlayerState,
  type GameState,
  type ChapterDef,
  type SegmentDef,
  type BossDef,
  type ShotResult,
  W,
  H,
  MAX_AMMO,
  START_LIVES,
  MAX_LIVES,
  CONTINUE_TIME,
  BEST_SCORE_KEY,
  streakToMultiplier,
} from "./types";
import { CHAPTERS } from "../data/chapters";
import { GAME_VERSION } from "./version";
import {
  makeEnemy,
  makeCivilian,
  makeBreakable,
  makeItem,
  makeBoss,
  resetEntityIds,
} from "../entities/factory";
import { Input } from "../systems/Input";
import { AudioBus } from "../systems/Audio";
import {
  drawBackground,
  drawEntity,
  drawCrosshair,
  drawHudCanvas,
  drawMuzzleFlash,
  drawDefendPrompt,
} from "../render/draw";

interface DefendPrompt {
  active: boolean;
  x: number;
  y: number;
  r: number;
  timeLeft: number;
  timeMax: number;
  hitsLeft: number;
  hitsNeed: number;
}

interface FloatScore {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  color: string;
}

export class Game {
  private ctx: CanvasRenderingContext2D;
  private input: Input;
  private audio = new AudioBus();

  state: GameState = "title";
  players: PlayerState[] = [];
  entities: Entity[] = [];
  chapterIndex = 0;
  segmentId = "";
  segmentTime = 0;
  introTimer = 0;
  continueTimer = CONTINUE_TIME;
  time = 0;
  shake = 0;
  civiliansSaved = 0;
  civiliansSeen = 0;
  totalCiviliansSaved = 0;
  spawnCursor = 0;
  branchPending: SegmentDef["branches"] | null = null;
  branchTimer = 0;
  bossDef: BossDef | null = null;
  flashMessages: { text: string; life: number }[] = [];
  muzzle: { x: number; y: number; life: number }[] = [];
  endingKind: "good" | "normal" | "bad" = "normal";
  routesTaken: string[] = [];
  shotsFired = 0;
  shotsHit = 0;
  headshots = 0;
  bestStreak = 0;
  newBest = false;
  private pendingAfterClear: "nextChapter" | "ending" | null = null;
  private defend: DefendPrompt = {
    active: false,
    x: W / 2,
    y: H * 0.45,
    r: 42,
    timeLeft: 0,
    timeMax: 1.4,
    hitsLeft: 1,
    hitsNeed: 1,
  };
  railProgress = 0;
  particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    max: number;
    color: string;
    size: number;
  }[] = [];
  floatScores: FloatScore[] = [];
  private wasExploring = true;
  private nearMissCooldown = 0;
  private bestScoreCached = 0;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unsupported");
    this.ctx = ctx;
    this.input = new Input(canvas);
    this.resetPlayers(1);
    this.input.bindReloadButton(document.getElementById("btn-reload"));
    this.bestScoreCached = this.loadBestScore();
  }

  private loadBestScore(): number {
    try {
      const raw = localStorage.getItem(BEST_SCORE_KEY);
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number) {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
      this.bestScoreCached = score;
    } catch {
      /* ignore quota / private mode */
    }
  }

  private resetPlayers(count: 1 | 2) {
    this.players = [
      {
        id: 0,
        active: true,
        lives: START_LIVES,
        maxLives: MAX_LIVES,
        ammo: MAX_AMMO,
        maxAmmo: MAX_AMMO,
        score: 0,
        reloading: false,
        invuln: 0,
        color: "#5ec8ff",
        crosshair: { x: W * 0.4, y: H / 2 },
        flash: 0,
        streak: 0,
        multiplier: 1,
      },
      {
        id: 1,
        active: count === 2,
        lives: START_LIVES,
        maxLives: MAX_LIVES,
        ammo: MAX_AMMO,
        maxAmmo: MAX_AMMO,
        score: 0,
        reloading: false,
        invuln: 0,
        color: "#ff8a5c",
        crosshair: { x: W * 0.65, y: H / 2 },
        flash: 0,
        streak: 0,
        multiplier: 1,
      },
    ];
  }

  private chapter(): ChapterDef {
    return CHAPTERS[this.chapterIndex];
  }

  private segment(): SegmentDef {
    return this.chapter().segments[this.segmentId];
  }

  startGame(players: 1 | 2) {
    this.audio.unlock();
    this.audio.start();
    this.resetPlayers(players);
    this.chapterIndex = 0;
    this.totalCiviliansSaved = 0;
    this.routesTaken = [];
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.headshots = 0;
    this.bestStreak = 0;
    this.newBest = false;
    this.floatScores = [];
    this.nearMissCooldown = 0;
    this.beginChapter();
  }

  private beginChapter() {
    resetEntityIds();
    const ch = this.chapter();
    this.segmentId = ch.startSegment;
    this.segmentTime = 0;
    this.spawnCursor = 0;
    this.entities = [];
    this.civiliansSaved = 0;
    this.civiliansSeen = 0;
    this.branchPending = null;
    this.bossDef = null;
    this.pendingAfterClear = null;
    this.clearDefend();
    this.railProgress = 0;
    this.particles = [];
    this.wasExploring = true;
    this.state = "chapterIntro";
    this.introTimer = 2.4;
    this.players.forEach((p) => {
      if (p.active) {
        p.ammo = MAX_AMMO;
        p.invuln = 1;
      }
    });
  }

  private enterSegment(id: string) {
    this.segmentId = id;
    this.segmentTime = 0;
    this.spawnCursor = 0;
    this.entities = this.entities.filter(
      (e) => e.kind === "item" && e.alive,
    );
    this.branchPending = null;
    const seg = this.segment();
    if (seg.boss) {
      this.state = "boss";
      this.bossDef = seg.boss;
      this.entities.push(makeBoss(seg.boss, W / 2, H * 0.55));
      this.pushMsg(seg.boss.name);
    } else {
      this.state = "playing";
      this.bossDef = null;
    }
  }

  private pushMsg(text: string) {
    this.flashMessages.push({ text, life: 2 });
  }

  private pushFloat(x: number, y: number, points: number, mult: number) {
    const text = mult > 1 ? `+${points} x${mult}` : `+${points}`;
    this.floatScores.push({
      x,
      y,
      text,
      life: 0.9,
      max: 0.9,
      color: mult >= 4 ? "#ffd36a" : mult > 1 ? "#8fb35a" : "#f2e6c9",
    });
  }

  /** Enemy hit: grow streak / multiplier; apply to combat score only. */
  private registerCombatHit(p: PlayerState, basePoints: number, x: number, y: number, headshot: boolean) {
    p.streak++;
    this.bestStreak = Math.max(this.bestStreak, p.streak);
    const fromStreak = streakToMultiplier(p.streak);
    if (fromStreak > p.multiplier) {
      p.multiplier = fromStreak;
      this.audio.streakUp(p.multiplier);
      if (p.multiplier >= 5) this.pushMsg("MAX MULTIPLIER");
      else this.pushMsg(`STREAK x${p.multiplier}`);
    }
    const awarded = basePoints * p.multiplier;
    p.score += awarded;
    this.pushFloat(x, y - 20, awarded, p.multiplier);
    if (headshot) this.headshots++;
  }

  private breakStreak(p: PlayerState) {
    p.streak = 0;
    p.multiplier = Math.max(1, p.multiplier - 2);
  }

  private breakAllStreaks() {
    for (const p of this.players) {
      if (p.active) this.breakStreak(p);
    }
  }

  update(dt: number) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 20);
    this.input.updateP2(dt);
    this.players[0].crosshair = { ...this.input.mouse };
    if (this.players[1].active) {
      this.players[1].crosshair = { ...this.input.p2Aim };
    }

    this.flashMessages = this.flashMessages
      .map((m) => ({ ...m, life: m.life - dt }))
      .filter((m) => m.life > 0);
    this.muzzle = this.muzzle
      .map((m) => ({ ...m, life: m.life - dt }))
      .filter((m) => m.life > 0);
    this.floatScores = this.floatScores
      .map((f) => ({
        ...f,
        y: f.y - 40 * dt,
        life: f.life - dt,
      }))
      .filter((f) => f.life > 0);
    this.nearMissCooldown = Math.max(0, this.nearMissCooldown - dt);

    if (this.state === "title") {
      if (this.input.consumeMenuConfirm()) {
        this.state = "select";
        this.audio.start();
      }
      this.syncMobileUi(false);
      return;
    }

    if (this.state === "select") {
      if (this.input.consumeJoin2p()) {
        this.startGame(2);
        return;
      }
      if (this.input.consumeMenuConfirm()) {
        this.startGame(1);
      }
      this.syncMobileUi(false);
      return;
    }

    if (this.state === "chapterIntro") {
      this.introTimer -= dt;
      if (this.introTimer <= 0 || this.input.consumeMenuConfirm()) {
        if (this.pendingAfterClear === "ending") {
          this.pendingAfterClear = null;
          this.finishGame();
          return;
        }
        if (this.pendingAfterClear === "nextChapter") {
          this.pendingAfterClear = null;
          this.chapterIndex++;
          this.beginChapter();
          return;
        }
        this.enterSegment(this.segmentId);
      }
      this.syncMobileUi(false);
      return;
    }

    if (this.state === "continue") {
      this.continueTimer -= dt;
      if (Math.floor(this.continueTimer * 2) !== Math.floor((this.continueTimer + dt) * 2)) {
        this.audio.continueBeep();
      }
      if (this.input.consumeMenuConfirm()) {
        this.players.forEach((p) => {
          if (p.active) {
            p.lives = START_LIVES;
            p.ammo = MAX_AMMO;
            p.invuln = 2;
          }
        });
        this.state = this.bossDef ? "boss" : "playing";
        this.continueTimer = CONTINUE_TIME;
        this.syncMobileUi(true);
        return;
      }
      if (this.continueTimer <= 0) {
        this.state = "title";
        this.continueTimer = CONTINUE_TIME;
      }
      this.syncMobileUi(false);
      return;
    }

    if (this.state === "ending") {
      if (this.input.consumeMenuConfirm()) this.state = "title";
      this.syncMobileUi(false);
      return;
    }

    if (this.state === "playing" || this.state === "boss") {
      this.syncMobileUi(true);
      // clear stray start presses from touch
      this.input.consumeStart();
      if (this.input.consumeJoin2p() && !this.players[1].active) {
        this.players[1].active = true;
        this.players[1].lives = START_LIVES;
        this.players[1].ammo = MAX_AMMO;
        this.pushMsg("2P JOINED");
      }
      this.updateGameplay(dt);
    }
  }

  private syncMobileUi(showReload: boolean) {
    const ui = document.getElementById("mobile-ui");
    if (!ui) return;
    const show = this.input.touch && showReload;
    if (show) ui.removeAttribute("hidden");
    else ui.setAttribute("hidden", "");
    ui.setAttribute("aria-hidden", show ? "false" : "true");
  }

  private updateGameplay(dt: number) {
    const seg = this.segment();
    const threats = this.entities.some(
      (e) =>
        ((e.kind === "enemy" || e.kind === "boss") && e.alive) ||
        (e.kind === "enemy" && (e.dying ?? 0) > 0),
    ) || this.defend.active;
    const exploring = this.state === "playing" && !threats;

    // Explore → stop to fight → explore again
    if (this.state === "playing") {
      if (exploring) {
        this.segmentTime += dt;
        this.railProgress += dt;
        if (!this.wasExploring) this.pushMsg("MOVE OUT");
      } else if (this.wasExploring && threats) {
        this.pushMsg("UNDEAD AHEAD!");
      }
      this.wasExploring = exploring;
    } else {
      this.segmentTime += dt;
      this.wasExploring = false;
    }

    // spawn events (only when timeline advances)
    while (
      this.spawnCursor < seg.spawns.length &&
      seg.spawns[this.spawnCursor].at <= this.segmentTime
    ) {
      this.spawn(seg.spawns[this.spawnCursor]);
      this.spawnCursor++;
    }

    // player input
    for (const p of this.players) {
      if (!p.active) continue;
      p.invuln = Math.max(0, p.invuln - dt);
      p.flash = Math.max(0, p.flash - dt);

      if (this.input.consumeReload(p.id)) {
        p.ammo = p.maxAmmo;
        this.audio.reload();
      } else if (this.input.consumeShoot(p.id)) {
        if (this.input.isOffPlayfield(p.crosshair.x, p.crosshair.y)) {
          p.ammo = p.maxAmmo;
          this.audio.reload();
        } else if (p.ammo > 0) {
          p.ammo--;
          p.flash = 0.08;
          this.audio.shoot();
          this.shotsFired++;
          this.muzzle.push({ x: p.crosshair.x, y: p.crosshair.y, life: 0.06 });
          this.resolveShot(p);
        }
      }
    }

    // particles
    this.particles = this.particles
      .map((pt) => ({
        ...pt,
        x: pt.x + pt.vx * dt,
        y: pt.y + pt.vy * dt,
        vy: pt.vy + 280 * dt,
        life: pt.life - dt,
      }))
      .filter((pt) => pt.life > 0);

    // entities
    for (const e of this.entities) {
      if (e.kind === "enemy" && (e.dying ?? 0) > 0) {
        e.dying = (e.dying ?? 0) + dt * 2.2;
        e.recoil = Math.max(0, (e.recoil ?? 0) - dt);
        continue;
      }
      if (!e.alive && e.kind !== "breakable") continue;
      e.age += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.recoil = Math.max(0, (e.recoil ?? 0) - dt);

      if (e.kind === "enemy" && e.alive) {
        const staggered = (e.recoil ?? 0) > 0;
        const speed =
          (e.variant === "runner" ? 55 : e.variant === "crawler" ? 35 : 28) *
          (staggered ? 0.25 : 1);
        e.z = Math.min(1, e.z + (speed * dt) / 400);
        e.y = lerp(H * 0.42, H * 0.72, e.z);
        e.x += (W / 2 - e.x) * dt * 0.15;
        if (!staggered) e.attackTimer -= dt;
        if (e.attackTimer <= 0 && e.z > 0.85) {
          this.damagePlayers();
          e.attackTimer = e.attackDelay;
          e.alive = false;
          e.dying = 0.01;
        } else if (
          e.z > 0.72 &&
          this.nearMissCooldown <= 0 &&
          (this.state === "playing" || this.state === "boss")
        ) {
          this.nearMissCooldown = 1.25;
          this.audio.nearMiss();
          this.pushMsg("CLOSE!");
        }
      }

      if (e.kind === "civilian" && e.alive && !e.rescued) {
        e.attackTimer -= dt;
        const threat = this.entities.some(
          (x) =>
            x.kind === "enemy" &&
            x.alive &&
            Math.abs(x.x - e.x) < 120 &&
            x.z > 0.5,
        );
        if (!threat && e.age > 1.2) {
          e.rescued = true;
          e.alive = false;
          this.civiliansSaved++;
          this.totalCiviliansSaved++;
          this.audio.kill();
          this.pushMsg("CIVILIAN SAVED");
          this.players.forEach((p) => {
            if (p.active) p.score += 500;
          });
          if (Math.random() < 0.45) {
            this.entities.push(makeItem("life", e.x, e.y - 40, 0.7));
          }
        } else if (e.attackTimer <= 0) {
          e.alive = false;
          this.pushMsg("CIVILIAN LOST");
        }
      }

      if (e.kind === "item" && e.alive) {
        e.y += e.vy * dt;
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) e.alive = false;
      }

      if (e.kind === "boss" && e.alive) {
        e.x += e.vx * dt;
        if (e.x < 180 || e.x > W - 180) e.vx *= -1;
        e.y = H * 0.52 + Math.sin(this.time * 1.5) * 18;
        e.phase = e.hp < e.maxHp * 0.4 ? 2 : 1;

        if (this.defend.active) {
          this.defend.x = e.x + Math.sin(this.time * 3) * 30;
          this.defend.y = e.y - 40 + Math.cos(this.time * 2.5) * 18;
          this.defend.timeLeft -= dt;
          if (this.defend.timeLeft <= 0) {
            this.failDefend(e);
          }
        } else {
          e.attackTimer -= dt;
          if (e.attackTimer <= 0) {
            this.startDefend(e);
          }
        }
      }
    }

    this.entities = this.entities.filter(
      (e) =>
        e.alive ||
        e.kind === "breakable" ||
        (e.kind === "civilian" && e.rescued && e.age < 3) ||
        (e.kind === "enemy" && (e.dying ?? 0) > 0 && (e.dying ?? 0) < 1),
    );

    // segment end / branch
    if (this.state === "playing" && this.segmentTime >= seg.duration) {
      if (seg.branches && seg.branches.length && !this.branchPending) {
        this.branchPending = seg.branches;
        this.branchTimer = 3.5;
        this.pushMsg("SELECT ROUTE");
      } else if (this.branchPending) {
        this.branchTimer -= dt;
        if (this.branchTimer <= 0) {
          this.pickBranch();
        }
      } else if (seg.next) {
        this.enterSegment(seg.next);
      }
    }

    // boss defeated
    if (this.state === "boss") {
      const boss = this.entities.find((e) => e.kind === "boss");
      if (!boss || !boss.alive) {
        this.onBossCleared();
      }
    }

    // game over check
    const anyAlive = this.players.some((p) => p.active && p.lives > 0);
    if (!anyAlive) {
      this.state = "continue";
      this.continueTimer = CONTINUE_TIME;
    }
  }

  private pickBranch() {
    if (!this.branchPending) return;
    const preferred = this.branchPending.find(
      (b) => b.requireSaved != null && this.civiliansSaved >= b.requireSaved,
    );
    const choice = preferred ?? this.branchPending[this.branchPending.length - 1];
    this.routesTaken.push(choice.label);
    this.branchPending = null;
    this.pushMsg(`ROUTE: ${choice.label}`);
    this.enterSegment(choice.next);
  }

  private spawn(s: (typeof CHAPTERS)[0]["segments"][string]["spawns"][0]) {
    const y = s.y ?? H * 0.48;
    // Appear down the corridor, then rush the player
    const z = s.z ?? 0.22 + Math.random() * 0.12;
    if (s.kind === "enemy") {
      this.entities.push(
        makeEnemy(s.variant ?? "walker", s.x, y, z, s.hp, s.attackDelay),
      );
    } else if (s.kind === "civilian") {
      this.civiliansSeen++;
      this.entities.push(makeCivilian(s.x, y, Math.max(0.4, z)));
    } else if (s.kind === "breakable") {
      this.entities.push(makeBreakable(s.x, y, z));
    }
  }

  private resolveShot(p: PlayerState) {
    const aim = p.crosshair;

    // Boss defend / cancel mark takes priority
    if (this.defend.active) {
      const dx = aim.x - this.defend.x;
      const dy = aim.y - this.defend.y;
      if (dx * dx + dy * dy <= this.defend.r * this.defend.r) {
        this.defend.hitsLeft--;
        this.audio.hit();
        this.shotsHit++;
        const pts = 150 * p.multiplier;
        p.score += pts;
        this.pushFloat(this.defend.x, this.defend.y - 24, pts, p.multiplier);
        if (this.defend.hitsLeft <= 0) {
          this.succeedDefend(p);
        } else {
          // Nudge mark for next required hit
          this.defend.x += (Math.random() - 0.5) * 80;
          this.defend.y += (Math.random() - 0.5) * 40;
          this.defend.x = Math.max(80, Math.min(W - 80, this.defend.x));
          this.defend.y = Math.max(100, Math.min(H - 120, this.defend.y));
        }
        return;
      }
    }

    // sort by z desc (front first)
    const targets = [...this.entities]
      .filter((e) => e.alive || (e.kind === "breakable" && !e.broken))
      .sort((a, b) => b.z - a.z);

    for (const e of targets) {
      const result = this.hitTest(e, aim.x, aim.y);
      if (!result.hit) continue;

      this.shotsHit++;

      if (e.kind === "civilian") {
        e.alive = false;
        p.lives = Math.max(0, p.lives - 1);
        this.breakStreak(p);
        this.audio.hurt();
        this.shake = 8;
        this.pushMsg("DON'T SHOOT CIVILIANS!");
        return;
      }

      if (e.kind === "item") {
        e.alive = false;
        if (e.itemType === "life" || e.itemType === "frog") {
          p.lives = Math.min(p.maxLives, p.lives + 1);
          this.pushMsg("LIFE UP");
        } else {
          p.score += 1000;
          this.pushFloat(e.x, e.y - 20, 1000, 1);
          this.pushMsg("+1000");
        }
        this.audio.kill();
        return;
      }

      if (e.kind === "breakable" && !e.broken) {
        e.broken = true;
        e.alive = false;
        p.score += 100;
        this.pushFloat(e.x, e.y - 20, 100, 1);
        const roll = Math.random();
        const type = roll < 0.4 ? "life" : roll < 0.7 ? "frog" : "score";
        this.entities.push(makeItem(type, e.x, e.y - 30, 0.65));
        this.audio.hit();
        return;
      }

      if (e.kind === "enemy" || e.kind === "boss") {
        const dmg = result.headshot ? 2.4 : result.points;
        e.hp -= dmg;
        e.hitFlash = 0.18;
        // Hit reaction: flinch away from shot
        const dir = aim.x < e.x ? 1 : -1;
        e.recoil = 0.28;
        e.recoilDir = dir;
        e.x += dir * (result.headshot ? 14 : 8);
        e.z = Math.max(0.15, e.z - (result.headshot ? 0.04 : 0.02));
        this.spawnGore(aim.x, aim.y, result.headshot);
        this.registerCombatHit(
          p,
          result.headshot ? 200 : 100,
          aim.x,
          aim.y,
          !!result.headshot,
        );
        if (e.kind === "boss") this.audio.bossHit();
        else this.audio.hit();

        if (e.hp <= 0) {
          e.alive = false;
          e.dying = 0.01;
          e.recoil = 0.4;
          e.recoilDir = dir;
          this.clearDefend();
          this.audio.kill();
          this.spawnGore(e.x, e.y - 30, true);
          const killBase = e.kind === "boss" ? 5000 : 300;
          const killPts = killBase * p.multiplier;
          p.score += killPts;
          this.pushFloat(e.x, e.y - 40, killPts, p.multiplier);
          if (result.headshot) this.pushMsg("HEADSHOT");
          else if (e.kind === "enemy") this.pushMsg("DOWN!");
        }
        return;
      }
    }
  }

  private spawnGore(x: number, y: number, heavy: boolean) {
    const n = heavy ? 14 : 7;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * (heavy ? 220 : 140);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.25 + Math.random() * 0.35,
        max: 0.6,
        color: Math.random() > 0.3 ? "#8a1a14" : "#c43c2b",
        size: 2 + Math.random() * (heavy ? 4 : 2.5),
      });
    }
  }

  private clearDefend() {
    this.defend.active = false;
    this.defend.timeLeft = 0;
  }

  private startDefend(boss: Entity) {
    const phase = boss.phase ?? 1;
    const hitsNeed = phase >= 2 ? 2 : 1;
    const window = phase >= 2 ? 1.15 : 1.55;
    this.defend = {
      active: true,
      x: boss.x + (Math.random() - 0.5) * 60,
      y: boss.y - 50,
      r: phase >= 2 ? 36 : 44,
      timeLeft: window,
      timeMax: window,
      hitsLeft: hitsNeed,
      hitsNeed,
    };
    this.audio.defendWarn();
    this.pushMsg("DEFEND!");
  }

  private succeedDefend(p: PlayerState) {
    const fx = this.defend.x;
    const fy = this.defend.y;
    this.clearDefend();
    this.audio.defendSuccess();
    this.pushMsg("BLOCKED!");
    const pts = 400 * p.multiplier;
    p.score += pts;
    this.pushFloat(fx, fy - 30, pts, p.multiplier);
    const boss = this.entities.find((e) => e.kind === "boss" && e.alive);
    if (boss) {
      // Brief stun before next attack; also chip damage for a successful cancel
      boss.attackTimer = Math.max(1.4, boss.attackDelay - (boss.phase ?? 1) * 0.1);
      boss.hp = Math.max(1, boss.hp - 2);
      boss.hitFlash = 0.2;
    }
  }

  private failDefend(boss: Entity) {
    this.clearDefend();
    this.damagePlayers();
    this.pushMsg("HIT!");
    boss.attackTimer = Math.max(1.1, boss.attackDelay - (boss.phase ?? 1) * 0.15);
    if (Math.random() < 0.45) {
      this.entities.push(
        makeEnemy(
          Math.random() < 0.5 ? "runner" : "walker",
          120 + Math.random() * (W - 240),
          H * 0.5,
          0.45,
        ),
      );
    }
  }

  private hitTest(e: Entity, x: number, y: number): ShotResult {
    const s = e.scale * (0.7 + e.z * 0.65);
    for (const z of e.zones) {
      const cx = e.x + z.x * s;
      const cy = e.y + z.y * s;
      const r = z.r * s;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        return {
          hit: true,
          headshot: z.tag === "head" || z.tag === "weak",
          killed: false,
          civilian: e.kind === "civilian",
          points: z.mult,
          entity: e,
        };
      }
    }
    return { hit: false, headshot: false, killed: false, civilian: false, points: 0 };
  }

  private damagePlayers() {
    this.shake = 10;
    this.audio.hurt();
    this.breakAllStreaks();
    for (const p of this.players) {
      if (!p.active || p.lives <= 0 || p.invuln > 0) continue;
      p.lives--;
      p.invuln = 1.2;
    }
  }

  private onBossCleared() {
    if (this.state !== "boss") return;
    this.clearDefend();
    this.pushMsg("STAGE CLEAR");
    this.players.forEach((p) => {
      if (p.active) {
        p.score += 2000 + this.civiliansSaved * 500;
        if (this.civiliansSaved > 0) {
          p.lives = Math.min(p.maxLives, p.lives + 1);
        }
      }
    });
    this.state = "chapterIntro";
    this.introTimer = 2.0;
    this.bossDef = null;
    this.pendingAfterClear =
      this.chapterIndex >= CHAPTERS.length - 1 ? "ending" : "nextChapter";
  }

  private finishGame() {
    const score = this.players.reduce((s, p) => s + (p.active ? p.score : 0), 0);
    if (this.totalCiviliansSaved >= 6 && score >= 25000) this.endingKind = "good";
    else if (score < 12000) this.endingKind = "bad";
    else this.endingKind = "normal";
    this.newBest = score > this.bestScoreCached;
    if (this.newBest) this.saveBestScore(score);
    this.state = "ending";
    this.audio.win();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);

    if (this.state === "title") {
      this.renderTitle();
      return;
    }
    if (this.state === "select") {
      this.renderSelect();
      return;
    }
    if (this.state === "ending") {
      this.renderEnding();
      return;
    }

    const theme =
      this.state === "chapterIntro"
        ? this.chapter().segments[this.chapter().startSegment].theme
        : this.segment().theme;

    drawBackground(
      ctx,
      theme,
      this.time,
      this.shake,
      this.railProgress,
      this.state === "playing" &&
        !this.entities.some((e) => e.kind === "enemy" && e.alive) &&
        !this.defend.active,
    );

    if (this.state === "chapterIntro") {
      this.renderChapterIntro();
      return;
    }

    // depth sort
    const sorted = [...this.entities].sort((a, b) => a.z - b.z);
    for (const e of sorted) drawEntity(ctx, e, this.time);

    // gore / impact particles
    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const m of this.muzzle) drawMuzzleFlash(ctx, m.x, m.y);

    for (const f of this.floatScores) {
      ctx.globalAlpha = Math.min(1, f.life / (f.max * 0.35));
      ctx.fillStyle = f.color;
      ctx.font = "11px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    if (this.defend.active) {
      drawDefendPrompt(
        ctx,
        this.defend.x,
        this.defend.y,
        this.defend.r,
        this.defend.timeLeft,
        this.defend.timeMax,
        this.defend.hitsLeft,
        this.defend.hitsNeed,
        this.time,
      );
    }

    const needReload = this.players.some((p) => p.active && p.ammo <= 0);
    const ch = this.chapter();
    drawHudCanvas(
      ctx,
      this.players,
      `${ch.title} — ${ch.subtitle}`,
      this.civiliansSaved,
      Math.max(this.civiliansSeen, 1),
      this.entities.find((e) => e.kind === "boss") ?? null,
      this.bossDef,
      needReload,
    );

    for (const p of this.players) {
      if (!p.active || p.lives <= 0) continue;
      drawCrosshair(ctx, p.crosshair.x, p.crosshair.y, p.color, p.flash);
    }

    for (const m of this.flashMessages) {
      ctx.globalAlpha = Math.min(1, m.life);
      ctx.fillStyle = "#f2e6c9";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(m.text, W / 2, H * 0.28);
      ctx.globalAlpha = 1;
    }

    if (this.branchPending) {
      const panelH = 28 + this.branchPending.length * 22 + 36;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W / 2 - 240, H * 0.52, 480, panelH);
      ctx.fillStyle = "#f2e6c9";
      ctx.font = "12px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("ROUTE SELECT", W / 2, H * 0.52 + 24);
      let rowY = H * 0.52 + 48;
      for (const b of this.branchPending) {
        const unlocked =
          b.requireSaved == null || this.civiliansSaved >= b.requireSaved;
        const need = b.requireSaved ?? 0;
        if (unlocked) {
          ctx.fillStyle = "#8fb35a";
          ctx.fillText(`→ ${b.label}  ROUTE OPEN`, W / 2, rowY);
        } else {
          ctx.fillStyle = "#6a6558";
          ctx.fillText(
            `LOCKED ${b.label}  NEED ${need} SAVED`,
            W / 2,
            rowY,
          );
        }
        rowY += 22;
      }
      ctx.fillStyle = "#6a6558";
      ctx.font = "10px Orbitron, sans-serif";
      ctx.fillText(
        `Saved this segment: ${this.civiliansSaved} · auto in ${Math.ceil(this.branchTimer)}s`,
        W / 2,
        rowY + 8,
      );
    }

    if (this.state === "continue") {
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff3b2f";
      ctx.font = "28px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("CONTINUE?", W / 2, H * 0.4);
      ctx.fillStyle = "#f2e6c9";
      ctx.font = "40px 'Press Start 2P', monospace";
      ctx.fillText(String(Math.ceil(this.continueTimer)), W / 2, H * 0.55);
      ctx.font = "12px Orbitron, sans-serif";
      ctx.fillText(
        this.input.touch ? "TAP SCREEN TO CONTINUE" : "PRESS SPACE / ENTER",
        W / 2,
        H * 0.68,
      );
    }
  }

  private renderTitle() {
    const ctx = this.ctx;
    drawBackground(ctx, "mansion", this.time, 0);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#c43c2b";
    ctx.font = "42px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("THE DEAD", W / 2, H * 0.32);
    ctx.fillText("HOUSE", W / 2, H * 0.42);

    ctx.fillStyle = "#f2e6c9";
    ctx.font = "12px Orbitron, sans-serif";
    ctx.fillText("AN ARCADE RAIL SHOOTER TRIBUTE", W / 2, H * 0.5);

    ctx.fillStyle = "#6a6558";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText(`VER ${GAME_VERSION}`, W / 2, H * 0.56);
    if (this.bestScoreCached > 0) {
      ctx.fillStyle = "#8fb35a";
      ctx.font = "10px Orbitron, sans-serif";
      ctx.fillText(`BEST ${String(this.bestScoreCached).padStart(6, "0")}`, W / 2, H * 0.595);
    }

    ctx.fillStyle = "rgba(196,60,43,0.9)";
    ctx.font = "11px Orbitron, sans-serif";
    ctx.fillText("MISSION: ENTER THE HOUSE · KILL THE MAGICIAN", W / 2, H * 0.635);

    const blink = Math.floor(this.time * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = "#8fb35a";
      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.fillText(this.input.touch ? "TAP TO START" : "PRESS START", W / 2, H * 0.72);
    }

    ctx.fillStyle = "#6a6558";
    ctx.font = "10px Orbitron, sans-serif";
    ctx.fillText(
      this.input.touch
        ? "Explore the halls · Stop and fire · Survive to the final boss"
        : "Explore · Clear undead · Reach the strongest foe in the dead house",
      W / 2,
      H * 0.88,
    );
  }

  private renderSelect() {
    const ctx = this.ctx;
    drawBackground(ctx, "courtyard", this.time, 0);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f2e6c9";
    ctx.font = "18px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("SELECT PLAYERS", W / 2, H * 0.3);
    ctx.font = "12px Orbitron, sans-serif";
    if (this.input.touch) {
      ctx.fillText("TAP SCREEN — 1 PLAYER", W / 2, H * 0.48);
      ctx.fillStyle = "#6a6558";
      ctx.fillText("2-player co-op is available on desktop (press 2)", W / 2, H * 0.58);
      ctx.fillText("Drag to aim · Tap to fire · RELOAD button when empty", W / 2, H * 0.72);
    } else {
      ctx.fillText("SPACE / ENTER — 1 PLAYER (Rogan)", W / 2, H * 0.48);
      ctx.fillText("PRESS 2 — 2 PLAYERS (Rogan + G)", W / 2, H * 0.56);
      ctx.fillStyle = "#6a6558";
      ctx.fillText("2P aims with Arrow Keys, shoots with Ctrl, reloads with F", W / 2, H * 0.72);
    }
  }

  private renderChapterIntro() {
    const ctx = this.ctx;
    const ch = this.chapter();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, H);
    if (this.pendingAfterClear) {
      ctx.fillStyle = "#8fb35a";
      ctx.font = "22px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText("STAGE CLEAR", W / 2, H * 0.45);
      ctx.fillStyle = "#f2e6c9";
      ctx.font = "12px Orbitron, sans-serif";
      ctx.fillText(
        this.pendingAfterClear === "ending" ? "THE END DRAWS NEAR..." : "PREPARE FOR NEXT CHAPTER",
        W / 2,
        H * 0.56,
      );
      return;
    }
    ctx.fillStyle = "#c43c2b";
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(ch.title, W / 2, H * 0.38);
    ctx.fillStyle = "#f2e6c9";
    ctx.font = "28px 'Press Start 2P', monospace";
    ctx.fillText(ch.subtitle, W / 2, H * 0.5);
    ctx.fillStyle = "#6a6558";
    ctx.font = "12px Orbitron, sans-serif";
    const tips = [
      "Approach the mansion. Clear every undead in your path.",
      "Push through the halls. The Hanged Man waits above.",
      "Descend into the labs. Truth lies deeper still.",
      "The Magician — strongest in the Dead House. End this.",
    ];
    ctx.fillText(tips[ch.index - 1] ?? "", W / 2, H * 0.62);
  }

  private renderEnding() {
    const ctx = this.ctx;
    drawBackground(ctx, "sanctum", this.time, 0);
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, W, H);
    const titles = {
      good: "GOOD ENDING",
      normal: "NORMAL ENDING",
      bad: "BAD ENDING",
    };
    const lines = {
      good: "The plague is sealed. The dead house falls silent.",
      normal: "Curien is stopped — but shadows still linger.",
      bad: "You escaped... yet the mansion still hungers.",
    };
    ctx.fillStyle = this.endingKind === "good" ? "#8fb35a" : this.endingKind === "bad" ? "#c43c2b" : "#f2e6c9";
    ctx.font = "18px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(titles[this.endingKind], W / 2, H * 0.2);
    ctx.fillStyle = "#f2e6c9";
    ctx.font = "12px Orbitron, sans-serif";
    ctx.fillText(lines[this.endingKind], W / 2, H * 0.28);
    const score = this.players.reduce((s, p) => s + (p.active ? p.score : 0), 0);
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.fillText(`FINAL SCORE ${score}`, W / 2, H * 0.38);
    if (this.newBest) {
      ctx.fillStyle = "#ffd36a";
      ctx.font = "11px 'Press Start 2P', monospace";
      ctx.fillText("NEW BEST", W / 2, H * 0.435);
    }
    ctx.fillStyle = "#f2e6c9";
    ctx.font = "11px Orbitron, sans-serif";
    const accuracy =
      this.shotsFired > 0
        ? Math.round((this.shotsHit / this.shotsFired) * 100)
        : 0;
    ctx.fillText(
      `ACCURACY ${accuracy}%  ·  HEADSHOTS ${this.headshots}  ·  BEST STREAK ${this.bestStreak}`,
      W / 2,
      H * 0.5,
    );
    ctx.fillText(`CIVILIANS SAVED ${this.totalCiviliansSaved}`, W / 2, H * 0.56);
    const routes =
      this.routesTaken.length > 0 ? this.routesTaken.join(" → ") : "NONE";
    ctx.fillStyle = "#8fb35a";
    ctx.font = "10px Orbitron, sans-serif";
    ctx.fillText(`ROUTES: ${routes}`, W / 2, H * 0.62);
    if (this.bestScoreCached > 0 && !this.newBest) {
      ctx.fillStyle = "#6a6558";
      ctx.fillText(`BEST ${this.bestScoreCached}`, W / 2, H * 0.68);
    }
    ctx.fillStyle = "#6a6558";
    ctx.font = "12px Orbitron, sans-serif";
    ctx.fillText(
      this.input.touch ? "TAP SCREEN — TITLE" : "PRESS START — TITLE",
      W / 2,
      H * 0.82,
    );
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
