import { G } from '../../game/game';
import { openOverlay } from '../overlay';
import { Frame, Menu } from '../widgets';

/** 포켓기어 전화: 걸 사람을 고른다. 고른 연락처 id, 닫으면 null */
export const openPhone = () => openOverlay<string | null>((done) => <PhoneScreen onDone={done} />);

function PhoneScreen({ onDone }: { onDone: (id: string | null) => void }) {
  const list = G.phoneContacts();
  return (
    <div className="panel phone">
      <div className="panel-title">포켓기어 · 전화</div>
      <Frame className="phone-list">
        <Menu
          items={[
            ...list.map((c) => ({
              label: (
                <span className="item-row">
                  <span className="grow">{c.name}</span>
                  <span className="small">{c.place}</span>
                </span>
              ),
            })),
            '닫기',
          ]}
          visible={7}
          onSelect={(k) => onDone(k < list.length ? list[k].id : null)}
          onCancel={() => onDone(null)}
        />
      </Frame>
    </div>
  );
}
