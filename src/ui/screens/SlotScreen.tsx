import { useState } from 'react';
import { MAPS } from '../../data/maps';
import { G } from '../../game/game';
import { SLOTS, exportSave, parseSaveFile, slotInfo, writeSave } from '../../game/save';
import { ask, say, yesNo } from '../dialog';
import { openOverlay } from '../overlay';
import { Frame, Menu } from '../widgets';

type Mode = 'save' | 'load';

/** 저장 슬롯 고르기. 고른 슬롯 번호, 취소하면 null. 슬롯마다 파일로 내보내기·파일에서 가져오기도 할 수 있다 */
export const openSlots = (mode: Mode) => openOverlay<number | null>((done) => <SlotScreen mode={mode} onDone={done} />);

/** 글을 파일로 내려받게 한다 */
function downloadText(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** 파일 고르기 창을 열어 글을 읽는다. 취소하면 null */
function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (f) f.text().then(resolve, () => resolve(null));
      else resolve(null);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

const time = (sec: number) => `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}`;

function SlotScreen({ mode, onDone }: { mode: Mode; onDone: (slot: number | null) => void }) {
  const [busy, setBusy] = useState(false);
  // 가져오기를 하면 목록을 다시 읽는다
  const [, setRev] = useState(0);
  const infos = SLOTS.map((n) => ({ n, info: slotInfo(n) }));
  const overwrite = (n: number, name: string) => yesNo(`${n}번에는 ${name}의 기록이 있다.\n덮어쓰겠습니까?`);

  const choose = async (k: number) => {
    const { n, info } = infos[k];
    const first = mode === 'save' ? '여기에 기록' : info ? '불러오기' : null;
    const options = [...(first ? [first] : []), ...(info ? ['파일로 내보내기'] : []), '파일에서 가져오기', '그만두기'];
    setBusy(true);
    const pick = options[await ask('', options)];
    if (pick === '여기에 기록') {
      // 다른 슬롯의 기록을 덮어쓸 때는 한 번 더 묻는다
      if (!info || n === G.slot || (await overwrite(n, info.name))) return onDone(n);
    } else if (pick === '불러오기') {
      return onDone(n);
    } else if (pick === '파일로 내보내기') {
      downloadText(`아롱몬-리포트${n}-${info!.name}.json`, exportSave(n)!);
      await say(`${n}번 리포트를\n파일로 내보냈다!`);
    } else if (pick === '파일에서 가져오기') {
      const text = await pickTextFile();
      const data = text === null ? null : parseSaveFile(text);
      if (text !== null && !data) await say('아롱몬 기록 파일이\n아닌 것 같다...');
      if (data && (!info || (await overwrite(n, info.name)))) {
        writeSave(n, data);
        setRev((x) => x + 1);
        await say(`${data.playerName}의 기록을\n${n}번 리포트에 가져왔다!`);
      }
    }
    setBusy(false);
  };
  return (
    <div className="panel slots">
      <div className="panel-title">{mode === 'save' ? '어느 곳에 기록할까?' : '어느 기록을 불러올까?'}</div>
      <Frame className="slot-list">
        <Menu
          active={!busy}
          initial={Math.max(0, infos.findIndex((x) => (mode === 'save' ? x.n === G.slot : !!x.info)))}
          items={infos.map(({ n, info }) => ({
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
