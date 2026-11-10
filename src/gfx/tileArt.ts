// 16x16 타일 그림과 타일 정의. '.'은 투명이고, base 타일 위에 겹쳐 그린다.
import {
  CAVE_MOUTH, CLIFF, DOOR, FENCE, FLOWER, FRINGE, GRASS, LAMP, LEDGE, PATH, ROCK, SAND, SHORE, SIGN, TALLGRASS, WATER, WINDOW,
  lighthouseGrid, roofGrid, treeGrid, wallGrid, type RoofPart,
} from './fieldArt';
import {
  BURNT_FLOOR, CANDLE, CAVE_FLOOR, COUNTER, FLOOR, GHOST_FLOOR, GYM_FLOOR, HEALER, ICE_FLOOR, LADDER, METAL_FLOOR, PC, PILLAR, PLANT, SHELF, STAIRS,
  WALL_IN, caveWallGrid,
} from './roomArt';
import { Grid, parseArt } from './pixel';
import type { PalName } from './palettes';

const A = (s: string, name: string) => parseArt(s, name);

export const ART = {
  rock: A(`
................
.....333333.....
...3311111133...
..311111112113..
.31111111211113.
.31111111111123.
3111111111112213
3111211111122213
3112111111222213
3111111112222213
.31111122222213.
.33222222222233.
...3333333333...
................
................
................`, 'rock'),
  // 동굴
  caveExit: A(`
1111111111111111
1111000000001111
1110000000000111
1100000000000011
1100000000000011
1000000000000001
1000000000000001
1000000000000001
1000000000000001
1000000000000001
1000000000000001
1100000000000011
1100000000000011
1110000000000111
1111000000001111
1111111111111111`, 'caveExit'),
  // 실내
  mat: A(`
................
................
................
.33333333333333.
.32222222222223.
.32111111111123.
.32122222222123.
.32121111112123.
.32121111112123.
.32122222222123.
.32111111111123.
.32222222222223.
.33333333333333.
................
................
................`, 'mat'),
  table: A(`
................
................
.33333333333333.
3000000000000003
3011111111111103
3011111111111103
3011111111111103
3000000000000003
3333333333333333
3222222222222223
.33333333333333.
..32........23..
..32........23..
..33........33..
................
................`, 'table'),
  bed: A(`
.33333333333333.
.30000000000003.
.30000000000003.
.33333333333333.
.31111111111113.
.31111111111113.
.31211111111213.
.31111111111113.
.31111111111113.
.31211111111213.
.31111111111113.
.31111111111113.
.31111111111113.
.32222222222223.
.33333333333333.
................`, 'bed'),
  statue: A(`
................
......3333......
.....310113.....
.....311113.....
.....312213.....
......3333......
.....322223.....
....33333333....
....31111113....
....31111113....
....31111113....
....31111113....
....32222223....
...3333333333...
...3222222223...
...3333333333...`, 'statue'),
  carpet: A(`
1111111111111111
1211121112111211
1111111111111111
1112111211121112
1111111111111111
1211121112111211
1111111111111111
1112111211121112
1111111111111111
1211121112111211
1111111111111111
1112111211121112
1111111111111111
1211121112111211
1111111111111111
1112111211121112`, 'carpet'),
} satisfies Record<string, Grid>;

export type ArtName = keyof typeof ART;

// 지붕 위 간판 문양 (10x10)
export const EMBLEMS = {
  center: A(`
.33333333.
3000000003
3000220003
3000220003
3022222203
3022222203
3000220003
3000220003
3000000003
.33333333.`, 'emblemCenter'),
  mart: A(`
.33333333.
3000000003
3001111003
3011331103
3011111103
3013311103
3011331103
3001111003
3000000003
.33333333.`, 'emblemMart'),
  gym: A(`
.33333333.
3000000003
3000110003
3001111003
3111111113
3011111103
3001101103
3011000113
3000000003
.33333333.`, 'emblemGym'),
};

export interface TileDef {
  art?: ArtName;
  /** 그림을 직접 만든 경우 (지붕 테두리 등) */
  grid?: Grid;
  /** 두 번째 애니메이션 프레임 */
  art2?: ArtName | 'shift';
  pal: PalName;
  /** 먼저 그릴 바닥 타일 */
  base?: string;
  solid?: boolean;
  grass?: boolean;
  water?: boolean;
  ledge?: 'down';
  sign?: boolean;
  door?: boolean;
  counter?: boolean;
  pc?: boolean;
  void?: boolean;
  /** 풀숲이 아니어도 야생 몬스터가 나온다 (동굴 바닥) */
  wild?: boolean;
  /** 두 번째 애니메이션 프레임 (직접 만든 그림) */
  grid2?: Grid;
  /** 얼음: 디디면 막힐 때까지 미끄러진다 */
  ice?: boolean;
  /** 이웃 칸에 따라 모양이 바뀐다 */
  auto?: 'grass' | 'tree' | 'path' | 'water' | 'cave' | 'statue';
}

function stamp(g: Grid, s: Grid): Grid {
  const out = g.map((r) => [...r]);
  const ox = Math.floor((g[0].length - s[0].length) / 2);
  const oy = Math.floor((g.length - s.length) / 2) - 1;
  s.forEach((row, y) => row.forEach((c, x) => c >= 0 && (out[oy + y][ox + x] = c)));
  return out;
}

const roofParts = (chars: string, pal: PalName, emblem?: { char: string; art: Grid }) => {
  // chars: 위 왼쪽, 위, 위 오른쪽, 아래 왼쪽, 아래, 아래 오른쪽
  const parts: RoofPart[] = ['tl', 't', 'tr', 'bl', 'b', 'br'];
  const defs: Record<string, TileDef> = {};
  [...chars].forEach((c, i) => {
    defs[c] = { grid: roofGrid(parts[i]), pal, solid: true };
  });
  if (emblem) defs[emblem.char] = { grid: stamp(roofGrid('b'), emblem.art), pal, solid: true };
  return defs;
};

const wallParts = (): Record<string, TileDef> => ({
  '7': { grid: wallGrid('l'), pal: 'wall', solid: true },
  '8': { grid: wallGrid('m'), pal: 'wall', solid: true },
  '9': { grid: wallGrid('r'), pal: 'wall', solid: true },
  W: { grid: WINDOW, pal: 'wall', solid: true },
  D: { grid: DOOR, pal: 'wall', door: true },
});

// 지도 문자 → 타일
export const TILES: Record<string, TileDef> = {
  '.': { grid: GRASS[0], pal: 'grass', auto: 'grass' },
  ',': { grid: TALLGRASS, pal: 'tallgrass', grass: true },
  T: { grid: treeGrid(0), pal: 'tree', base: '.', solid: true, auto: 'tree' },
  ':': { grid: PATH, pal: 'path', auto: 'path' },
  '~': { grid: WATER, art2: 'shift', pal: 'water', solid: true, water: true, auto: 'water' },
  '*': { grid: FLOWER[0], grid2: FLOWER[1], pal: 'flower', base: '.' },
  F: { grid: FENCE, pal: 'fence', base: '.', solid: true },
  S: { grid: SIGN, pal: 'fence', base: '.', solid: true, sign: true },
  v: { grid: LEDGE, pal: 'ledge', solid: true, ledge: 'down' },
  o: { grid: ROCK, pal: 'rock', base: '.', solid: true },
  '^': { grid: CLIFF, pal: 'rock', solid: true },
  U: { grid: CAVE_MOUTH, pal: 'rock', door: true },
  Q: { art: 'statue', pal: 'statue', base: '.', solid: true, sign: true },
  // 항구
  '0': { grid: SAND, pal: 'sand' },
  '|': { grid: FLOOR, pal: 'wood' },
  N: { grid: LAMP, pal: 'lighthouse', base: '.', solid: true },
  '(': { grid: lighthouseGrid('l'), pal: 'lighthouse', base: '.', solid: true },
  R: { grid: lighthouseGrid('m'), pal: 'lighthouse', solid: true },
  ')': { grid: lighthouseGrid('r'), pal: 'lighthouse', base: '.', solid: true },
  ...roofParts('123456', 'roofHouse'),
  ...roofParts('qweasd', 'roofCenter', { char: '+', art: EMBLEMS.center }),
  ...roofParts('rtyfgh', 'roofMart', { char: '$', art: EMBLEMS.mart }),
  ...roofParts('zxcbnm', 'roofLab'),
  ...roofParts('uipjkl', 'roofGym', { char: '!', art: EMBLEMS.gym }),
  ...roofParts('<@>[?]', 'roofBurnt'),
  ...wallParts(),
  // 실내
  X: { pal: 'ui', solid: true, void: true },
  _: { grid: FLOOR, pal: 'floor' },
  '-': { grid: GYM_FLOOR, pal: 'gymFloor' },
  '=': { grid: WALL_IN, pal: 'wallIn', solid: true },
  C: { grid: COUNTER, pal: 'wood', solid: true, counter: true },
  B: { grid: SHELF, pal: 'books', solid: true },
  P: { grid: PLANT, pal: 'plant', base: '_', solid: true },
  H: { grid: HEALER, pal: 'machine', base: '_', solid: true },
  M: { grid: PC, pal: 'machine', base: '_', solid: true, pc: true },
  E: { art: 'mat', pal: 'mat', base: '_' },
  '&': { art: 'table', pal: 'wood', base: '_', solid: true },
  Z: { art: 'bed', pal: 'bed', base: '_', solid: true },
  Y: { art: 'statue', pal: 'statue', base: '-', solid: true, auto: 'statue' },
  K: { art: 'carpet', pal: 'mat' },
  // 동굴
  ';': { grid: CAVE_FLOOR, pal: 'cave', wild: true },
  '#': { grid: caveWallGrid(0), pal: 'caveWall', solid: true, auto: 'cave' },
  '%': { art: 'rock', pal: 'rock', base: ';', solid: true, auto: 'statue' },
  O: { art: 'caveExit', pal: 'cave' },
  '/': { grid: STAIRS, pal: 'wood', base: '_', door: true },
  '{': { grid: METAL_FLOOR, pal: 'metal' },
  '}': { grid: ICE_FLOOR, pal: 'ice', ice: true },
  // 불탄 탑
  A: { grid: BURNT_FLOOR, pal: 'burnt', wild: true },
  G: { art: 'rock', pal: 'burnt', base: 'A', solid: true },
  I: { grid: PILLAR, pal: 'burnt', solid: true },
  L: { grid: LADDER, pal: 'burnt', door: true },
  // 고스트 체육관
  V: { grid: GHOST_FLOOR, pal: 'ghostFloor' },
  J: { grid: CANDLE, pal: 'candle', base: 'V', solid: true },
};

// ── 이웃에 따라 바뀌는 타일 ──
/** 길 가장자리에 풀이 걸치는 이웃 */
const GRASSY = new Set(['.', '*', ',', 'T', 'F', 'S', 'v', 'o', 'Q', 'N', '(', ')']);
/** 석상·바위 밑에 깔 수 있는 바닥 (둘레의 바닥을 따른다) */
const STATUE_FLOORS = ['-', '}', 'V', '{', '_', ';'];
const hash = (x: number, y: number) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

/** at(dx, dy): 이웃 칸의 문자. 결과는 tileLayers에 그대로 넘긴다 */
export function tileVariant(ch: string, at: (dx: number, dy: number) => string, x: number, y: number): number {
  const auto = TILES[ch]?.auto;
  if (!auto) return 0;
  const sides = (test: (c: string) => boolean) =>
    (test(at(0, -1)) ? 1 : 0) | (test(at(1, 0)) ? 2 : 0) | (test(at(0, 1)) ? 4 : 0) | (test(at(-1, 0)) ? 8 : 0);
  switch (auto) {
    case 'grass':
      return hash(x, y) % 3 === 0 ? 1 : 0;
    case 'tree': {
      const t = (c: string) => c === 'T';
      return (t(at(0, -1)) ? 1 : 0) | (t(at(0, 1)) ? 2 : 0) | (t(at(-1, 0)) ? 4 : 0) | (t(at(1, 0)) ? 8 : 0);
    }
    case 'path':
      return sides((c) => GRASSY.has(c));
    case 'water':
      return sides((c) => !TILES[c]?.water && c !== 'X');
    case 'statue': {
      // 석상·바위 밑은 둘레의 바닥을 따른다 (얼음을 먼저 본다)
      const around = [at(0, 1), at(-1, 0), at(1, 0), at(0, -1)];
      const near = around.includes('}') ? '}' : around.find((c) => STATUE_FLOORS.includes(c));
      return near ? STATUE_FLOORS.indexOf(near) + 1 : 0;
    }
    case 'cave': {
      const open = (c: string) => c !== '#' && c !== 'X';
      return (open(at(0, 1)) ? 1 : 0) | (open(at(0, -1)) ? 2 : 0);
    }
  }
}

export interface TileLayer { grid: Grid; pal: PalName }

const shift = (g: Grid, n: number): Grid => g.map((r) => r.map((_, x) => r[(x + n) % r.length]));

/** 바닥 타일부터 위로 겹쳐 그릴 그림들 */
export function tileLayers(ch: string, frame = 0, variant = 0): TileLayer[] {
  const d = TILES[ch] ?? TILES.X;
  if (d.void) return [];
  const base = d.auto === 'statue' && variant ? STATUE_FLOORS[variant - 1] : d.base;
  const out: TileLayer[] = base ? tileLayers(base) : [];
  let g = d.grid ?? ART[d.art!];
  if (frame && d.art2) g = d.art2 === 'shift' ? shift(g, 4) : ART[d.art2];
  if (frame && d.grid2) g = d.grid2;
  if (d.auto === 'grass' && variant) g = GRASS[1];
  if (d.auto === 'tree') g = treeGrid(variant);
  if (d.auto === 'cave') g = caveWallGrid(variant);
  out.push({ grid: g, pal: d.pal });
  for (let side = 0; side < 4; side++) {
    if (!(variant & (1 << side))) continue;
    if (d.auto === 'path') out.push({ grid: FRINGE[side], pal: 'grass' });
    if (d.auto === 'water') out.push({ grid: SHORE[side], pal: 'water' });
  }
  return out;
}
