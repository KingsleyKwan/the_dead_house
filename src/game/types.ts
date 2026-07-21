export type GameState =
  | "title"
  | "select"
  | "chapterIntro"
  | "playing"
  | "boss"
  | "continue"
  | "ending";

export type EntityKind = "enemy" | "civilian" | "breakable" | "item" | "boss";

export type EnemyVariant = "walker" | "runner" | "brute" | "crawler";

export type ItemType = "life" | "score" | "frog";

export type SceneTheme = "drive" | "courtyard" | "mansion" | "lab" | "cave" | "sanctum";

export interface Vec2 {
  x: number;
  y: number;
}

export interface HitZone {
  x: number;
  y: number;
  r: number;
  mult: number;
  tag: "head" | "body" | "weak";
}

export interface PlayerState {
  id: 0 | 1;
  active: boolean;
  lives: number;
  maxLives: number;
  ammo: number;
  maxAmmo: number;
  score: number;
  reloading: boolean;
  invuln: number;
  color: string;
  crosshair: Vec2;
  flash: number;
}

export interface Entity {
  id: number;
  kind: EntityKind;
  variant?: EnemyVariant;
  itemType?: ItemType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  scale: number;
  hp: number;
  maxHp: number;
  attackTimer: number;
  attackDelay: number;
  alive: boolean;
  hitFlash: number;
  age: number;
  zones: HitZone[];
  label?: string;
  rescued?: boolean;
  broken?: boolean;
  phase?: number;
}

export interface SpawnEvent {
  at: number;
  kind: EntityKind;
  variant?: EnemyVariant;
  itemType?: ItemType;
  x: number;
  y?: number;
  z?: number;
  hp?: number;
  attackDelay?: number;
  label?: string;
}

export interface BranchChoice {
  id: string;
  label: string;
  next: string;
  /** If set, require this many civilians saved in segment to unlock preferred route */
  requireSaved?: number;
}

export interface SegmentDef {
  id: string;
  duration: number;
  theme: SceneTheme;
  caption?: string;
  spawns: SpawnEvent[];
  branches?: BranchChoice[];
  /** default next if no branch */
  next?: string;
  boss?: BossDef;
}

export interface BossDef {
  name: string;
  subtitle: string;
  hp: number;
  variant: "chariot" | "hanged" | "hermit" | "magician";
}

export interface ChapterDef {
  index: number;
  title: string;
  subtitle: string;
  startSegment: string;
  segments: Record<string, SegmentDef>;
}

export interface ShotResult {
  hit: boolean;
  headshot: boolean;
  killed: boolean;
  civilian: boolean;
  points: number;
  entity?: Entity;
}

export const W = 960;
export const H = 540;
export const MAX_AMMO = 6;
export const START_LIVES = 3;
export const MAX_LIVES = 5;
export const CONTINUE_TIME = 10;
