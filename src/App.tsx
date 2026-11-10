import { useEffect, useState } from 'react';
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
        <div className="dpad">
          <Pad b="up" className="up" />
          <Pad b="left" className="left" />
          <Pad b="right" className="right" />
          <Pad b="down" className="down" />
        </div>
        <div className="mid-btns">
          <Pad b="select" label="SELECT" className="small-btn" />
          <Pad b="start" label="START" className="small-btn" />
        </div>
        <div className="ab">
          <Pad b="b" label="B" className="btn-b" />
          <Pad b="a" label="A" className="btn-a" />
        </div>
      </div>
      <div className="keys">방향키 이동 · Z/Space = A · X/Esc = B · Enter = START</div>
    </div>
  );
}
