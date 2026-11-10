import { useEffect, useRef, useState } from 'react';
import { playMusic } from '../engine/sound';
import { useButtons } from '../engine/input';
import { G } from '../game/game';
import { hasSave } from '../game/save';
import { say } from './dialog';
import { openOverlay } from './overlay';
import { askName } from './screens/NameInput';
import { openSlots } from './screens/SlotScreen';
import { Frame, Menu, MonImg } from './widgets';

export function Title() {
  useEffect(() => playMusic('title'), []);
  const [stage, setStage] = useState<'press' | 'menu'>('press');
  const saved = hasSave();
  useButtons((b) => (b === 'a' || b === 'start') && setStage('menu'), stage === 'press');

  const start = async (k: number) => {
    const items = saved ? ['continue', 'new'] : ['new'];
    if (items[k] === 'continue') {
      const slot = await openSlots('load');
      if (slot !== null) G.continueGame(slot);
      return;
    }
    await openOverlay<void>((done) => <Intro onDone={done} />);
  };

  return (
    <div className="title">
      <div className="title-sky" />
      <div className="logo">
        <span className="logo-main">아롱몬</span>
        <span className="logo-sub">ALONGMON</span>
      </div>
      <div className="title-mons">
        <MonImg species="arong3" view="front" className="title-arong" />
      </div>
      {stage === 'press' ? (
        <div className="press-start">PRESS START</div>
      ) : (
        <Frame className="title-menu">
          <Menu items={saved ? ['이어서 하기', '처음부터 하기'] : ['처음부터 하기']} onSelect={start} onCancel={() => setStage('press')} />
        </Frame>
      )}
    </div>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      await say('안녕! 몬스터의 세계에\n잘 왔단다!');
      await say('나는 느티. 사람들은 나를\n느티 박사라고 부르지.');
      await say('이 세계에는 몬스터라 불리는\n신기한 생물들이 살고 있단다.');
      await say('사람과 몬스터는 함께 놀고,\n함께 싸우며, 서로 도우며 살지.');
      await say('그럼 너에 대해 알려 주겠니?\n이름이 뭐니?');
      const name = await askName('너의 이름은?', '아롱');
      await say(`${name}! 좋은 이름이구나.`);
      await say('너와 아롱이의 이야기가\n지금 시작된다!');
      await say('몬스터의 세계로\n출발!');
      onDone();
      G.startNew(name);
    })();
  }, [onDone]);
  return (
    <div className="panel intro">
      <MonImg species="arong" view="front" className="intro-mon" />
    </div>
  );
}
