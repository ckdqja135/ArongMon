// 픽셀 그리드를 캔버스로 바꿔 캐시한다 (브라우저 전용).
import { FRONT_ONLY, MON_ART, monPalette } from '../data/monArt';
import { ARONG_FIELD_PAL, arongFieldFrame, hasFieldArt } from './arongField';
import { BADGE_ART, dimPalette } from './badgeArt';
import { fieldBox, monOverride } from './monOverrides';
import { CHAR_H, CHAR_W, EXCLAIM, ITEM_POUCH, charFrame, type CharBase, type Dir } from './charArt';
import { DESIGN_SIZE, renderBack, renderFront, renderIcon, renderMonster } from './monsterArt';
import { CHAR_PAL, ITEM_PAL, PAL, type CharPalName } from './palettes';
import { gridToRgba, type Grid, type Palette } from './pixel';
import { SWIM_TUBE } from './fieldArt';
import { TILES, tileLayers } from './tileArt';

export const TILE = 16;
export const SCREEN_W = 256;
export const SCREEN_H = 192;

const cache = new Map<string, HTMLCanvasElement>();

export function gridCanvas(g: Grid, pal: Palette): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = g[0].length;
  c.height = g.length;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(c.width, c.height);
  img.data.set(gridToRgba(g, pal));
  ctx.putImageData(img, 0, 0);
  return c;
}

function cached(key: string, make: () => HTMLCanvasElement) {
  let c = cache.get(key);
  if (!c) {
    c = make();
    cache.set(key, c);
  }
  return c;
}

/** 타일 하나 (바닥 타일과 합성, 애니메이션 프레임 0/1, 이웃에 따른 모양 variant) */
export function tileCanvas(ch: string, frame = 0, variant = 0): HTMLCanvasElement {
  const d = TILES[ch] ?? TILES.X;
  const f = d.art2 || d.grid2 ? frame : 0;
  return cached(`t:${ch}:${f}:${variant}`, () => {
    const c = document.createElement('canvas');
    c.width = c.height = TILE;
    const ctx = c.getContext('2d')!;
    if (d.void) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, TILE, TILE);
      return c;
    }
    for (const l of tileLayers(ch, f, variant)) ctx.drawImage(gridCanvas(l.grid, PAL[l.pal]), 0, 0);
    return c;
  });
}

/** 풀숲 타일의 아랫부분 (캐릭터 발 위에 덮는다) */
export function grassOverlay(): HTMLCanvasElement {
  return cached('grassTop', () => {
    const g = TILES[','].grid!.map((r, y) => (y < 9 ? r.map(() => -1) : r));
    return gridCanvas(g, PAL.tallgrass);
  });
}

export function charCanvas(base: CharBase, pal: CharPalName, dir: Dir, frame: 0 | 1 | 2) {
  return cached(`c:${base}:${pal}:${dir}:${frame}`, () => gridCanvas(charFrame(base, dir, frame), CHAR_PAL[pal]));
}
export const CHAR_SIZE = { w: CHAR_W, h: CHAR_H };

export type MonView = 'front' | 'back' | 'icon';

/** 직접 넣은 PNG를 캔버스로 (이로치는 색상환을 돌린다) */
function fromOverride(src: HTMLCanvasElement, shiny: boolean, flip = false) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  if (shiny) ctx.filter = 'hue-rotate(150deg)';
  if (flip) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src, 0, 0);
  return c;
}

export function monCanvas(species: string, view: MonView, shiny = false) {
  return cached(`m:${species}:${view}:${shiny ? 1 : 0}`, () => {
    // 뒷모습: 앞모습만 쓰는 몬스터이거나 PNG를 넣은 몬스터는 앞모습 그대로
    const front = monOverride(species, 'front');
    const v = view === 'back' && (FRONT_ONLY.has(species) || front) ? 'front' : view;
    const o = v === 'back' ? undefined : monOverride(species, v);
    // 내 쪽에 나올 때는 상대를 보도록 좌우를 뒤집는다 (아롱이는 정면 그림이라 그대로)
    if (o) return fromOverride(o, shiny, view === 'back' && !FRONT_ONLY.has(species));
    const art = MON_ART[species];
    const g = v === 'front' ? renderFront(art) : v === 'back' ? renderBack(art) : renderIcon(art);
    return gridCanvas(g, monPalette(species, shiny));
  });
}

/** 필드용 몬스터 (따라다니는 몬스터, 집에 있는 아롱이). 아롱이는 방향·걸음마다 그린 16x16 그림을 쓴다 */
export function monFieldCanvas(species: string, dir: Dir, frame: 0 | 1 | 2 = 0) {
  if (hasFieldArt(species)) {
    return cached(`mf:${species}:${dir}:${frame}`, () => gridCanvas(arongFieldFrame(species, dir, frame), ARONG_FIELD_PAL));
  }
  // 그 밖의 몬스터는 앞모습을 키에 비례해 줄여서 쓴다 (11~24px, 오른쪽을 볼 때만 뒤집는다)
  const flip = dir === 'right';
  return cached(`mf:${species}:${flip ? 1 : 0}`, () => {
    const o = monOverride(species, 'field');
    if (o) return fromOverride(o, false, flip);
    const size = fieldBox(species);
    const g = renderMonster(MON_ART[species], { size, scale: (size / DESIGN_SIZE) * 1.05, dx: -0.6, dy: -1, mirror: flip });
    return gridCanvas(g, monPalette(species));
  });
}

/** 발밑 그림자 (DS 시절처럼 반투명 타원) */
export const shadowCanvas = (w = 12) =>
  cached(`shadow:${w}`, () => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = 4;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(16, 20, 40, 0.28)';
    ctx.fillRect(2, 0, w - 4, 4);
    ctx.fillRect(0, 1, w, 2);
    return c;
  });

export const tubeCanvas = () => cached('tube', () => gridCanvas(SWIM_TUBE, ['#ffffff', '#f04848', '#b82828', '#2c2c3a']));

export const pouchCanvas = () => cached('pouch', () => gridCanvas(ITEM_POUCH, ITEM_PAL));
/** 자전거 (16x11). 옆모습은 바퀴 두 개, 앞/뒷모습은 바퀴 하나 */
export function bikeCanvas(dir: Dir) {
  return cached(`bike:${dir}`, () => {
    const W = 16, H = 11;
    const g: Grid = Array.from({ length: H }, () => new Array(W).fill(-1));
    const set = (x: number, y: number, c: number) => x >= 0 && y >= 0 && x < W && y < H && (g[y][x] = c);
    const line = (x0: number, y0: number, x1: number, y1: number, c: number) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
    };
    if (dir === 'left' || dir === 'right') {
      const wheel = (cx: number) => {
        for (let a = 0; a < 360; a += 10) set(Math.round(cx + Math.cos((a * Math.PI) / 180) * 3), Math.round(7 + Math.sin((a * Math.PI) / 180) * 3), 1);
        set(cx, 7, 3);
      };
      wheel(3);
      wheel(12);
      line(3, 7, 4, 2, 1);
      line(2, 1, 4, 1, 1);
      line(5, 3, 10, 3, 2);
      line(5, 4, 8, 7, 2);
      line(10, 3, 9, 7, 2);
      line(9, 7, 12, 7, 2);
      line(9, 2, 11, 2, 1);
      if (dir === 'right') g.forEach((r) => r.reverse());
    } else {
      line(3, 2, 12, 2, 1);
      line(7, 3, 8, 3, 2);
      for (let y = 4; y <= 10; y++) {
        set(6, y, 1);
        set(7, y, 3);
        set(8, y, 3);
        set(9, y, 1);
      }
      line(7, 10, 8, 10, 1);
    }
    return gridCanvas(g, ['#ffffff', '#2c2c3a', '#e04848', '#6c6c80']);
  });
}

export const heartCanvas = () =>
  cached('heart', () =>
    gridCanvas(
      [
        '.33...33.',
        '3013.3113',
        '311131113',
        '311111113',
        '.3111113.',
        '..31113..',
        '...313...',
        '....3....',
      ].map((r) => [...r].map((c) => (c === '.' ? -1 : Number(c)))),
      ['#ffffff', '#f86888', '#c83858', '#5c1c2c'],
    ),
  );
/** 체육관 배지. on이 아니면 색을 뺀 그림자 */
export function badgeCanvas(id: string, on: boolean) {
  const b = BADGE_ART[id];
  return cached(`badge:${id}:${on}`, () => gridCanvas(b.art, on ? b.pal : dimPalette(b.pal)));
}

export const exclaimCanvas = () => cached('excl', () => gridCanvas(EXCLAIM, ['#ffffff', '#ffffff', '#e04040', '#2c2c3a']));

/** <canvas>에 스프라이트를 그리는 React용 헬퍼 */
export function paint(target: HTMLCanvasElement | null, src: HTMLCanvasElement) {
  if (!target) return;
  target.width = src.width;
  target.height = src.height;
  const ctx = target.getContext('2d')!;
  ctx.clearRect(0, 0, src.width, src.height);
  ctx.drawImage(src, 0, 0);
}
