// 배틀 배경과 발판 (플라티나풍). 배경은 가로로 그은 붓질 무늬, 발판은 동심원 무늬의 타원.
import type { Grid, Palette } from './pixel';

export type BattleTerrain = 'field' | 'water' | 'cave' | 'indoor';
export type BattleTime = 'morning' | 'day' | 'evening' | 'night';

interface Look {
  /** 위(하늘·벽) 4단계: 맨 위 → 지평선 */
  sky: string[];
  /** 아래(땅·물·바닥) 4단계: 지평선 → 맨 아래 */
  ground: string[];
  /** 발판: 외곽선, 테두리, 밝은 띠, 윗면, 윗면 점무늬 */
  pf: string[];
  /** 지평선 높이 */
  horizon: number;
}

const LOOKS: Record<BattleTerrain, Look> = {
  field: {
    sky: ['#e4e0ee', '#ecE8f2', '#f4f2f6', '#faf8f4'],
    ground: ['#c8a878', '#d8bf98', '#e6d4b8', '#f0e6d4'],
    pf: ['#9890a8', '#bab2c8', '#e6e2ec', '#d2ccdc', '#c4bed2'],
    horizon: 58,
  },
  water: {
    sky: ['#c4dcf0', '#d4e8f6', '#e4f2fa', '#f2f8fc'],
    ground: ['#4a88c8', '#629ed8', '#80b6e4', '#a0ccee'],
    pf: ['#2c6aa8', '#78b0e0', '#d0e8f8', '#a8d0f0', '#94c2ea'],
    horizon: 54,
  },
  cave: {
    sky: ['#4c4038', '#5a4c42', '#6a5a4e', '#7a6a5c'],
    ground: ['#5c5042', '#6e6050', '#82725e', '#968670'],
    pf: ['#3a2e26', '#7a6a56', '#b4a48a', '#9a8a72', '#8c7c66'],
    horizon: 56,
  },
  indoor: {
    sky: ['#c4bcd4', '#d0cade', '#dcd8e6', '#e8e6ee'],
    ground: ['#a8a0b8', '#b6aec6', '#c6c0d4', '#d6d2e0'],
    pf: ['#8880a0', '#aea6c2', '#e2deec', '#cac4d8', '#bcb6cc'],
    horizon: 60,
  },
};

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (v: number[]) => `#${v.map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: string, b: string, t: number) => toHex(hex(a).map((x, i) => x + (hex(b)[i] - x) * t));

/** 바깥에서만 시간에 따라 물든다: 아침은 살짝 따뜻하게, 저녁은 노을빛, 밤은 짙은 남색 */
function tint(c: string, time: BattleTime) {
  if (time === 'morning') return mix(c, '#fff0d8', 0.15);
  if (time === 'evening') return mix(c, '#f06a28', 0.5);
  if (time === 'night') return mix(c, '#1c2448', 0.55);
  return c;
}

function look(terrain: BattleTerrain, time: BattleTime): Look {
  const l = LOOKS[terrain];
  if (terrain === 'cave' || terrain === 'indoor' || time === 'day') return l;
  const t = (cs: string[]) => cs.map((c) => tint(c, time));
  // 노을 진 발판은 분홍이 아니라 황토빛
  // 밤에는 발판이 배경에 묻히지 않게 덜 어둡게
  const pf = time === 'evening' ? l.pf.map((c) => mix(c, '#e09848', 0.6)) : time === 'night' ? l.pf.map((c) => mix(c, '#3a4478', 0.4)) : t(l.pf);
  return { ...l, sky: t(l.sky), ground: t(l.ground), pf };
}

/** 같은 씨앗이면 늘 같은 무늬 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const BG_W = 256;
export const BG_H = 144;

/** 배경: 줄마다 기본색 위에 길고 짧은 붓질을 이웃 색으로 덧칠한다. 지평선 근처일수록 붓질이 짙다 */
export function battleBgGrid(terrain: BattleTerrain, time: BattleTime): { grid: Grid; pal: Palette } {
  const l = look(terrain, time);
  const pal = [...l.sky, ...l.ground];
  const rand = rng(terrain.length * 7919 + 17);
  const grid: Grid = [];
  for (let y = 0; y < BG_H; y++) {
    const sky = y < l.horizon;
    const t = sky ? y / l.horizon : (y - l.horizon) / (BG_H - l.horizon);
    const base = (sky ? 0 : 4) + Math.min(3, Math.floor(t * 4));
    const lo = sky ? 0 : 4, hi = lo + 3;
    // 지평선에 가까울수록 붓질이 많다
    const busy = sky ? 0.08 + 0.32 * t : 0.6 - 0.45 * t;
    const row: number[] = [];
    let x = 0;
    while (x < BG_W) {
      const len = rand() < 0.3 ? 3 + Math.floor(rand() * 8) : 24 + Math.floor(rand() * 90);
      let c = base;
      if (rand() < busy) c = Math.max(lo, Math.min(hi, base + (rand() < (sky ? 0.5 : 0.62) ? -1 : 1)));
      for (let i = 0; i < len && x < BG_W; i++, x++) row.push(c);
    }
    grid.push(row);
  }
  return { grid, pal };
}

/** 발판: 바깥 외곽선 → 테두리 → 밝은 띠 → 점무늬 윗면. 아래쪽 테두리는 그늘이 진다 */
export function platformGrid(terrain: BattleTerrain, time: BattleTime, w: number, h: number): { grid: Grid; pal: Palette } {
  const l = look(terrain, time);
  // 0 외곽선, 1 테두리, 2 밝은 띠, 3 윗면, 4 점무늬, 5 테두리 그늘
  const pal = [...l.pf, mix(l.pf[1], l.pf[0], 0.5)];
  const a = w / 2, b = h / 2;
  const grid: Grid = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - a) / a, dy = (y + 0.5 - b) / b;
      const r = Math.sqrt(dx * dx + dy * dy);
      let c = -1;
      if (r <= 1) {
        if (r > 0.93) c = 0;
        else if (r > 0.8) c = dy > 0.15 ? 5 : 1;
        else if (r > 0.68) c = 2;
        else if (r > 0.6) c = 3;
        else if (r > 0.42) c = (x + y) % 2 ? 4 : 3;
        else c = (x + 2 * y) % 5 === 0 ? 4 : 3;
      }
      row.push(c);
    }
    grid.push(row);
  }
  return { grid, pal };
}
