import { useEffect, useRef, useState } from 'react';
import { FLY_SPOTS, REGION_PLACES, regionSpot, type RegionPlace } from '../../data/region';
import { useButtons, type Button } from '../../engine/input';
import { sfx } from '../../engine/sound';
import { G } from '../../game/game';
import { REGION_SCALE, regionCanvas } from '../../gfx/regionMap';
import { openOverlay } from '../overlay';
import { Frame } from '../widgets';

/** 포켓기어 지도. 공중날기로 고른 마을 id, 그냥 닫으면 null */
export const openMap = () => openOverlay<string | null>((done) => <MapScreen onDone={done} />);

const DIRS: Partial<Record<Button, [number, number]>> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const center = (p: RegionPlace) => [p.x + p.w / 2, p.y + p.h / 2];

/** 누른 방향에 있는 곳 중 가장 가까운 곳 (방향에서 벗어날수록 멀게 친다) */
function nextPlace(from: RegionPlace, [dx, dy]: [number, number]) {
  const [fx, fy] = center(from);
  let best: RegionPlace | null = null, score = Infinity;
  for (const p of REGION_PLACES) {
    if (p === from) continue;
    const [x, y] = center(p);
    const along = (x - fx) * dx + (y - fy) * dy, side = Math.abs((x - fx) * dy - (y - fy) * dx);
    if (along <= 0) continue;
    const s = along + side * 2;
    if (s < score) [best, score] = [p, s];
  }
  return best;
}

function MapScreen({ onDone }: { onDone: (town: string | null) => void }) {
  const here = regionSpot(G.world.map.id, G.world.player.x, G.world.player.y);
  const [cur, setCur] = useState(() => Math.max(0, REGION_PLACES.findIndex((p) => p.id === here?.place)));
  const [blink, setBlink] = useState(true);
  const ref = useRef<HTMLCanvasElement>(null);
  const place = REGION_PLACES[cur];
  const visited = G.save.visited ?? [];
  const flyable = !!FLY_SPOTS[place.id] && visited.includes(place.id);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 320);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const base = regionCanvas();
    c.width = base.width;
    c.height = base.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(base, 0, 0);
    const s = REGION_SCALE;
    // 고른 곳: 테두리를 깜빡인다
    if (blink) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      const x = Math.floor(place.x / s), y = Math.floor(place.y / s), w = Math.max(2, Math.ceil(place.w / s)), h = Math.max(2, Math.ceil(place.h / s));
      ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    }
    // 가 본 마을: 작은 점
    ctx.fillStyle = '#ffe060';
    for (const id of visited) {
      const p = REGION_PLACES.find((q) => q.id === id);
      if (p) ctx.fillRect(Math.floor((p.x + p.w / 2) / s) - 1, Math.floor((p.y + p.h / 2) / s) - 1, 2, 2);
    }
    // 지금 있는 곳: 빨간 점 (고른 곳과 엇갈려 깜빡인다)
    if (here && !blink) {
      const x = Math.floor(here.x / s), y = Math.floor(here.y / s);
      ctx.fillStyle = '#202030';
      ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = '#f04040';
      ctx.fillRect(x - 1, y - 1, 3, 3);
    }
  }, [blink, cur]);

  useButtons((b) => {
    const d = DIRS[b];
    if (d) {
      const n = nextPlace(place, d);
      if (n) {
        sfx('cursor');
        setCur(REGION_PLACES.indexOf(n));
        setBlink(true);
      }
    } else if (b === 'a') {
      if (flyable && G.canFly()) {
        sfx('select');
        onDone(place.id);
      }
    } else if (b === 'b' || b === 'start') {
      sfx('cancel');
      onDone(null);
    }
  });

  const note = here?.place === place.id ? '지금 있는 곳' : '';
  const fly = !G.save.bag.fly
    ? ''
    : !FLY_SPOTS[place.id]
      ? ''
      : !visited.includes(place.id)
        ? '아직 가 본 적 없다'
        : G.canFly()
          ? 'A: 날아가기'
          : G.world.map.outdoor
            ? '날 수 있는 포켓몬이 없다'
            : '바깥에서만 날 수 있다';
  return (
    <div className="panel region">
      <div className="panel-title">포켓기어 · 지도</div>
      <canvas ref={ref} className="pix region-map" />
      <Frame className="region-info">
        <div className="region-name">{place.name}</div>
        {note && <div className="small">{note}</div>}
        {fly && <div className={`small${flyable && G.canFly() ? ' region-fly' : ''}`}>{fly}</div>}
      </Frame>
      <div className="hint">방향키: 고르기 · B: 닫기</div>
    </div>
  );
}
