import { useEffect, useRef, useState } from 'react';
import type { PlayerAction } from '../../battle/engine';
import { STATUS_SHORT, calcStats, expForLevel, isShiny, monName, spec, type Mon, type MoveSlot } from '../../battle/mon';
import type { BattleSession, SideView } from '../../battle/session';
import { MOVES, type MoveData } from '../../data/moves';
import { SPECIES } from '../../data/species';
import { effectiveness, type Type } from '../../data/types';
import { josa } from '../../engine/josa';
import { useStore } from '../../engine/store';
import { useButtons } from '../../engine/input';
import { G, PARTY_MAX } from '../../game/game';
import { timeOfDay } from '../../game/world';
import type { CharBase } from '../../gfx/charArt';
import type { BattleTerrain, BattleTime } from '../../gfx/battleBg';
import type { BallId } from '../../gfx/ballArt';
import { ballCanvas, battleBgCanvas, charCanvas, paint, platformCanvas, smallBallCanvas } from '../../gfx/sprites';
import type { CharPalName } from '../../gfx/palettes';
import { openBag } from '../screens/BagScreen';
import { openParty } from '../screens/PartyScreen';
import { Frame, GenderMark, HpBar, Menu, MonImg, TextBox, TypeTag } from '../widgets';

export function BattleScreen({ session }: { session: BattleSession }) {
  const s = useStore(session.store);
  const [player, enemy] = s.sides;
  const terrain = s.terrain ?? terrainHere();
  // 급소/효과 굉장: 화면 전체가 흔들린다
  const quake = s.sides.some((v) => v.anim === 'hitBig');
  return (
    <div className={`battle${s.outro ? ' outro' : ''}${quake ? ' quake' : ''}`}>
      <Backdrop terrain={terrain} time={battleTime()} />
      {s.trainer && s.trainerVisible && <TrainerSprite base={s.trainer.sprite.base} pal={s.trainer.sprite.pal as CharPalName} />}
      <BattlerSprite side={enemy} view="front" className="enemy-sprite" ball={(s.ball ?? 'capsule') as BallId} />
      <BattlerSprite side={player} view="back" className="player-sprite" />
      {enemy.visible && enemy.mon && <EnemyHud side={enemy} wild={s.kind === 'wild'} />}
      {enemy.visible && enemy.mon && s.kind === 'trainer' && <PartyBalls party={s.enemyParty} className="enemy-balls" />}
      {player.visible && player.mon && <PlayerHud side={player} />}
      <div className="battle-bottom">
        {s.prompt ? (
          <ActionMenu
            key={s.prompt.mon.uid + s.tick}
            mon={s.prompt.mon}
            moves={s.prompt.moves}
            trainer={s.kind === 'trainer'}
            foe={enemy.mon ? SPECIES[enemy.form ?? enemy.mon.species].types : null}
            resolve={s.prompt.resolve}
          />
        ) : s.message ? (
          <TextBox key={s.message.key} text={s.message.text} onDone={() => session.messageDone()} auto={1000} width={232} className="textbox battle-text" />
        ) : (
          <div className="textbox battle-text" />
        )}
      </div>
      {s.levelStats && <LevelStats {...s.levelStats} />}
      {s.intro && <div className="battle-intro" />}
    </div>
  );
}

/** 지금 있는 곳의 배틀 배경: 물 위면 물, 바깥이면 들판, 동굴 바닥이 있으면 동굴, 그 밖은 실내 */
function terrainHere(): BattleTerrain {
  const w = G.world;
  if (w.surfing) return 'water';
  if (w.map.outdoor) return 'field';
  return w.map.tiles.some((r) => r.includes(';')) ? 'cave' : 'indoor';
}

/** 배틀 배경의 시간: 오후 5~8시는 노을 */
function battleTime(): BattleTime {
  const h = new Date().getHours();
  return h >= 17 && h < 20 ? 'evening' : timeOfDay();
}

const PF = { enemy: [120, 30], player: [152, 40] } as const;

function Backdrop({ terrain, time }: { terrain: BattleTerrain; time: BattleTime }) {
  const bg = useRef<HTMLCanvasElement>(null);
  const ep = useRef<HTMLCanvasElement>(null);
  const pp = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    paint(bg.current, battleBgCanvas(terrain, time));
    paint(ep.current, platformCanvas(terrain, time, ...PF.enemy));
    paint(pp.current, platformCanvas(terrain, time, ...PF.player));
  }, [terrain, time]);
  return (
    <>
      <canvas ref={bg} className="pix battle-bg" />
      <canvas ref={ep} className="pix platform enemy-pf" />
      <canvas ref={pp} className="pix platform player-pf" />
    </>
  );
}

function BattlerSprite({ side, view, className, ball = 'capsule' }: { side: SideView; view: 'front' | 'back'; className: string; ball?: BallId }) {
  const m = side.mon;
  const ballAnim = ['throw', 'shake', 'caught'].includes(side.anim);
  return (
    <>
      {m && side.visible && !ballAnim && (
        <div key={side.animKey} className={`battler ${className} anim-${side.anim}`}>
          <MonImg species={side.form ?? m.species} view={view} shiny={isShiny(m)} />
          {side.anim === 'shiny' && <span className="sparkle">✦</span>}
          {(side.anim === 'hit' || side.anim === 'hitBig') && side.fx && <span className={`fx fx-${side.fx}${side.anim === 'hitBig' ? ' big' : ''}`} />}
        </div>
      )}
      {view === 'front' && ballAnim && (
        <div key={side.animKey} className={`ball-anim anim-${side.anim}`}>
          <PixCanvas src={ballCanvas(ball)} className="ball-img" />
        </div>
      )}
    </>
  );
}

/** 미리 만든 도트 그림 하나를 그대로 보여 준다 */
function PixCanvas({ src, className }: { src: HTMLCanvasElement; className: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => paint(ref.current, src), [src]);
  return <canvas ref={ref} className={`pix ${className}`} />;
}

function TrainerSprite({ base, pal }: { base: CharBase; pal: CharPalName }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => paint(ref.current, charCanvas(base, pal, 'down', 0)), [base, pal]);
  return <canvas ref={ref} className="pix trainer-sprite" />;
}

function StatusTag({ mon }: { mon: Mon }) {
  if (mon.hp <= 0) return <span className="status fnt">기절</span>;
  return mon.status ? <span className={`status ${mon.status}`}>{STATUS_SHORT[mon.status]}</span> : null;
}

function EnemyHud({ side, wild }: { side: SideView; wild: boolean }) {
  const m = side.mon!;
  const max = calcStats(m).hp;
  const caught = wild && G.save.caught.includes(m.species);
  return (
    <div className="hud enemy-hud">
      <div className="hud-row">
        <span className="hud-name">{monName(m)}</span>
        <GenderMark mon={m} />
        {caught && <span className="caught-mark" title="잡은 적 있음">●</span>}
        <span className="hud-lv">Lv{m.level}</span>
      </div>
      <div className="hud-row">
        <StatusTag mon={m} />
        <HpBar hp={side.hp} max={max} width={56} />
      </div>
    </div>
  );
}

function PlayerHud({ side }: { side: SideView }) {
  const m = side.mon!;
  const max = calcStats(m).hp;
  const g = spec(m).growth;
  const base = expForLevel(g, m.level);
  const next = expForLevel(g, m.level + 1);
  const frac = m.level >= 100 ? 0 : Math.max(0, Math.min(1, (side.exp - base) / (next - base)));
  return (
    <div className="hud player-hud">
      <div className="hud-row">
        <span className="hud-name">{monName(m)}</span>
        <GenderMark mon={m} />
        <span className="hud-lv">Lv{m.level}</span>
      </div>
      <div className="hud-row">
        <StatusTag mon={m} />
        <HpBar hp={side.hp} max={max} width={56} />
      </div>
      <div className="hud-hp">
        <PartyBalls party={G.save.party} className="player-balls" />
        <span>
          {Math.ceil(side.hp)}/{max}
        </span>
      </div>
      <div className="hud-exp">
        <div style={{ width: `${frac * 100}%` }} />
      </div>
    </div>
  );
}

/** 가진 몬스터 수: 싸울 수 있으면 볼, 기절했으면 회색 볼, 빈 자리는 작은 점 */
function PartyBalls({ party, className }: { party: Mon[]; className: string }) {
  return (
    <div className={`party-balls ${className}`}>
      {Array.from({ length: PARTY_MAX }, (_, i) => {
        const m = party[i];
        return m ? <PixCanvas key={i} src={smallBallCanvas(m.hp <= 0)} className="ball" /> : <span key={i} className="ball none" />;
      })}
    </div>
  );
}

/** 상대 타입에 대한 효과: 좋음 / 보통 / 나쁨 / 없음. 변화 기술은 상태 이상이 안 통할 때만 '없음' */
function effectLabel(mv: MoveData, foe: readonly Type[] | null): { label: string; cls: string } | null {
  if (!foe) return null;
  const e = effectiveness(mv.type, foe);
  if (mv.power === 0) return mv.status && e === 0 ? { label: '효과 없음', cls: 'none' } : null;
  if (e === 0) return { label: '효과 없음', cls: 'none' };
  if (e > 1) return { label: '효과 좋음', cls: 'good' };
  if (e < 1) return { label: '효과 나쁨', cls: 'bad' };
  return { label: '효과 보통', cls: 'normal' };
}

function ActionMenu({ mon, moves, trainer, foe, resolve }: { mon: Mon; moves: MoveSlot[]; trainer: boolean; foe: readonly Type[] | null; resolve: (a: PlayerAction) => void }) {
  const [mode, setMode] = useState<'main' | 'moves'>('main');
  const [busy, setBusy] = useState(false);
  const [cur, setCur] = useState(0);
  const [warn, setWarn] = useState<string | null>(null);

  const onMain = async (k: number) => {
    if (k === 0) {
      if (moves.every((s) => s.pp <= 0)) resolve({ kind: 'fight', move: -1 });
      else setMode('moves');
    } else if (k === 1) {
      setBusy(true);
      const r = await openBag('battle', trainer);
      setBusy(false);
      if (r) resolve({ kind: 'item', item: r.item, target: r.target });
    } else if (k === 2) {
      setBusy(true);
      const idx = await openParty({ mode: 'battle', active: mon });
      setBusy(false);
      if (idx !== null) resolve({ kind: 'switch', index: idx });
    } else resolve({ kind: 'run' });
  };

  if (mode === 'moves') {
    const mv = moves[cur] ? MOVES[moves[cur].id] : null;
    return (
      <div className="move-select">
        <Frame className="move-list">
          <Menu
            columns={2}
            visible={2}
            items={moves.map((s) => ({
              label: (
                <span className={`${s.pp <= 0 ? 'nopp' : ''}${MOVES[s.id].name.length >= 5 ? ' long' : ''}${MOVES[s.id].name.length >= 6 ? ' xlong' : ''}`}>
                  {MOVES[s.id].name}
                </span>
              ),
            }))}
            onMove={setCur}
            onSelect={(k) => (moves[k].pp <= 0 ? setWarn('기술의 남은 포인트가 없다!') : resolve({ kind: 'fight', move: k }))}
            onCancel={() => setMode('main')}
            active={!warn}
          />
        </Frame>
        <Frame className="move-info">
          {warn ? (
            <WarnLine text={warn} onDone={() => setWarn(null)} />
          ) : (
            mv && (
              <>
                <div className="mi-row">
                  <TypeTag type={mv.type} />
                  <span>
                    PP {moves[cur].pp}/{mv.pp}
                  </span>
                </div>
                <div className="mi-row">
                  <span>{mv.power === 0 ? '변화 기술' : `위력 ${mv.power > 1 ? mv.power : '-'}`}</span>
                  {(() => {
                    const e = effectLabel(mv, foe);
                    return e && <span className={`eff ${e.cls}`}>{e.label}</span>;
                  })()}
                </div>
                <div className="mi-desc">{mv.desc}</div>
              </>
            )
          )}
        </Frame>
      </div>
    );
  }
  return (
    <div className="action-select">
      <div className="textbox battle-text action-text">
        <div className="line">{josa(monName(mon), '은/는')}</div>
        <div className="line">무엇을 할까?</div>
      </div>
      <Frame className="action-menu">
        <Menu columns={2} items={['싸운다', '가방', '포켓몬', '도망간다']} onSelect={onMain} active={!busy} />
      </Frame>
    </div>
  );
}

function WarnLine({ text, onDone }: { text: string; onDone: () => void }) {
  useButtons((b) => (b === 'a' || b === 'b') && onDone());
  return <div className="small">{text}</div>;
}

function LevelStats({ mon, before, after, resolve }: { mon: Mon; before: ReturnType<typeof calcStats>; after: ReturnType<typeof calcStats>; resolve: () => void }) {
  const [page, setPage] = useState(0);
  useButtons((b) => {
    if (b !== 'a' && b !== 'b') return;
    if (page === 0) setPage(1);
    else resolve();
  });
  const rows: [string, keyof typeof after][] = [['최대HP', 'hp'], ['공격', 'atk'], ['방어', 'def'], ['특수공격', 'spa'], ['특수방어', 'spd'], ['스피드', 'spe']];
  return (
    <Frame className="level-stats">
      <div className="small">{monName(mon)}</div>
      {rows.map(([n, k]) => (
        <div key={k} className="row">
          <span className="grow">{n}</span>
          <span>{page === 0 ? `+${after[k] - before[k]}` : after[k]}</span>
        </div>
      ))}
    </Frame>
  );
}
