// 지역 지도 그림: 실제 맵 타일을 2x2칸마다 한 점으로 줄여 그린다 (브라우저 전용)
import { MAPS } from '../data/maps';
import { REGION } from '../data/region';
import { TILES } from './tileArt';

/** 지도 한 점 = 타일 2x2 */
export const REGION_SCALE = 2;

type Kind = 'water' | 'tree' | 'grass' | 'tall' | 'path' | 'roof' | 'wall' | 'rock' | 'ice';
const COLOR: Record<Kind, string> = {
  water: '#5c9ce8', tree: '#3a8a3c', grass: '#9cd468', tall: '#78c050', path: '#ecd8a0',
  roof: '#e06048', wall: '#f4f0e4', rock: '#b09070', ice: '#d8f0ff',
};
/** 길·건물처럼 가늘거나 작은 것은 줄여도 남게 무게를 더 준다 */
const WEIGHT: Record<Kind, number> = { roof: 3, path: 2, wall: 2, water: 1, tree: 1, grass: 1, tall: 1, rock: 1, ice: 1 };
const SEA = '#3c6cc0';

function kind(ch: string): Kind | null {
  const t = TILES[ch] ?? TILES.X;
  if (t.void) return null;
  if (t.water) return 'water';
  if (ch === 'T') return 'tree';
  if (t.pal.startsWith('roof')) return 'roof';
  if (t.pal === 'wall' || t.pal === 'lighthouse') return 'wall';
  if (t.pal === 'path' || t.pal === 'sand' || t.pal === 'wood') return 'path';
  if (t.pal === 'rock' || t.pal === 'caveWall' || t.pal === 'cave' || t.pal === 'reef') return 'rock';
  if (t.pal === 'ice') return 'ice';
  if (t.grass) return 'tall';
  return 'grass';
}

let cache: HTMLCanvasElement | null = null;

/** 지역 전체 그림 (가로 REGION.w / 2, 세로 REGION.h / 2) */
export function regionCanvas(): HTMLCanvasElement {
  if (cache) return cache;
  const W = Math.ceil(REGION.w / REGION_SCALE), H = Math.ceil(REGION.h / REGION_SCALE);
  // 타일 하나하나의 종류
  const tiles: (Kind | null)[] = new Array(REGION.w * REGION.h).fill(null);
  for (const [id, r] of REGION.placed) {
    const m = MAPS[id];
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) tiles[(r.y + y) * REGION.w + r.x + x] = kind(m.tiles[y][x]);
  }
  for (const r of REGION.caves.values()) for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) tiles[(r.y + y) * REGION.w + r.x + x] ??= 'rock';
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = SEA;
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const votes = new Map<Kind, number>();
      for (let dy = 0; dy < REGION_SCALE; dy++)
        for (let dx = 0; dx < REGION_SCALE; dx++) {
          const tx = x * REGION_SCALE + dx, ty = y * REGION_SCALE + dy;
          const k = tx < REGION.w && ty < REGION.h ? tiles[ty * REGION.w + tx] : null;
          if (k) votes.set(k, (votes.get(k) ?? 0) + WEIGHT[k]);
        }
      let best: Kind | null = null, n = 0;
      for (const [k, v] of votes) if (v > n) [best, n] = [k, v];
      if (!best) continue;
      ctx.fillStyle = COLOR[best];
      ctx.fillRect(x, y, 1, 1);
    }
  // 동굴로 이어진 길: 산 테두리와 동굴 입구
  ctx.fillStyle = '#6c5440';
  for (const r of REGION.caves.values()) {
    const x = Math.floor(r.x / REGION_SCALE), y = Math.floor(r.y / REGION_SCALE), w = Math.ceil(r.w / REGION_SCALE), h = Math.ceil(r.h / REGION_SCALE);
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillRect(x + Math.floor(w / 2) - 1, y + Math.floor(h / 2) - 1, 2, 2);
  }
  cache = c;
  return c;
}
