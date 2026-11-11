// 지역 지도: 바깥 맵들을 이어진 대로 붙인 배치, 지도에서 고를 수 있는 곳, 지금 있는 곳의 지도 위 자리
import { MAPS, type MapDef } from './maps';

export interface Rect { x: number; y: number; w: number; h: number }
export interface RegionPlace extends Rect {
  id: string;
  name: string;
  /** 동굴처럼 맵 하나로 그리지 않고 점으로만 찍는 곳 */
  point?: boolean;
}

const size = (m: MapDef) => ({ w: m.tiles[0].length, h: m.tiles.length });

/** 동굴로만 이어진 맵: 입구 쪽 바깥 맵을 기준으로 놓을 자리와, 그 사이 동굴(산)을 그릴 칸 (모두 타일 단위) */
const DETACHED: { id: string; from: string; at: [number, number]; cave: { id: string; rect: Rect } }[] = [
  // 9번도로 동쪽 끝 얼음 동굴을 지나 남쪽으로 내려가면 용의 마을
  { id: 'blackthorn', from: 'route9', at: [30, 15], cave: { id: 'icePath', rect: { x: 28, y: 0, w: 16, h: 15 } } },
  // 10번수로 동쪽 챔피언로드를 지나 북쪽으로 올라가면 포켓몬리그
  { id: 'plateau', from: 'route10', at: [34, -24], cave: { id: 'victoryRoad', rect: { x: 32, y: -10, w: 14, h: 24 } } },
];

/** 지도 둘레 바다 (타일) */
const MARGIN = 4;

function layout() {
  const placed = new Map<string, Rect>();
  const start = MAPS.sprout;
  placed.set(start.id, { x: 0, y: 0, ...size(start) });
  const queue = [start.id];
  while (queue.length) {
    const id = queue.shift()!;
    const m = MAPS[id], at = placed.get(id)!;
    for (const [side, c] of Object.entries(m.connections ?? {})) {
      if (placed.has(c.map)) continue;
      const n = MAPS[c.map], b = size(n);
      const [x, y] =
        side === 'north' ? [at.x + c.offset, at.y - b.h] : side === 'south' ? [at.x + c.offset, at.y + at.h] : side === 'west' ? [at.x - b.w, at.y + c.offset] : [at.x + at.w, at.y + c.offset];
      placed.set(c.map, { x, y, ...b });
      queue.push(c.map);
    }
  }
  const caves = new Map<string, Rect>();
  for (const d of DETACHED) {
    const from = placed.get(d.from)!;
    placed.set(d.id, { x: from.x + d.at[0], y: from.y + d.at[1], ...size(MAPS[d.id]) });
    caves.set(d.cave.id, { ...d.cave.rect, x: from.x + d.cave.rect.x, y: from.y + d.cave.rect.y });
  }
  // 둘레에 바다를 조금 두고 왼쪽 위를 0,0으로
  const all = [...placed.values(), ...caves.values()];
  const x0 = Math.min(...all.map((r) => r.x)) - MARGIN, y0 = Math.min(...all.map((r) => r.y)) - MARGIN;
  for (const r of all) {
    r.x -= x0;
    r.y -= y0;
  }
  const w = Math.max(...all.map((r) => r.x + r.w)) + MARGIN, h = Math.max(...all.map((r) => r.y + r.h)) + MARGIN;
  return { placed, caves, w, h };
}

export const REGION = layout();

/** 실내 맵 → 그 건물·동굴의 입구가 있는 바깥 맵과 입구 자리 */
const ENTRANCE = (() => {
  const out = new Map<string, { map: string; x: number; y: number }>();
  const queue: string[] = [];
  for (const m of Object.values(MAPS)) {
    if (!m.outdoor) continue;
    for (const w of m.warps) {
      if (MAPS[w.to].outdoor || out.has(w.to)) continue;
      out.set(w.to, { map: m.id, x: w.x, y: w.y });
      queue.push(w.to);
    }
  }
  // 2층·지하처럼 실내에서 다시 들어가는 곳은 처음 건물의 입구를 따른다
  while (queue.length) {
    const id = queue.shift()!;
    for (const w of MAPS[id].warps) {
      if (MAPS[w.to].outdoor || out.has(w.to)) continue;
      out.set(w.to, out.get(id)!);
      queue.push(w.to);
    }
  }
  return out;
})();

/** 지도에서 고를 수 있는 곳: 바깥 맵 전부와 이름 있는 동굴 */
export const REGION_PLACES: RegionPlace[] = (() => {
  const list: RegionPlace[] = [];
  for (const [id, r] of REGION.placed) list.push({ id, name: MAPS[id].name, ...r });
  for (const m of Object.values(MAPS)) {
    if (m.outdoor || !m.encounters || list.some((p) => p.name === m.name)) continue;
    const cave = REGION.caves.get(m.id);
    if (cave) {
      list.push({ id: m.id, name: m.name, ...cave });
      continue;
    }
    const e = ENTRANCE.get(m.id);
    const at = e && REGION.placed.get(e.map);
    // 한 건물의 여러 층(불탄 탑 지하 등)은 입구가 같으니 한 번만
    if (at && !list.some((p) => p.point && p.x === at.x + e.x && p.y === at.y + e.y))
      list.push({ id: m.id, name: m.name, x: at.x + e.x, y: at.y + e.y, w: 1, h: 1, point: true });
  }
  return list;
})();

/** 지금 있는 곳의 지도 위 자리 (타일 단위). 건물·동굴 안이면 입구 자리 */
export function regionSpot(mapId: string, x: number, y: number): { x: number; y: number; place: string } | null {
  const cave = REGION.caves.get(mapId);
  if (cave) return { x: cave.x + cave.w / 2, y: cave.y + cave.h / 2, place: mapId };
  const at = REGION.placed.get(mapId);
  if (at) return { x: at.x + x, y: at.y + y, place: mapId };
  const e = ENTRANCE.get(mapId);
  if (!e) return null;
  const spot = regionSpot(e.map, e.x, e.y);
  // 이름 있는 동굴 안이면 그 동굴을, 아니면 입구가 있는 바깥 맵을 가리킨다
  const named = REGION_PLACES.find((p) => p.id === mapId) ?? REGION_PLACES.find((p) => p.name === MAPS[mapId].name);
  return spot && { ...spot, place: named?.id ?? e.map };
}

/** 공중날기로 갈 수 있는 마을과 내려앉을 자리 (포켓몬센터 앞, 새싹마을은 집 앞) */
export const FLY_SPOTS: Record<string, { x: number; y: number }> = Object.fromEntries([
  ['sprout', { x: 5, y: 6 }],
  ...Object.values(MAPS)
    .filter((m) => m.outdoor && m.healSpot)
    .map((m) => [m.id, m.healSpot!]),
]);
