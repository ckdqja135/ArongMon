// 데이터 검사: npm run check
import { readFileSync, readdirSync } from 'node:fs';
import { ITEMS, itemData } from '../src/data/items';
import { MAPS } from '../src/data/maps';
import { MON_ART, MON_COLORS } from '../src/data/monArt';
import { MOVES } from '../src/data/moves';
import { EGG_GROUPS } from '../src/data/breeding';
import { FISH } from '../src/data/fishing';
import { SPECIES } from '../src/data/species';
import { TILES } from '../src/gfx/tileArt';

const errors: string[] = [];
const err = (m: string) => errors.push(m);

for (const sp of Object.values(SPECIES)) {
  if (!MON_ART[sp.key] || !MON_COLORS[sp.key]) err(`그림 없음: ${sp.key}`);
  if (sp.evolve && !SPECIES[sp.evolve.to]) err(`진화 대상 없음: ${sp.key} → ${sp.evolve.to}`);
  for (const e of sp.evolveItem ?? []) {
    if (!SPECIES[e.to]) err(`진화 대상 없음: ${sp.key} → ${e.to}`);
    if (!itemData(e.item).stone) err(`진화 도구 아님: ${sp.key} ${e.item}`);
  }
  if (sp.learnset.every(([l]) => l > 1)) err(`Lv.1 기술 없음: ${sp.key}`);
  for (const [, id] of sp.learnset) if (!MOVES[id]) err(`기술 없음: ${sp.key} ${id}`);
}

for (const m of Object.values(MAPS)) {
  const w = m.tiles[0].length, h = m.tiles.length;
  m.tiles.forEach((r, y) => {
    if (r.length !== w) err(`${m.id}: ${y}행 폭 ${r.length} ≠ ${w}`);
    [...r].forEach((c, x) => !TILES[c] && err(`${m.id}: 모르는 타일 '${c}' (${x},${y})`));
  });
  const solid = (x: number, y: number) => TILES[m.tiles[y]?.[x]]?.solid;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;
  for (const wp of m.warps) {
    const t = MAPS[wp.to];
    if (!t) { err(`${m.id}: 워프 대상 없음 ${wp.to}`); continue; }
    if (!(wp.ty >= 0 && wp.ty < t.tiles.length && wp.tx >= 0 && wp.tx < t.tiles[0].length)) err(`${m.id}→${wp.to}: 도착 좌표 밖 (${wp.tx},${wp.ty})`);
    else if (TILES[t.tiles[wp.ty][wp.tx]].solid) err(`${m.id}→${wp.to}: 도착 칸이 막힘 (${wp.tx},${wp.ty})`);
    if (!wp.exit && !TILES[m.tiles[wp.y][wp.x]].door) err(`${m.id}: 문 아닌 칸에 워프 (${wp.x},${wp.y})`);
  }
  for (const [dir, c] of Object.entries(m.connections ?? {})) {
    const o = MAPS[c.map];
    if (!o) { err(`${m.id}: 연결 대상 없음 ${c.map}`); continue; }
    const back = { north: 'south', south: 'north', east: 'west', west: 'east' }[dir] as 'north';
    const rc = o.connections?.[back];
    if (!rc || rc.map !== m.id || rc.offset !== -c.offset) err(`${m.id}.${dir} ↔ ${o.id}.${back} 연결이 서로 맞지 않음`);
    // 경계에서 열린 칸이 서로 이어지는지
    if (dir === 'north' || dir === 'south') {
      const myRow = dir === 'north' ? 0 : h - 1, oRow = dir === 'north' ? o.tiles.length - 1 : 0;
      for (let x = 0; x < w; x++) {
        if (TILES[m.tiles[myRow][x]].solid) continue;
        const ox = x - c.offset;
        const ot = o.tiles[oRow]?.[ox];
        if (!ot || TILES[ot].solid) err(`${m.id}.${dir}: (${x},${myRow})이 열려 있는데 ${o.id}(${ox},${oRow})가 막힘`);
      }
    }
  }
  for (const n of m.npcs) {
    if (!inside(n.x, n.y)) err(`${m.id}: NPC ${n.id} 위치가 맵 밖`);
    else if (solid(n.x, n.y) && !TILES[m.tiles[n.y][n.x]].water) err(`${m.id}: NPC ${n.id}가 막힌 칸 위 (${n.x},${n.y})`);
    if (n.item && !ITEMS[n.item]) err(`${m.id}: 아이템 없음 ${n.item}`);
    for (const [sp] of n.trainer?.team ?? []) if (!SPECIES[sp]) err(`${m.id}: 트레이너 몬스터 없음 ${sp}`);
    if (typeof n.sprite === 'object' && 'mon' in n.sprite && !SPECIES[n.sprite.mon]) err(`${m.id}: NPC 몬스터 없음`);
  }
  for (const t of m.triggers ?? []) if (!inside(t.x, t.y) || solid(t.x, t.y)) err(`${m.id}: 트리거 위치 이상 (${t.x},${t.y})`);
  for (const sg of m.signs ?? []) if (!TILES[m.tiles[sg.y]?.[sg.x]]?.sign) err(`${m.id}: 표지판 칸이 아님 (${sg.x},${sg.y})`);
  for (const tod of ['morning', 'day', 'night'] as const)
    for (const e of m.encounters?.[tod] ?? []) if (!SPECIES[e.species]) err(`${m.id}: 야생 몬스터 없음 ${e.species}`);
}

for (const [spot, rods] of Object.entries(FISH))
  for (const [rod, table] of Object.entries(rods)) for (const e of table) if (!SPECIES[e.species]) err(`낚시 ${spot}/${rod}: 몬스터 없음 ${e.species}`);

const gen1 = Object.values(SPECIES).filter((s) => s.no > 0);
for (const s of gen1) if (!EGG_GROUPS[s.key]) err(`알 그룹 없음: ${s.key}`);
if (gen1.length !== 151 || gen1.some((s, i) => s.no !== i + 1)) err(`1세대 도감 번호가 001~151이 아님 (${gen1.length}종)`);
for (const k of Object.keys(MON_ART)) if (!SPECIES[k]) err(`종족 없는 그림: ${k}`);

// 출입구로 들어선 자리에서 그 맵의 다른 출입구로 걸어갈 수 있는지 (계단에서 내렸는데 카운터 안에 갇히는 일)
for (const m of Object.values(MAPS)) {
  for (const w of m.warps) {
    const t = MAPS[w.to];
    if (!t) continue;
    const h = t.tiles.length, wd = t.tiles[0].length;
    const open = (x: number, y: number) => x >= 0 && y >= 0 && x < wd && y < h && !(TILES[t.tiles[y][x]]?.solid && !TILES[t.tiles[y][x]]?.water);
    const seen = new Set<string>();
    const stack: [number, number][] = [[w.tx, w.ty]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      const k = `${x},${y}`;
      if (seen.has(k) || !open(x, y)) continue;
      seen.add(k);
      // 출입구(계단·문) 칸을 밟으면 바로 다른 맵으로 가므로 그 너머로는 못 지나간다
      if (seen.size > 1 && t.warps.some((x2) => x2.x === x && x2.y === y)) continue;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    if (!seen.has(`${w.tx},${w.ty}`)) { err(`${m.id} → ${t.id}: 내리는 자리 (${w.tx},${w.ty})가 막힌 칸`); continue; }
    const others = t.warps.filter((x) => x.to !== m.id);
    const edge = [...seen].some((k) => { const [x, y] = k.split(',').map(Number); return x === 0 || y === 0 || x === wd - 1 || y === h - 1; }) && !!t.connections;
    if (others.length && !edge && !others.some((x) => seen.has(`${x.x},${x.y}`)))
      err(`${m.id} → ${t.id}: (${w.tx},${w.ty})에 내리면 다른 출입구로 갈 수 없다 (갇힘)`);
  }
}

// 줄바꿈을 \\n으로 잘못 적으면 화면에 "\n" 글자가 그대로 나온다
const walk = (v: unknown, where: string): void => {
  if (typeof v === 'string') {
    if (v.includes('\\n')) err(`${where}: 줄바꿈이 글자 그대로 나옴 (\\n) "${v.slice(0, 30)}"`);
  } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
};
walk(MAPS, 'MAPS');
walk(ITEMS, 'ITEMS');
walk(SPECIES, 'SPECIES');
walk(MOVES, 'MOVES');
for (const f of readdirSync('src', { recursive: true }) as string[]) {
  if (!/\.tsx?$/.test(f)) continue;
  readFileSync(`src/${f}`, 'utf8').split('\n').forEach((line, i) => {
    if (/(['`"])[^'`"]*\\\\n/.test(line)) err(`src/${f}:${i + 1}: 줄바꿈이 글자 그대로 나옴 (\\\\n)`);
  });
}

console.log(errors.length ? errors.join('\n') : '데이터 이상 없음');
console.log(`몬스터 ${Object.keys(SPECIES).length}종, 기술 ${Object.keys(MOVES).length}개, 맵 ${Object.keys(MAPS).length}개`);
process.exit(errors.length ? 1 : 0);
