import { canFight, monName, type Mon } from '../../battle/mon';
import { josa } from '../../engine/josa';
import { G, PARTY_MAX } from '../../game/game';
import { ask, say } from '../dialog';
import { openOverlay } from '../overlay';
import { Frame, Menu, MonIcon } from '../widgets';
import { openParty } from './PartyScreen';

export async function openPC() {
  await say(`${josa(G.player, '은/는')} PC의\n스위치를 켰다!`);
  for (;;) {
    const c = await ask('포켓몬 보관 시스템에\n접속했습니다.', ['포켓몬 맡기기', '포켓몬 꺼내기', '로그아웃'], 2);
    if (c === 0) await deposit();
    else if (c === 1) await withdraw();
    else break;
  }
}

async function deposit() {
  const party = G.save.party;
  if (party.length <= 1) {
    await say('마지막 포켓몬은\n맡길 수 없습니다!');
    return;
  }
  const i = await openParty({ mode: 'select', title: '어느 포켓몬을 맡길까?' });
  if (i === null) return;
  const m = party[i];
  if (party.filter((p, k) => k !== i && canFight(p)).length === 0) {
    await say('싸울 수 있는 포켓몬이\n남지 않게 됩니다!');
    return;
  }
  party.splice(i, 1);
  G.save.box.push(m);
  await say(`${josa(monName(m), '을/를')}\n박스에 맡겼다.`);
}

async function withdraw() {
  const box = G.save.box;
  if (!box.length) {
    await say('박스에 포켓몬이 없습니다.');
    return;
  }
  if (G.save.party.length >= PARTY_MAX) {
    await say('파티가 가득 찼습니다!');
    return;
  }
  const i = await openOverlay<number | null>((done) => <BoxList box={box} onDone={done} />);
  if (i === null) return;
  const [m] = box.splice(i, 1);
  G.save.party.push(m);
  await say(`${josa(monName(m), '을/를')}\n데리고 왔다.`);
}

function BoxList({ box, onDone }: { box: Mon[]; onDone: (i: number | null) => void }) {
  return (
    <div className="panel">
      <div className="panel-title">박스 ({box.length})</div>
      <Frame style={{ left: 8, top: 30, width: 240, height: 152 }}>
        <Menu
          items={box.map((m) => ({
            label: (
              <span className="item-row">
                <MonIcon mon={m} />
                <span className="grow">{monName(m)}</span>
                <span>Lv{m.level}</span>
              </span>
            ),
          }))}
          onSelect={onDone}
          onCancel={() => onDone(null)}
          visible={4}
        />
      </Frame>
    </div>
  );
}
