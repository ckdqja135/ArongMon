// 낚시: 낚싯대마다 낚이는 포켓몬과 레벨이 다르고, 물의 종류(민물·바다·특별한 곳)에 따라서도 다르다.
import type { Encounter } from './maps';

export type RodId = 'oldrod' | 'goodrod' | 'superrod';
export type FishSpot = 'fresh' | 'sea' | 'rage' | 'dragon' | 'cave';

/** 좋은 낚싯대부터 */
export const RODS: RodId[] = ['superrod', 'goodrod', 'oldrod'];

/** 입질 확률 */
export const ROD_BITE: Record<RodId, number> = { oldrod: 0.7, goodrod: 0.8, superrod: 0.9 };

const f = (species: string, min: number, max: number, weight: number): Encounter => ({ species, min, max, weight });

export const FISH: Record<FishSpot, Record<RodId, Encounter[]>> = {
  // 연못·강·호수
  fresh: {
    oldrod: [f('magikarp', 4, 10, 70), f('poliwag', 5, 10, 30)],
    goodrod: [f('magikarp', 15, 22, 35), f('poliwag', 15, 22, 35), f('goldeen', 15, 22, 30)],
    superrod: [f('poliwhirl', 30, 38, 35), f('seaking', 30, 38, 30), f('goldeen', 28, 34, 20), f('gyarados', 32, 38, 15)],
  },
  // 항구·바다
  sea: {
    oldrod: [f('magikarp', 4, 10, 60), f('tentacool', 5, 10, 25), f('krabby', 5, 10, 15)],
    goodrod: [f('tentacool', 15, 22, 30), f('krabby', 15, 22, 25), f('shellder', 15, 22, 20), f('horsea', 15, 22, 15), f('magikarp', 15, 22, 10)],
    superrod: [f('tentacruel', 32, 40, 25), f('kingler', 32, 40, 20), f('seadra', 32, 40, 20), f('staryu', 32, 38, 25), f('gyarados', 34, 40, 10)],
  },
  // 분노의 호수: 잉어킹과 갸라도스뿐
  rage: {
    oldrod: [f('magikarp', 5, 12, 100)],
    goodrod: [f('magikarp', 15, 25, 70), f('gyarados', 18, 25, 30)],
    superrod: [f('gyarados', 30, 40, 60), f('magikarp', 30, 40, 40)],
  },
  // 용의 굴: 대단한낚싯대라야 미뇽이 걸린다
  dragon: {
    oldrod: [f('magikarp', 5, 12, 100)],
    goodrod: [f('magikarp', 15, 22, 70), f('dratini', 15, 20, 30)],
    superrod: [f('dratini', 30, 38, 60), f('dragonair', 34, 40, 30), f('magikarp', 30, 40, 10)],
  },
  // 빛바랜 동굴 (엔딩 뒤)
  cave: {
    oldrod: [f('magikarp', 5, 12, 70), f('goldeen', 5, 12, 30)],
    goodrod: [f('goldeen', 20, 28, 40), f('slowpoke', 20, 28, 30), f('poliwag', 20, 28, 30)],
    superrod: [f('golduck', 40, 48, 30), f('slowbro', 40, 48, 25), f('seaking', 40, 48, 25), f('kingler', 40, 48, 20)],
  },
};
