// 종족 기본색으로 포켓몬 팔레트를 만든다 (renderMonster 결과와 짝).
import { TONES } from './monsterArt';

const WHITE_RAMP = ['#ffffff', '#f4f4f8', '#d6d6e2', '#aaaabc', '#74748a'];
const BLACK_RAMP = ['#54546a', '#1e1e28', '#16161c', '#0e0e12', '#08080a'];

/** 색마다 TONES개: 0 흰색, 1 밝은색, 2 어두운색, 3 검정, 4~ 추가 색 */
export const buildMonPalette = (light: string, dark: string, extraCols: string[] = [], shiny = false): string[] => {
  const tint = shiny ? rotateHue : (c: string) => c;
  const bases = [tint(light), tint(dark), ...extraCols];
  const [l, d, ...extra] = bases.map(ramp);
  const pal = [...WHITE_RAMP, ...l, ...d, ...BLACK_RAMP, ...extra.flat()];
  if (pal.length % TONES) throw new Error('palette');
  return pal;
};

function toHsl(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  const r = (v >> 16) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** 기본색 하나로 [하이라이트, 기본, 음영, 진한 음영, 외곽선]을 만든다. 어두운 쪽은 푸른 기를 섞는다. */
function ramp(hex: string): string[] {
  const [h, s, l] = toHsl(hex);
  return [
    hsl(h + 6, s * 0.92, Math.min(0.96, l + 0.15)),
    hex,
    hsl(h - 8, s * 1.05, l - 0.12),
    hsl(h - 14, s * 1.1, l - 0.22),
    hsl(h - 20, s * 1.1, Math.max(0.05, l - 0.34)),
  ];
}

/** 이로치: 색상환을 돌린 색 */
function rotateHue(hex: string): string {
  const [h, s, l] = toHsl(hex);
  return hsl(h + 150, Math.max(s, 0.35), l);
}
