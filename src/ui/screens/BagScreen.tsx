import { useEffect, useRef, useState } from 'react';
import { canUseOn, useItemOn } from '../../battle/itemUse';
import { monName, type Mon } from '../../battle/mon';
import { RODS, type RodId } from '../../data/fishing';
import { ITEMS, itemData, type ItemId, type Pocket } from '../../data/items';
import { MOVES, type MoveId } from '../../data/moves';
import { isSpecial } from '../../data/types';
import { canLearnTM } from '../../data/tms';
import { josa } from '../../engine/josa';
import { useButtons } from '../../engine/input';
import { G } from '../../game/game';
import { bagCanvas, itemIconCanvas, pocketIconCanvas } from '../../gfx/bagArt';
import { paint } from '../../gfx/sprites';
import { openOverlay } from '../overlay';
import { yesNo } from '../dialog';
import { Frame, Menu, TypeTag } from '../widgets';
import { openMap } from './MapScreen';
import { openParty } from './PartyScreen';

export type BagResult = { item: ItemId; target?: number } | null;
/** give: 파티 화면에서 지니게 할 도구를 고를 때 */
type BagMode = 'field' | 'battle' | 'give';

/** noBalls: 트레이너와의 배틀 (남의 포켓몬에게는 볼을 던질 수 없다) */
export const openBag = (mode: BagMode, noBalls = false) => openOverlay<BagResult>((done) => <BagScreen mode={mode} noBalls={noBalls} onDone={done} />);

const POCKETS: { id: Pocket; name: string }[] = [
  { id: 'items', name: '도구' },
  { id: 'balls', name: '볼' },
  { id: 'tm', name: '기술머신' },
  { id: 'key', name: '중요한 물건' },
];

function BagScreen({ mode, noBalls, onDone }: { mode: BagMode; noBalls: boolean; onDone: (r: BagResult) => void }) {
  const [pocket, setPocket] = useState(0);
  const [cur, setCur] = useState(0);
  const [sub, setSub] = useState<ItemId | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, force] = useState(0);
  const bag = G.save.bag;
  const list = (Object.keys(bag) as ItemId[]).filter((id) => ITEMS[id].pocket === POCKETS[pocket].id && (bag[id] ?? 0) > 0);
  const sel = list[cur];

  const switchPocket = (b: string) => {
    if (b !== 'left' && b !== 'right') return;
    setPocket((p) => (p + (b === 'left' ? POCKETS.length - 1 : 1)) % POCKETS.length);
    setCur(0);
  };

  /** 기술머신: 배울 수 있는지 파티 화면에 보여 주고, 고른 포켓몬에게 가르친다 */
  const teach = async (id: ItemId) => {
    const move = itemData(id).tm!;
    const name = MOVES[move].name;
    const knows = (m: Mon) => m.moves.some((s) => s.id === move);
    const target = await openParty({
      mode: 'item',
      title: `${josa(name, '을/를')}\n누구에게 가르칠까?`,
      note: (m) =>
        knows(m) ? { text: '이미 안다', ok: false } : m.egg === undefined && canLearnTM(m.species, move) ? { text: '배울 수 있다', ok: true } : { text: '배울 수 없다', ok: false },
    });
    if (target === null) return;
    const m = G.save.party[target];
    if (knows(m)) setMsg(`${josa(monName(m), '은/는')} 이미\n${josa(name, '을/를')} 알고 있다!`);
    else if (m.egg !== undefined || !canLearnTM(m.species, move)) setMsg(`${josa(monName(m), '은/는')}\n${josa(name, '을/를')} 배울 수 없다!`);
    else if (await yesNo(`${monName(m)}에게\n${josa(name, '을/를')} 가르칠까?`)) {
      await G.teachMove(m, move);
      force((x) => x + 1);
    }
  };

  const useOnMon = async (id: ItemId) => {
    const target = await openParty({ mode: 'item', title: `${josa(ITEMS[id].name, '을/를')} 누구에게 쓸까?` });
    if (target === null) return;
    const m = G.save.party[target];
    if (mode === 'battle') {
      if (itemData(id).stone) setMsg('지금은 쓸 수 없다.');
      else if (!canUseOn(m, id)) setMsg('써도 효과가 없다.');
      else onDone({ item: id, target });
      return;
    }
    if (itemData(id).stone) {
      if (!G.stoneEvolution(m, id)) setMsg('써도 효과가 없다.');
      else if (await G.useStone(m, id)) G.removeItem(id);
      force((x) => x + 1);
      return;
    }
    const r = useItemOn(m, id);
    if (r.ok) G.removeItem(id);
    setMsg(r.message);
    force((x) => x + 1);
  };

  /** 도구를 지니게 한다: 파티 화면에서 왔으면 고른 도구를 돌려주고, 아니면 누구에게 줄지 고른다 */
  const hold = async (id: ItemId) => {
    setSub(null);
    if (!itemData(id).hold) return setMsg('그 도구는\n지니게 할 수 없다.');
    if (mode === 'give') return onDone({ item: id });
    const target = await openParty({ mode: 'item', title: `${josa(ITEMS[id].name, '을/를')}\n누구에게 지니게 할까?` });
    if (target === null) return;
    if (G.save.party[target].egg !== undefined) return setMsg('알은 도구를\n지닐 수 없다.');
    setMsg(G.giveHeld(G.save.party[target], id));
    force((x) => x + 1);
  };

  const choose = async (id: ItemId) => {
    const it = ITEMS[id];
    setSub(null);
    if (mode === 'battle') {
      if (itemData(id).hold) return setMsg('지금은 쓸 수 없다.');
      if ('ball' in it) {
        if (noBalls) setMsg('남의 포켓몬에게는\n볼을 던질 수 없다!');
        else onDone({ item: id });
      }
      else if (it.pocket === 'items') await useOnMon(id);
      else setMsg('지금은 쓸 수 없다.');
      return;
    }
    if (it.pocket === 'items') await useOnMon(id);
    else if (it.pocket === 'tm') await teach(id);
    else if (it.pocket === 'balls') setMsg('여기서는 쓸 수 없다.');
    else if (id === 'bicycle') setMsg((await G.toggleBike(true)) ?? '')
    else if (RODS.includes(id as RodId)) {
      if (!G.world.facingWater()) setMsg('여기서는 낚시를\n할 수 없다!');
      else {
        // 가방과 메뉴를 닫고 낚시한다
        G.afterMenu = () => G.fish(id as RodId);
        onDone(null);
      }
    }
    else if (id === 'fly') {
      // 지도를 열어 마을을 고르면 가방과 메뉴를 닫고 날아간다
      const town = await openMap();
      if (town) {
        G.afterMenu = () => G.flyTo(town);
        onDone(null);
      }
    }
    else setMsg(`${josa(G.player, '은/는')} ${josa(it.name, '을/를')}\n펼쳐 보았다.`);
  };

  // 중요한 물건과 기술머신은 버릴 수 없다. 지니게 하는 도구는 '사용' 대신 '지니게 하기'
  const holdable = sel ? !!itemData(sel).hold : false;
  const options =
    mode === 'give'
      ? ['지니게 하기', '취소']
      : mode === 'battle' || ITEMS[sel]?.pocket === 'key' || ITEMS[sel]?.pocket === 'tm'
        ? ['사용', '취소']
        : [holdable ? '지니게 하기' : '사용', '버리기', '취소'];
  const onSub = async (k: number) => {
    const id = sub!;
    const o = options[k];
    if (o === '사용') await choose(id);
    else if (o === '지니게 하기') await hold(id);
    else if (o === '버리기') {
      G.removeItem(id);
      setSub(null);
      setMsg(`${josa(ITEMS[id].name, '을/를')} 버렸다.`);
      setCur((c) => Math.max(0, c - 1));
    } else setSub(null);
  };

  const tm = sel ? itemData(sel).tm : undefined;
  return (
    <div className="panel bag">
      <div className="bag-title">가방</div>
      <Pic key={pocket} className="bag-art" src={bagCanvas(POCKETS[pocket].id)} />
      <div className="bag-pockets">
        <div className="bag-tabs">
          <span className="bag-arrow">◀</span>
          {POCKETS.map((q, k) => (
            <Pic key={q.id} className={`bag-tab${k === pocket ? ' on' : ''}`} src={pocketIconCanvas(q.id)} />
          ))}
          <span className="bag-arrow">▶</span>
        </div>
        <div className="bag-pocket-name">{POCKETS[pocket].name}</div>
      </div>
      <div className="bag-list-wrap">
        <Frame className="bag-list">
          {list.length ? (
            <Menu
              key={pocket}
              items={[
                ...list.map((id) => ({
                  label: (
                    <span className="item-row">
                      {itemData(id).tm ? (
                        <>
                          <span className="tm-no">No.{ITEMS[id].name.slice(-2)}</span>
                          <span className="grow">{MOVES[itemData(id).tm!].name}</span>
                        </>
                      ) : (
                        <span className="grow">{ITEMS[id].name}</span>
                      )}
                      {ITEMS[id].pocket !== 'key' && ITEMS[id].pocket !== 'tm' && <span>x{bag[id]}</span>}
                    </span>
                  ),
                })),
                '닫기',
              ]}
              initial={Math.min(cur, list.length)}
              onMove={setCur}
              onSelect={(k) => (k === list.length ? onDone(null) : setSub(list[k]))}
              onCancel={() => onDone(null)}
              visible={7}
              active={!sub && !msg}
              onButton={switchPocket}
            />
          ) : (
            <div className="empty">아무것도 없다.</div>
          )}
        </Frame>
      </div>
      <div className="bag-info">
        {msg ? (
          <div className="bag-text wide">{msg}</div>
        ) : tm ? (
          <TmInfo move={tm} />
        ) : (
          <>
            {sel && <Pic className="bag-icon" src={itemIconCanvas(sel)} />}
            <div className={`bag-text${sel ? '' : ' wide'}`}>{sel ? ITEMS[sel].desc : '가방을 닫는다.'}</div>
          </>
        )}
      </div>
      {!list.length && !msg && !sub && <EmptyPocket onButton={switchPocket} onDone={() => onDone(null)} />}
      {msg && <Dismiss onDone={() => setMsg(null)} />}
      {sub && (
        <Frame className="submenu">
          <Menu items={options} onSelect={onSub} onCancel={() => setSub(null)} />
        </Frame>
      )}
    </div>
  );
}

/** 기술머신: 가르치는 기술의 타입·분류·PP·위력·명중 */
function TmInfo({ move }: { move: MoveId }) {
  const m = MOVES[move];
  const kind = m.power === 0 ? '변화' : isSpecial(m.type) ? '특수' : '물리';
  return (
    <div className="bag-tm">
      <span className="k">타입</span>
      <TypeTag type={m.type} />
      <span className="k">분류</span>
      <span className={`kind k-${kind}`}>{kind}</span>
      <span className="k">PP</span>
      <span>{m.pp}</span>
      <span className="k">위력</span>
      <span>{m.power || '-'}</span>
      <span />
      <span />
      <span className="k">명중</span>
      <span>{m.acc || '-'}</span>
    </div>
  );
}

/** 미리 그린 캔버스를 그대로 보여 준다 */
function Pic({ src, className }: { src: HTMLCanvasElement; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => paint(ref.current, src), [src]);
  return <canvas ref={ref} className={`pix ${className ?? ''}`} />;
}

function EmptyPocket({ onButton, onDone }: { onButton: (b: string) => void; onDone: () => void }) {
  useButtons((b) => (b === 'b' ? onDone() : onButton(b)));
  return null;
}

/** 메시지를 A/B로 닫는다 (나중에 마운트되므로 입력 우선) */
function Dismiss({ onDone }: { onDone: () => void }) {
  useButtons((b) => (b === 'a' || b === 'b') && onDone());
  return null;
}

