import { useState } from 'react';
import { ITEMS, itemData, type ItemId } from '../../data/items';
import { josa } from '../../engine/josa';
import { G } from '../../game/game';
import { ask, askQuantity, say, yesNo } from '../dialog';
import { openOverlay } from '../overlay';
import { Frame, Menu } from '../widgets';

export async function openMart(stock: ItemId[]) {
  await say('어서 오세요!\n무엇을 도와드릴까요?');
  for (;;) {
    const c = await ask('', ['사러 왔다', '팔러 왔다', '아무것도 아니다'], 2);
    if (c === 0) await buy(stock);
    else if (c === 1) await sell();
    else break;
  }
  await say('또 오세요!');
}

async function buy(stock: ItemId[]) {
  for (;;) {
    const id = await openOverlay<ItemId | null>((done) => <ItemList ids={stock} price={(i) => ITEMS[i].price} onDone={done} />);
    if (!id) return;
    const it = ITEMS[id];
    // 기술머신은 몇 번이든 쓸 수 있어서 하나만 판다
    const isTM = !!itemData(id).tm;
    if (isTM && G.save.bag[id]) {
      await say('그 기술머신은 이미\n가지고 계시네요!');
      continue;
    }
    const max = isTM ? 1 : Math.min(99, Math.floor(G.save.money / it.price));
    if (max < 1 || G.save.money < it.price) {
      await say('돈이 모자랍니다.');
      continue;
    }
    if (!isTM) await say(`${josa(it.name, '을/를')}\n몇 개 사시겠습니까?`);
    const n = isTM ? 1 : await askQuantity(max, it.price);
    if (!n) continue;
    if (!(await yesNo(`${it.name} ${n}개 해서\n${(n * it.price).toLocaleString()}원입니다. 괜찮으시겠어요?`))) continue;
    G.save.money -= n * it.price;
    G.addItem(id, n);
    await say('감사합니다!');
    if (id === 'capsule' && n >= 10) {
      G.addItem('supercapsule');
      await say('많이 사 주셔서 슈퍼볼을\n하나 덤으로 드릴게요!');
    }
  }
}

async function sell() {
  for (;;) {
    const ids = (Object.keys(G.save.bag) as ItemId[]).filter((id) => ITEMS[id].pocket !== 'key' && ITEMS[id].price > 0);
    if (!ids.length) {
      await say('팔 수 있는 물건이 없습니다.');
      return;
    }
    const id = await openOverlay<ItemId | null>((done) => <ItemList ids={ids} price={(i) => ITEMS[i].price / 2} count onDone={done} />);
    if (!id) return;
    const it = ITEMS[id];
    const n = await askQuantity(G.save.bag[id] ?? 0, it.price / 2);
    if (!n) continue;
    if (!(await yesNo(`${(n * it.price) / 2}원에\n사겠습니다. 괜찮으세요?`))) continue;
    G.removeItem(id, n);
    G.save.money += (n * it.price) / 2;
  }
}

function ItemList({ ids, price, count, onDone }: { ids: ItemId[]; price: (id: ItemId) => number; count?: boolean; onDone: (id: ItemId | null) => void }) {
  const [cur, setCur] = useState(0);
  return (
    <div className="panel mart">
      <Frame className="money-box">
        소지금 <b>{G.save.money.toLocaleString()}원</b>
      </Frame>
      <Frame className="mart-list">
        <Menu
          items={[
            ...ids.map((id) => ({
              label: (
                <span className="item-row">
                  <span className="grow">{ITEMS[id].name}</span>
                  {count && <span className="cnt">×{G.save.bag[id]}</span>}
                  <span>{price(id).toLocaleString()}원</span>
                </span>
              ),
            })),
            '그만두기',
          ]}
          onMove={setCur}
          onSelect={(k) => onDone(k === ids.length ? null : ids[k])}
          onCancel={() => onDone(null)}
          visible={7}
        />
      </Frame>
      <Frame className="mart-desc">{ids[cur] ? ITEMS[ids[cur]].desc : ''}</Frame>
    </div>
  );
}
