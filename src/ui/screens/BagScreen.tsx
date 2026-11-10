import { useState } from 'react';
import { canUseOn, useItemOn } from '../../battle/itemUse';
import { ITEMS, itemData, type ItemId, type Pocket } from '../../data/items';
import { josa } from '../../engine/josa';
import { useButtons } from '../../engine/input';
import { G } from '../../game/game';
import { openOverlay } from '../overlay';
import { Frame, Menu } from '../widgets';
import { openParty } from './PartyScreen';

export type BagResult = { item: ItemId; target?: number } | null;
type BagMode = 'field' | 'battle';

export const openBag = (mode: BagMode) => openOverlay<BagResult>((done) => <BagScreen mode={mode} onDone={done} />);

const POCKETS: { id: Pocket; name: string }[] = [
  { id: 'items', name: '도구' },
  { id: 'balls', name: '캡슐' },
  { id: 'key', name: '중요한 물건' },
];

function BagScreen({ mode, onDone }: { mode: BagMode; onDone: (r: BagResult) => void }) {
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
    setPocket((p) => (p + (b === 'left' ? 2 : 1)) % 3);
    setCur(0);
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

  const choose = async (id: ItemId) => {
    const it = ITEMS[id];
    setSub(null);
    if (mode === 'battle') {
      if ('ball' in it) onDone({ item: id });
      else if (it.pocket === 'items') await useOnMon(id);
      else setMsg('지금은 쓸 수 없다.');
      return;
    }
    if (it.pocket === 'items') await useOnMon(id);
    else if (it.pocket === 'balls') setMsg('여기서는 쓸 수 없다.');
    else if (id === 'bicycle') setMsg((await G.toggleBike(true)) ?? '')
    else setMsg(`${josa(G.player, '은/는')} ${josa(it.name, '을/를')}\n펼쳐 보았다.`);
  };

  const options = mode === 'battle' ? ['사용', '취소'] : ITEMS[sel]?.pocket === 'key' ? ['사용', '취소'] : ['사용', '버리기', '취소'];
  const onSub = async (k: number) => {
    const id = sub!;
    const o = options[k];
    if (o === '사용') await choose(id);
    else if (o === '버리기') {
      G.removeItem(id);
      setSub(null);
      setMsg(`${josa(ITEMS[id].name, '을/를')} 버렸다.`);
      setCur((c) => Math.max(0, c - 1));
    } else setSub(null);
  };

  return (
    <div className="panel bag">
      <div className="bag-pocket">
        ◀ <b>{POCKETS[pocket].name}</b> ▶
      </div>
      <Frame className="bag-list">
        {list.length ? (
          <Menu
            key={pocket}
            items={[...list.map((id) => ({ label: <span className="item-row"><span className="grow">{ITEMS[id].name}</span>{ITEMS[id].pocket !== 'key' && <span>×{bag[id]}</span>}</span> })), '닫기']}
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
      <Frame className="bag-desc">{msg ?? (sel ? ITEMS[sel].desc : '가방을 닫는다.')}</Frame>
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

function EmptyPocket({ onButton, onDone }: { onButton: (b: string) => void; onDone: () => void }) {
  useButtons((b) => (b === 'b' ? onDone() : onButton(b)));
  return null;
}

/** 메시지를 A/B로 닫는다 (나중에 마운트되므로 입력 우선) */
function Dismiss({ onDone }: { onDone: () => void }) {
  useButtons((b) => (b === 'a' || b === 'b') && onDone());
  return null;
}

