import { useState } from 'react';
import { monName, type Mon } from '../../battle/mon';
import { MOVES, type MoveId } from '../../data/moves';
import { Frame, Menu, MonIcon, TypeTag } from '../widgets';

/** 새 기술 대신 잊을 기술 고르기. 취소하면 null */
export function MoveForget({ mon, move, onDone }: { mon: Mon; move: MoveId; onDone: (i: number | null) => void }) {
  const [i, setI] = useState(0);
  const ids = [...mon.moves.map((s) => s.id), move];
  const mv = MOVES[ids[i]];
  return (
    <div className="panel">
      <div className="panel-title">
        <MonIcon mon={mon} /> {monName(mon)}: 어느 기술을 잊게 할까?
      </div>
      <Frame style={{ left: 8, top: 34, width: 240 }}>
        <Menu
          items={ids.map((id, k) => ({
            label: (
              <span className="move-row">
                <TypeTag type={MOVES[id].type} />
                <span className="grow">{MOVES[id].name}</span>
                {k === ids.length - 1 ? <span className="new">NEW</span> : <span className="pp">PP {mon.moves[k].pp}/{MOVES[id].pp}</span>}
              </span>
            ),
          }))}
          onMove={setI}
          onSelect={(k) => onDone(k === ids.length - 1 ? null : k)}
          onCancel={() => onDone(null)}
        />
      </Frame>
      <Frame className="desc-box">
        <div>
          위력 {mv.power > 1 ? mv.power : '-'} · 명중 {mv.acc || '-'}
        </div>
        <div>{mv.desc}</div>
      </Frame>
    </div>
  );
}
