import type { Type } from './types';

export type StatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva';
export type MajorStatus = 'brn' | 'par' | 'psn' | 'slp' | 'frz';

export interface MoveData {
  name: string;
  type: Type;
  /** 0이면 변화기 */
  power: number;
  /** 0이면 반드시 맞는다 */
  acc: number;
  pp: number;
  priority?: number;
  status?: MajorStatus;
  /** 부가효과 확률(%). 변화기는 항상 100 */
  chance?: number;
  stat?: { s: StatKey; n: number; self?: boolean }[];
  confuse?: boolean;
  /** 확률로 상대가 움찔해서 몇 턴 동안 행동하지 못한다 */
  startle?: { chance: number; turns: [number, number] };
  flinch?: boolean;
  drain?: boolean;
  recoil?: number;
  heal?: number;
  highCrit?: boolean;
  hits?: [number, number];
  fixed?: number | 'level';
  /** 상대의 모습·능력치·기술을 그대로 따라 한다 */
  transform?: boolean;
  /** 아무 일도 일어나지 않는다 */
  splash?: boolean;
  /** 그 몬스터만 쓰는 기술: 아롱이가 고르는 새 기술 후보에 나오지 않는다 */
  signature?: boolean;
  desc: string;
}

const m = (name: string, type: Type, power: number, acc: number, pp: number, desc: string, extra: Partial<MoveData> = {}): MoveData => ({
  name, type, power, acc, pp, desc, ...extra,
});

export const MOVES = {
  // 아롱이 전용 (무상성)
  bodycheck: m('몸통박치기', 'typeless', 40, 100, 35, '몸을 날려 상대에게 부딪친다.'),
  nibble: m('물기', 'typeless', 60, 100, 25, '이빨로 문다. 상대를 풀죽게 할 때가 있다.', { flinch: true, chance: 30 }),
  bark: m('짖기', 'typeless', 0, 100, 30, '크게 짖어 상대의 방어를 떨어뜨린다. 상대가 움찔해서 몇 턴 동안 움직이지 못할 때가 있다.', {
    stat: [{ s: 'def', n: -1 }],
    startle: { chance: 30, turns: [1, 3] },
  }),
  charm: m('애교부리기', 'typeless', 0, 100, 20, '귀엽게 애교를 부려 상대의 공격을 크게 떨어뜨린다.', { stat: [{ s: 'atk', n: -2 }] }),
  // 노말
  tackle: m('부딪치기', 'normal', 35, 95, 35, '몸을 부딪쳐 공격한다.'),
  scratch: m('할퀴기', 'normal', 40, 100, 35, '날카로운 발톱으로 할퀸다.'),
  growl: m('으르렁', 'normal', 0, 100, 40, '상대의 공격을 떨어뜨린다.', { stat: [{ s: 'atk', n: -1 }] }),
  wink: m('깜빡눈', 'normal', 0, 100, 30, '상대의 방어를 떨어뜨린다.', { stat: [{ s: 'def', n: -1 }] }),
  quick: m('번개걸음', 'normal', 40, 100, 30, '반드시 먼저 공격한다.', { priority: 1 }),
  slam: m('짓누르기', 'normal', 85, 100, 15, '몸무게로 짓누른다. 마비시킬 때가 있다.', { status: 'par', chance: 30 }),
  takedown: m('돌진', 'normal', 90, 85, 20, '강하게 돌진한다. 자신도 데미지를 입는다.', { recoil: 1 / 4 }),
  fang: m('앞니깨물기', 'normal', 80, 90, 15, '앞니로 문다. 풀죽게 할 때가 있다.', { flinch: true, chance: 10 }),
  slash: m('베어가르기', 'normal', 70, 100, 20, '급소에 맞기 쉽다.', { highCrit: true }),
  rest: m('쉬어가기', 'normal', 0, 0, 10, 'HP를 최대 HP의 절반만큼 회복한다.', { heal: 1 / 2 }),
  lullaby: m('자장가', 'normal', 0, 55, 15, '노래로 상대를 잠재운다.', { status: 'slp' }),
  harden: m('몸부풀리기', 'normal', 0, 0, 30, '자신의 방어를 올린다.', { stat: [{ s: 'def', n: 1, self: true }] }),
  focus: m('기합모으기', 'normal', 0, 0, 20, '자신의 공격을 크게 올린다.', { stat: [{ s: 'atk', n: 2, self: true }] }),
  furyswipes: m('연타', 'normal', 18, 80, 15, '2~5회 연속으로 공격한다.', { hits: [2, 5] }),
  starfall: m('별가루', 'normal', 60, 0, 20, '반드시 맞는 별 모양 빛을 쏜다.'),
  megastrike: m('필살일격', 'normal', 120, 80, 5, '온 힘을 다해 들이받는다.'),
  splash: m('튀어오르기', 'normal', 0, 0, 40, '팔딱팔딱 튀어오른다. 아무 일도 일어나지 않는다.', { splash: true, signature: true }),
  transform: m('변신', 'normal', 0, 0, 10, '상대의 모습으로 변신해 능력과 기술을 그대로 따라 한다.', { transform: true, signature: true }),
  // 불꽃
  ember: m('불씨', 'fire', 40, 100, 25, '작은 불꽃. 화상을 입힐 때가 있다.', { status: 'brn', chance: 10 }),
  flamewheel: m('불수레', 'fire', 60, 100, 25, '불꽃을 두르고 구른다.', { status: 'brn', chance: 10 }),
  firefang: m('불꽃이빨', 'fire', 65, 95, 15, '불꽃 이빨로 문다.', { status: 'brn', chance: 10 }),
  flamecannon: m('화염포', 'fire', 95, 100, 15, '거센 불길을 내뿜는다.', { status: 'brn', chance: 10 }),
  inferno: m('작열', 'fire', 120, 85, 5, '모든 것을 태우는 불꽃.', { status: 'brn', chance: 30 }),
  // 물
  watershot: m('물방울쏘기', 'water', 40, 100, 25, '물방울을 세차게 쏜다.'),
  bubble: m('거품방울', 'water', 20, 100, 30, '거품을 뿜는다. 스피드를 떨어뜨릴 때가 있다.', { stat: [{ s: 'spe', n: -1 }], chance: 10 }),
  wavecrash: m('물결치기', 'water', 65, 100, 20, '물결로 친다.', { stat: [{ s: 'spe', n: -1 }], chance: 10 }),
  tsunami: m('해일', 'water', 95, 100, 15, '거대한 파도로 덮친다.'),
  geyser: m('물기둥', 'water', 120, 80, 5, '강력한 물기둥을 뿜어낸다.'),
  // 풀
  leafshot: m('잎날리기', 'grass', 40, 100, 25, '날카로운 잎을 날린다.'),
  leechvine: m('흡혈덩굴', 'grass', 40, 100, 20, '준 데미지의 절반을 회복한다.', { drain: true }),
  bigleech: m('양분흡수', 'grass', 60, 100, 10, '준 데미지의 절반을 회복한다.', { drain: true }),
  petalstorm: m('꽃잎폭풍', 'grass', 90, 100, 15, '꽃잎이 휘몰아친다.'),
  solarray: m('햇살광선', 'grass', 120, 85, 5, '햇빛을 모아 광선으로 쏜다.'),
  poisonspore: m('독포자', 'grass', 0, 75, 35, '상대를 독 상태로 만든다.', { status: 'psn' }),
  sleepspore: m('잠꽃가루', 'grass', 0, 75, 15, '상대를 잠재운다.', { status: 'slp' }),
  stunspore: m('찌릿가루', 'grass', 0, 75, 30, '상대를 마비시킨다.', { status: 'par' }),
  sunbath: m('햇빛쬐기', 'grass', 0, 0, 5, 'HP를 최대 HP의 절반만큼 회복한다.', { heal: 1 / 2 }),
  // 전기
  spark: m('찌릿찌릿', 'electric', 40, 100, 30, '전기를 흘린다. 마비시킬 때가 있다.', { status: 'par', chance: 10 }),
  shock: m('전격', 'electric', 65, 100, 20, '강한 전격을 날린다.', { status: 'par', chance: 10 }),
  discharge: m('방전', 'electric', 95, 100, 15, '모아둔 전기를 한꺼번에 쏜다.', { status: 'par', chance: 10 }),
  lightning: m('벼락', 'electric', 120, 70, 10, '하늘에서 벼락을 떨어뜨린다.', { status: 'par', chance: 30 }),
  paralyze: m('마비전류', 'electric', 0, 100, 20, '약한 전류로 마비시킨다.', { status: 'par' }),
  // 얼음
  icechip: m('얼음조각', 'ice', 40, 100, 30, '얼음 조각을 던진다.', { status: 'frz', chance: 10 }),
  coldwind: m('찬바람', 'ice', 55, 95, 15, '찬바람으로 스피드를 떨어뜨린다.', { stat: [{ s: 'spe', n: -1 }] }),
  frostbeam: m('냉기광선', 'ice', 95, 100, 10, '얼어붙는 광선을 쏜다.', { status: 'frz', chance: 10 }),
  blizzard: m('빙설폭풍', 'ice', 120, 70, 5, '거센 눈보라를 일으킨다.', { status: 'frz', chance: 10 }),
  // 격투
  chop: m('손날치기', 'fighting', 50, 100, 25, '급소에 맞기 쉽다.', { highCrit: true }),
  lowsweep: m('다리걸기', 'fighting', 60, 100, 20, '다리를 걸어 스피드를 떨어뜨린다.', { stat: [{ s: 'spe', n: -1 }] }),
  kick: m('회오리발차기', 'fighting', 70, 95, 15, '빙글 돌며 걷어찬다.'),
  punch: m('정권찌르기', 'fighting', 85, 100, 15, '주먹을 곧게 내지른다.'),
  smash: m('격파', 'fighting', 120, 80, 5, '혼신의 힘으로 내려친다.'),
  // 독
  poisonsting: m('독가시', 'poison', 15, 100, 35, '독가시로 찌른다.', { status: 'psn', chance: 30 }),
  acidspray: m('산성액', 'poison', 40, 100, 30, '산성액을 뿌린다.', { stat: [{ s: 'def', n: -1 }], chance: 10 }),
  sludge: m('독폭탄', 'poison', 90, 100, 10, '독 덩어리를 던진다.', { status: 'psn', chance: 30 }),
  toxicgas: m('독가스', 'poison', 0, 85, 40, '독가스로 상대를 독 상태로 만든다.', { status: 'psn' }),
  // 땅
  dirtkick: m('흙뿌리기', 'ground', 0, 100, 15, '상대의 명중률을 떨어뜨린다.', { stat: [{ s: 'acc', n: -1 }] }),
  mudslap: m('흙탕치기', 'ground', 20, 100, 10, '흙탕물을 끼얹어 명중률을 떨어뜨린다.', { stat: [{ s: 'acc', n: -1 }] }),
  quake: m('땅울림', 'ground', 60, 100, 20, '땅을 울려 공격한다.'),
  bigquake: m('대지진동', 'ground', 100, 100, 10, '대지를 크게 뒤흔든다.'),
  // 비행
  peck: m('콕찌르기', 'flying', 35, 100, 35, '부리로 콕 찌른다.'),
  gust: m('돌풍', 'flying', 40, 100, 35, '날개로 돌풍을 일으킨다.'),
  wingbeat: m('날갯짓', 'flying', 60, 100, 35, '날개로 세게 친다.'),
  dive: m('급강하', 'flying', 80, 95, 15, '높은 곳에서 내리꽂는다. 급소에 맞기 쉽다.', { highCrit: true }),
  // 에스퍼
  psywave: m('염력파', 'psychic', 50, 100, 25, '염력을 보낸다. 혼란시킬 때가 있다.', { confuse: true, chance: 10 }),
  mindblast: m('정신파', 'psychic', 90, 100, 10, '강한 염력. 특수방어를 떨어뜨릴 때가 있다.', { stat: [{ s: 'spd', n: -1 }], chance: 10 }),
  hypno: m('졸음파', 'psychic', 0, 60, 20, '이상한 파동으로 잠재운다.', { status: 'slp' }),
  calm: m('집중', 'psychic', 0, 0, 20, '자신의 특수공격과 특수방어를 올린다.', {
    stat: [{ s: 'spa', n: 1, self: true }, { s: 'spd', n: 1, self: true }],
  }),
  // 벌레
  string: m('실감기', 'bug', 0, 95, 40, '실로 감아 스피드를 떨어뜨린다.', { stat: [{ s: 'spe', n: -1 }] }),
  leech: m('피빨기', 'bug', 20, 100, 15, '준 데미지의 절반을 회복한다.', { drain: true }),
  bugbite: m('벌레씹기', 'bug', 60, 100, 20, '튼튼한 턱으로 씹는다.'),
  bugcharge: m('벌레돌격', 'bug', 80, 100, 15, '온몸으로 돌격한다.'),
  // 바위
  rockthrow: m('돌던지기', 'rock', 50, 90, 15, '작은 돌을 던진다.'),
  rockfall: m('낙석', 'rock', 75, 90, 10, '돌을 떨어뜨린다. 풀죽게 할 때가 있다.', { flinch: true, chance: 30 }),
  stiffen: m('굳히기', 'rock', 0, 0, 20, '몸을 굳혀 방어를 크게 올린다.', { stat: [{ s: 'def', n: 2, self: true }] }),
  boulder: m('바위폭격', 'rock', 100, 80, 5, '커다란 바위를 퍼붓는다.'),
  // 고스트
  lick: m('혀날름', 'ghost', 20, 100, 30, '혀로 핥는다. 마비시킬 때가 있다.', { status: 'par', chance: 30 }),
  nightray: m('악몽광선', 'ghost', 1, 100, 15, '레벨만큼 데미지를 준다.', { fixed: 'level' }),
  confuseray: m('홀림불빛', 'ghost', 0, 100, 10, '이상한 빛으로 혼란시킨다.', { confuse: true }),
  shadowball: m('그림자탄', 'ghost', 80, 100, 15, '그림자 덩어리를 던진다.', { stat: [{ s: 'spd', n: -1 }], chance: 20 }),
  // 드래곤
  dragonrage: m('용의포효', 'dragon', 1, 100, 10, '언제나 40 데미지를 준다.', { fixed: 40 }),
  dragonbreath: m('용트림', 'dragon', 60, 100, 20, '거친 숨결. 마비시킬 때가 있다.', { status: 'par', chance: 30 }),
  scale: m('비늘세우기', 'dragon', 0, 0, 20, '자신의 특수공격과 스피드를 올린다.', {
    stat: [{ s: 'spa', n: 1, self: true }, { s: 'spe', n: 1, self: true }],
  }),
  dragonwave: m('천룡파', 'dragon', 100, 100, 10, '용의 기운을 파동으로 쏜다.'),
  // 악
  glare: m('흘겨보기', 'dark', 0, 100, 30, '상대의 방어를 떨어뜨린다.', { stat: [{ s: 'def', n: -1 }] }),
  bite: m('깨물기', 'dark', 60, 100, 25, '날카로운 이빨로 문다. 풀죽게 할 때가 있다.', { flinch: true, chance: 30 }),
  feint: m('기습할퀴기', 'dark', 60, 0, 20, '방심한 틈을 노려 반드시 맞는다.'),
  crunch: m('으깨물기', 'dark', 80, 100, 15, '세게 깨문다.', { stat: [{ s: 'spd', n: -1 }], chance: 20 }),
  // 강철
  ironclaw: m('쇠발톱', 'steel', 50, 95, 35, '강철 발톱. 공격이 오를 때가 있다.', { stat: [{ s: 'atk', n: 1, self: true }], chance: 10 }),
  ironwall: m('철갑두르기', 'steel', 0, 0, 15, '자신의 방어를 크게 올린다.', { stat: [{ s: 'def', n: 2, self: true }] }),
  irontail: m('강철꼬리', 'steel', 100, 75, 15, '단단한 꼬리로 친다.', { stat: [{ s: 'def', n: -1 }], chance: 30 }),
} satisfies Record<string, MoveData>;

export type MoveId = keyof typeof MOVES;
export const moveData = (id: MoveId): MoveData => MOVES[id];

/** 기술의 세기. 공격기는 위력, 변화기는 효과에 따라 매긴다 (레벨에 맞는 기술을 고를 때 쓴다) */
export function moveRank(id: MoveId): number {
  const mv = moveData(id);
  if (mv.fixed) return 60;
  if (mv.power > 0) return mv.hits ? mv.power * 3 : mv.power;
  if (mv.status === 'slp') return 70;
  if (mv.heal) return 65;
  if (mv.status || mv.confuse) return 55;
  const strong = (mv.stat?.length ?? 0) > 1 || mv.stat?.some((s) => Math.abs(s.n) > 1);
  return strong ? 55 : 35;
}

/** 혼란 자해용 */
export const CONFUSION_HIT: MoveData = m('', 'normal', 40, 0, 1, '');
