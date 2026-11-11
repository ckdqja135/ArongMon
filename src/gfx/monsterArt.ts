// 도형으로 정의한 포켓몬을 DS 시절 스타일 픽셀 그림으로 래스터화한다.
// 색마다 [하이라이트, 기본, 음영, 진한 음영, 외곽선] 5단계 톤을 쓰고,
// 외곽선은 검정 대신 인접한 색의 가장 어두운 톤으로 그린다.
import { Grid, emptyGrid } from './pixel';

/** 0 흰색, 1 종족 밝은색, 2 종족 어두운색, 3 검정(눈), 4~ 추가 색 */
export type Col = number;
export const TONES = 5;
const T_HI = 0, T_BASE = 1, T_SHADE = 2, T_DEEP = 3, T_LINE = 4;

interface ShapeOpts {
  /** 앞모습에서만 그림 (눈, 입 등) */
  front?: boolean;
  /** 뒷모습에서만 그림 */
  back?: boolean;
  /** 아래 도형과의 경계에 선을 긋는다 (기본 true) */
  line?: boolean;
  /** 입체 음영 (기본 true) */
  shade?: boolean;
}

export type Shape = ShapeOpts & { col: Col } & (
    | { k: 'e'; cx: number; cy: number; rx: number; ry: number }
    | { k: 'p'; pts: number[] }
    | { k: 'l'; x1: number; y1: number; x2: number; y2: number; w: number }
  );

export const E = (cx: number, cy: number, rx: number, ry: number, col: Col, o: ShapeOpts = {}): Shape => ({
  k: 'e', cx, cy, rx, ry, col, ...o,
});
export const P = (pts: number[], col: Col, o: ShapeOpts = {}): Shape => ({ k: 'p', pts, col, ...o });
export const R = (x: number, y: number, w: number, h: number, col: Col, o: ShapeOpts = {}): Shape =>
  P([x, y, x + w, y, x + w, y + h, x, y + h], col, o);
export const L = (x1: number, y1: number, x2: number, y2: number, col: Col, w = 1.5, o: ShapeOpts = {}): Shape => ({
  k: 'l', x1, y1, x2, y2, w, col, ...o,
});
/** 털이 복슬복슬한 타원 (가장자리가 톱니 모양) */
export const fluff = (cx: number, cy: number, rx: number, ry: number, col: Col, o: ShapeOpts & { n?: number; d?: number } = {}): Shape => {
  const n = o.n ?? 16;
  const d = o.d ?? 2;
  const pts: number[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const k = i % 2 ? d : 0;
    pts.push(cx + Math.cos(a) * (rx - k), cy + Math.sin(a) * (ry - k));
  }
  return P(pts, col, o);
};
/** 오각별 */
export const star = (cx: number, cy: number, r: number, col: Col, o: ShapeOpts = {}): Shape => {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  return P(pts, col, o);
};
/** 반짝이 하이라이트가 있는 눈 */
export const eye = (x: number, y: number, r = 2.6, ry = r * 1.25): Shape[] => [
  E(x, y, r, ry, 3, { front: true }),
  E(x - r * 0.35, y - ry * 0.35, Math.max(0.8, r * 0.38), Math.max(0.8, r * 0.38), 0, { front: true, line: false, shade: false }),
];
/** 감은 눈 / 웃는 눈 */
export const happyEye = (x: number, y: number, w = 3): Shape[] => [
  L(x - w, y + 1, x, y - 1.2, 3, 1.4, { front: true, shade: false }),
  L(x, y - 1.2, x + w, y + 1, 3, 1.4, { front: true, shade: false }),
];
export const mouth = (x: number, y: number, w = 2.5): Shape[] => [
  L(x - w, y - 0.6, x, y + 0.8, 3, 1.2, { front: true, shade: false }),
  L(x, y + 0.8, x + w, y - 0.6, 3, 1.2, { front: true, shade: false }),
];

export interface MonArt {
  shapes: Shape[];
}

function inShape(s: Shape, x: number, y: number): boolean {
  switch (s.k) {
    case 'e': {
      const dx = (x - s.cx) / s.rx;
      const dy = (y - s.cy) / s.ry;
      return dx * dx + dy * dy <= 1;
    }
    case 'p': {
      const p = s.pts;
      let inside = false;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    case 'l': {
      const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
      const len2 = vx * vx + vy * vy || 1;
      const t = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / len2));
      const px = s.x1 + vx * t - x, py = s.y1 + vy * t - y;
      return px * px + py * py <= (s.w / 2) * (s.w / 2);
    }
  }
}

/** 음영 계산용 도형 중심과 반지름 */
function bounds(s: Shape): { cx: number; cy: number; rx: number; ry: number } {
  if (s.k === 'e') return s;
  const xs: number[] = [], ys: number[] = [];
  if (s.k === 'p') s.pts.forEach((v, i) => (i % 2 ? ys : xs).push(v));
  else xs.push(s.x1 - s.w, s.x2 + s.w), ys.push(s.y1 - s.w, s.y2 + s.w);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: Math.max(1, (x1 - x0) / 2), ry: Math.max(1, (y1 - y0) / 2) };
}

export interface RenderOpts {
  size: number;
  /** 설계 좌표(56x56)에서 스프라이트 좌표로의 배율 */
  scale?: number;
  dx?: number;
  dy?: number;
  view?: 'front' | 'back';
  mirror?: boolean;
}

/** 결과 그리드 값 = 색 * TONES + 톤. monPalette()가 만든 팔레트와 짝을 이룬다. */
export function renderMonster(art: MonArt, o: RenderOpts): Grid {
  const { size, scale = 1, dx = 0, dy = 0, view = 'front', mirror = false } = o;
  const shapes = art.shapes.filter((s) => (view === 'front' ? !s.back : !s.front));
  const bnd = shapes.map(bounds);
  const ids: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1));
  const tone: number[][] = Array.from({ length: size }, () => new Array(size).fill(T_BASE));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = mirror ? size - 1 - x : x;
      const sx = (px + 0.5 - dx) / scale;
      const sy = (y + 0.5 - dy) / scale;
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (!inShape(shapes[i], sx, sy)) continue;
        ids[y][x] = i;
        const s = shapes[i];
        if (s.shade !== false && s.col !== 3) {
          const b = bnd[i];
          // 왼쪽 위 광원: 광원점에서 멀수록 어둡게
          const nx = ((sx - b.cx) / b.rx) * (mirror ? -1 : 1);
          const ny = (sy - b.cy) / b.ry;
          const d2 = (nx + 0.38) ** 2 + (ny + 0.45) ** 2;
          if (d2 < 0.09 && Math.min(b.rx, b.ry) * scale > 4) tone[y][x] = T_HI;
          else if (d2 > 1.45) tone[y][x] = T_SHADE;
        }
        break;
      }
    }
  }
  const id = (x: number, y: number) => (x < 0 || y < 0 || x >= size || y >= size ? -1 : ids[y][x]);
  const col = (i: number) => shapes[i].col;

  // 가장자리 음영: 도형이 오른쪽 아래로 끝나는 곳을 진하게
  const lx = mirror ? -1 : 1;
  const edge = Math.max(1, Math.round(scale * 1.2));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = ids[y][x];
      if (i < 0 || shapes[i].shade === false || col(i) === 3) continue;
      if (id(x + lx * edge, y + edge) !== i || id(x, y + edge + 1) !== i) tone[y][x] = Math.max(tone[y][x], T_SHADE);
      if (id(x + lx, y + 1) !== i && id(x, y + 1) !== i) tone[y][x] = T_DEEP;
    }
  }

  const g = emptyGrid(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if (ids[y][x] >= 0) g[y][x] = col(ids[y][x]) * TONES + tone[y][x];

  // 도형 사이 경계선: 위에 그린 도형의 테두리를 그 색의 진한 톤으로
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = ids[y][x];
      if (i < 0 || shapes[i].line === false || col(i) === 3) continue;
      const n = [id(x + 1, y), id(x - 1, y), id(x, y + 1), id(x, y - 1)];
      if (n.some((j) => j >= 0 && j < i && col(j) !== 3 && !(shapes[j].line === false && col(j) === col(i)))) {
        g[y][x] = col(i) * TONES + T_LINE;
      }
    }
  }

  // 바깥 외곽선: 이웃한 색의 외곽선 톤 (색 있는 외곽선)
  const out = g.map((r) => [...r]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (ids[y][x] >= 0) continue;
      const n = [id(x, y - 1), id(x - lx, y), id(x + lx, y), id(x, y + 1)].find((j) => j >= 0);
      if (n === undefined) continue;
      out[y][x] = (col(n) === 0 ? 2 : col(n)) * TONES + T_LINE;
    }
  }
  return out;
}

export const DESIGN_SIZE = 56;
export const FRONT_SIZE = 80;
export const BACK_SIZE = 80;
export const ICON_SIZE = 32;

const S = FRONT_SIZE / DESIGN_SIZE;

export function renderFront(art: MonArt): Grid {
  return renderMonster(art, { size: FRONT_SIZE, scale: S });
}

/** 뒷모습: 얼굴을 빼고 좌우 반전, 조금 키워서 아랫부분이 잘리게 */
export function renderBack(art: MonArt): Grid {
  const sc = S * 1.1;
  return renderMonster(art, { size: BACK_SIZE, view: 'back', mirror: true, scale: sc, dx: (BACK_SIZE - DESIGN_SIZE * sc) / 2, dy: 14 });
}

export function renderIcon(art: MonArt): Grid {
  const sc = (ICON_SIZE / DESIGN_SIZE) * 1.05;
  return renderMonster(art, { size: ICON_SIZE, scale: sc, dx: -0.6, dy: -1.2 });
}
