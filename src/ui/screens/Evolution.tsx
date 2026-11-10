import { useEffect, useState } from 'react';
import { isShiny, monName, type Mon } from '../../battle/mon';
import { SPECIES } from '../../data/species';
import { josa } from '../../engine/josa';
import { useButtons } from '../../engine/input';
import { sfx } from '../../engine/sound';
import { DialogText } from '../dialog';
import { MonImg } from '../widgets';

type Phase = 'intro' | 'anim' | 'done' | 'stop';

/** 진화 연출. B를 누르면 멈춘다 */
export function EvolutionScreen({ mon, to, onDone }: { mon: Mon; to: string; onDone: (ok: boolean) => void }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [showNew, setShowNew] = useState(false);
  const from = mon.species;
  const shiny = isShiny(mon);
  const name = monName(mon);
  const sameName = SPECIES[from].name === SPECIES[to].name;

  useEffect(() => {
    if (phase !== 'anim') return;
    let t = 0;
    let delay = 420;
    let alive = true;
    let flag = false;
    const step = () => {
      if (!alive) return;
      flag = !flag;
      setShowNew(flag);
      t += delay;
      delay = Math.max(60, delay * 0.86);
      if (t > 4200) {
        setShowNew(true);
        sfx('evolve');
        setPhase('done');
        return;
      }
      setTimeout(step, delay);
    };
    const h = setTimeout(step, delay);
    return () => {
      alive = false;
      clearTimeout(h);
    };
  }, [phase]);

  useButtons((b) => {
    if (b === 'b' && phase === 'anim') {
      setShowNew(false);
      setPhase('stop');
    }
  }, phase === 'anim');

  const species = showNew ? to : from;
  const doneText = sameName
    ? `축하합니다! ${josa(name, '이/가')}\n${josa(SPECIES[to].category, '으로/로')} 쑥쑥 자랐다!`
    : `축하합니다! ${josa(name, '은/는')}\n${josa(SPECIES[to].name, '으로/로')} 진화했다!`;
  return (
    <div className="panel evolution">
      <div className={`evo-stage${phase === 'anim' ? ' glowing' : ''}`}>
        <MonImg species={species} view="front" shiny={shiny} className={phase === 'anim' ? 'silhouette' : ''} />
      </div>
      {phase === 'intro' && <DialogText key="i" text={`어라...!?\n${name}의 모습이...!`} onDone={() => setPhase('anim')} />}
      {phase === 'anim' && <DialogText key="a" text={`어라...!?\n${name}의 모습이...!`} />}
      {phase === 'done' && <DialogText key="d" text={doneText} onDone={() => onDone(true)} />}
      {phase === 'stop' && <DialogText key="s" text={`어라...?\n${name}의 변화가 멈췄다!`} onDone={() => onDone(false)} />}
    </div>
  );
}
