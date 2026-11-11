import { useState } from 'react';
import { STATUS_SHORT, calcStats, monName, type Mon } from '../../battle/mon';
import { josa } from '../../engine/josa';
import { useButtons } from '../../engine/input';
import { G } from '../../game/game';
import { openOverlay } from '../overlay';
import { Frame, GenderMark, HpBar, Menu, MonIcon } from '../widgets';
import { itemData } from '../../data/items';
import { ask } from '../dialog';
import { openBag } from './BagScreen';
import { openSummary } from './SummaryScreen';

export type PartyMode = 'field' | 'battle' | 'battleForced' | 'item' | 'select';

interface PartyOpts {
  mode: PartyMode;
  /** 배틀에 나와 있는 몬스터 */
  active?: Mon | null;
  title?: string;
  /** HP 숫자 대신 보여 줄 글 (기술머신: 배울 수 있다 / 없다) */
  note?: (m: Mon) => { text: string; ok: boolean };
}

export const openParty = (o: PartyOpts) => openOverlay<number | null>((done) => <PartyScreen {...o} onDone={done} />);

function PartyScreen({ mode, active, title, note, onDone }: PartyOpts & { onDone: (i: number | null) => void }) {
  const party = G.save.party;
  const [i, setI] = useState(0);
  const [sub, setSub] = useState(false);
  const [swapFrom, setSwapFrom] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, force] = useState(0);
  const idle = !sub && !msg;

  useButtons((b) => {
    const n = party.length;
    if (b === 'up') setI((v) => Math.max(0, v - 2));
    if (b === 'down') setI((v) => Math.min(n - 1, v + 2));
    if (b === 'left') setI((v) => (v % 2 ? v - 1 : v));
    if (b === 'right') setI((v) => (v % 2 === 0 && v + 1 < n ? v + 1 : v));
    if (b === 'a') {
      if (swapFrom !== null) {
        const t = party[swapFrom];
        party[swapFrom] = party[i];
        party[i] = t;
        setSwapFrom(null);
        force((x) => x + 1);
      } else if (mode === 'item' || mode === 'select') onDone(i);
      else setSub(true);
    }
    if (b === 'b') {
      if (swapFrom !== null) setSwapFrom(null);
      else if (mode !== 'battleForced') onDone(null);
    }
  }, idle);

  const subItems = mode === 'field' ? ['상태 보기', '순서 바꾸기', '지닌 도구', '취소'] : ['교체', '상태 보기', '취소'];
  const onSub = async (k: number) => {
    const label = subItems[k];
    setSub(false);
    if (label === '상태 보기') await openSummary(party, i);
    else if (label === '지닌 도구') {
      // 지닌 도구 빼기·바꾸기, 없으면 가방에서 골라 지니게 한다
      const m = party[i];
      const k = m.item ? await ask(`${josa(monName(m), '은/는')}\n${josa(itemData(m.item).name, '을/를')} 지니고 있다.`, ['빼기', '바꾸기', '그만두기']) : 1;
      if (k === 0) setMsg(G.takeHeld(m));
      else if (k === 1) {
        const r = await openBag('give');
        if (r) setMsg(G.giveHeld(m, r.item));
      }
      force((x) => x + 1);
    }
    else if (label === '순서 바꾸기') setSwapFrom(i);
    else if (label === '교체') {
      const m = party[i];
      if (m.hp <= 0) setMsg(`${josa(monName(m), '은/는')}\n싸울 힘이 남아 있지 않다!`);
      else if (m === active) setMsg(`${josa(monName(m), '은/는')}\n이미 나와 있다!`);
      else onDone(i);
    }
  };

  const hint =
    swapFrom !== null ? '어디로 옮길까?' : title ?? (mode === 'item' ? '누구에게 쓸까?' : mode === 'battleForced' ? '다음 몬스터를 골라 주세요.' : '몬스터를 골라 주세요.');
  return (
    <div className="panel party">
      <div className="party-grid">
        {party.map((m, k) => {
          const max = calcStats(m).hp;
          return (
            <div key={m.uid} className={`party-slot${k === i ? ' sel' : ''}${k === swapFrom ? ' swap' : ''}${m.hp <= 0 ? ' fainted' : ''}`}>
              <MonIcon mon={m} bounce={k === i} />
              <div className="pinfo">
                <div className="pname">
                  {monName(m)}
                  <GenderMark mon={m} />
                  {m.item && <span className="held-mark" title={itemData(m.item).name}>✦</span>}
                </div>
                <div className="plv">
                  Lv{m.level}
                  {m.hp <= 0 ? <span className="status fnt">기절</span> : m.status && <span className={`status ${m.status}`}>{STATUS_SHORT[m.status]}</span>}
                </div>
                <HpBar hp={m.hp} max={max} width={48} />
                {note ? (
                  <div className={`php note${note(m).ok ? ' ok' : ''}`}>{note(m).text}</div>
                ) : (
                  <div className="php">
                    {m.hp}/{max}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {msg ? (
        <MsgLine text={msg} onDone={() => setMsg(null)} />
      ) : (
        <Frame className="party-hint">{hint}</Frame>
      )}
      {sub && (
        <Frame className="submenu">
          <Menu items={subItems} onSelect={onSub} onCancel={() => setSub(false)} />
        </Frame>
      )}
    </div>
  );
}

function MsgLine({ text, onDone }: { text: string; onDone: () => void }) {
  useButtons((b) => (b === 'a' || b === 'b') && onDone());
  return <Frame className="party-hint">{text}</Frame>;
}
