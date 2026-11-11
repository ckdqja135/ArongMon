// 고해상도 몬스터 그림(Pokémon HOME 그림)을 아롱이와 같은 도트 그림으로 다시 찍는다.
// 부드럽게 줄이기 → 살짝 선명하게 → 반투명 없애기 → 색 줄이기 → 가장자리 한 칸을 진하게 (외곽선)
// 사용: npx tsx scripts/pixelize-mon.ts <원본폴더> [종족키,...]
//   scratch/art/<도감번호>.png가 있으면 그 종족은 그 그림(공식 일러스트)으로 찍는다
//   원본폴더/<도감번호>.png, 원본폴더/shiny/<도감번호>.png (PokeAPI sprites의 other/home)
// 출력: src/assets/mon/<키>/front.png, front-shiny.png, icon.png, icon-shiny.png, field.png
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { SPECIES } from '../src/data/species';
import { decodePng, encodePng } from './png';

interface Img { w: number; h: number; data: Float32Array }

function load(path: string): Img {
  const p = decodePng(readFileSync(path));
  return { w: p.w, h: p.h, data: Float32Array.from(p.data) };
}

/** 그림이 있는 부분만 */
function crop(img: Img): Img {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++)
      if (img.data[(y * img.w + x) * 4 + 3] > 8) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const data = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) data.set(img.data.subarray(((y + y0) * img.w + x0) * 4, ((y + y0) * img.w + x0 + w) * 4), y * w * 4);
  return { w, h, data };
}

/** 넓이 평균으로 줄이기 (투명도를 곱한 채로 섞어서 가장자리가 검게 번지지 않게) */
function shrink(img: Img, tw: number, th: number): Img {
  const out = new Float32Array(tw * th * 4);
  const sx = img.w / tw, sy = img.h / th;
  for (let ty = 0; ty < th; ty++)
    for (let tx = 0; tx < tw; tx++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = Math.floor(ty * sy); y < Math.min(img.h, Math.ceil((ty + 1) * sy)); y++)
        for (let x = Math.floor(tx * sx); x < Math.min(img.w, Math.ceil((tx + 1) * sx)); x++) {
          const i = (y * img.w + x) * 4, al = img.data[i + 3] / 255;
          r += img.data[i] * al; g += img.data[i + 1] * al; b += img.data[i + 2] * al; a += al; n++;
        }
      const o = (ty * tw + tx) * 4;
      if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
      out[o + 3] = (a / n) * 255;
    }
  return { w: tw, h: th, data: out };
}

/** 이웃과의 차이를 키워 선명하게 */
function sharpen(img: Img, amount: number): Img {
  const { w, h, data } = img;
  const out = Float32Array.from(data);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let s = 0, n = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || data[(yy * w + xx) * 4 + 3] < 128) continue;
          s += data[(yy * w + xx) * 4 + c]; n++;
        }
        if (n) out[i + c] = Math.max(0, Math.min(255, data[i + c] + amount * (data[i + c] - s / n)));
      }
    }
  return { w, h, data: out };
}

/**
 * 미디언 컷으로 색을 n개로 줄인다. cut보다 덜 칠해진 칸은 지운다.
 * rescue: 고른 색 어느 것과도 많이 다른 작은 무늬(분홍 코처럼 넓이가 작아 묻힌 색)를 이만큼까지 따로 살린다
 */
function quantize(img: Img, n: number, cut = 128, rescue = 0) {
  const px: number[][] = [];
  for (let i = 0; i < img.w * img.h; i++) if (img.data[i * 4 + 3] >= cut) px.push([img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]]);
  let boxes = [px];
  while (boxes.length < n) {
    // 색 범위가 가장 넓은 상자를 가장 넓은 채널의 가운데에서 자른다
    let best = -1, bestRange = -1, bestCh = 0;
    boxes.forEach((bx, k) => {
      if (bx.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of bx) { lo = Math.min(lo, p[c]); hi = Math.max(hi, p[c]); }
        if (hi - lo > bestRange) { bestRange = hi - lo; best = k; bestCh = c; }
      }
    });
    if (best < 0 || bestRange < 6) break;
    const bx = boxes[best].sort((a, b) => a[bestCh] - b[bestCh]);
    const mid = bx.length >> 1;
    boxes.splice(best, 1, bx.slice(0, mid), bx.slice(mid));
  }
  const pal = boxes.map((bx) => [0, 1, 2].map((c) => bx.reduce((s, p) => s + p[c], 0) / bx.length));
  const dist = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  if (rescue) {
    const groups: { sum: number[]; n: number }[] = [];
    for (const p of px) {
      if (Math.min(...pal.map((q) => dist(p, q))) < 22 ** 2) continue;
      const g = groups.find((g) => dist(p, g.sum.map((v) => v / g.n)) < 22 ** 2);
      if (g) { g.sum = g.sum.map((v, c) => v + p[c]); g.n++; }
      else groups.push({ sum: [...p], n: 1 });
    }
    groups.sort((a, b) => b.n - a.n);
    for (const g of groups.slice(0, rescue)) if (g.n >= 3) pal.push(g.sum.map((v) => v / g.n));
  }
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4;
    if (img.data[o + 3] < cut) { img.data[o + 3] = 0; continue; }
    let bi = 0, bd = Infinity;
    pal.forEach((p, k) => {
      const d = (p[0] - img.data[o]) ** 2 + (p[1] - img.data[o + 1]) ** 2 + (p[2] - img.data[o + 2]) ** 2;
      if (d < bd) { bd = d; bi = k; }
    });
    img.data.set([...pal[bi], 255], o);
  }
}

const lum = (d: Float32Array, o: number) => d[o] * 0.3 + d[o + 1] * 0.59 + d[o + 2] * 0.11;

/** 원본에서 밝기가 크게 바뀌는 곳(무늬·마디·눈매)을 찾아, 줄인 그림의 칸마다 그런 곳이 얼마나 섞였는지 */
function edgeFraction(src: Img, tw: number, th: number, threshold: number): Float32Array {
  const { w, h, data } = src;
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = data[i * 4 + 3] > 128 ? lum(data, i * 4) : -1;
  const out = new Float32Array(tw * th);
  const sx = w / tw, sy = h / th;
  for (let ty = 0; ty < th; ty++)
    for (let tx = 0; tx < tw; tx++) {
      let hit = 0, n = 0;
      for (let y = Math.max(1, Math.floor(ty * sy)); y < Math.min(h - 1, Math.ceil((ty + 1) * sy)); y++)
        for (let x = Math.max(1, Math.floor(tx * sx)); x < Math.min(w - 1, Math.ceil((tx + 1) * sx)); x++) {
          const at = (xx: number, yy: number) => L[yy * w + xx];
          if (at(x, y) < 0) continue;
          // 투명한 이웃은 가운데 밝기로 본다 (바깥 테두리는 따로 외곽선을 그린다)
          const v = (xx: number, yy: number) => (at(xx, yy) < 0 ? at(x, y) : at(xx, yy));
          const gx = v(x + 1, y - 1) + 2 * v(x + 1, y) + v(x + 1, y + 1) - v(x - 1, y - 1) - 2 * v(x - 1, y) - v(x - 1, y + 1);
          const gy = v(x - 1, y + 1) + 2 * v(x, y + 1) + v(x + 1, y + 1) - v(x - 1, y - 1) - 2 * v(x, y - 1) - v(x + 1, y - 1);
          if (Math.hypot(gx, gy) / 4 > threshold) hit++;
          n++;
        }
      out[ty * tw + tx] = n ? hit / n : 0;
    }
  return out;
}

/** 채도와 대비를 조금 올려 도트답게 */
function vivid(img: Img, sat: number, contrast: number) {
  const d = img.data;
  for (let o = 0; o < d.length; o += 4) {
    if (d[o + 3] < 1) continue;
    const l = lum(d, o);
    for (let c = 0; c < 3; c++) d[o + c] = Math.max(0, Math.min(255, (l + (d[o + c] - l) * sat - 128) * contrast + 128));
  }
}

/** 안쪽 선: 밝기가 크게 바뀌는 칸 중 주변보다 어두운 쪽을 진하게 */
function innerLines(img: Img, frac: Float32Array, minFrac: number) {
  const { w, h, data } = img;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  const marks: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!solid(x, y) || frac[y * w + x] < minFrac) continue;
      let sum = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (solid(x + dx, y + dy)) { sum += lum(data, ((y + dy) * w + x + dx) * 4); n++; }
      if (n && lum(data, (y * w + x) * 4) <= sum / n + 2) marks.push((y * w + x) * 4);
    }
  for (const o of marks) for (let c = 0; c < 3; c++) data[o + c] *= 0.55;
}

/** 줄인 그림의 칸마다 원본에서 test에 맞는 픽셀이 얼마나 섞였는지 */
function share(src: Img, w: number, h: number, test: (r: number, g: number, b: number) => boolean): Float32Array {
  const out = new Float32Array(w * h), sx = src.w / w, sy = src.h / h;
  for (let ty = 0; ty < h; ty++)
    for (let tx = 0; tx < w; tx++) {
      let hit = 0, n = 0;
      for (let y = Math.floor(ty * sy); y < Math.min(src.h, Math.ceil((ty + 1) * sy)); y++)
        for (let x = Math.floor(tx * sx); x < Math.min(src.w, Math.ceil((tx + 1) * sx)); x++) {
          const i = (y * src.w + x) * 4;
          if (src.data[i + 3] < 128) continue;
          n++;
          if (test(src.data[i], src.data[i + 1], src.data[i + 2])) hit++;
        }
      out[ty * w + tx] = n ? hit / n : 0;
    }
  return out;
}

/** 원본에서 test에 맞는 무늬(눈동자·분홍 코처럼 작아서 묻히는 곳)가 칸의 frac 이상이면 그 칸을 color로 칠한다 */
interface Feature {
  test: (r: number, g: number, b: number) => boolean;
  frac: number;
  color: [number, number, number];
  /** 이 칸 안에서만 (줄인 그림의 x0, y0, x1, y1) */
  box?: [number, number, number, number];
}
function features(src: Img, img: Img, list: Feature[]) {
  const sx = src.w / img.w, sy = src.h / img.h;
  for (let ty = 0; ty < img.h; ty++)
    for (let tx = 0; tx < img.w; tx++) {
      const o = (ty * img.w + tx) * 4;
      if (!img.data[o + 3]) continue;
      const hit = list.map(() => 0);
      let n = 0;
      for (let y = Math.floor(ty * sy); y < Math.min(src.h, Math.ceil((ty + 1) * sy)); y++)
        for (let x = Math.floor(tx * sx); x < Math.min(src.w, Math.ceil((tx + 1) * sx)); x++) {
          const i = (y * src.w + x) * 4;
          if (src.data[i + 3] < 128) continue;
          n++;
          list.forEach((f, k) => { if (f.test(src.data[i], src.data[i + 1], src.data[i + 2])) hit[k]++; });
        }
      const inBox = (f: Feature) => !f.box || (tx >= f.box[0] && ty >= f.box[1] && tx <= f.box[2] && ty <= f.box[3]);
      const k = list.findIndex((f, k) => n && inBox(f) && hit[k] / n >= f.frac);
      if (k >= 0) img.data.set(list[k].color, o);
    }
}

/** 원본에서 두 부분(a, b)이 맞닿는 자리: 칸 안에 둘이 모두 frac 이상 섞였으면 그 칸을 진하게 칠해 경계선을 긋는다 */
interface Border { a: Feature['test']; b: Feature['test']; frac: number }
function borders(src: Img, img: Img, list: Border[]) {
  const sx = src.w / img.w, sy = src.h / img.h;
  const marks: number[] = [];
  for (let ty = 0; ty < img.h; ty++)
    for (let tx = 0; tx < img.w; tx++) {
      const o = (ty * img.w + tx) * 4;
      if (!img.data[o + 3]) continue;
      const ha = list.map(() => 0), hb = list.map(() => 0);
      let n = 0;
      for (let y = Math.floor(ty * sy); y < Math.min(src.h, Math.ceil((ty + 1) * sy)); y++)
        for (let x = Math.floor(tx * sx); x < Math.min(src.w, Math.ceil((tx + 1) * sx)); x++) {
          const i = (y * src.w + x) * 4;
          if (src.data[i + 3] < 128) continue;
          n++;
          const [r, g, b] = [src.data[i], src.data[i + 1], src.data[i + 2]];
          list.forEach((f, k) => { if (f.a(r, g, b)) ha[k]++; if (f.b(r, g, b)) hb[k]++; });
        }
      if (n && list.some((f, k) => ha[k] / n >= f.frac && hb[k] / n >= f.frac)) marks.push(o);
    }
  for (const o of marks) for (let c = 0; c < 3; c++) img.data[o + c] *= 0.45;
}

/** 색이 크게 다른 이웃과 닿은 칸 중 어두운 쪽을 진하게 (노란 몸과 갈색 팔 사이 같은 경계선). dist는 RGB 거리 */
function regionLines(img: Img, dist: number) {
  const { w, h, data } = img;
  const marks: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (!data[o + 3]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = (yy * w + xx) * 4;
        if (!data[q + 3]) continue;
        const d = Math.hypot(data[o] - data[q], data[o + 1] - data[q + 1], data[o + 2] - data[q + 2]);
        if (d > dist && lum(data, o) < lum(data, q)) { marks.push(o); break; }
      }
    }
  for (const o of marks) for (let c = 0; c < 3; c++) data[o + c] *= 0.45;
}

/** 투명한 곳과 닿은 가장자리를 진하게 칠해 도트 외곽선을 만든다 */
function outline(img: Img, keep = 0.28) {
  const { w, h, data } = img;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  const edge: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (solid(x, y) && (!solid(x + 1, y) || !solid(x - 1, y) || !solid(x, y + 1) || !solid(x, y - 1))) edge.push((y * w + x) * 4);
  for (const o of edge) for (let c = 0; c < 3; c++) data[o + c] = data[o + c] * keep + 16 * (1 - keep);
}

/** size는 가로·세로 평균의 목표 길이 (팔을 벌린 꼬마돌처럼 납작한 그림도 몸이 작아지지 않게), cap은 칸 크기 */
const TUNE = { edge: Number(process.env.EDGE ?? 16), frac: Number(process.env.FRAC ?? 0.15), sat: Number(process.env.SAT ?? 1.15), contrast: Number(process.env.CONTRAST ?? 1.08) };

interface Opts {
  /** 줄인 칸이 이만큼 칠해져야 남긴다. 작은 그림은 낮춰서 가는 꼬리·팔다리가 끊기지 않게 */
  cut?: number;
  /** 묻히기 쉬운 작은 무늬 색을 몇 개까지 따로 살릴지 */
  rescue?: number;
  /** 안쪽 선을 넣을지 (매끈한 몸에 잔주름처럼 생기는 그림은 끈다) */
  lines?: boolean;
  /** 안쪽 선을 이 부분에만 (별가사리의 갈색 팔처럼) */
  linesOnly?: (r: number, g: number, b: number) => boolean;
  /** 외곽선에 원래 색을 얼마나 남길지 (작을수록 검고 진하다) */
  ink?: number;
  /** 배틀 그림 크기를 키에서 정한 값 대신 이 값으로 (불꽃·날개가 넓게 퍼져 몸이 작아지는 그림) */
  size?: number;
  /** 작아서 묻히는 무늬를 원본에서 찾아 칠한다 */
  feats?: Feature[];
  /** 색이 크게 다른 부분 사이에 경계선을 넣는다 (RGB 거리) */
  region?: number;
  /** 원본에서 두 부분이 맞닿는 자리에 경계선 */
  edges?: Border[];
  /** 채도 (작은 무늬 색이 바탕에 묻히는 그림은 올린다) */
  sat?: number;
}

function pixelize(src: Img, size: number, cap: number, colors: number, { cut = 128, rescue = 0, lines = true, linesOnly, feats, region, edges, ink = 0.28, sat = TUNE.sat }: Opts = {}): Img {
  const s = Math.min(size / ((src.w + src.h) / 2), cap / Math.max(src.w, src.h));
  const tw = Math.max(1, Math.round(src.w * s)), th = Math.max(1, Math.round(src.h * s));
  const img = shrink(src, tw, th);
  vivid(img, sat, TUNE.contrast);
  const sharp = sharpen(img, size >= 40 ? 0.45 : 0.25);
  quantize(sharp, colors, cut, rescue);
  // 작은 그림(아이콘·필드)은 안쪽 선을 넣으면 뭉개지므로 큰 그림에만
  if (size >= 40 && lines) {
    const frac = edgeFraction(src, tw, th, TUNE.edge);
    if (linesOnly) share(src, tw, th, linesOnly).forEach((v, i) => { if (v < 0.6) frac[i] = 0; });
    innerLines(sharp, frac, TUNE.frac);
  }
  if (region) regionLines(sharp, region);
  if (edges) borders(src, sharp, edges);
  if (feats) features(src, sharp, feats);
  outline(sharp, ink);
  return sharp;
}

const save = (img: Img, path: string) => writeFileSync(path, encodePng(img.w, img.h, Uint8ClampedArray.from(img.data)));

/** 배틀 그림 크기 (가로·세로 평균): 키에 따라 46~78px (아롱이 45~70px와 어울리게) */
export const frontSize = (height: number) => Math.round(Math.min(78, Math.max(46, 40 + 16 * Math.sqrt(height))));
/** 필드에서 따라다닐 때 크기 (monOverrides.fieldBox와 같다) */
const fieldSize = (height: number) => Math.round(Math.min(24, Math.max(11, 10 + height * 8)));
/** 그림이 칸을 얼마나 채우는지 (팔다리·꼬리가 가늘게 뻗은 그림일수록 작다) */
function fill(img: Img) {
  let n = 0;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 128) n++;
  return n / (img.w * img.h);
}
/** 필드 그림 크기: 가늘게 뻗은 그림(라이츄처럼 꼬리가 긴 녀석)은 몸이 앙상해지지 않게 최대 1.25배까지 키운다 */
const fieldTarget = (img: Img, height: number) => Math.min(24, Math.round(fieldSize(height) * Math.min(1.25, Math.max(1, Math.sqrt(0.5 / fill(img))))));

/** 필드 그림을 손으로 찍어 둔 종족 (다시 만들지 않는다): 원본 자세 그대로 줄이면 앙상해지는 녀석들 */
const HAND_FIELD = new Set(['raichu']);

/** 종족마다 따로 맞춘 배틀 그림 설정 */
const FRONT_OPTS: Record<string, Opts> = {
  // 불꽃 갈기·꼬리가 넓게 퍼져 말 몸통과 뿔이 작아진다 (공식 일러스트로 찍는다)
  rapidash: { size: 72 },
  // 고양이 몸이 길게 뻗어 얼굴이 작다: 크게 찍고 눈매를 살린다 (공식 일러스트로 찍는다)
  persian: { size: 66, feats: [{ test: (r, g, b) => r + g + b < 260, frac: 0.1, color: [40, 30, 30] }] },
  // 입 안의 분홍색과 눈동자를 살린다 (공식 일러스트로 찍는다)
  koffing: {
    rescue: 4,
    sat: 1.3,
    // 눈: 흰자위 위쪽의 까만 눈동자와 눈매
    feats: [
      { test: (r, g, b) => r + g + b < 250, frac: 0.07, color: [16, 12, 20], box: [18, 11, 41, 19] },
      { test: (r, g, b) => r > 228 && g > 228 && b > 228, frac: 0.4, color: [255, 255, 255], box: [18, 11, 41, 19] },
    ],
  },
  // 몸의 줄무늬가 원본에 이미 있어 안쪽 선을 더하면 지저분하다. 연보라색을 살린다 (공식 일러스트로 찍는다)
  muk: { lines: false, sat: 1.4, size: 70 },
  // 머리카락 결이 안쪽 선으로 찍혀 지저분하다. 눈·입술 색은 살린다 (공식 일러스트로 찍는다)
  jynx: { lines: false, rescue: 4 },
  // 설정을 바꿔 찍어 보기: TRY='{"키":{"size":70}}' npx tsx scripts/pixelize-mon.ts <원본폴더> 키
  ...(process.env.TRY ? JSON.parse(process.env.TRY) : {}),
  // 노란 가운데의 음영이 바퀴살 같은 선으로 찍힌다. 안쪽 선은 갈색 팔에만, 노란 가운데·보석 둘레에는 경계선
  staryu: {
    linesOnly: (r, g, b) => r > 80 && g < 0.7 * r && b < 100,
    ink: 0.12,
    edges: [
      // 노란 가운데 | 갈색 팔
      { a: (r, g, b) => r > 180 && g > 0.78 * r && b < 150, b: (r, g, b) => r > 80 && g < 0.7 * r && b < 100, frac: 0.06 },
      // 빨간 보석 | 노란 가운데
      { a: (r, g) => r > 150 && g < 80, b: (r, g, b) => r > 180 && g > 0.78 * r && b < 150, frac: 0.12 },
    ],
  },
  // 털 질감이 얼굴에 낙서처럼 찍히고 눈·분홍 코가 묻힌다. 눈썹·눈동자와 코를 원본에서 찾아 칠한다
  primeape: {
    lines: false,
    rescue: 4,
    sat: 1.35,
    feats: [
      { test: (r, g, b) => r + g + b < 250, frac: 0.1, color: [36, 28, 28] },
      { test: (r, g, b) => r > 200 && r - g >= 12 && b > g, frac: 0.3, color: [242, 168, 184] },
      { test: (r, g, b) => r > 251 && g > 251 && b > 251, frac: 0.45, color: [255, 255, 255] },
    ],
  },
};

const [srcDir, only] = process.argv.slice(2);
if (!srcDir) throw new Error('원본 폴더를 주세요');
const want = only?.split(',');
for (const sp of Object.values(SPECIES)) {
  if (sp.no < 1 || sp.no > 151 || (want && !want.includes(sp.key))) continue;
  const dir = `src/assets/mon/${sp.key}`;
  mkdirSync(dir, { recursive: true });
  // HOME 3D 그림이 원근 때문에 일그러져 보이는 종족은 scratch/art/<도감번호>.png (공식 일러스트)를 대신 쓴다
  const art = `scratch/art/${sp.no}.png`;
  const normal = crop(load(existsSync(art) ? art : `${srcDir}/${sp.no}.png`));
  const fo = FRONT_OPTS[sp.key];
  save(pixelize(normal, fo?.size ?? frontSize(sp.height), 78, 16, fo), `${dir}/front.png`);
  save(pixelize(normal, 26, 30, 16), `${dir}/icon.png`);
  // 필드 그림은 목표 크기를 넘지 않게 (게임에서 한 번 더 줄이면 픽셀이 빠져 앙상해진다)
  const fs = fieldTarget(normal, sp.height);
  if (!HAND_FIELD.has(sp.key)) save(pixelize(normal, fs, fs, 10, { cut: 64 }), `${dir}/field.png`);
  const shinyPath = `${srcDir}/shiny/${sp.no}.png`;
  if (existsSync(shinyPath)) {
    const shiny = crop(load(shinyPath));
    save(pixelize(shiny, fo?.size ?? frontSize(sp.height), 78, 16, fo), `${dir}/front-shiny.png`);
    save(pixelize(shiny, 26, 30, 16), `${dir}/icon-shiny.png`);
  }
  console.log(sp.key);
}
