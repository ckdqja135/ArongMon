import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { calcStats, gender, isShiny, monName, type Mon } from '../battle/mon';
import { TYPE_NAME, type Type } from '../data/types';
import { useButtons, type Button } from '../engine/input';
import { sfx } from '../engine/sound';
import { settings } from '../game/settings';
import { loadMonArt } from '../gfx/monOverrides';
import { badgeCanvas, eggCanvas, monCanvas, paint, type MonView } from '../gfx/sprites';
import { paginate } from './text';

export function Frame({ style, className = '', children }: { style?: CSSProperties; className?: string; children?: ReactNode }) {
  return (
    <div className={`frame ${className}`} style={style}>
      {children}
    </div>
  );
}

const CPS = { slow: 22, mid: 48, fast: 140 };

interface TextBoxProps {
  text: string;
  /** 마지막 페이지에서 A를 누르면 호출. 없으면 바로 다 보여주고 입력을 받지 않는다 */
  onDone?: () => void;
  /** 다 보여준 뒤 이 시간(ms)이 지나면 자동으로 넘어간다 */
  auto?: number;
  width: number;
  style?: CSSProperties;
  className?: string;
}

/** 한 글자씩 나오는 2줄 글상자 */
export function TextBox({ text, onDone, auto, width, style, className = 'textbox' }: TextBoxProps) {
  const pages = useMemo(() => paginate(text, width), [text, width]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const interactive = !!onDone;
  const [page, setPage] = useState(0);
  const [shown, setShown] = useState(interactive ? 0 : Infinity);
  const total = pages[page].join('').length;
  const full = shown >= total;
  const last = page === pages.length - 1;

  useEffect(() => {
    if (full) return;
    const t0 = performance.now();
    const start = shown;
    let raf = 0;
    const tick = (now: number) => {
      setShown(start + Math.floor(((now - t0) / 1000) * CPS[settings.textSpeed]));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, full]);

  useEffect(() => {
    if (!full || !last || !interactive || auto === undefined) return;
    const t = setTimeout(() => doneRef.current?.(), auto);
    return () => clearTimeout(t);
  }, [full, last, interactive, auto]);

  useButtons((b) => {
    if (b !== 'a' && b !== 'b') return;
    if (!full) setShown(Infinity);
    else if (!last) {
      setPage(page + 1);
      setShown(0);
    } else doneRef.current?.();
  }, interactive);

  let left = shown;
  const lines = pages[page].map((l) => {
    const s = l.slice(0, Math.max(0, left));
    left -= l.length;
    return s;
  });
  return (
    <div className={className} style={style}>
      {lines.map((l, i) => (
        <div key={i} className="line">
          {l || ' '}
        </div>
      ))}
      {interactive && full && auto === undefined && <span className="more">▼</span>}
    </div>
  );
}

export interface MenuItem {
  label: ReactNode;
  disabled?: boolean;
}

interface MenuProps {
  items: (MenuItem | string)[];
  onSelect: (i: number) => void;
  onCancel?: () => void;
  initial?: number;
  columns?: number;
  active?: boolean;
  onMove?: (i: number) => void;
  /** start/select 같은 다른 버튼 */
  onButton?: (b: Button, i: number) => void;
  style?: CSSProperties;
  className?: string;
  /** 한 번에 보여줄 줄 수 (넘치면 스크롤) */
  visible?: number;
}

/** ▶ 커서가 있는 선택지 */
export function Menu({ items, onSelect, onCancel, initial = 0, columns = 1, active = true, onMove, onButton, style, className = '', visible }: MenuProps) {
  const [i, setI] = useState(Math.min(initial, items.length - 1));
  const [top, setTop] = useState(0);
  const norm = items.map((it) => (typeof it === 'string' ? { label: it } : it));
  const move = (n: number) => {
    const next = Math.max(0, Math.min(items.length - 1, n));
    if (next === i) return;
    sfx('cursor');
    setI(next);
    onMove?.(next);
    if (visible) {
      const rows = Math.floor(next / columns);
      if (rows < top) setTop(rows);
      if (rows >= top + visible) setTop(rows - visible + 1);
    }
  };
  useEffect(() => onMove?.(i), []); // eslint-disable-line react-hooks/exhaustive-deps
  useButtons((b) => {
    if (b === 'up') move(i - columns);
    else if (b === 'down') move(i + columns);
    else if (b === 'left' && columns > 1 && i % columns) move(i - 1);
    else if (b === 'right' && columns > 1 && i % columns < columns - 1) move(i + 1);
    else if (b === 'a') {
      if (norm[i].disabled) return;
      sfx('select');
      onSelect(i);
    } else if (b === 'b' && onCancel) {
      sfx('cancel');
      onCancel();
    }
    else onButton?.(b, i);
  }, active);
  const rows = visible ? norm.slice(top * columns, (top + visible) * columns) : norm;
  const offset = visible ? top * columns : 0;
  return (
    <div className={`menu ${className}`} style={{ ...style, gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {rows.map((it, k) => (
        <div key={k + offset} className={`item${it.disabled ? ' disabled' : ''}`}>
          <span className="cursor">{k + offset === i ? '▶' : ''}</span>
          {it.label}
        </div>
      ))}
      {visible && top > 0 && <span className="scroll up">▲</span>}
      {visible && (top + visible) * columns < norm.length && <span className="scroll down">▼</span>}
    </div>
  );
}

export function MonImg({ species, view, shiny = false, className, style }: { species: string; view: MonView; shiny?: boolean; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // 그림 파일은 처음 쓸 때 불러오고, 다 불러오면 다시 그린다
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    const c = monCanvas(species, view, shiny);
    if (c) paint(ref.current, c);
    else void loadMonArt(species).then(() => setLoaded((n) => n + 1));
  }, [species, view, shiny, loaded]);
  return <canvas ref={ref} className={`pix ${className ?? ''}`} style={style} />;
}

export function BadgeImg({ id, on, className, style }: { id: string; on: boolean; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => paint(ref.current, badgeCanvas(id, on)), [id, on]);
  return <canvas ref={ref} className={`pix ${className ?? ''}`} style={style} />;
}

/** 포켓몬 알 그림 */
export function EggImg({ view, className }: { view: 'icon' | 'front'; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => paint(ref.current, eggCanvas(view)), [view]);
  return <canvas ref={ref} className={`pix ${className ?? ''}`} />;
}

export function MonIcon({ mon, bounce = false }: { mon: Mon; bounce?: boolean }) {
  if (mon.egg !== undefined) return <EggImg view="icon" className={bounce ? 'icon bounce' : 'icon'} />;
  return <MonImg species={mon.species} view="icon" shiny={isShiny(mon)} className={bounce ? 'icon bounce' : 'icon'} />;
}

export function hpColor(frac: number) {
  return frac > 0.5 ? 'green' : frac > 0.2 ? 'yellow' : 'red';
}

export function HpBar({ hp, max, width = 48 }: { hp: number; max: number; width?: number }) {
  const frac = max ? Math.max(0, hp) / max : 0;
  return (
    <div className="hpbar" style={{ width: width + 16 }}>
      <span className="hplabel">HP</span>
      <div className="hptrack" style={{ width }}>
        <div className={`hpfill ${hpColor(frac)}`} style={{ width: `${Math.ceil(frac * 100)}%` }} />
      </div>
    </div>
  );
}

export function GenderMark({ mon }: { mon: Mon }) {
  if (mon.egg !== undefined) return null;
  const g = gender(mon);
  if (!g) return null;
  return <span className={`gender ${g}`}>{g === 'm' ? '♂' : '♀'}</span>;
}

export function TypeTag({ type }: { type: Type }) {
  return <span className={`type t-${type}`}>{TYPE_NAME[type]}</span>;
}

export function MonLabel({ mon }: { mon: Mon }) {
  return (
    <>
      {monName(mon)}
      <GenderMark mon={mon} />
    </>
  );
}

export const maxHpOf = (m: Mon) => calcStats(m).hp;
