// 1세대 그림 묶음 하나만 미리보기: npx tsx scripts/preview-part.ts <묶음번호 1~6> <출력폴더> [키,...]
// 한 줄에 몬스터 하나씩 [앞모습 | 뒷모습 | 아이콘] 순서로, 3배 확대해서 그린다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildMonPalette } from '../src/gfx/monPalette';
import { renderBack, renderFront, renderIcon, type MonArt } from '../src/gfx/monsterArt';
import { gridToRgba, type Grid, type Palette } from '../src/gfx/pixel';
import { Sheet } from './png';

const [part, outDir = 'scratch', only] = process.argv.slice(2);
const mod = (await import(`../src/data/gen1Art/p${part}.ts`)) as {
  ART: Record<string, MonArt>;
  COLORS: Record<string, [string, string]>;
  EXTRA: Record<string, string[]>;
};
mkdirSync(outDir, { recursive: true });
const want = only?.split(',');
const keys = Object.keys(mod.ART).filter((k) => !want || want.includes(k));
const missing = keys.filter((k) => !mod.COLORS[k]);
if (missing.length) throw new Error(`COLORS 없음: ${missing.join(', ')}`);

const put = (s: Sheet, g: Grid, pal: Palette, x: number, y: number) => s.blit(gridToRgba(g, pal), g[0].length, g.length, x, y);
const cols = Math.min(3, Math.max(1, keys.length));
const cw = 204, ch = 84;
const sheet = new Sheet(cols * cw, Math.ceil(keys.length / cols) * ch, [232, 232, 240]);
keys.forEach((k, i) => {
  const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
  const pal = buildMonPalette(mod.COLORS[k][0], mod.COLORS[k][1], mod.EXTRA[k]);
  put(sheet, renderFront(mod.ART[k]), pal, x + 2, y + 2);
  put(sheet, renderBack(mod.ART[k]), pal, x + 84, y + 2);
  put(sheet, renderIcon(mod.ART[k]), pal, x + 168, y + 48);
});
const file = `${outDir}/part${part}${want ? '-' + want.join('_').slice(0, 40) : ''}.png`;
writeFileSync(file, sheet.png(3));
console.log(file, keys.join(' '));
