import type { Entity, EnemyVariant, HitZone, ItemType, BossDef } from "../game/types";

let nextId = 1;

function zonesForEnemy(variant: EnemyVariant, scale: number): HitZone[] {
  const s = scale;
  if (variant === "crawler") {
    return [
      { x: 0, y: -18 * s, r: 14 * s, mult: 2.2, tag: "head" },
      { x: 0, y: 4 * s, r: 22 * s, mult: 1, tag: "body" },
    ];
  }
  if (variant === "brute") {
    return [
      { x: 0, y: -52 * s, r: 16 * s, mult: 2.5, tag: "head" },
      { x: 0, y: -10 * s, r: 28 * s, mult: 1, tag: "body" },
    ];
  }
  return [
    { x: 0, y: -42 * s, r: 14 * s, mult: 2.4, tag: "head" },
    { x: 0, y: -8 * s, r: 22 * s, mult: 1, tag: "body" },
  ];
}

export function makeEnemy(
  variant: EnemyVariant,
  x: number,
  y: number,
  z = 0.55,
  hp?: number,
  attackDelay?: number,
): Entity {
  const scale = variant === "brute" ? 1.25 : variant === "crawler" ? 0.85 : 1;
  const baseHp =
    hp ??
    (variant === "brute" ? 5 : variant === "runner" ? 2 : variant === "crawler" ? 2 : 3);
  return {
    id: nextId++,
    kind: "enemy",
    variant,
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    scale,
    hp: baseHp,
    maxHp: baseHp,
    attackTimer: attackDelay ?? 1.6 + Math.random() * 0.8,
    attackDelay: attackDelay ?? 1.8,
    alive: true,
    hitFlash: 0,
    age: 0,
    zones: zonesForEnemy(variant, scale),
    recoil: 0,
    recoilDir: 0,
    dying: 0,
  };
}

export function makeCivilian(x: number, y: number, z = 0.5): Entity {
  return {
    id: nextId++,
    kind: "civilian",
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    scale: 1,
    hp: 1,
    maxHp: 1,
    attackTimer: 2.8,
    attackDelay: 2.8,
    alive: true,
    hitFlash: 0,
    age: 0,
    zones: [
      { x: 0, y: -40, r: 14, mult: 1, tag: "head" },
      { x: 0, y: -8, r: 20, mult: 1, tag: "body" },
    ],
    label: "HELP!",
    rescued: false,
  };
}

export function makeBreakable(x: number, y: number, z = 0.45): Entity {
  return {
    id: nextId++,
    kind: "breakable",
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    scale: 1,
    hp: 1,
    maxHp: 1,
    attackTimer: 0,
    attackDelay: 0,
    alive: true,
    hitFlash: 0,
    age: 0,
    zones: [{ x: 0, y: 0, r: 28, mult: 1, tag: "body" }],
    broken: false,
  };
}

export function makeItem(type: ItemType, x: number, y: number, z = 0.6): Entity {
  return {
    id: nextId++,
    kind: "item",
    itemType: type,
    x,
    y,
    z,
    vx: 0,
    vy: -20,
    scale: 1,
    hp: 1,
    maxHp: 1,
    attackTimer: 4,
    attackDelay: 4,
    alive: true,
    hitFlash: 0,
    age: 0,
    zones: [{ x: 0, y: 0, r: 18, mult: 1, tag: "body" }],
  };
}

export function makeBoss(def: BossDef, x: number, y: number): Entity {
  const scale =
    def.variant === "hermit" ? 1.6 : def.variant === "magician" ? 1.45 : 1.7;
  const zones: HitZone[] =
    def.variant === "chariot"
      ? [
          { x: 0, y: -70, r: 28, mult: 1.2, tag: "weak" },
          { x: 0, y: -10, r: 50, mult: 0.6, tag: "body" },
        ]
      : def.variant === "hanged"
        ? [
            { x: 0, y: -50, r: 24, mult: 1.4, tag: "weak" },
            { x: -40, y: 10, r: 22, mult: 0.7, tag: "body" },
            { x: 40, y: 10, r: 22, mult: 0.7, tag: "body" },
          ]
        : def.variant === "hermit"
          ? [
              { x: 0, y: -20, r: 30, mult: 1.5, tag: "weak" },
              { x: -55, y: 20, r: 20, mult: 0.5, tag: "body" },
              { x: 55, y: 20, r: 20, mult: 0.5, tag: "body" },
            ]
          : [
              { x: 0, y: -40, r: 26, mult: 1.6, tag: "weak" },
              { x: 0, y: 10, r: 40, mult: 0.7, tag: "body" },
            ];

  return {
    id: nextId++,
    kind: "boss",
    x,
    y,
    z: 0.75,
    vx: 40,
    vy: 0,
    scale,
    hp: def.hp,
    maxHp: def.hp,
    attackTimer: 2.2,
    attackDelay: 2.2,
    alive: true,
    hitFlash: 0,
    age: 0,
    zones,
    label: def.name,
    phase: 1,
  };
}

export function resetEntityIds() {
  nextId = 1;
}
