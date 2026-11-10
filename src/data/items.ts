import type { MajorStatus } from './moves';

export type Pocket = 'items' | 'balls' | 'key';

export interface ItemData {
  name: string;
  price: number;
  pocket: Pocket;
  desc: string;
  /** 회복량. 'full'이면 전부 */
  heal?: number | 'full';
  cure?: MajorStatus[] | 'all';
  /** 기절한 몬스터를 최대 HP의 이 비율로 되살린다 */
  revive?: number;
  /** 포획 배율 */
  ball?: number;
  /** 진화의 돌: 맞는 몬스터에게 쓰면 진화한다 */
  stone?: boolean;
}

export const ITEMS = {
  capsule: { name: '몬스터캡슐', price: 200, pocket: 'balls', ball: 1, desc: '야생 몬스터에게 던져서\n잡는 캡슐.' },
  supercapsule: { name: '슈퍼캡슐', price: 600, pocket: 'balls', ball: 1.5, desc: '몬스터캡슐보다 잡기 쉬운\n성능 좋은 캡슐.' },
  mastercapsule: { name: '마스터캡슐', price: 0, pocket: 'balls', ball: 255, desc: '어떤 야생 몬스터든\n반드시 잡을 수 있다.' },
  hypercapsule: { name: '하이퍼캡슐', price: 1200, pocket: 'balls', ball: 2, desc: '슈퍼캡슐보다 더 잘 잡히는\n고성능 캡슐.' },
  potion: { name: '회복약', price: 300, pocket: 'items', heal: 20, desc: '몬스터의 HP를 20\n회복한다.' },
  superpotion: { name: '좋은회복약', price: 700, pocket: 'items', heal: 50, desc: '몬스터의 HP를 50\n회복한다.' },
  hyperpotion: { name: '고급회복약', price: 1200, pocket: 'items', heal: 200, desc: '몬스터의 HP를 200\n회복한다.' },
  antidote: { name: '해독약', price: 100, pocket: 'items', cure: ['psn'], desc: '독 상태를 치료한다.' },
  parlyzheal: { name: '마비약', price: 200, pocket: 'items', cure: ['par'], desc: '마비 상태를 치료한다.' },
  awakening: { name: '각성약', price: 250, pocket: 'items', cure: ['slp'], desc: '잠든 몬스터를 깨운다.' },
  burnheal: { name: '화상약', price: 250, pocket: 'items', cure: ['brn'], desc: '화상을 치료한다.' },
  iceheal: { name: '해동약', price: 250, pocket: 'items', cure: ['frz'], desc: '얼음 상태를 치료한다.' },
  fullheal: { name: '만능약', price: 600, pocket: 'items', cure: 'all', desc: '모든 상태 이상을\n치료한다.' },
  revive: { name: '부활초', price: 1500, pocket: 'items', revive: 0.5, desc: '기절한 몬스터를 HP 절반\n상태로 되살린다.' },
  firestone: { name: '불꽃의돌', price: 2100, pocket: 'items', stone: true, desc: '어떤 몬스터를 진화시키는\n불꽃 무늬의 신비한 돌.' },
  waterstone: { name: '물의돌', price: 2100, pocket: 'items', stone: true, desc: '어떤 몬스터를 진화시키는\n물빛의 신비한 돌.' },
  thunderstone: { name: '천둥의돌', price: 2100, pocket: 'items', stone: true, desc: '어떤 몬스터를 진화시키는\n번개 무늬의 신비한 돌.' },
  leafstone: { name: '리프의돌', price: 2100, pocket: 'items', stone: true, desc: '어떤 몬스터를 진화시키는\n잎 무늬의 신비한 돌.' },
  moonstone: { name: '달의돌', price: 2100, pocket: 'items', stone: true, desc: '어떤 몬스터를 진화시키는\n밤하늘처럼 검은 신비한 돌.' },
  dexdevice: { name: '몬스터도감', price: 0, pocket: 'key', desc: '만난 몬스터를 기록하는\n하이테크 도감.' },
  wakebell: { name: '깨움방울', price: 0, pocket: 'key', desc: '맑은 소리로 잠든 몬스터를\n깨운다.' },
  surf: { name: '파도타기', price: 0, pocket: 'key', desc: '몬스터와 함께 물 위를 건넌다.\n물가에서 A 버튼으로 쓴다.' },
  secretpotion: { name: '비상약', price: 0, pocket: 'key', desc: '섬도시 약국의 귀한 약.\n아픈 몬스터가 기운을 차린다.' },
  bicycle: { name: '자전거', price: 0, pocket: 'key', desc: '걷는 것보다 두 배 빠르다.\nSELECT 버튼으로 타고 내린다.' },
} satisfies Record<string, ItemData>;

export type ItemId = keyof typeof ITEMS;
export const itemData = (id: ItemId): ItemData => ITEMS[id];
