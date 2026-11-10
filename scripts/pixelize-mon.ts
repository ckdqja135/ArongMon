// 고해상도 몬스터 그림(Pokémon HOME 그림)을 아롱이와 같은 도트 그림으로 다시 찍는다.
// 부드럽게 줄이기 → 살짝 선명하게 → 반투명 없애기 → 색 줄이기 → 가장자리 한 칸을 진하게 (외곽선)
// 사용: npx tsx scripts/pixelize-mon.ts <원본폴더> [종족키,...]
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

/** 미디언 컷으로 색을 n개로 줄인다 */
function quantize(img: Img, n: number) {
  const px: number[][] = [];
  for (let i = 0; i < img.w * img.h; i++) if (img.data[i * 4 + 3] >= 128) px.push([img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]]);
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
  for (let i = 0; i < img.w * img.h; i++) {
    const o = i * 4;
    if (img.data[o + 3] < 128) { img.data[o + 3] = 0; continue; }
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

/** 투명한 곳과 닿은 가장자리를 진하게 칠해 도트 외곽선을 만든다 */
function outline(img: Img) {
  const { w, h, data } = img;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
  const edge: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (solid(x, y) && (!solid(x + 1, y) || !solid(x - 1, y) || !solid(x, y + 1) || !solid(x, y - 1))) edge.push((y * w + x) * 4);
  for (const o of edge) for (let c = 0; c < 3; c++) data[o + c] = data[o + c] * 0.28 + 16 * 0.72;
}

/** size는 가로·세로 평균의 목표 길이 (팔을 벌린 꼬마돌처럼 납작한 그림도 몸이 작아지지 않게), cap은 칸 크기 */
const TUNE = { edge: Number(process.env.EDGE ?? 16), frac: Number(process.env.FRAC ?? 0.15), sat: Number(process.env.SAT ?? 1.15), contrast: Number(process.env.CONTRAST ?? 1.08) };

function pixelize(src: Img, size: number, cap: number, colors: number): Img {
  const s = Math.min(size / ((src.w + src.h) / 2), cap / Math.max(src.w, src.h));
  const tw = Math.max(1, Math.round(src.w * s)), th = Math.max(1, Math.round(src.h * s));
  const img = shrink(src, tw, th);
  vivid(img, TUNE.sat, TUNE.contrast);
  const sharp = sharpen(img, size >= 40 ? 0.45 : 0.25);
  quantize(sharp, colors);
  // 작은 그림(아이콘·필드)은 안쪽 선을 넣으면 뭉개지므로 큰 그림에만
  if (size >= 40) innerLines(sharp, edgeFraction(src, tw, th, TUNE.edge), TUNE.frac);
  outline(sharp);
  return sharp;
}

const save = (img: Img, path: string) => writeFileSync(path, encodePng(img.w, img.h, Uint8ClampedArray.from(img.data)));

/** 배틀 그림 크기 (가로·세로 평균): 키에 따라 46~78px (아롱이 45~70px와 어울리게) */
export const frontSize = (height: number) => Math.round(Math.min(78, Math.max(46, 40 + 16 * Math.sqrt(height))));
/** 필드에서 따라다닐 때 크기 (monOverrides.fieldBox와 같다) */
const fieldSize = (height: number) => Math.round(Math.min(24, Math.max(11, 10 + height * 8)));

const [srcDir, only] = process.argv.slice(2);
if (!srcDir) throw new Error('원본 폴더를 주세요');
const want = only?.split(',');
for (const sp of Object.values(SPECIES)) {
  if (sp.no < 1 || sp.no > 151 || (want && !want.includes(sp.key))) continue;
  const dir = `src/assets/mon/${sp.key}`;
  mkdirSync(dir, { recursive: true });
  const normal = crop(load(`${srcDir}/${sp.no}.png`));
  save(pixelize(normal, frontSize(sp.height), 78, 16), `${dir}/front.png`);
  save(pixelize(normal, 26, 30, 16), `${dir}/icon.png`);
  save(pixelize(normal, fieldSize(sp.height), 24, 10), `${dir}/field.png`);
  const shinyPath = `${srcDir}/shiny/${sp.no}.png`;
  if (existsSync(shinyPath)) {
    const shiny = crop(load(shinyPath));
    save(pixelize(shiny, frontSize(sp.height), 78, 16), `${dir}/front-shiny.png`);
    save(pixelize(shiny, 26, 30, 16), `${dir}/icon-shiny.png`);
  }
  console.log(sp.key);
}
