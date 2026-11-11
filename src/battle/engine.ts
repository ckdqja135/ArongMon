// 2세대 규칙 배틀 진행. 화면은 BattleIO를 통해서만 다룬다.
import { itemData, type ItemId } from '../data/items';
import { MOVES, CONFUSION_HIT, type MajorStatus, type MoveData, type MoveId, type StatKey } from '../data/moves';
import { SPECIES } from '../data/species';
import { effectiveness, isSpecial, type Type } from '../data/types';
import { josa } from '../engine/josa';
import type { BattleTerrain } from '../gfx/battleBg';
import type { CharBase } from '../gfx/charArt';
import { chance, pick, rand, randInt } from '../engine/rng';
import { useItemOn } from './itemUse';
import { learnMoves, pickMoves } from './learn';
import {
  STAT_NAME, calcStats, expForLevel, monName, movesLearnedAt, picksAtLevel, setLevel, spec, type Mon, type MoveSlot, type Stats,
} from './mon';

export type SideId = 0 | 1;
export type AnimKind =
  | 'enter' | 'withdraw' | 'attack' | 'cast' | 'hit' | 'hitBig' | 'faint' | 'statUp' | 'statDown' | 'status'
  | 'throw' | 'shake' | 'caught' | 'breakout' | 'shiny' | 'trainerOut';

export type PlayerAction =
  | { kind: 'fight'; move: number }
  | { kind: 'item'; item: ItemId; target?: number }
  | { kind: 'switch'; index: number }
  | { kind: 'run' };

export interface TrainerInfo {
  className: string;
  name: string;
  prize: number;
  sprite: { base: CharBase; pal: string };
  /** 졌을 때 대사 */
  lose?: string;
}

export interface BattleOpts {
  kind: 'wild' | 'trainer';
  enemy: Mon[];
  trainer?: TrainerInfo;
  /** 배틀 배경 (없으면 지금 있는 곳으로 정한다. 낚시는 물) */
  terrain?: BattleTerrain;
}

export interface BattleResult {
  outcome: 'win' | 'lose' | 'run' | 'caught';
  /** 이번 배틀에서 레벨이 오른 몬스터 (진화 확인용) */
  leveled: Mon[];
  prize: number;
}

export interface BattleIO {
  message(text: string): Promise<void>;
  refresh(): void;
  setActive(side: SideId, mon: Mon | null): void;
  /** 던지는 볼 종류 (던지는 연출에 쓴다) */
  throwing?(ball: ItemId): void;
  /** 변신: 겉모습을 species로 바꾼다 (null이면 원래대로) */
  transform?(side: SideId, species: string | null): void;
  /** type: 맞았을 때 터지는 이펙트 색 */
  anim(side: SideId, kind: AnimKind, type?: Type): Promise<void>;
  hp(side: SideId, to: number): Promise<void>;
  exp(mon: Mon, to: number): Promise<void>;
  /** moves: 지금 쓸 수 있는 기술 (변신 중이면 따라 한 기술) */
  chooseAction(mon: Mon, moves: MoveSlot[]): Promise<PlayerAction>;
  /** forced=false면 취소 시 -1 */
  chooseSwitch(forced: boolean): Promise<number>;
  chooseForget(mon: Mon, newMove: MoveId): Promise<number | null>;
  chooseMove(mon: Mon, options: MoveId[]): Promise<MoveId>;
  yesNo(text: string): Promise<boolean>;
  showLevelStats(mon: Mon, before: Stats): Promise<void>;
  /** 상대를 모두 쓰러뜨렸을 때 (승리 음악) */
  victory?(): void;
}

export interface BattleCtx {
  playerName: string;
  party: Mon[];
  bag: Partial<Record<ItemId, number>>;
  onSeen(species: string): void;
  /** 잡은 몬스터를 보관하고 안내 문구를 돌려준다 */
  onCaught(mon: Mon): Promise<void>;
}

interface Side {
  id: SideId;
  party: Mon[];
  active: number;
  stages: Record<StatKey, number>;
  confused: number;
  flinch: boolean;
  /** 움찔해서 행동하지 못하는 남은 턴 */
  startled: number;
  /** 변신한 모습: 종족(겉모습·타입), HP를 뺀 능력치, 5PP씩 받은 기술. 교체하거나 배틀이 끝나면 풀린다 */
  form: { species: string; stats: Stats; moves: MoveSlot[] } | null;
}

const STRUGGLE: MoveData = { name: '발버둥', type: 'normal', power: 50, acc: 0, pp: 1, recoil: 1 / 4, desc: '' };
const ACC_MULT: Record<number, number> = {
  [-6]: 0.33, [-5]: 0.36, [-4]: 0.43, [-3]: 0.5, [-2]: 0.6, [-1]: 0.75, 0: 1,
  1: 1.33, 2: 1.66, 3: 2, 4: 2.33, 5: 2.66, 6: 3,
};
const CRIT_RATE = [17, 32, 64, 85, 128];
const stageMult = (n: number) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
const freshStages = (): Record<StatKey, number> => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export async function runBattle(o: BattleOpts, ctx: BattleCtx, io: BattleIO): Promise<BattleResult> {
  const P: Side = { id: 0, party: ctx.party, active: Math.max(0, ctx.party.findIndex((m) => m.hp > 0)), stages: freshStages(), confused: 0, flinch: false, startled: 0, form: null };
  const E: Side = { id: 1, party: o.enemy, active: 0, stages: freshStages(), confused: 0, flinch: false, startled: 0, form: null };
  const wild = o.kind === 'wild';
  const leveled = new Set<Mon>();
  let participants = new Set<number>([P.active]);
  let runAttempts = 0;

  const act = (s: Side) => s.party[s.active];
  const other = (s: Side) => (s === P ? E : P);
  // 변신 중이면 HP만 자기 것이고 능력치·타입·기술은 따라 한 몬스터의 것
  const statsOf = (s: Side): Stats => (s.form ? { ...s.form.stats, hp: calcStats(act(s)).hp } : calcStats(act(s)));
  const typesOf = (s: Side): readonly Type[] => SPECIES[s.form?.species ?? act(s).species].types;
  const movesOf = (s: Side) => s.form?.moves ?? act(s).moves;
  /** 지닌 도구의 효과 */
  const held = (s: Side) => {
    const id = act(s).item;
    return id ? itemData(id).hold : undefined;
  };
  const label = (s: Side) => (s === P ? monName(act(s)) : `${wild ? '야생' : '상대'} ${monName(act(s))}`);
  const lj = (s: Side, pair: string) => josa(label(s), pair);
  const say = (t: string) => io.message(t);
  const result = (outcome: BattleResult['outcome']): BattleResult => ({
    outcome,
    leveled: [...leveled],
    prize: outcome === 'win' && o.trainer ? o.trainer.prize : 0,
  });

  // ── 등장 ──
  if (o.trainer) {
    io.setActive(1, null);
    await say(`${o.trainer.className} ${josa(o.trainer.name, '이/가')}\n승부를 걸어왔다!`);
    await io.anim(1, 'trainerOut');
    await sendOutEnemy(0);
  } else {
    io.setActive(1, act(E));
    await say(`앗! 야생 ${josa(monName(act(E)), '이/가')}\n튀어나왔다!`);
    ctx.onSeen(act(E).species);
  }
  await sendOutPlayer(P.active);

  // ── 턴 반복 ──
  for (;;) {
    const action = await io.chooseAction(act(P), movesOf(P));
    let playerMove: number | null = null;

    if (action.kind === 'run') {
      if (!wild) {
        await say('안 돼! 트레이너와의 승부에서는\n도망칠 수 없다!');
        continue;
      }
      runAttempts++;
      if (canEscape()) {
        await say('무사히 도망쳤다!');
        return result('run');
      }
      await say('도망칠 수 없다!');
    } else if (action.kind === 'item') {
      const it = itemData(action.item);
      ctx.bag[action.item] = (ctx.bag[action.item] ?? 1) - 1;
      if (!ctx.bag[action.item]) delete ctx.bag[action.item];
      if (it.ball) {
        if (!wild) {
          await say(`${josa(ctx.playerName, '은/는')} ${josa(it.name, '을/를')}\n던졌다!`);
          await say('트레이너가 볼을 쳐냈다!\n남의 몬스터는 잡을 수 없다!');
        } else if (await throwBall(it.ball, it.name, action.item)) {
          return result('caught');
        }
      } else {
        const target = ctx.party[action.target ?? P.active];
        await say(`${josa(ctx.playerName, '은/는')} ${josa(it.name, '을/를')}\n사용했다!`);
        const r = useItemOn(target, action.item);
        if (target === act(P) && r.hpTo !== undefined) await io.hp(0, r.hpTo);
        io.refresh();
        await say(r.message);
      }
    } else if (action.kind === 'switch') {
      await switchPlayer(action.index);
    } else {
      playerMove = action.move;
    }

    const enemyMove = chooseEnemyMove();
    const order: [Side, number][] = [];
    if (playerMove !== null) {
      const pFirst = goesFirst(P, playerMove, E, enemyMove);
      order.push(...((pFirst ? [[P, playerMove], [E, enemyMove]] : [[E, enemyMove], [P, playerMove]]) as [Side, number][]));
    } else {
      order.push([E, enemyMove]);
    }

    let ended: BattleResult | null = null;
    const startP = act(P), startE = act(E);
    const changed = () => act(P) !== startP || act(E) !== startE;
    for (let i = 0; i < order.length; i++) {
      const [s, mv] = order[i];
      if (changed() || act(s).hp <= 0 || act(other(s)).hp <= 0) continue;
      await useMove(s, mv, i === 0);
      await eatBerry(P);
      await eatBerry(E);
      ended = await handleFaints();
      if (ended) return ended;
    }

    // 턴 종료: 화상/독 데미지, 해동
    const residualOrder = order.length === 2 ? order.map(([s]) => s) : [P, E];
    for (const s of residualOrder) {
      const m = act(s);
      if (m.hp <= 0) continue;
      if (m.status === 'brn' || m.status === 'psn') {
        await say(`${lj(s, '은/는')} ${m.status === 'brn' ? '화상' : '독'} 데미지를\n입고 있다!`);
        await damage(s, Math.max(1, Math.floor(statsOf(s).hp / 8)));
      } else if (m.status === 'frz' && rand(256) < 25) {
        m.status = null;
        io.refresh();
        await say(`${label(s)}의 얼음이 녹았다!`);
      }
      const max = statsOf(s).hp;
      if (held(s)?.kind === 'leftovers' && m.hp > 0 && m.hp < max) {
        await heal(s, Math.max(1, Math.floor(max / 16)));
        await say(`${lj(s, '은/는')} 먹다남은음식으로\n조금 회복했다!`);
      }
      await eatBerry(s);
    }
    P.flinch = E.flinch = false;
    ended = await handleFaints();
    if (ended) return ended;
  }

  // ── 내보내기/교체 ──
  async function sendOutPlayer(idx: number) {
    P.active = idx;
    participants.add(idx);
    await say(`가랏! ${monName(act(P))}!`);
    io.setActive(0, act(P));
    await io.anim(0, 'enter');
  }

  /** 물러나면 능력 변화·혼란·움찔·변신이 모두 풀린다 */
  function resetVolatile(S: Side) {
    S.stages = freshStages();
    S.confused = 0;
    S.startled = 0;
    if (S.form) {
      S.form = null;
      io.transform?.(S.id, null);
    }
  }

  async function sendOutEnemy(idx: number) {
    resetVolatile(E);
    E.active = idx;
    await say(`${josa(o.trainer!.name, '은/는')}\n${josa(monName(act(E)), '을/를')} 내보냈다!`);
    io.setActive(1, act(E));
    await io.anim(1, 'enter');
    ctx.onSeen(act(E).species);
  }

  async function switchPlayer(idx: number) {
    await say(`${monName(act(P))}, 돌아와!`);
    await io.anim(0, 'withdraw');
    resetVolatile(P);
    await sendOutPlayer(idx);
  }

  // ── 기술 사용 ──
  async function useMove(A: Side, moveIdx: number, movedFirst: boolean) {
    const D = other(A);
    const a = act(A);
    const d = act(D);

    if (a.status === 'slp') {
      a.sleepTurns--;
      if (a.sleepTurns <= 0) {
        a.status = null;
        io.refresh();
        await say(`${lj(A, '은/는')} 눈을 떴다!`);
      } else {
        await say(`${lj(A, '은/는')} 쿨쿨 잠들어 있다.`);
      }
      return;
    }
    if (a.status === 'frz') {
      await say(`${lj(A, '은/는')} 얼어붙어서\n움직일 수 없다!`);
      return;
    }
    if (A.startled > 0) {
      A.startled--;
      await say(`${lj(A, '은/는')} 움찔해서\n움직일 수 없다!`);
      return;
    }
    if (A.flinch) {
      A.flinch = false;
      await say(`${lj(A, '은/는')} 풀이 죽어\n움직일 수 없다!`);
      return;
    }
    if (A.confused > 0) {
      A.confused--;
      if (A.confused === 0) {
        await say(`${label(A)}의 혼란이 풀렸다!`);
      } else {
        await say(`${lj(A, '은/는')}\n혼란에 빠져 있다!`);
        if (chance(50)) {
          await say('영문도 모른 채\n자신을 공격했다!');
          await damage(A, calcDamage(A, A, CONFUSION_HIT, false, 1, randInt(217, 255)));
          return;
        }
      }
    }
    if (a.status === 'par' && chance(25)) {
      await say(`${lj(A, '은/는')} 몸이 저려서\n움직일 수 없다!`);
      return;
    }

    const slot = moveIdx >= 0 ? movesOf(A)[moveIdx] : null;
    const move = slot ? MOVES[slot.id] : STRUGGLE;
    if (slot) slot.pp = Math.max(0, slot.pp - 1);
    else await say(`${lj(A, '은/는')} 쓸 수 있는\n기술이 없다!`);
    await say(`${label(A)}의\n${move.name}!`);

    const selfOnly = move.power === 0 && (!!move.heal || (!!move.stat && move.stat.every((s) => s.self)));
    await io.anim(A.id, move.power > 0 ? 'attack' : 'cast');
    if (!selfOnly && move.acc > 0) {
      const st = clamp(A.stages.acc - D.stages.eva, -6, 6);
      if (Math.random() * 100 >= move.acc * ACC_MULT[st]) {
        await say(`그러나 ${label(A)}의\n공격은 빗나갔다!`);
        return;
      }
    }

    if (move.power === 0) {
      await statusMove(A, D, move);
      return;
    }

    const eff = effectiveness(move.type, typesOf(D));
    if (eff === 0) {
      await say(`${label(D)}에게는 효과가\n없는 것 같다...`);
      return;
    }
    const hits = move.hits ? pick([2, 2, 2, 3, 3, 3, 4, 5]) : 1;
    let total = 0;
    let done = 0;
    for (let h = 0; h < hits; h++) {
      let dmg: number;
      let crit = false;
      if (move.fixed) {
        dmg = move.fixed === 'level' ? a.level : move.fixed;
      } else {
        const stage = clamp((move.highCrit ? 2 : 0), 0, 4);
        crit = rand(256) < CRIT_RATE[stage];
        dmg = calcDamage(A, D, move, crit, eff, randInt(217, 255));
      }
      dmg = Math.min(dmg, act(D).hp);
      // 기합의띠: 쓰러질 공격을 가끔 HP 1로 버틴다
      const endure = dmg >= act(D).hp && held(D)?.kind === 'focusband' && chance(12);
      if (endure) dmg = act(D).hp - 1;
      await damage(D, dmg, move.type, crit || eff > 1);
      total += dmg;
      done++;
      if (crit) await say('급소에 맞았다!');
      if (endure) await say(`${lj(D, '은/는')} 기합의띠로\n버텼다!`);
      if (act(D).hp <= 0) break;
    }
    if (hits > 1) await say(`${done}번 맞았다!`);
    if (!move.fixed) {
      if (eff > 1) await say('효과가 굉장했다!');
      else if (eff < 1) await say('효과가 별로인 듯하다...');
    }
    if (move.drain && total > 0 && a.hp > 0) {
      await heal(A, Math.max(1, Math.floor(total / 2)));
      await say(`${label(D)}의\n체력을 흡수했다!`);
    }
    if (move.recoil && total > 0) {
      await say(`${lj(A, '은/는')} 반동으로\n데미지를 입었다!`);
      await damage(A, Math.max(1, Math.floor(total * move.recoil)));
    }
    if (d.hp > 0 && d.status === 'frz' && move.type === 'fire') {
      d.status = null;
      io.refresh();
      await say(`${label(D)}의 얼음이 녹았다!`);
    }
    if (chance(move.chance ?? 100)) {
      if (d.hp > 0 && move.status) await inflict(D, move.status, true);
      for (const st of move.stat ?? []) {
        const target = st.self ? A : D;
        if (act(target).hp > 0) await changeStage(target, st.s, st.n, true);
      }
      if (d.hp > 0 && move.confuse && !D.confused) await confuse(D);
      if (d.hp > 0 && move.flinch && movedFirst) D.flinch = true;
    }
  }

  async function statusMove(A: Side, D: Side, move: MoveData) {
    const a = act(A);
    if (move.splash) {
      await say('그러나 아무 일도\n일어나지 않았다!');
      return;
    }
    if (move.transform) {
      if (A.form || D.form) {
        await say('그러나 실패했다!');
        return;
      }
      const d = act(D);
      // 2세대: HP를 뺀 능력치·능력 변화·타입·기술을 그대로 따라 하고, 기술은 PP 5씩
      A.form = { species: d.species, stats: statsOf(D), moves: movesOf(D).map((m) => ({ id: m.id, pp: 5 })) };
      A.stages = { ...D.stages };
      await io.anim(A.id, 'status');
      io.transform?.(A.id, d.species);
      await say(`${lj(A, '은/는')}\n${josa(monName(d), '으로/로')} 변신했다!`);
      return;
    }
    if (move.heal) {
      const max = calcStats(a).hp;
      if (a.hp >= max) await say('그러나 HP가\n가득 차 있다!');
      else {
        await heal(A, Math.floor(max * move.heal));
        await say(`${label(A)}의 HP가\n회복되었다!`);
      }
    }
    if (move.status) {
      if (effectiveness(move.type, typesOf(D)) === 0) await say(`${label(D)}에게는 효과가\n없는 것 같다...`);
      else await inflict(D, move.status, false);
    }
    for (const st of move.stat ?? []) await changeStage(st.self ? A : D, st.s, st.n, false);
    if (move.startle && act(D).hp > 0 && !D.startled && chance(move.startle.chance)) {
      D.startled = randInt(...move.startle.turns);
      await io.anim(D.id, 'status');
      await say(`${lj(D, '은/는')} 깜짝 놀라\n움찔했다!`);
    }
    if (move.confuse) {
      if (D.confused) await say('그러나 실패했다!');
      else await confuse(D);
    }
  }

  async function inflict(D: Side, st: MajorStatus, secondary: boolean) {
    const d = act(D);
    const types = typesOf(D);
    const immune =
      (st === 'brn' && types.includes('fire')) ||
      (st === 'psn' && (types.includes('poison') || types.includes('steel'))) ||
      (st === 'frz' && types.includes('ice'));
    if (d.status || immune) {
      if (!secondary) await say('그러나 실패했다!');
      return;
    }
    d.status = st;
    if (st === 'slp') d.sleepTurns = randInt(1, 6);
    io.refresh();
    await io.anim(D.id, 'status');
    const msg: Record<MajorStatus, string> = {
      brn: `${lj(D, '은/는')}\n화상을 입었다!`,
      par: `${lj(D, '은/는')} 마비되어\n기술이 나오기 어려워졌다!`,
      psn: `${lj(D, '은/는')}\n독에 걸렸다!`,
      slp: `${lj(D, '은/는')}\n잠들어 버렸다!`,
      frz: `${lj(D, '은/는')}\n얼어붙었다!`,
    };
    await say(msg[st]);
  }

  async function confuse(D: Side) {
    D.confused = randInt(2, 5);
    await io.anim(D.id, 'status');
    await say(`${lj(D, '은/는')}\n혼란에 빠졌다!`);
  }

  async function changeStage(S: Side, stat: StatKey, n: number, secondary: boolean) {
    const cur = S.stages[stat];
    const nm = STAT_NAME[stat];
    if ((n > 0 && cur >= 6) || (n < 0 && cur <= -6)) {
      if (!secondary) await say(`${label(S)}의 ${josa(nm, '은/는')}\n더 이상 ${n > 0 ? '올라가지' : '떨어지지'} 않는다!`);
      return;
    }
    S.stages[stat] = clamp(cur + n, -6, 6);
    await io.anim(S.id, n > 0 ? 'statUp' : 'statDown');
    const how = n >= 2 ? '크게 올라갔다!' : n === 1 ? '올라갔다!' : n === -1 ? '떨어졌다!' : '크게 떨어졌다!';
    await say(`${label(S)}의 ${josa(nm, '이/가')}\n${how}`);
  }

  function calcDamage(A: Side, D: Side, move: MoveData, crit: boolean, eff: number, roll: number): number {
    const a = act(A);
    const special = isSpecial(move.type);
    const as = statsOf(A), ds = statsOf(D);
    const ak = special ? 'spa' : 'atk', dk = special ? 'spd' : 'def';
    let atkStage = A.stages[ak], defStage = D.stages[dk];
    if (crit) {
      atkStage = Math.max(0, atkStage);
      defStage = Math.min(0, defStage);
    }
    let atk = Math.floor(as[ak] * stageMult(atkStage));
    let def = Math.floor(ds[dk] * stageMult(defStage));
    if (a.status === 'brn' && !special && move !== CONFUSION_HIT) atk = Math.floor(atk / 2);
    if (atk > 255 || def > 255) {
      atk = Math.max(1, Math.floor(atk / 4));
      def = Math.max(1, Math.floor(def / 4));
    }
    let dmg = Math.floor(Math.floor((Math.floor((2 * a.level) / 5 + 2) * move.power * atk) / def) / 50);
    if (crit) dmg *= 2;
    dmg += 2;
    if (move !== CONFUSION_HIT && typesOf(A).includes(move.type)) dmg = Math.floor(dmg * 1.5);
    const h = held(A);
    if (h?.kind === 'boost' && h.type === move.type && move !== CONFUSION_HIT) dmg = Math.floor(dmg * 1.1);
    dmg = Math.floor(dmg * eff);
    dmg = Math.floor((dmg * roll) / 255);
    return Math.max(1, dmg);
  }

  async function damage(S: Side, amount: number, type?: Type, big = false) {
    const m = act(S);
    const to = Math.max(0, m.hp - amount);
    await io.anim(S.id, big ? 'hitBig' : 'hit', type);
    await io.hp(S.id, to);
    m.hp = to;
    io.refresh();
  }

  async function heal(S: Side, amount: number) {
    const m = act(S);
    const to = Math.min(calcStats(m).hp, m.hp + amount);
    await io.hp(S.id, to);
    m.hp = to;
    io.refresh();
  }

  /** 지닌 열매: HP가 절반 이하면 회복, 상태 이상·혼란이면 고친다. 먹으면 없어진다 */
  async function eatBerry(S: Side) {
    const m = act(S);
    const h = held(S);
    if (!h || m.hp <= 0) return;
    const name = itemData(m.item!).name;
    if (h.kind === 'berry' && m.hp <= statsOf(S).hp / 2) {
      m.item = undefined;
      await heal(S, h.heal);
      await say(`${lj(S, '은/는')} ${josa(name, '을/를')}\n먹고 HP를 회복했다!`);
    } else if (h.kind === 'cure' && (m.status || S.confused)) {
      m.item = undefined;
      m.status = null;
      S.confused = 0;
      io.refresh();
      await say(`${lj(S, '은/는')} ${josa(name, '을/를')}\n먹고 상태가 나았다!`);
    }
  }

  // ── 순서/AI ──
  function speedOf(s: Side) {
    const m = act(s);
    let v = statsOf(s).spe * stageMult(s.stages.spe);
    if (m.status === 'par') v /= 4;
    return v;
  }

  function goesFirst(a: Side, am: number, b: Side, bm: number) {
    const pa = am >= 0 ? MOVES[movesOf(a)[am].id].priority ?? 0 : 0;
    const pb = bm >= 0 ? MOVES[movesOf(b)[bm].id].priority ?? 0 : 0;
    if (pa !== pb) return pa > pb;
    // 선제공격손톱: 가끔 스피드와 상관없이 먼저
    const qa = held(a)?.kind === 'quickclaw' && chance(23);
    const qb = held(b)?.kind === 'quickclaw' && chance(23);
    if (qa !== qb) return qa;
    const sa = speedOf(a), sb = speedOf(b);
    if (sa !== sb) return sa > sb;
    return chance(50);
  }

  function chooseEnemyMove(): number {
    const m = act(E);
    const usable = movesOf(E).map((s, i) => ({ s, i })).filter((x) => x.s.pp > 0);
    if (!usable.length) return -1;
    if (wild) return pick(usable).i;
    const target = act(P);
    let best = usable[0].i;
    let bestScore = -1;
    for (const { s, i } of usable) {
      const mv = MOVES[s.id];
      let score: number;
      if (mv.power > 0) {
        const eff = effectiveness(mv.type, typesOf(P));
        const stab = typesOf(E).includes(mv.type) ? 1.5 : 1;
        score = (mv.fixed ? 40 : mv.power) * eff * stab * ((mv.acc || 100) / 100);
      } else if (mv.status) {
        score = target.status ? 0 : 35;
      } else if (mv.heal) {
        score = m.hp < calcStats(m).hp / 3 ? 80 : 0;
      } else if (mv.transform) {
        score = E.form ? 0 : 60;
      } else if (mv.splash) {
        score = 0;
      } else {
        score = 20;
      }
      score *= 0.75 + Math.random() * 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  function canEscape() {
    const ps = statsOf(P).spe;
    const es = statsOf(E).spe;
    if (ps >= es) return true;
    const b = Math.floor(es / 4) % 256;
    if (b === 0) return true;
    const odds = Math.floor((ps * 32) / b) + 30 * (runAttempts - 1);
    return odds > 255 || rand(256) < odds;
  }

  // ── 포획 ──
  async function throwBall(mult: number, ballName: string, ball: ItemId): Promise<boolean> {
    const e = act(E);
    await say(`${josa(ctx.playerName, '은/는')}\n${josa(ballName, '을/를')} 던졌다!`);
    io.throwing?.(ball);
    await io.anim(1, 'throw');
    const max = calcStats(e).hp;
    const rate = Math.min(255, Math.floor(spec(e).catchRate * mult));
    let a = Math.max(1, Math.floor(((3 * max - 2 * e.hp) * rate) / (3 * max)));
    if (e.status === 'slp' || e.status === 'frz') a += 10;
    a = Math.min(255, a);
    // 마스터볼(배율 255 이상)은 반드시 잡힌다
    const caught = mult >= 255 || rand(256) <= a;
    const shakes = caught ? 3 : a < 10 ? 0 : a < 30 ? 1 : a < 70 ? randInt(1, 2) : 2;
    for (let i = 0; i < shakes; i++) await io.anim(1, 'shake');
    if (caught) {
      await io.anim(1, 'caught');
      await say(`신난다!\n${josa(monName(e), '을/를')} 잡았다!`);
      e.ot = ctx.playerName;
      await ctx.onCaught(e);
      return true;
    }
    await io.anim(1, 'breakout');
    await say(
      shakes === 0 ? '앗! 몬스터가 볼에서\n나와 버렸다!' : shakes === 1 ? '아앗! 잡았다고\n생각했는데!' : '아쉽다! 조금만 더 하면\n잡을 수 있었는데!',
    );
    return false;
  }

  // ── 기절 처리 ──
  async function handleFaints(): Promise<BattleResult | null> {
    if (act(E).hp <= 0) {
      await io.anim(1, 'faint');
      await say(`${lj(E, '은/는')}\n쓰러졌다!`);
      await awardExp(act(E));
      const next = E.party.findIndex((m) => m.hp > 0);
      if (next < 0) {
        io.victory?.();
        if (o.trainer) {
          io.setActive(1, null);
          await say(`${o.trainer.className} ${josa(o.trainer.name, '과/와')}의\n승부에서 이겼다!`);
          if (o.trainer.lose) await say(o.trainer.lose);
          await say(`${josa(ctx.playerName, '은/는')} 상금으로\n${o.trainer.prize}원을 받았다!`);
        }
        return result('win');
      }
      if (act(P).hp > 0 && P.party.filter((m) => m.hp > 0).length > 1) {
        const nextName = monName(E.party[next]);
        if (await io.yesNo(`${josa(o.trainer!.name, '은/는')} ${josa(nextName, '을/를')}\n내보내려 한다. 교체할까?`)) {
          const idx = await io.chooseSwitch(false);
          if (idx >= 0 && idx !== P.active) await switchPlayer(idx);
        }
      }
      participants = new Set([P.active]);
      await sendOutEnemy(next);
    }
    if (act(P).hp <= 0) {
      await io.anim(0, 'faint');
      await say(`${lj(P, '은/는')}\n쓰러졌다!`);
      participants.delete(P.active);
      if (!P.party.some((m) => m.hp > 0)) {
        await say(`${ctx.playerName}에게는 싸울 수 있는\n몬스터가 없다!`);
        await say(`${josa(ctx.playerName, '은/는')}\n눈앞이 캄캄해졌다!`);
        return result('lose');
      }
      if (wild && !(await io.yesNo('다음 몬스터를\n쓰겠습니까?'))) {
        if (canEscape()) {
          await say('무사히 도망쳤다!');
          return result('run');
        }
        await say('도망칠 수 없다!');
      }
      const idx = await io.chooseSwitch(true);
      resetVolatile(P);
      await sendOutPlayer(idx);
    }
    return null;
  }

  async function awardExp(defeated: Mon) {
    const alive = [...participants].filter((i) => P.party[i]?.hp > 0);
    if (!alive.length) return;
    // 학습장치를 지닌 포켓몬은 배틀에 안 나갔어도 절반을 받는다
    const sharers = P.party.map((m, i) => i).filter((i) => !alive.includes(i) && P.party[i].hp > 0 && P.party[i].item && itemData(P.party[i].item!).hold?.kind === 'expshare');
    const sp = spec(defeated);
    for (const i of [...alive, ...sharers]) {
      const m = P.party[i];
      const se = m.statExp;
      se.hp = Math.min(65535, se.hp + sp.base.hp);
      se.atk = Math.min(65535, se.atk + sp.base.atk);
      se.def = Math.min(65535, se.def + sp.base.def);
      se.spe = Math.min(65535, se.spe + sp.base.spe);
      se.spc = Math.min(65535, se.spc + sp.base.spa);
      if (m.level >= 100) continue;
      let gain = Math.floor(Math.floor((sp.expYield * defeated.level) / 7) / alive.length);
      if (!alive.includes(i)) gain = Math.floor(gain / 2);
      if (!wild) gain = Math.floor(gain * 1.5);
      if (m.item && itemData(m.item).hold?.kind === 'luckyegg') gain = Math.floor(gain * 1.5);
      gain = Math.max(1, gain);
      await say(`${josa(monName(m), '은/는')}\n${gain} 경험치를 얻었다!`);
      await gainExp(m, gain, i === P.active);
    }
  }

  async function gainExp(m: Mon, gain: number, isActive: boolean) {
    const g = spec(m).growth;
    let left = gain;
    while (left > 0 && m.level < 100) {
      const next = expForLevel(g, m.level + 1);
      if (m.exp + left < next) {
        m.exp += left;
        if (isActive) await io.exp(m, m.exp);
        break;
      }
      left -= next - m.exp;
      m.exp = next;
      if (isActive) await io.exp(m, next);
      const before = calcStats(m);
      setLevel(m, m.level + 1);
      leveled.add(m);
      io.refresh();
      await say(`${monName(m)}의 레벨이\n${josa(String(m.level), '으로/로')} 올랐다!`);
      await io.showLevelStats(m, before);
      await learnMoves(m, movesLearnedAt(spec(m), m.level), io);
      await pickMoves(m, picksAtLevel(spec(m), m.level), io);
      io.refresh();
    }
  }
}
