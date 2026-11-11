import { useEffect, useState } from 'react';
import { isShiny, type Mon } from '../../battle/mon';
import { useButtons } from '../../engine/input';
import { sfx } from '../../engine/sound';
import { EggImg, MonImg } from '../widgets';

/** 알이 흔들리다가 깨지고 포켓몬이 나온다. 다 나오면 A로 닫는다 */
export function HatchScreen({ mon, onDone }: { mon: Mon; onDone: () => void }) {
  const [phase, setPhase] = useState<'shake' | 'flash' | 'born'>('shake');
  useEffect(() => {
    const a = setTimeout(() => setPhase('flash'), 2600);
    const b = setTimeout(() => {
      setPhase('born');
      sfx('evolve');
    }, 3100);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  useButtons((b) => b === 'a' && onDone(), phase === 'born');
  return (
    <div className="panel evolution hatch">
      <div className={`evo-stage${phase === 'born' ? '' : ' glowing'}`}>
        {phase === 'born' ? <MonImg species={mon.species} view="front" shiny={isShiny(mon)} /> : <EggImg view="front" className={phase === 'shake' ? 'egg-shake' : 'egg-flash'} />}
      </div>
    </div>
  );
}
