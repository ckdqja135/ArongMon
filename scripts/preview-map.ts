// 지도 미리보기: npx tsx scripts/preview-map.ts <출력.png> <맵id> [맵id...] [--x=0 --y=0 --w=16 --h=12]
// 게임과 같은 규칙(이웃에 따른 타일 모양)으로 그리고, NPC 자리는 분홍 점으로 표시한다.
import { writeFileSync } from 'node:fs';
import { MAPS } from '../src/data/maps';
import { PAL } from '../src/gfx/palettes';
import { gridToRgba } from '../src/gfx/pixel';
import { TILES, tileLayers, tileVariant } from '../src/gfx/tileArt';
import { Sheet } from './png';

const args = process.argv.slice(2);
const opt = (k: string) => Number(args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? NaN);
const [out, ...ids] = args.filter((a) => !a.startsWith('--'));
const maps = ids.map((i) => MAPS[i]);
const clip = (m: (typeof maps)[0]) => {
  const W = m.tiles[0].length, H = m.tiles.length;
  const x0 = Number.isNaN(opt('x')) ? 0 : opt('x'), y0 = Number.isNaN(opt('y')) ? 0 : opt('y');
  return { x0, y0, w: Number.isNaN(opt('w')) ? W - x0 : opt('w'), h: Number.isNaN(opt('h')) ? H - y0 : opt('h') };
};
const width = Math.max(...maps.map((m) => clip(m).w)) * 16;
const height = maps.reduce((a, m) => a + clip(m).h * 16 + 8, 0);
const sheet = new Sheet(width, height, [40, 40, 40]);
let oy = 0;
for (const m of maps) {
  const { x0, y0, w, h } = clip(m);
  const at = (x: number, y: number) => m.tiles[y]?.[x] ?? m.border ?? 'X';
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const ch = at(x, y);
      if (TILES[ch]?.void) continue;
      const v = tileVariant(ch, (dx, dy) => at(x + dx, y + dy), x, y);
      for (const l of tileLayers(ch, 0, v)) sheet.blit(gridToRgba(l.grid, PAL[l.pal]), 16, 16, (x - x0) * 16, oy + (y - y0) * 16);
    }
  for (const n of m.npcs) {
    const px = (n.x - x0) * 16, py = oy + (n.y - y0) * 16;
    if (n.x < x0 || n.y < y0 || n.x >= x0 + w || n.y >= y0 + h) continue;
    sheet.blit(new Uint8ClampedArray(6 * 6 * 4).map((_, i) => [255, 0, 200, 255][i % 4]), 6, 6, px + 5, py + 5);
  }
  oy += h * 16 + 8;
}
writeFileSync(out, sheet.png(Number.isNaN(opt('scale')) ? 1 : opt('scale')));
console.log(out);
