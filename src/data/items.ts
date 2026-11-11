import { josa } from '../engine/josa';
import { MOVES, type MajorStatus, type MoveId } from './moves';
import { TYPE_NAME, type Type } from './types';

export type Pocket = 'items' | 'balls' | 'tm' | 'key';

export interface ItemData {
  name: string;
  price: number;
  pocket: Pocket;
  desc: string;
  /** 회복량. 'full'이면 전부 */
  heal?: number | 'full';
  cure?: MajorStatus[] | 'all';
  /** 기절한 포켓몬을 최대 HP의 이 비율로 되살린다 */
  revive?: number;
  /** 포획 배율 */
  ball?: number;
  /** 진화의 돌: 맞는 포켓몬에게 쓰면 진화한다 */
  stone?: boolean;
  /** 기술머신: 이 기술을 가르친다 (몇 번이든 쓸 수 있다) */
  tm?: MoveId;
  /** 포켓몬에게 지니게 했을 때의 효과 */
  hold?: HeldEffect;
}

export type HeldEffect =
  /** HP가 절반 이하가 되면 먹고 회복한다 (한 번) */
  | { kind: 'berry'; heal: number }
  /** 상태 이상·혼란을 바로 고친다 (한 번) */
  | { kind: 'cure' }
  /** 턴이 끝날 때마다 최대 HP의 1/16 회복 */
  | { kind: 'leftovers' }
  /** 쓰러질 공격을 가끔 HP 1로 버틴다 */
  | { kind: 'focusband' }
  /** 가끔 먼저 행동한다 */
  | { kind: 'quickclaw' }
  /** 경험치 1.5배 */
  | { kind: 'luckyegg' }
  /** 배틀에 나가지 않아도 경험치를 나눠 받는다 */
  | { kind: 'expshare' }
  /** 그 타입 기술의 위력이 10% 오른다 */
  | { kind: 'boost'; type: Type };

const held = (name: string, price: number, hold: HeldEffect, desc: string): ItemData => ({ name, price, pocket: 'items', hold, desc });
/** 타입 강화 도구 */
const boost = (name: string, type: Type): ItemData =>
  held(name, 1000, { kind: 'boost', type }, `지니게 하면 ${TYPE_NAME[type]} 타입\n기술의 위력이 올라간다.`);

/** 기술머신. price가 0이면 관장에게서만 받을 수 있다 */
const tm = (no: string, move: MoveId, price = 0): ItemData => ({
  name: `기술머신${no}`,
  price,
  pocket: 'tm',
  tm: move,
  desc: `포켓몬에게 ${josa(MOVES[move].name, '을/를')}\n가르친다. 몇 번이든 쓸 수 있다.`,
});

export const ITEMS = {
  capsule: { name: '몬스터볼', price: 200, pocket: 'balls', ball: 1, desc: '야생 포켓몬에게 던져서\n잡는 볼.' },
  supercapsule: { name: '슈퍼볼', price: 600, pocket: 'balls', ball: 1.5, desc: '몬스터볼보다 잡기 쉬운\n성능 좋은 볼.' },
  mastercapsule: { name: '마스터볼', price: 0, pocket: 'balls', ball: 255, desc: '어떤 야생 포켓몬이든\n반드시 잡을 수 있다.' },
  hypercapsule: { name: '하이퍼볼', price: 1200, pocket: 'balls', ball: 2, desc: '슈퍼볼보다 더 잘 잡히는\n고성능 볼.' },
  potion: { name: '회복약', price: 300, pocket: 'items', heal: 20, desc: '포켓몬의 HP를 20\n회복한다.' },
  superpotion: { name: '좋은회복약', price: 700, pocket: 'items', heal: 50, desc: '포켓몬의 HP를 50\n회복한다.' },
  hyperpotion: { name: '고급회복약', price: 1200, pocket: 'items', heal: 200, desc: '포켓몬의 HP를 200\n회복한다.' },
  antidote: { name: '해독약', price: 100, pocket: 'items', cure: ['psn'], desc: '독 상태를 치료한다.' },
  parlyzheal: { name: '마비약', price: 200, pocket: 'items', cure: ['par'], desc: '마비 상태를 치료한다.' },
  awakening: { name: '각성약', price: 250, pocket: 'items', cure: ['slp'], desc: '잠든 포켓몬을 깨운다.' },
  burnheal: { name: '화상약', price: 250, pocket: 'items', cure: ['brn'], desc: '화상을 치료한다.' },
  iceheal: { name: '해동약', price: 250, pocket: 'items', cure: ['frz'], desc: '얼음 상태를 치료한다.' },
  fullheal: { name: '만능약', price: 600, pocket: 'items', cure: 'all', desc: '모든 상태 이상을\n치료한다.' },
  revive: { name: '부활초', price: 1500, pocket: 'items', revive: 0.5, desc: '기절한 포켓몬을 HP 절반\n상태로 되살린다.' },
  // 지니게 하는 도구
  berry: held('열매', 100, { kind: 'berry', heal: 10 }, '지니게 하면 HP가 절반 이하일 때\n먹고 10 회복한다.'),
  goldberry: held('황금열매', 400, { kind: 'berry', heal: 30 }, '지니게 하면 HP가 절반 이하일 때\n먹고 30 회복한다.'),
  miracleberry: held('만병통치열매', 400, { kind: 'cure' }, '지니게 하면 상태 이상이나\n혼란을 바로 고친다.'),
  leftovers: held('먹다남은음식', 0, { kind: 'leftovers' }, '지니게 하면 배틀 중 턴마다\nHP를 조금씩 회복한다.'),
  focusband: held('기합의띠', 0, { kind: 'focusband' }, '지니게 하면 쓰러질 공격을\n가끔 버텨 낸다.'),
  quickclaw: held('선제공격손톱', 0, { kind: 'quickclaw' }, '지니게 하면 가끔\n상대보다 먼저 행동한다.'),
  luckyegg: held('행복의알', 0, { kind: 'luckyegg' }, '지니게 하면 받는 경험치가\n1.5배가 된다.'),
  expshare: held('학습장치', 0, { kind: 'expshare' }, '지니게 하면 배틀에 나가지\n않아도 경험치를 받는다.'),
  silkscarf: boost('실크스카프', 'normal'),
  charcoal: boost('목탄', 'fire'),
  mysticwater: boost('신비의물방울', 'water'),
  miracleseed: boost('기적의씨', 'grass'),
  magnet: boost('자석', 'electric'),
  nevermeltice: boost('녹지않는얼음', 'ice'),
  blackbelt: boost('검은띠', 'fighting'),
  poisonbarb: boost('독바늘', 'poison'),
  softsand: boost('부드러운모래', 'ground'),
  sharpbeak: boost('예리한부리', 'flying'),
  twistedspoon: boost('휘어진스푼', 'psychic'),
  silverpowder: boost('은빛가루', 'bug'),
  hardstone: boost('딱딱한돌', 'rock'),
  spelltag: boost('저주의부적', 'ghost'),
  dragonfang: boost('용의이빨', 'dragon'),
  blackglasses: boost('검은안경', 'dark'),
  metalcoat: boost('금속코트', 'steel'),
  firestone: { name: '불꽃의돌', price: 2100, pocket: 'items', stone: true, desc: '어떤 포켓몬을 진화시키는\n불꽃 무늬의 신비한 돌.' },
  waterstone: { name: '물의돌', price: 2100, pocket: 'items', stone: true, desc: '어떤 포켓몬을 진화시키는\n물빛의 신비한 돌.' },
  thunderstone: { name: '천둥의돌', price: 2100, pocket: 'items', stone: true, desc: '어떤 포켓몬을 진화시키는\n번개 무늬의 신비한 돌.' },
  leafstone: { name: '리프의돌', price: 2100, pocket: 'items', stone: true, desc: '어떤 포켓몬을 진화시키는\n잎 무늬의 신비한 돌.' },
  moonstone: { name: '달의돌', price: 2100, pocket: 'items', stone: true, desc: '어떤 포켓몬을 진화시키는\n밤하늘처럼 검은 신비한 돌.' },
  dexdevice: { name: '포켓몬도감', price: 0, pocket: 'key', desc: '만난 포켓몬을 기록하는\n하이테크 도감.' },
  wakebell: { name: '깨움방울', price: 0, pocket: 'key', desc: '맑은 소리로 잠든 포켓몬을\n깨운다.' },
  surf: { name: '파도타기', price: 0, pocket: 'key', desc: '포켓몬과 함께 물 위를 건넌다.\n물가에서 A 버튼으로 쓴다.' },
  fly: { name: '공중날기', price: 0, pocket: 'key', desc: '포켓몬과 함께 가 본 마을로\n날아간다. 바깥에서 지도를 열어\n마을을 고른다.' },
  secretpotion: { name: '비상약', price: 0, pocket: 'key', desc: '섬도시 약국의 귀한 약.\n아픈 포켓몬이 기운을 차린다.' },
  oldrod: { name: '낡은낚싯대', price: 0, pocket: 'key', desc: '낡은 낚싯대. 물가에서 쓰면\n포켓몬을 낚을 수 있다.' },
  goodrod: { name: '좋은낚싯대', price: 0, pocket: 'key', desc: '쓸 만한 낚싯대. 물가에서\n쓰면 더 센 포켓몬이 낚인다.' },
  superrod: { name: '대단한낚싯대', price: 0, pocket: 'key', desc: '최고의 낚싯대. 물가에서\n쓰면 귀한 포켓몬도 낚인다.' },
  // 관장이 배지와 함께 준다
  tm01: tm('01', 'wingbeat'),
  tm02: tm('02', 'bugcharge'),
  tm03: tm('03', 'slam'),
  tm04: tm('04', 'shadowball'),
  tm05: tm('05', 'punch'),
  tm06: tm('06', 'irontail'),
  tm07: tm('07', 'coldwind'),
  tm08: tm('08', 'dragonbreath'),
  // 한빛시티 마트에서 판다
  tm09: tm('09', 'flamecannon', 5500),
  tm10: tm('10', 'tsunami', 5500),
  tm11: tm('11', 'discharge', 5500),
  tm12: tm('12', 'frostbeam', 5500),
  tm13: tm('13', 'petalstorm', 5000),
  tm14: tm('14', 'mindblast', 5000),
  tm15: tm('15', 'sludge', 4000),
  tm16: tm('16', 'rockfall', 3500),
  tm17: tm('17', 'crunch', 4000),
  tm18: tm('18', 'bigquake', 6000),
  tm19: tm('19', 'rest', 3000),
  tm20: tm('20', 'quick', 2000),
  pokegear: { name: '포켓기어', price: 0, pocket: 'key', desc: '전화를 걸고 받을 수 있는 기계.\nSTART 메뉴의 전화로 쓴다.' },
  bicycle: { name: '자전거', price: 0, pocket: 'key', desc: '걷는 것보다 두 배 빠르다.\nSELECT 버튼으로 타고 내린다.' },
} satisfies Record<string, ItemData>;

export type ItemId = keyof typeof ITEMS;
export const itemData = (id: ItemId): ItemData => ITEMS[id];
