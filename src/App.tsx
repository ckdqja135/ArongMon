import { useEffect, useRef, useState } from 'react';
import { input, type Button } from './engine/input';
import { useStore } from './engine/store';
import { app } from './game/game';
import { SCREEN_H, SCREEN_W } from './gfx/sprites';
import { BattleScreen } from './ui/battle/BattleScreen';
import { OverlayHost } from './ui/overlay';
import { Title } from './ui/Title';
import { WorldView } from './ui/WorldView';

function useScale() {
  const calc = () => {
    const w = window.innerWidth - 24;
    const h = window.innerHeight - (window.innerWidth < 700 ? 230 : 110);
    const fit = Math.min(w / SCREEN_W, h / SCREEN_H);
    // 2배 이상이면 픽셀이 고르게 정수 배율, 좁은 화면(휴대폰)은 꽉 차게
    return fit >= 2 ? Math.floor(fit) : Math.max(1, Math.floor(fit * 10) / 10);
  };
  const [s, setS] = useState(calc);
  useEffect(() => {
    const f = () => setS(calc());
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return s;
}

type Dir = 'up' | 'down' | 'left' | 'right';
const ARROW: Record<Dir, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };

/**
 * 십자 버튼: 네 버튼을 한 판으로 받아, 손가락 위치(가운데에서 어느 쪽인지)로 방향을 정한다.
 * 손가락을 떼지 않고 오른쪽 → 아래로 밀어도 방향만 바뀌고 입력이 끊기지 않는다
 */
function DPad() {
  const [dir, setDir] = useState<Dir | null>(null);
  const cur = useRef<{ id: number; dir: Dir | null } | null>(null);
  const aim = (e: React.PointerEvent<HTMLDivElement>): Dir | null => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    // 가운데 좁은 곳은 방향 없음 (바꾸는 중에 엉뚱한 방향이 튀지 않게)
    if (Math.hypot(dx, dy) < r.width * 0.12) return cur.current?.dir ?? null;
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
  };
  const to = (next: Dir | null) => {
    const c = cur.current;
    if (!c || c.dir === next) return;
    if (c.dir) input.releaseVirtual(c.dir);
    if (next) input.pressVirtual(next);
    c.dir = next;
    setDir(next);
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (cur.current) return;
    cur.current = { id: e.pointerId, dir: null };
    // 손가락이 십자 버튼 밖으로 나가도 계속 받는다 (지원하지 않는 기기는 그냥 넘어간다)
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 무시 */
    }
    to(aim(e));
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cur.current?.id === e.pointerId) to(aim(e));
  };
  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cur.current?.id !== e.pointerId) return;
    to(null);
    cur.current = null;
  };
  return (
    <div className="dpad" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}>
      {(['up', 'left', 'right', 'down'] as Dir[]).map((d) => (
        <div key={d} className={`pad ${d}${dir === d ? ' on' : ''}`}>
          {ARROW[d]}
        </div>
      ))}
    </div>
  );
}

function Pad({ b, label, className }: { b: Button; label?: string; className: string }) {
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    input.pressVirtual(b);
  };
  const up = () => input.releaseVirtual(b);
  return (
    <button className={`pad ${className}`} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}>
      {label}
    </button>
  );
}

export function App() {
  const { scene, battle } = useStore(app);
  const scale = useScale();
  return (
    <div className="shell">
      <div className="screen-wrap" style={{ width: SCREEN_W * scale, height: SCREEN_H * scale }}>
        <div className="screen" style={{ zoom: scale }}>
          {scene === 'boot' && <div className="boot">불러오는 중...</div>}
          {scene === 'title' && <Title />}
          {scene === 'world' && <WorldView />}
          {scene === 'battle' && battle && <BattleScreen session={battle} />}
          <OverlayHost />
        </div>
      </div>
      <div className="controls">
        <DPad />
        <div className="mid-btns">
          <Pad b="select" label="SELECT" className="small-btn" />
          <Pad b="start" label="START" className="small-btn" />
        </div>
        <div className="ab">
          <Pad b="b" label="B" className="btn-b" />
          <Pad b="a" label="A" className="btn-a" />
        </div>
      </div>
      <div className="keys">방향키 이동 · Z/Space = A · X/Esc = B · Enter = START · Shift = SELECT</div>
    </div>
  );
}
