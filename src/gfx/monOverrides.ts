// src/assets/mon/<종족키>/ 의 그림 파일을 쓴다.
// - front.png (+ icon.png): 직접 그린 도트 그림 (아롱이). 시작할 때 모두 불러 둔다.
// - hd.png (+ hd-shiny.png): 1세대 151종의 고해상도 그림. 처음 쓸 때 불러온다.
// 크기가 달라도 칸에 맞게 줄이고, 단색 배경은 투명하게 지운다.
import { SPECIES } from '../data/species';

const files = import.meta.glob('../assets/mon/*/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
/** `${종족}:${파일 이름}` → 주소 */
const urls = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/mon\/([^/]+)\/([\w-]+)\.png$/);
  if (m) urls.set(`${m[1]}:${m[2]}`, url);
}

export type OverrideView = 'front' | 'icon' | 'field';
const BOX: Record<OverrideView, number> = { front: 80, icon: 32, field: 24 };
/** 고해상도 그림은 화면 1px에 이만큼의 픽셀을 담는다 (canvas.dataset.scale) */
export const HD_RES = 4;

/** 필드에서 따라다닐 때 크기: 실제 키에 비례 (아롱이 12px, 사람 키쯤 되면 24px) */
export const fieldBox = (species: string) => Math.round(Math.min(BOX.field, Math.max(11, 10 + (SPECIES[species]?.height ?? 1) * 8)));
/** `${종족}:${view}` (이로치 고해상도 그림은 `:shiny`가 붙는다) → 준비된 그림 */
const prepared = new Map<string, HTMLCanvasElement>();
const loading = new Map<string, Promise<void>>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** 네 귀퉁이와 이어진 비슷한 색을 투명하게 */
function clearBackground(d: ImageData) {
  const { width: w, height: h, data } = d;
  const at = (x: number, y: number) => (y * w + x) * 4;
  const c0 = at(0, 0);
  if (data[c0 + 3] < 250) return;
  const [r, g, b] = [data[c0], data[c0 + 1], data[c0 + 2]];
  const near = (i: number) => data[i + 3] > 0 && Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b) < 48;
  const seen = new Uint8Array(w * h);
  const stack: number[] = [0, 0, w - 1, 0, 0, h - 1, w - 1, h - 1];
  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h || seen[y * w + x]) continue;
    seen[y * w + x] = 1;
    const i = at(x, y);
    if (!near(i)) continue;
    data[i + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
}

/** 그림 부분만 잘라 box×box 칸에 바닥 가운데 정렬로 넣는다 */
/** res > 1이면 고해상도: box×res 칸에 부드럽게 줄여 넣고, 화면에서는 box 크기로 보인다 */
function fit(img: HTMLImageElement, box: number, res = 1): HTMLCanvasElement {
  const src = document.createElement('canvas');
  src.width = img.naturalWidth;
  src.height = img.naturalHeight;
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0);
  const d = sctx.getImageData(0, 0, src.width, src.height);
  clearBackground(d);
  sctx.putImageData(d, 0, 0);

  let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1;
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++)
      if (d.data[(y * src.width + x) * 4 + 3] > 0) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  const size = box * res;
  const out = document.createElement('canvas');
  out.width = out.height = size;
  if (res > 1) out.dataset.scale = String(res);
  if (x1 < 0) return out;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const s = Math.min(1, size / cw, size / ch);
  const dw = Math.max(1, Math.round(cw * s)), dh = Math.max(1, Math.round(ch * s));
  const octx = out.getContext('2d', { willReadFrequently: true })!;
  // 고해상도는 늘 부드럽게. 도트 그림은 2배 넘게 줄일 때만 부드럽게 줄인 뒤 반투명 가장자리를 정리해 픽셀 느낌을 살린다
  octx.imageSmoothingEnabled = res > 1 || s < 0.5;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(src, x0, y0, cw, ch, Math.floor((size - dw) / 2), size - dh, dw, dh);
  if (res === 1 && s < 0.5) {
    const od = octx.getImageData(0, 0, box, box);
    for (let i = 3; i < od.data.length; i += 4) od.data[i] = od.data[i] < 110 ? 0 : 255;
    octx.putImageData(od, 0, 0);
  }
  return out;
}

/** 시작할 때: 직접 그린 도트 그림만 불러 둔다 */
export async function loadMonOverrides() {
  const raw = new Map<string, HTMLImageElement>();
  await Promise.all(
    [...urls].map(async ([key, url]) => {
      if (!key.endsWith(':front') && !key.endsWith(':icon')) return;
      const img = await loadImage(url);
      if (img) raw.set(key, img);
    }),
  );
  for (const [key, img] of raw) {
    const [species, kind] = key.split(':');
    if (kind === 'front') {
      prepared.set(`${species}:front`, fit(img, BOX.front));
      if (!raw.has(`${species}:icon`)) prepared.set(`${species}:icon`, fit(img, BOX.icon));
      prepared.set(`${species}:field`, fit(raw.get(`${species}:icon`) ?? img, fieldBox(species)));
    } else {
      prepared.set(`${species}:icon`, fit(img, BOX.icon));
    }
  }
}

/** 고해상도 그림이 있는데 아직 안 불러왔는지 (이로치면 이로치 그림 기준) */
export function hdPending(species: string, shiny = false) {
  if (!urls.has(`${species}:hd`)) return false;
  const k = shiny && urls.has(`${species}:hd-shiny`) ? `${species}:front:shiny` : `${species}:front`;
  return !prepared.has(k);
}

/** 고해상도 그림을 불러와 배틀·아이콘·필드용으로 만들어 둔다 */
export function loadMonArt(species: string, shiny = false): Promise<void> {
  const file = shiny && urls.has(`${species}:hd-shiny`) ? 'hd-shiny' : 'hd';
  const key = `${species}:${file}`;
  let p = loading.get(key);
  if (!p) {
    p = (async () => {
      const url = urls.get(key);
      const img = url ? await loadImage(url) : null;
      if (!img) return;
      const tag = file === 'hd-shiny' ? ':shiny' : '';
      prepared.set(`${species}:front${tag}`, fit(img, BOX.front, HD_RES));
      prepared.set(`${species}:icon${tag}`, fit(img, BOX.icon, HD_RES));
      if (!tag) prepared.set(`${species}:field`, fit(img, fieldBox(species)));
    })();
    loading.set(key, p);
  }
  return p;
}

/** 준비된 그림. shiny면 이로치 고해상도 그림이 있을 때만 돌려준다 */
export const monOverride = (species: string, view: OverrideView, shiny = false) => prepared.get(`${species}:${view}${shiny ? ':shiny' : ''}`);
