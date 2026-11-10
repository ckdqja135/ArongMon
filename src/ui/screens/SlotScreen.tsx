import { useState } from 'react';
import { MAPS } from '../../data/maps';
import { G } from '../../game/game';
import { SLOTS, slotInfo } from '../../game/save';
import { yesNo } from '../dialog';
import { openOverlay } from '../overlay';
import { Frame, Menu } from '../widgets';

type Mode = 'save' | 'load';

/** 저장 슬롯 고르기. 고른 슬롯 번호, 취소하면 null */
export const openSlots = (mode: Mode) => openOverlay<number | null>((done) => <SlotScreen mode={mode} onDone={done} />);

const time = (sec: number) => `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}`;

function SlotScreen({ mode, onDone }: { mode: Mode; onDone: (slot: number | null) => void }) {
  const [busy, setBusy] = useState(false);
  const infos = SLOTS.map((n) => ({ n, info: slotInfo(n) }));
  const choose = async (k: number) => {
    const { n, info } = infos[k];
    if (mode === 'load') {
      if (info) onDone(n);
      return;
    }
    // 다른 슬롯의 기록을 덮어쓸 때는 한 번 더 묻는다
    if (info && n !== G.slot) {
      setBusy(true);
      const ok = await yesNo(`${n}번에는 ${info.name}의 기록이 있다.\n덮어쓰겠습니까?`);
      setBusy(false);
      if (!ok) return;
    }
    onDone(n);
  };
  return (
    <div className="panel slots">
      <div className="panel-title">{mode === 'save' ? '어느 곳에 기록할까?' : '어느 기록을 불러올까?'}</div>
      <Frame className="slot-list">
        <Menu
          active={!busy}
          initial={Math.max(0, infos.findIndex((x) => (mode === 'save' ? x.n === G.slot : !!x.info)))}
          items={infos.map(({ n, info }) => ({
            disabled: mode === 'load' && !info,
            label: (
              <div className={`slot-row${info ? '' : ' empty'}`}>
                <div className="slot-head">
                  <span>리포트 {n}</span>
                  {mode === 'save' && n === G.slot && <span className="small now">지금 기록</span>}
                </div>
                {info ? (
                  <div className="small">
                    {info.name} · {MAPS[info.map]?.name ?? '?'}
                    <br />
                    배지 {info.badges} · 도감 {info.caught} · {time(info.seconds)}
                  </div>
                ) : (
                  <div className="small">- 비어 있음 -</div>
                )}
              </div>
            ),
          }))}
          onSelect={choose}
          onCancel={() => onDone(null)}
        />
      </Frame>
    </div>
  );
}
