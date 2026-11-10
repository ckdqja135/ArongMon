import { useState } from 'react';
import { josa } from '../../engine/josa';
import { useButtons } from '../../engine/input';
import { G } from '../../game/game';
import { setSoundEnabled } from '../../engine/sound';
import { settings } from '../../game/settings';
import { say } from '../dialog';
import { openOverlay } from '../overlay';
import { BadgeImg, Frame, Menu } from '../widgets';
import { openBag } from './BagScreen';
import { openDex } from './DexScreen';
import { openParty } from './PartyScreen';
import { openSlots } from './SlotScreen';

type Entry = { label: string; run: () => Promise<unknown> };

/** START 메뉴. 고른 화면을 닫으면 메뉴로 돌아온다 */
export async function openStartMenu() {
  let last = 0;
  for (;;) {
    const entries: Entry[] = [];
    if (G.flag('dex')) entries.push({ label: '도감', run: openDex });
    if (G.save.party.length) entries.push({ label: '몬스터', run: () => openParty({ mode: 'field' }) });
    entries.push({ label: '가방', run: () => openBag('field') });
    entries.push({ label: G.player, run: openCard });
    entries.push({ label: '리포트', run: report });
    entries.push({ label: '설정', run: openOptions });
    entries.push({ label: '닫기', run: async () => {} });
    const i = await openOverlay<number>((done) => (
      <Frame className="start-menu">
        <Menu items={entries.map((e) => e.label)} initial={last} onSelect={done} onCancel={() => done(-1)} onButton={(b) => b === 'start' && done(-1)} />
      </Frame>
    ));
    if (i < 0 || entries[i].label === '닫기') return;
    last = i;
    await entries[i].run();
    if (G.afterMenu) {
      const next = G.afterMenu;
      G.afterMenu = null;
      return next();
    }
    if (entries[i].label === '리포트') return;
  }
}

async function report() {
  const slot = await openSlots('save');
  if (slot === null) return;
  G.writeSave(slot);
  await say(`${josa(G.player, '은/는')} ${slot}번 리포트에\n확실히 기록했다!`);
}

const BADGES = ['feather', 'antenna', 'heart', 'spirit', 'fist', 'steel', 'glacier', 'dragon'];

function openCard() {
  return openOverlay<void>((done) => <TrainerCard onDone={done} />);
}

function TrainerCard({ onDone }: { onDone: () => void }) {
  useButtons((b) => (b === 'a' || b === 'b') && onDone());
  const s = G.save;
  const h = Math.floor(s.playSeconds / 3600);
  const m = Math.floor((s.playSeconds % 3600) / 60);
  return (
    <div className="panel card">
      <Frame className="card-body">
        <div className="card-title">트레이너 카드</div>
        <table className="kv">
          <tbody>
            <tr><th>ID No.</th><td>{String(s.playerId).padStart(5, '0')}</td></tr>
            <tr><th>이름</th><td>{s.playerName}</td></tr>
            <tr><th>소지금</th><td>{s.money.toLocaleString()}원</td></tr>
            <tr><th>도감</th><td>{s.caught.length}마리</td></tr>
            <tr><th>플레이 시간</th><td>{h}:{String(m).padStart(2, '0')}</td></tr>
          </tbody>
        </table>
        <div className="badges">
          {BADGES.map((b) => (
            <BadgeImg key={b} id={b} on={s.badges.includes(b)} className="badge" />
          ))}
        </div>
      </Frame>
    </div>
  );
}

function openOptions() {
  return openOverlay<void>((done) => <Options onDone={done} />);
}

const SPEEDS = [
  { id: 'slow', name: '느림' },
  { id: 'mid', name: '보통' },
  { id: 'fast', name: '빠름' },
] as const;

function Options({ onDone }: { onDone: () => void }) {
  const [row, setRow] = useState(0);
  const [k, setK] = useState(SPEEDS.findIndex((s) => s.id === settings.textSpeed));
  const [sound, setSound] = useState(settings.sound);
  useButtons((b) => {
    if (b === 'up' || b === 'down') setRow((r) => 1 - r);
    if (row === 0 && b === 'left') setK((v) => Math.max(0, v - 1));
    if (row === 0 && b === 'right') setK((v) => Math.min(2, v + 1));
    if (row === 1 && (b === 'left' || b === 'right')) setSound((v) => !v);
    if (b === 'a' || b === 'b') {
      settings.textSpeed = SPEEDS[k].id;
      G.save.options.textSpeed = SPEEDS[k].id;
      setSoundEnabled(sound);
      G.save.options.sound = sound;
      onDone();
    }
  });
  return (
    <div className="panel">
      <div className="panel-title">설정</div>
      <Frame style={{ left: 8, top: 34, width: 240 }}>
        <div className="row">
          <span className="cursor">{row === 0 ? '▶' : ''}</span>
          <span className="grow">글자 속도</span>
          {SPEEDS.map((s, i) => (
            <span key={s.id} className={`opt${i === k ? ' on' : ''}`}>
              {s.name}
            </span>
          ))}
        </div>
        <div className="row">
          <span className="cursor">{row === 1 ? '▶' : ''}</span>
          <span className="grow">소리</span>
          <span className={`opt${sound ? ' on' : ''}`}>켜기</span>
          <span className={`opt${!sound ? ' on' : ''}`}>끄기</span>
        </div>
      </Frame>
      <div className="hint">◀ ▶ 바꾸기 · A 확인</div>
    </div>
  );
}
