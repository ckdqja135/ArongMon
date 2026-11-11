import { useState } from 'react';
import { STATUS_NAME, calcStats, expForLevel, isShiny, monName, spec, type Mon } from '../../battle/mon';
import { itemData } from '../../data/items';
import { MOVES } from '../../data/moves';
import { useButtons } from '../../engine/input';
import { openOverlay } from '../overlay';
import { EggImg, Frame, GenderMark, HpBar, MonImg, TypeTag } from '../widgets';

export const openSummary = (list: Mon[], index: number) => openOverlay<void>((done) => <Summary list={list} index={index} onDone={done} />);

const PAGES = ['정보', '능력치', '기술'];

function Summary({ list, index, onDone }: { list: Mon[]; index: number; onDone: () => void }) {
  const [i, setI] = useState(index);
  const [page, setPage] = useState(0);
  const [moveCur, setMoveCur] = useState<number | null>(null);
  const m = list[i];
  const sp = spec(m);
  const st = calcStats(m);

  useButtons((b) => {
    if (moveCur !== null) {
      if (b === 'up') setMoveCur(Math.max(0, moveCur - 1));
      if (b === 'down') setMoveCur(Math.min(m.moves.length - 1, moveCur + 1));
      if (b === 'b') setMoveCur(null);
      return;
    }
    if (b === 'left') setPage((p) => (p + 2) % 3);
    if (b === 'right') setPage((p) => (p + 1) % 3);
    if (b === 'up') setI((v) => Math.max(0, v - 1));
    if (b === 'down') setI((v) => Math.min(list.length - 1, v + 1));
    if (b === 'a' && page === 2 && m.moves.length) setMoveCur(0);
    if (b === 'b') onDone();
  });

  // 알: 그림과 언제 깨어날지만 알려 준다
  if (m.egg !== undefined) {
    const hint =
      m.egg > 300 ? '언제 깨어날지\n전혀 모르겠다.' : m.egg > 80 ? '가끔 움직이는 것 같다.\n조금 더 걸릴 것 같다.' : '안에서 소리가 들린다!\n곧 깨어날 것 같다!';
    return (
      <div className="panel summary">
        <div className="sum-left">
          <div className="sum-name">알</div>
          <EggImg view="front" className="sum-sprite" />
        </div>
        <Frame className="sum-body egg-note">{hint}</Frame>
      </div>
    );
  }

  const lvBase = expForLevel(sp.growth, m.level);
  const lvNext = expForLevel(sp.growth, m.level + 1);
  const cur = moveCur ?? -1;
  const visible = 6;
  const top = Math.max(0, Math.min(cur - 2, m.moves.length - visible));

  return (
    <div className="panel summary">
      <div className="sum-tabs">
        {PAGES.map((p, k) => (
          <span key={p} className={k === page ? 'on' : ''}>
            {p}
          </span>
        ))}
        <span className="sum-arrows">◀▶</span>
      </div>
      <div className="sum-left">
        <div className="sum-name">
          {monName(m)}
          <GenderMark mon={m} />
        </div>
        <div className="small">Lv{m.level}</div>
        <MonImg species={m.species} view="front" shiny={isShiny(m)} className="sum-sprite" />
        {isShiny(m) && <div className="shiny-mark">★ 이로치</div>}
        <div className="sum-item small">
          <span className="held-mark">✦</span> {m.item ? itemData(m.item).name : '지닌 도구 없음'}
        </div>
      </div>
      <Frame className="sum-body">
        {page === 0 && (
          <table className="kv">
            <tbody>
              <tr><th>도감번호</th><td>No.{String(sp.no).padStart(3, '0')}</td></tr>
              <tr><th>이름</th><td>{sp.name}</td></tr>
              <tr><th>타입</th><td>{sp.types.map((t) => <TypeTag key={t} type={t} />)}</td></tr>
              <tr><th>트레이너</th><td>{m.ot}</td></tr>
              <tr><th>ID No.</th><td>{String(m.otId).padStart(5, '0')}</td></tr>
              <tr><th>상태</th><td>{m.hp <= 0 ? '기절' : m.status ? STATUS_NAME[m.status] : '보통'}</td></tr>
              <tr><th>경험치</th><td>{m.exp}</td></tr>
              <tr><th>다음 Lv</th><td>{m.level >= 100 ? '-' : lvNext - m.exp}</td></tr>
              <tr><th>만난 곳</th><td className="small">{m.metMap ?? '-'} · Lv{m.metLevel}</td></tr>
            </tbody>
          </table>
        )}
        {page === 1 && (
          <>
            <div className="row">
              <HpBar hp={m.hp} max={st.hp} width={64} />
              <span>{m.hp}/{st.hp}</span>
            </div>
            <table className="kv stats">
              <tbody>
                <tr><th>공격</th><td>{st.atk}</td></tr>
                <tr><th>방어</th><td>{st.def}</td></tr>
                <tr><th>특수공격</th><td>{st.spa}</td></tr>
                <tr><th>특수방어</th><td>{st.spd}</td></tr>
                <tr><th>스피드</th><td>{st.spe}</td></tr>
              </tbody>
            </table>
            <div className="expbar-wrap">
              EXP
              <div className="expbar">
                <div style={{ width: `${m.level >= 100 ? 100 : ((m.exp - lvBase) / (lvNext - lvBase)) * 100}%` }} />
              </div>
            </div>
          </>
        )}
        {page === 2 && (
          <>
            {sp.unlimitedMoves && <div className="small unlimited">기술 {m.moves.length}개 · 제한 없음</div>}
            <div className="moves">
              {m.moves.slice(top, top + visible).map((s, k) => {
                const mv = MOVES[s.id];
                return (
                  <div key={s.id} className={`move-row${k + top === cur ? ' sel' : ''}`}>
                    <TypeTag type={mv.type} />
                    <span className="grow">{mv.name}</span>
                    <span className="pp">PP {s.pp}/{mv.pp}</span>
                  </div>
                );
              })}
            </div>
            {moveCur !== null ? (
              <div className="move-desc small">
                위력 {MOVES[m.moves[cur].id].power > 1 ? MOVES[m.moves[cur].id].power : '-'} · 명중 {MOVES[m.moves[cur].id].acc || '-'} — {MOVES[m.moves[cur].id].desc}
              </div>
            ) : (
              <div className="move-desc small">A: 기술 설명 보기</div>
            )}
          </>
        )}
      </Frame>
    </div>
  );
}
