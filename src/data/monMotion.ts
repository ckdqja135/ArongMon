// 포켓몬이 움직이는 모양: 배틀에서 숨 쉬는 모습, 필드에서 따라다니는 걸음새
import { SPECIES } from './species';

/** 걷기: 발을 번갈아 딛는다 / 기기: 몸을 움츠렸다 편다 / 뜨기: 그림자 위에서 둥실거린다 */
export type Gait = 'legs' | 'legless' | 'float';

/** 타입과 상관없이 몸이 떠 있는 녀석들 */
const FLOATERS = new Set(['koffing', 'weezing', 'magnemite', 'magneton', 'geodude', 'porygon', 'mew', 'venomoth', 'beedrill', 'voltorb', 'electrode']);
/** 비행·고스트 타입이지만 땅을 딛고 걷는 녀석들 */
const WALKERS = new Set(['charizard', 'dragonite', 'scyther', 'doduo', 'dodrio', 'farfetchd', 'gengar']);
/** 다리 없이 기거나 미끄러지는 녀석들 */
const LEGLESS = new Set([
  'ekans', 'arbok', 'caterpie', 'weedle', 'metapod', 'kakuna', 'grimer', 'muk', 'onix', 'dratini', 'dragonair',
  'magikarp', 'goldeen', 'seaking', 'horsea', 'seadra', 'tentacool', 'tentacruel', 'shellder', 'cloyster',
  'staryu', 'starmie', 'omanyte', 'omastar', 'ditto', 'diglett', 'dugtrio', 'exeggcute', 'seel', 'dewgong', 'lapras',
]);

export const floats = (species: string) =>
  FLOATERS.has(species) || (!WALKERS.has(species) && !!SPECIES[species]?.types.some((t) => t === 'flying' || t === 'ghost'));

export const gait = (species: string): Gait => (floats(species) ? 'float' : LEGLESS.has(species) ? 'legless' : 'legs');
