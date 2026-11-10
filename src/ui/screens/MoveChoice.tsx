import { useState } from 'react';
import { monName, type Mon } from '../../battle/mon';
import { MOVES, type MoveId } from '../../data/moves';
import { Frame, Menu, MonIcon, TypeTag } from '../widgets';

/** 무작위 후보 중에서 배울 기술 고르기. 반드시 하나를 골라야 한다 */
export function MoveChoice({ mon, options, onDone }: { mon: Mon; options: MoveId[]; onDone: (id: MoveId) => void }) {
  const [i, setI] = useState(0);
  const mv = MOVES[options[i]];
  return (
    <div className="panel">
      <div className="panel-title">
        <MonIcon mon={mon} /> {monName(mon)}: 어느 기술을 배울까?
      </div>
      <Frame style={{ left: 8, top: 34, width: 240 }}>
        <Menu
          items={options.map((id) => ({
            label: (
              <span className="move-row">
                <TypeTag type={MOVES[id].type} />
                <span className="grow">{MOVES[id].name}</span>
                <span className="pp">PP {MOVES[id].pp}</span>
              </span>
            ),
          }))}
          onMove={setI}
          onSelect={(k) => onDone(options[k])}
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
