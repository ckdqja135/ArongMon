import { useState } from 'react';
import { SPECIES_LIST } from '../../data/species';
import { useButtons } from '../../engine/input';
import { G } from '../../game/game';
import { openOverlay } from '../overlay';
import { Frame, Menu, MonImg, TypeTag } from '../widgets';

export const openDex = () => openOverlay<void>((done) => <DexScreen onDone={done} />);

function DexScreen({ onDone }: { onDone: () => void }) {
  const [cur, setCur] = useState(0);
  const [entry, setEntry] = useState<number | null>(null);
  const seen = new Set(G.save.seen);
  const caught = new Set(G.save.caught);
  const list = SPECIES_LIST;
  const sel = list[cur];
  return (
    <div className="panel dex">
      <div className="dex-head">
        포켓몬도감 <span className="small">발견 {seen.size} · 잡음 {caught.size}</span>
      </div>
      <div className="dex-preview">{seen.has(sel.key) ? <MonImg species={sel.key} view="front" /> : <div className="unknown">?</div>}</div>
      <div className="dex-types">{seen.has(sel.key) && sel.types.map((t) => <TypeTag key={t} type={t} />)}</div>
      <Frame className="dex-list">
        <Menu
          items={list.map((s) => ({
            label: (
              <span className="item-row">
                <span className="no">{String(s.no).padStart(3, '0')}</span>
                <span className="mark">{caught.has(s.key) ? '●' : ''}</span>
                <span className="grow">{seen.has(s.key) ? s.name : '- - - - -'}</span>
              </span>
            ),
          }))}
          onMove={setCur}
          onSelect={(k) => seen.has(list[k].key) && setEntry(k)}
          onCancel={onDone}
          visible={6}
          active={entry === null}
        />
      </Frame>
      {/* 고른 포켓몬의 설명: 잡았으면 도감 설명, 보기만 했으면 분류만 */}
      <Frame className="dex-desc">
        {caught.has(sel.key) ? sel.dex : seen.has(sel.key) ? `${sel.category}포켓몬\n잡으면 자세한 설명을 볼 수 있다.` : '아직 만나지 못한 포켓몬이다.'}
      </Frame>
      {entry !== null && <DexEntry k={entry} caught={caught.has(list[entry].key)} onDone={() => setEntry(null)} />}
    </div>
  );
}

function DexEntry({ k, caught, onDone }: { k: number; caught: boolean; onDone: () => void }) {
  const s = SPECIES_LIST[k];
  useButtons((b) => (b === 'a' || b === 'b') && onDone());
  return (
    <div className="panel dex-entry">
      <div className="dex-entry-top">
        <MonImg species={s.key} view="front" />
        <div>
          <div className="no">No.{String(s.no).padStart(3, '0')}</div>
          <div className="big">{s.name}</div>
          <div>{s.category}포켓몬</div>
          <div>{s.types.map((t) => <TypeTag key={t} type={t} />)}</div>
          {caught && (
            <div className="small">
              키 {s.height}m · 몸무게 {s.weight}kg
            </div>
          )}
        </div>
      </div>
      <Frame className="dex-text">{caught ? s.dex : '아직 잡지 않아서 자세한 정보가 없다.'}</Frame>
    </div>
  );
}
