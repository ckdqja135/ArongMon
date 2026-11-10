// 순수 픽셀 데이터 유틸. DOM 없이도 동작해서 미리보기 스크립트에서도 쓴다.

/** -1 = 투명, 0~3 = 팔레트 인덱스 (0 가장 밝음, 3 가장 어두움) */
export type Grid = number[][];
/** 0~3은 게임보이 4색. 4번 이후는 아롱이처럼 색을 더 쓰는 경우 (짝수=기본, 홀수=음영) */
export type Palette = readonly string[];

export function parseArt(art: string, name = 'art'): Grid {
  const rows = art
    .trim()
    .split('\n')
    .map((r) => r.trim());
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${name}: row ${i} width ${r.length} != ${w}`);
  });
  return rows.map((r) => [...r].map((c) => (c === '.' ? -1 : Number(c))));
}

export function rows(...lines: string[]): Grid {
  return parseArt(lines.join('\n'));
}

export function flipH(g: Grid): Grid {
  return g.map((r) => [...r].reverse());
}

export function emptyGrid(w: number, h: number): Grid {
  return Array.from({ length: h }, () => new Array(w).fill(-1));
}

export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** 그리드를 RGBA 바이트 배열로 변환 */
export function gridToRgba(g: Grid, pal: Palette): Uint8ClampedArray {
  const h = g.length;
  const w = g[0].length;
  const out = new Uint8ClampedArray(w * h * 4);
  const rgb = pal.map(hexToRgb);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = g[y][x];
      if (c < 0) continue;
      const i = (y * w + x) * 4;
      out[i] = rgb[c][0];
      out[i + 1] = rgb[c][1];
      out[i + 2] = rgb[c][2];
      out[i + 3] = 255;
    }
  }
  return out;
}
