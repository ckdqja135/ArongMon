// 따라다니는 포켓몬의 방향과 걸음: 도트 앞모습 한 장으로 뒷모습과 걷는 그림을 만든다 (브라우저 전용)
import type { Gait } from '../data/monMotion';

export type FieldView = 'front' | 'back' | 'side';

function read(src: HTMLCanvasElement) {
  return src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, src.width, src.height);
}

function toCanvas(d: ImageData) {
  const c = document.createElement('canvas');
  c.width = d.width;
  c.height = d.height;
  c.getContext('2d')!.putImageData(d, 0, 0);
  return c;
}

/** 그림이 있는 칸의 경계 */
function bounds(d: ImageData) {
  let x0 = d.width, y0 = d.height, x1 = -1, y1 = -1;
  for (let y = 0; y < d.height; y++)
    for (let x = 0; x < d.width; x++)
      if (d.data[(y * d.width + x) * 4 + 3]) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return { x0, y0, x1, y1 };
}

/** 뒷모습: 좌우를 뒤집고 눈·입 같은 작은 무늬를 둘레의 몸 색으로 메운 뒤 살짝 어둡게 */
export function backView(src: HTMLCanvasElement): HTMLCanvasElement {
  const s = read(src);
  const { width: w, height: h } = s;
  const d = new ImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, j = (y * w + (w - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) d.data[i + k] = s.data[j + k];
    }
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d.data[(y * w + x) * 4 + 3] > 0;
  // 가장자리에서 두 칸 이상 안쪽만 고친다 (외곽선과 귀·꼬리 끝 모양은 그대로)
  const inner = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!op(x + dx, y + dy)) return false;
    return true;
  };
  const r = h >= 18 ? 2 : 1;
  const out = new Uint8ClampedArray(d.data);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!inner(x, y)) continue;
      const votes = new Map<number, number>();
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (!op(x + dx, y + dy)) continue;
          const i = ((y + dy) * w + x + dx) * 4;
          const [cr, cg, cb] = [d.data[i], d.data[i + 1], d.data[i + 2]];
          // 눈동자·외곽선 같은 어두운 색과 흰자위는 표에 넣지 않는다
          const l = cr * 0.3 + cg * 0.59 + cb * 0.11;
          if (l < 64 || l > 236) continue;
          const key = (cr << 16) | (cg << 8) | cb;
          votes.set(key, (votes.get(key) ?? 0) + 1);
        }
      let best = -1, n = 0;
      for (const [k, v] of votes) if (v > n) [best, n] = [k, v];
      if (best < 0) continue;
      const i = (y * w + x) * 4;
      out[i] = best >> 16;
      out[i + 1] = (best >> 8) & 255;
      out[i + 2] = best & 255;
    }
  for (let i = 0; i < out.length; i += 4) for (let k = 0; k < 3; k++) out[i + k] = Math.round(out[i + k] * 0.92);
  d.data.set(out);
  return toCanvas(d);
}

/**
 * 걷는 그림 (frame 1·2는 걸음 A·B)
 * - 다리: 앞뒤 모습은 한쪽 발을 들고, 옆모습은 다리를 앞뒤로 벌린다
 * - 다리 없음: 몸을 낮게 움츠린다
 * - 떠 있음: 그대로 (둥실거리는 건 그릴 때 위치로)
 */
export function walkFrame(src: HTMLCanvasElement, view: FieldView, gait: Gait, frame: 1 | 2): HTMLCanvasElement {
  if (gait === 'float') return src;
  const s = read(src);
  const { width: w, height: h } = s;
  const b = bounds(s);
  if (b.x1 < 0) return src;
  const d = new ImageData(w, h);
  const px = (x: number, y: number) => (y * w + x) * 4;
  const copy = (fx: number, fy: number, tx: number, ty: number) => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return;
    for (let k = 0; k < 4; k++) d.data[px(tx, ty) + k] = s.data[px(fx, fy) + k];
  };

  if (gait === 'legless') {
    // 아래를 기준으로 키를 줄이고 옆으로 조금 퍼지게
    const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    const nh = Math.max(1, bh - Math.max(1, Math.round(bh * 0.12)));
    const nw = bw + (bw >= 8 ? 2 : 0);
    const nx0 = b.x0 - (nw - bw) / 2;
    for (let y = 0; y < nh; y++)
      for (let x = 0; x < nw; x++) {
        const fx = b.x0 + Math.min(bw - 1, Math.floor((x * bw) / nw));
        const fy = b.y0 + Math.min(bh - 1, Math.floor((y * bh) / nh));
        if (s.data[px(fx, fy) + 3]) copy(fx, fy, nx0 + x, b.y1 - nh + 1 + y);
      }
    return toCanvas(d);
  }

  d.data.set(s.data);
  const bh = b.y1 - b.y0 + 1;
  const legH = Math.max(2, Math.min(5, Math.round(bh * 0.28)));
  const top = b.y1 - legH + 1;
  // 다리 부분의 가운데 (맨 아래 줄에 칠해진 칸 기준)
  let lx0 = w, lx1 = -1;
  for (let y = top; y <= b.y1; y++)
    for (let x = 0; x < w; x++)
      if (s.data[px(x, y) + 3] && y >= b.y1 - 1) {
        lx0 = Math.min(lx0, x);
        lx1 = Math.max(lx1, x);
      }
  const cx = (lx0 + lx1 + 1) / 2;

  if (view === 'side') {
    // 아래쪽 다리를 앞뒤로 한 칸씩 벌린다 (걸음 B는 반대쪽 다리가 앞)
    const spreadTop = b.y1 - Math.max(1, Math.floor(legH / 2)) + 1;
    for (let y = spreadTop; y <= b.y1; y++) for (let x = 0; x < w; x++) d.data[px(x, y) + 3] = 0;
    const order = frame === 1 ? [-1, 1] : [1, -1];
    for (let y = spreadTop; y <= b.y1; y++)
      for (let x = 0; x < w; x++) {
        if (!s.data[px(x, y) + 3]) continue;
        const dx = x < cx ? order[0] : order[1];
        copy(x, y, x + dx, y);
      }
    return toCanvas(d);
  }

  // 앞뒤 모습: 한쪽 발을 한 칸 든다 (걸음 A는 왼발, B는 오른발)
  const lifted = (x: number) => (frame === 1 ? x < cx : x >= cx);
  for (let x = 0; x < w; x++) {
    if (!lifted(x)) continue;
    for (let y = top; y <= b.y1; y++) {
      if (y === top && !s.data[px(x, y) + 3]) continue;
      copy(x, y, x, y - 1);
    }
    const i = px(x, b.y1);
    d.data[i] = d.data[i + 1] = d.data[i + 2] = d.data[i + 3] = 0;
  }
  return toCanvas(d);
}
