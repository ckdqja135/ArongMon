// 포켓몬 개체: 2세대 방식 DV(0~15)와 노력치(스탯 경험치)를 쓴다.
import type { ItemId } from '../data/items';
import { MOVES, moveRank, type MajorStatus, type MoveId } from '../data/moves';
import { SPECIES, type Growth, type SpeciesData } from '../data/species';
import { josa } from '../engine/josa';
import { rand, uid } from '../engine/rng';

export interface MoveSlot { id: MoveId; pp: number }
export interface DVs { atk: number; def: number; spe: number; spc: number }
export interface StatExp { hp: number; atk: number; def: number; spe: number; spc: number }
export interface Stats { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }

export interface Mon {
  uid: string;
  species: string;
  nickname?: string;
  level: number;
  exp: number;
  dvs: DVs;
  statExp: StatExp;
  hp: number;
  status: MajorStatus | null;
  sleepTurns: number;
  moves: MoveSlot[];
  ot: string;
  otId: number;
  metLevel: number;
  metMap?: string;
  /** 지닌 도구 */
  item?: ItemId;
  /** 알이면 깨어날 때까지 남은 걸음 수 (알은 배틀에 나가지 않는다) */
  egg?: number;
}

export const MAX_MOVES = 4;
export const MAX_LEVEL = 100;

export const spec = (m: Mon): SpeciesData => SPECIES[m.species];
export const monName = (m: Mon) => (m.egg !== undefined ? '알' : (m.nickname ?? spec(m).name));
/** 배틀에 나갈 수 있는지 (쓰러지지 않았고 알이 아니다) */
export const canFight = (m: Mon) => m.hp > 0 && m.egg === undefined;

export function expForLevel(g: Growth, n: number): number {
  if (n <= 1) return 0;
  switch (g) {
    case 'fast': return Math.floor((4 * n ** 3) / 5);
    case 'mediumFast': return n ** 3;
    case 'mediumSlow': return Math.max(0, Math.floor((6 * n ** 3) / 5 - 15 * n ** 2 + 100 * n - 140));
    case 'slow': return Math.floor((5 * n ** 3) / 4);
  }
}

export const hpDV = (d: DVs) => ((d.atk & 1) << 3) | ((d.def & 1) << 2) | ((d.spe & 1) << 1) | (d.spc & 1);

const statBonus = (se: number) => Math.floor(Math.ceil(Math.sqrt(se)) / 4);

export function calcStats(m: Mon): Stats {
  const b = spec(m).base;
  const L = m.level;
  const d = m.dvs;
  const s = m.statExp;
  const other = (base: number, dv: number, se: number) => Math.floor((((base + dv) * 2 + statBonus(se)) * L) / 100) + 5;
  return {
    hp: Math.floor((((b.hp + hpDV(d)) * 2 + statBonus(s.hp)) * L) / 100) + L + 10,
    atk: other(b.atk, d.atk, s.atk),
    def: other(b.def, d.def, s.def),
    spa: other(b.spa, d.spc, s.spc),
    spd: other(b.spd, d.spc, s.spc),
    spe: other(b.spe, d.spe, s.spe),
  };
}

export const maxHp = (m: Mon) => calcStats(m).hp;

/** 2세대 이로치 조건: 방어·스피드·특수 DV 10, 공격 DV가 2,3,6,7,10,11,14,15 */
export const isShiny = (m: Mon) =>
  m.dvs.def === 10 && m.dvs.spe === 10 && m.dvs.spc === 10 && [2, 3, 6, 7, 10, 11, 14, 15].includes(m.dvs.atk);

/** 2세대처럼 공격 DV로 성별을 정한다 */
export function gender(m: Mon): 'm' | 'f' | null {
  const f = spec(m).female;
  if (f === null) return null;
  if (f === 0) return 'm';
  return m.dvs.atk < Math.round(f * 16) ? 'f' : 'm';
}

export function movesLearnedAt(sp: SpeciesData, level: number): MoveId[] {
  return sp.learnset.filter(([l]) => l === level).map(([, id]) => id);
}

/** 이 레벨에 고를 수 있는 기술의 세기 상한 (Lv.10 → 54, Lv.30 → 82, Lv.57부터 120) */
const rankCap = (level: number) => Math.min(120, 40 + Math.round(level * 1.4));
/** 상한 아래에서 센 순서로 이만큼만 후보 풀에 넣는다 (너무 약한 기술이 섞이지 않게) */
const POOL_SIZE = 12;

/** 아직 모르는 기술 중에서 레벨에 맞는 것을 무작위로 n개 */
export function randomNewMoves(known: MoveId[], n: number, level: number): MoveId[] {
  const unknown = (Object.keys(MOVES) as MoveId[]).filter((id) => !known.includes(id) && !MOVES[id].signature);
  const cap = rankCap(level);
  // 상한 이하를 센 순서로, 모자라면 상한을 넘는 것 중 약한 것부터 채운다
  const within = unknown.filter((id) => moveRank(id) <= cap).sort((a, b) => moveRank(b) - moveRank(a));
  const above = unknown.filter((id) => moveRank(id) > cap).sort((a, b) => moveRank(a) - moveRank(b));
  const pool = [...within, ...above].slice(0, Math.max(POOL_SIZE, n));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, n));
}

/** 이 레벨이 되면 골라 배우는 횟수 */
export function picksAtLevel(sp: SpeciesData, level: number): number {
  const p = sp.movePicks;
  return p && level >= p.from && (level - p.from) % p.every === 0 ? 1 : 0;
}

/** 처음부터 이 모습·이 레벨로 만들 때, 그동안 기술을 골랐을 레벨들 (진화할 때 고른 것 포함) */
function pastPickLevels(sp: SpeciesData, level: number): number[] {
  const p = sp.movePicks;
  if (!p) return [];
  const out: number[] = [];
  for (let lv = p.from; lv <= level; lv += p.every) out.push(lv);
  // 이 모습까지 거쳐 온 진화마다 그 진화 레벨에서 고른 횟수
  for (let s = sp, prev = Object.values(SPECIES).find((v) => v.evolve?.to === s.key); prev; s = prev, prev = Object.values(SPECIES).find((v) => v.evolve?.to === s.key))
    for (let i = 0; i < (s.movePicks?.onEvolve ?? 0); i++) out.push(prev.evolve!.level);
  return out.sort((a, b) => a - b);
}

function defaultMoves(sp: SpeciesData, level: number): MoveSlot[] {
  const known: MoveId[] = [];
  for (const [l, id] of sp.learnset) if (l <= level && !known.includes(id)) known.push(id);
  for (const lv of pastPickLevels(sp, level)) known.push(...randomNewMoves(known, 1, lv));
  const ids = sp.unlimitedMoves ? known : known.slice(-MAX_MOVES);
  return ids.map((id) => ({ id, pp: MOVES[id].pp }));
}

export interface CreateOpts { ot?: string; otId?: number; shiny?: boolean; map?: string }

export function createMon(speciesKey: string, level: number, o: CreateOpts = {}): Mon {
  const sp = SPECIES[speciesKey];
  if (!sp) throw new Error(`unknown species ${speciesKey}`);
  const dvs: DVs = o.shiny
    ? { atk: 10, def: 10, spe: 10, spc: 10 }
    : { atk: rand(16), def: rand(16), spe: rand(16), spc: rand(16) };
  const m: Mon = {
    uid: uid(),
    species: speciesKey,
    level,
    exp: expForLevel(sp.growth, level),
    dvs,
    statExp: { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 },
    hp: 0,
    status: null,
    sleepTurns: 0,
    moves: defaultMoves(sp, level),
    ot: o.ot ?? '',
    otId: o.otId ?? 0,
    metLevel: level,
    metMap: o.map,
  };
  m.hp = maxHp(m);
  return m;
}

export function healMon(m: Mon) {
  m.hp = maxHp(m);
  m.status = null;
  m.sleepTurns = 0;
  m.moves.forEach((s) => (s.pp = MOVES[s.id].pp));
}

export const canLearnMore = (m: Mon) => spec(m).unlimitedMoves || m.moves.length < MAX_MOVES;
export const knows = (m: Mon, id: MoveId) => m.moves.some((s) => s.id === id);

/** 레벨업 후 HP는 최대 HP 증가분만큼 같이 오른다 */
export function setLevel(m: Mon, level: number) {
  const before = maxHp(m);
  m.level = level;
  m.hp = Math.max(0, m.hp + (maxHp(m) - before));
}

export const STAT_NAME: Record<string, string> = {
  atk: '공격', def: '방어', spa: '특수공격', spd: '특수방어', spe: '스피드', acc: '명중률', eva: '회피율',
};

export const STATUS_NAME: Record<MajorStatus, string> = { brn: '화상', par: '마비', psn: '독', slp: '잠듦', frz: '얼음' };
export const STATUS_SHORT: Record<MajorStatus, string> = { brn: 'BRN', par: 'PAR', psn: 'PSN', slp: 'SLP', frz: 'FRZ' };

export const nameJ = (m: Mon, pair: string) => josa(monName(m), pair);
