// 그림 미리보기: npm run art → scratch/art-*.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { MON_ART, monPalette } from '../src/data/monArt';
import { renderBack, renderFront, renderIcon } from '../src/gfx/monsterArt';
import { gridToRgba, type Grid, type Palette } from '../src/gfx/pixel';
import { TILES, tileLayers } from '../src/gfx/tileArt';
import { PAL, CHAR_PAL } from '../src/gfx/palettes';
import { ballPalette, groundBallGrid } from '../src/gfx/ballArt';
import { charFrame, type CharBase, type Dir } from '../src/gfx/charArt';
import { Sheet } from './png';

const outDir = process.argv[2] ?? 'scratch';
mkdirSync(outDir, { recursive: true });
const put = (s: Sheet, g: Grid, pal: Palette, x: number, y: number) => s.blit(gridToRgba(g, pal), g[0].length, g.length, x, y);
const monPal = (k: string): Palette => monPalette(k);
const only = process.argv[3]?.split(',');

// 몬스터
const keys = Object.keys(MON_ART).filter((k) => !only || only.includes(k));
const cols = Math.min(6, keys.length);
const cell = 84;
const mons = new Sheet(cols * (cell * 2 + 34), Math.ceil(keys.length / cols) * cell, [232, 232, 240]);
keys.forEach((k, i) => {
  const x = (i % cols) * (cell * 2 + 34), y = Math.floor(i / cols) * cell;
  put(mons, renderFront(MON_ART[k]), monPal(k), x + 2, y + 2);
  put(mons, renderBack(MON_ART[k]), monPal(k), x + 84, y + 2);
  put(mons, renderIcon(MON_ART[k]), monPal(k), x + 168, y + 48);
});
writeFileSync(`${outDir}/art-monsters.png`, mons.png(keys.length <= 3 ? 3 : 2));

// 타일
const tileKeys = Object.keys(TILES).filter((k) => !TILES[k].void);
const tiles = new Sheet(16 * 17, Math.ceil(tileKeys.length / 16) * 17, [255, 0, 255]);
tileKeys.forEach((k, i) => {
  const x = (i % 16) * 17, y = Math.floor(i / 16) * 17;
  for (const l of tileLayers(k)) put(tiles, l.grid, PAL[l.pal], x, y);
});
writeFileSync(`${outDir}/art-tiles.png`, tiles.png(4));

// 캐릭터
const bases: CharBase[] = ['cap', 'long', 'old', 'hat', 'bald', 'bun'];
const dirs: Dir[] = ['down', 'up', 'left', 'right'];
const charPals = [CHAR_PAL.player, CHAR_PAL.mom, CHAR_PAL.prof, CHAR_PAL.green, CHAR_PAL.brown, CHAR_PAL.purple];
const chars = new Sheet(12 * 17 + 17, bases.length * 17, [200, 230, 180]);
bases.forEach((b, bi) => {
  dirs.forEach((d, di) => ([0, 1, 2] as const).forEach((f) => put(chars, charFrame(b, d, f), charPals[bi], (di * 3 + f) * 17, bi * 17)));
});
put(chars, groundBallGrid(), ballPalette('capsule'), 12 * 17, 0);
writeFileSync(`${outDir}/art-chars.png`, chars.png(5));
console.log('ok', outDir);
