// 기술머신으로 누가 무엇을 배울 수 있는지
import type { MoveId } from './moves';
import { MOVES } from './moves';
import { SPECIES } from './species';
import type { Type } from './types';

/** 기술머신을 하나도 배우지 못하는 포켓몬 */
const NO_TM = new Set(['caterpie', 'metapod', 'weedle', 'kakuna', 'magikarp', 'ditto']);

/** 같은 타입이 아니어도 배울 수 있는 타입 (노말 기술은 모두 배운다) */
const EXTRA: Partial<Record<MoveId, Type[]>> = {
  wingbeat: ['dragon', 'bug'],
  bugcharge: ['grass', 'normal', 'ground'],
  shadowball: ['psychic', 'dark', 'normal', 'poison'],
  punch: ['normal', 'psychic', 'fire', 'electric', 'ice', 'ground', 'rock', 'water'],
  irontail: ['normal', 'electric', 'ground', 'rock', 'dragon', 'fire', 'water'],
  coldwind: ['water', 'flying', 'psychic'],
  dragonbreath: ['fire', 'water', 'flying'],
  flamecannon: ['dragon', 'normal'],
  tsunami: ['ice', 'dragon', 'normal'],
  discharge: ['normal', 'psychic'],
  frostbeam: ['water', 'normal', 'psychic'],
  mindblast: ['ghost', 'normal', 'poison'],
  sludge: ['ghost', 'grass', 'bug'],
  rockfall: ['ground', 'fighting', 'normal'],
  crunch: ['normal', 'water', 'dragon', 'ground'],
  bigquake: ['rock', 'normal', 'fighting', 'water', 'dragon', 'poison'],
};

export function canLearnTM(species: string, move: MoveId): boolean {
  const sp = SPECIES[species];
  if (!sp || NO_TM.has(species)) return false;
  // 아롱이는 어떤 기술이든 배운다
  if (sp.unlimitedMoves) return true;
  const type = MOVES[move].type;
  return type === 'normal' || sp.types.some((t) => t === type || EXTRA[move]?.includes(t));
}
