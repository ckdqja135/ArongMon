// 큰 픽셀아트 이미지를 게임용 스프라이트로 바꾼다.
// 배경 제거 → 도트 한 칸 크기 찾기 → 원래 도트 해상도로 되돌리기 → 정수 배율로 확대
// 사용: npx tsx scripts/import-sprite.ts <입력.png> <출력.png> [--height N] [--scale N] [--box 80]
//   --height: 원래 도트 해상도 대신 이 높이(px)로 다시 찍는다 (단계별 크기 맞출 때)
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './png';

interface Img { w: number; h: number; data: Uint8ClampedArray }

const dist = (d: Uint8ClampedArray, i: number, j: number) =>
  Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]) + Math.abs(d[i + 3] - d[j + 3]);

/** 테두리에서 이어진 배경색을 투명하게 */
function removeBackground(img: Img, tol = 60) {
  const { w, h, data } = img;
  const ref = new Uint8ClampedArray(data.subarray(0, 4));
  const near = (i: number) =>
    Math.abs(data[i] - ref[0]) + Math.abs(data[i + 1] - ref[1]) + Math.abs(data[i + 2] - ref[2]) <= tol;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, 0, x, h - 1);
  for (let y = 0; y < h; y++) stack.push(0, y, w - 1, y);
  while (stack.length) {
    const y = stack.pop()!, x = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h || seen[y * w + x]) continue;
    seen[y * w + x] = 1;
    const i = (y * w + x) * 4;
    if (!near(i)) continue;
    data[i + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
}

function bbox(img: Img) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (img.data[(y * img.w + x) * 4 + 3] > 0) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
  return { x0, y0, x1, y1 };
}

/** 색이 크게 바뀌는 위치들로 도트 한 칸 크기(소수 허용)와 시작 위치를 찾는다 */
function detectGrid(img: Img, axis: 'x' | 'y', minS = 3, maxS = 80) {
  const { w, h, data } = img;
  const edges: number[] = [];
  const n = axis === 'x' ? w : h, m = axis === 'x' ? h : w;
  for (let a = 0; a < m; a++)
    for (let b = 1; b < n; b++) {
      const i = axis === 'x' ? (a * w + b) * 4 : (b * w + a) * 4;
      const j = axis === 'x' ? (a * w + b - 1) * 4 : ((b - 1) * w + a) * 4;
      if (dist(data, i, j) > 90) edges.push(b);
    }
  let best = { s: 1, phase: 0, score: -1 };
  for (let s = minS; s <= maxS; s += 0.02) {
    const bins = new Float64Array(Math.ceil(s) + 2);
    for (const e of edges) bins[Math.floor(e % s)]++;
    const nb = Math.ceil(s);
    for (let p = 0; p < nb; p++) {
      const c = bins[p] + bins[(p + 1) % nb] + bins[(p + nb - 1) % nb];
      const score = c / edges.length - 3 / s;
      if (score > best.score) best = { s, phase: p + 0.5, score };
    }
  }
  return best;
}

function downsample(img: Img, sx: number, px: number, sy: number, py: number) {
  const { x0, y0, x1, y1 } = bbox(img);
  const i0 = Math.floor((x0 - px) / sx), i1 = Math.ceil((x1 - px) / sx);
  const j0 = Math.floor((y0 - py) / sy), j1 = Math.ceil((y1 - py) / sy);
  const W = i1 - i0, H = j1 - j0;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      // 칸 가운데 40% 영역의 중앙값 색
      const cx = px + (i + i0 + 0.5) * sx, cy = py + (j + j0 + 0.5) * sy;
      const rs: number[] = [], gs: number[] = [], bs: number[] = [];
      let clear = 0, total = 0;
      for (let y = Math.round(cy - sy * 0.2); y <= Math.round(cy + sy * 0.2); y++)
        for (let x = Math.round(cx - sx * 0.2); x <= Math.round(cx + sx * 0.2); x++) {
          if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
          const k = (y * img.w + x) * 4;
          total++;
          if (img.data[k + 3] < 128) clear++;
          else rs.push(img.data[k]), gs.push(img.data[k + 1]), bs.push(img.data[k + 2]);
        }
      if (!total || clear * 2 >= total) continue;
      const med = (a: number[]) => a.sort((u, v) => u - v)[a.length >> 1];
      out.set([med(rs), med(gs), med(bs), 255], (j * W + i) * 4);
    }
  return { w: W, h: H, data: out };
}

function trim(img: Img): Img {
  const { x0, y0, x1, y1 } = bbox(img);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) data.set(img.data.subarray(((y + y0) * img.w + x0) * 4, ((y + y0) * img.w + x1 + 1) * 4), y * w * 4);
  return { w, h, data };
}

function upscale(img: Img, k: number): Img {
  const w = img.w * k, h = img.h * k;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = (Math.floor(y / k) * img.w + Math.floor(x / k)) * 4;
      data.set(img.data.subarray(s, s + 4), (y * w + x) * 4);
    }
  return { w, h, data };
}

const [input, output, ...rest] = process.argv.slice(2);
const opt = (name: string) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? Number(rest[i + 1]) : undefined;
};
const src = decodePng(readFileSync(input));
removeBackground(src);
const targetH = opt('height');
let native: Img;
let s: number;
if (targetH) {
  const b = bbox(src);
  s = (b.y1 - b.y0 + 1) / targetH;
  native = trim(downsample(src, s, b.x0, s, b.y0));
} else {
  const gx = detectGrid(src, 'x');
  const gy = detectGrid(src, 'y');
  s = (gx.s + gy.s) / 2;
  native = trim(downsample(src, s, gx.phase, s, gy.phase));
}
const box = opt('box') ?? 80;
const k = opt('scale') ?? Math.max(1, Math.floor(Math.min(box / native.w, box / native.h)));
const out = upscale(native, k);
writeFileSync(output, encodePng(out.w, out.h, out.data));
console.log(`${input}: 도트 ${s.toFixed(2)}px → 원본 ${native.w}x${native.h} → ×${k} = ${out.w}x${out.h}`);
