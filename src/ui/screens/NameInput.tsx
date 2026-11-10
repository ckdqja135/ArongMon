import { useEffect, useRef, useState } from 'react';
import { openOverlay } from '../overlay';
import { Frame } from '../widgets';

/** 이름 입력 (한글 IME를 쓰려고 실제 input 사용). 취소하면 기본값 */
export const askName = (title: string, def: string) => openOverlay<string>((done) => <NameInput title={title} def={def} onDone={done} />);

function NameInput({ title, def, onDone }: { title: string; def: string; onDone: (s: string) => void }) {
  const [v, setV] = useState(def);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <div className="panel name-input">
      <Frame className="name-box">
        <div className="panel-title">{title}</div>
        <input
          ref={ref}
          value={v}
          maxLength={6}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) onDone(v.trim() || def);
            if (e.key === 'Escape') onDone(def);
          }}
          onBlur={() => ref.current?.focus()}
        />
        <div className="small">최대 6글자 · Enter 결정</div>
      </Frame>
    </div>
  );
}
