import type { MoveId } from './moves';
import type { ItemId } from './items';
import type { Type } from './types';

export type Growth = 'fast' | 'mediumFast' | 'mediumSlow' | 'slow';
export interface BaseStats { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }

export interface SpeciesData {
  key: string;
  no: number;
  name: string;
  types: [Type] | [Type, Type];
  base: BaseStats;
  growth: Growth;
  expYield: number;
  catchRate: number;
  /** 암컷 비율 (0~1). null = 성별 없음 */
  female: number | null;
  learnset: [number, MoveId][];
  evolve?: { to: string; level: number };
  /** 진화의 돌 같은 도구를 써서 하는 진화 */
  evolveItem?: { to: string; item: ItemId }[];
  /** 기술 개수 제한 없음 (아롱이) */
  unlimitedMoves?: boolean;
  /** 정해진 기술 대신 무작위 후보에서 직접 골라 배운다: from 레벨부터 every 레벨마다 한 번, 이 모습으로 진화할 때 onEvolve번 */
  movePicks?: { from: number; every: number; onEvolve: number };
  category: string;
  height: number;
  weight: number;
  dex: string;
}

const b = (hp: number, atk: number, def: number, spa: number, spd: number, spe: number): BaseStats => ({ hp, atk, def, spa, spd, spe });

type Learnset = [number, MoveId][];

// 진화 계열이 함께 쓰는 기술 배우기 목록
const LS = {
  bulbasaur: [[1, 'tackle'], [1, 'growl'], [7, 'leechvine'], [10, 'leafshot'], [15, 'poisonspore'], [15, 'sleepspore'], [22, 'bigleech'], [29, 'slam'], [32, 'sunbath'], [39, 'petalstorm'], [46, 'solarray']],
  charmander: [[1, 'scratch'], [1, 'growl'], [7, 'ember'], [13, 'glare'], [19, 'dragonrage'], [25, 'flamewheel'], [31, 'slash'], [37, 'flamecannon'], [46, 'inferno']],
  squirtle: [[1, 'tackle'], [1, 'wink'], [7, 'bubble'], [10, 'harden'], [13, 'watershot'], [18, 'bite'], [23, 'wavecrash'], [28, 'stiffen'], [33, 'slam'], [37, 'tsunami'], [45, 'geyser']],
  caterpie: [[1, 'tackle'], [1, 'string']],
  butterfree: [[1, 'psywave'], [10, 'psywave'], [13, 'poisonspore'], [14, 'stunspore'], [15, 'sleepspore'], [18, 'gust'], [23, 'bugbite'], [28, 'wingbeat'], [34, 'mindblast']],
  weedle: [[1, 'poisonsting'], [1, 'string']],
  beedrill: [[1, 'furyswipes'], [10, 'furyswipes'], [15, 'focus'], [20, 'bugbite'], [25, 'feint'], [30, 'acidspray'], [35, 'bugcharge'], [40, 'sludge']],
  pidgey: [[1, 'tackle'], [5, 'dirtkick'], [9, 'gust'], [15, 'quick'], [23, 'wingbeat'], [33, 'focus'], [43, 'dive'], [55, 'megastrike']],
  rattata: [[1, 'tackle'], [1, 'wink'], [7, 'quick'], [13, 'fang'], [20, 'focus'], [27, 'bite'], [34, 'takedown']],
  spearow: [[1, 'peck'], [1, 'growl'], [7, 'glare'], [13, 'furyswipes'], [25, 'feint'], [31, 'wingbeat'], [37, 'dive']],
  ekans: [[1, 'tackle'], [1, 'glare'], [9, 'poisonsting'], [15, 'bite'], [23, 'acidspray'], [29, 'toxicgas'], [37, 'sludge'], [43, 'crunch']],
  pikachu: [[1, 'spark'], [1, 'growl'], [6, 'wink'], [8, 'paralyze'], [11, 'quick'], [15, 'shock'], [20, 'slam'], [26, 'discharge'], [33, 'starfall'], [41, 'lightning']],
  sandshrew: [[1, 'scratch'], [6, 'harden'], [11, 'dirtkick'], [17, 'poisonsting'], [23, 'slash'], [30, 'quake'], [37, 'furyswipes'], [45, 'bigquake']],
  nidoranf: [[1, 'growl'], [1, 'tackle'], [8, 'scratch'], [12, 'poisonsting'], [17, 'wink'], [23, 'bite'], [30, 'furyswipes'], [38, 'sludge'], [45, 'bigquake']],
  nidoranm: [[1, 'glare'], [1, 'tackle'], [8, 'peck'], [12, 'poisonsting'], [17, 'focus'], [23, 'furyswipes'], [30, 'kick'], [38, 'sludge'], [45, 'bigquake']],
  clefairy: [[1, 'tackle'], [1, 'growl'], [8, 'lullaby'], [13, 'furyswipes'], [19, 'harden'], [26, 'starfall'], [34, 'rest'], [43, 'slam'], [50, 'megastrike']],
  vulpix: [[1, 'ember'], [1, 'wink'], [7, 'quick'], [13, 'glare'], [19, 'confuseray'], [25, 'flamewheel'], [31, 'feint'], [37, 'flamecannon'], [43, 'inferno']],
  jigglypuff: [[1, 'lullaby'], [4, 'harden'], [9, 'tackle'], [14, 'wink'], [19, 'furyswipes'], [24, 'rest'], [29, 'starfall'], [34, 'slam'], [39, 'takedown']],
  zubat: [[1, 'leech'], [6, 'gust'], [12, 'bite'], [19, 'confuseray'], [27, 'wingbeat'], [36, 'toxicgas'], [46, 'dive']],
  oddish: [[1, 'leechvine'], [7, 'leafshot'], [14, 'poisonspore'], [16, 'stunspore'], [18, 'sleepspore'], [23, 'acidspray'], [28, 'bigleech'], [32, 'sunbath'], [39, 'petalstorm'], [46, 'sludge']],
  paras: [[1, 'scratch'], [7, 'stunspore'], [13, 'poisonspore'], [19, 'leech'], [25, 'sleepspore'], [31, 'slash'], [37, 'bigleech'], [43, 'bugcharge']],
  venonat: [[1, 'tackle'], [9, 'leech'], [17, 'psywave'], [20, 'poisonspore'], [25, 'bugbite'], [28, 'stunspore'], [33, 'sleepspore'], [36, 'sludge'], [41, 'mindblast']],
  diglett: [[1, 'scratch'], [5, 'growl'], [9, 'mudslap'], [17, 'quake'], [25, 'dirtkick'], [33, 'slash'], [41, 'bigquake']],
  meowth: [[1, 'scratch'], [1, 'growl'], [11, 'bite'], [20, 'starfall'], [28, 'feint'], [35, 'wink'], [41, 'furyswipes'], [46, 'slash']],
  psyduck: [[1, 'scratch'], [5, 'wink'], [10, 'watershot'], [16, 'psywave'], [23, 'wavecrash'], [31, 'calm'], [40, 'furyswipes'], [45, 'tsunami'], [50, 'geyser']],
  mankey: [[1, 'scratch'], [1, 'glare'], [9, 'chop'], [15, 'furyswipes'], [21, 'focus'], [27, 'kick'], [33, 'slam'], [39, 'punch'], [47, 'smash']],
  growlithe: [[1, 'bite'], [1, 'growl'], [9, 'ember'], [18, 'glare'], [22, 'flamewheel'], [26, 'takedown'], [34, 'firefang'], [42, 'crunch'], [50, 'flamecannon']],
  poliwag: [[1, 'bubble'], [7, 'hypno'], [13, 'watershot'], [19, 'furyswipes'], [25, 'wavecrash'], [31, 'slam'], [37, 'focus'], [43, 'tsunami'], [49, 'geyser']],
  abra: [[1, 'psywave'], [16, 'confuseray'], [21, 'calm'], [26, 'rest'], [31, 'starfall'], [38, 'mindblast'], [45, 'hypno']],
  machop: [[1, 'tackle'], [1, 'glare'], [7, 'focus'], [13, 'chop'], [19, 'lowsweep'], [25, 'kick'], [31, 'slam'], [37, 'punch'], [46, 'smash']],
  bellsprout: [[1, 'leafshot'], [6, 'leechvine'], [11, 'wink'], [15, 'sleepspore'], [17, 'poisonspore'], [19, 'stunspore'], [23, 'acidspray'], [30, 'bigleech'], [37, 'petalstorm'], [45, 'sludge']],
  tentacool: [[1, 'poisonsting'], [6, 'bubble'], [12, 'acidspray'], [19, 'confuseray'], [25, 'wavecrash'], [30, 'toxicgas'], [36, 'harden'], [43, 'sludge'], [49, 'tsunami']],
  geodude: [[1, 'tackle'], [6, 'harden'], [11, 'rockthrow'], [16, 'quake'], [21, 'stiffen'], [26, 'rockfall'], [31, 'takedown'], [36, 'bigquake'], [41, 'boulder']],
  ponyta: [[1, 'tackle'], [4, 'growl'], [8, 'wink'], [13, 'ember'], [19, 'flamewheel'], [26, 'quick'], [34, 'takedown'], [43, 'flamecannon'], [53, 'inferno']],
  slowpoke: [[1, 'tackle'], [6, 'growl'], [15, 'watershot'], [20, 'psywave'], [25, 'wavecrash'], [29, 'slam'], [34, 'calm'], [43, 'mindblast'], [48, 'rest']],
  magnemite: [[1, 'tackle'], [6, 'spark'], [11, 'confuseray'], [16, 'ironclaw'], [21, 'paralyze'], [27, 'shock'], [33, 'starfall'], [39, 'ironwall'], [45, 'discharge'], [50, 'lightning']],
  farfetchd: [[1, 'peck'], [7, 'dirtkick'], [13, 'glare'], [19, 'furyswipes'], [25, 'focus'], [31, 'wingbeat'], [37, 'slash'], [44, 'dive']],
  doduo: [[1, 'peck'], [1, 'growl'], [9, 'quick'], [13, 'furyswipes'], [21, 'feint'], [25, 'wingbeat'], [33, 'dive'], [41, 'takedown']],
  seel: [[1, 'tackle'], [5, 'growl'], [10, 'watershot'], [16, 'icechip'], [21, 'coldwind'], [27, 'rest'], [32, 'takedown'], [37, 'frostbeam'], [43, 'tsunami'], [48, 'blizzard']],
  grimer: [[1, 'toxicgas'], [1, 'tackle'], [5, 'harden'], [10, 'acidspray'], [16, 'mudslap'], [23, 'wink'], [31, 'slam'], [40, 'sludge']],
  shellder: [[1, 'tackle'], [1, 'harden'], [9, 'watershot'], [17, 'icechip'], [25, 'stiffen'], [33, 'glare'], [41, 'wavecrash'], [49, 'frostbeam']],
  gastly: [[1, 'lick'], [1, 'hypno'], [8, 'glare'], [13, 'toxicgas'], [16, 'nightray'], [21, 'confuseray'], [28, 'feint'], [33, 'shadowball'], [41, 'sludge']],
  onix: [[1, 'tackle'], [1, 'glare'], [10, 'rockthrow'], [14, 'stiffen'], [23, 'dragonrage'], [27, 'quake'], [36, 'rockfall'], [40, 'slam'], [45, 'irontail'], [51, 'boulder']],
  drowzee: [[1, 'tackle'], [1, 'hypno'], [10, 'wink'], [18, 'psywave'], [25, 'fang'], [31, 'toxicgas'], [36, 'calm'], [40, 'mindblast'], [45, 'rest']],
  krabby: [[1, 'bubble'], [5, 'glare'], [12, 'scratch'], [16, 'harden'], [23, 'wavecrash'], [27, 'furyswipes'], [34, 'slash'], [41, 'tsunami'], [49, 'megastrike']],
  voltorb: [[1, 'tackle'], [9, 'wink'], [13, 'spark'], [17, 'quick'], [23, 'shock'], [29, 'harden'], [33, 'starfall'], [39, 'discharge'], [44, 'megastrike'], [48, 'lightning']],
  exeggcute: [[1, 'tackle'], [1, 'hypno'], [7, 'calm'], [13, 'leechvine'], [19, 'psywave'], [25, 'stunspore'], [31, 'poisonspore'], [37, 'sleepspore'], [43, 'solarray']],
  cubone: [[1, 'tackle'], [1, 'growl'], [5, 'wink'], [9, 'mudslap'], [13, 'glare'], [17, 'focus'], [21, 'quake'], [25, 'feint'], [29, 'slash'], [33, 'takedown'], [37, 'rockfall'], [41, 'bigquake']],
  hitmonlee: [[1, 'lowsweep'], [6, 'focus'], [11, 'chop'], [16, 'wink'], [21, 'kick'], [31, 'slam'], [41, 'takedown'], [46, 'smash']],
  hitmonchan: [[1, 'chop'], [7, 'quick'], [13, 'focus'], [20, 'lowsweep'], [26, 'shock'], [32, 'coldwind'], [38, 'punch'], [44, 'slam'], [50, 'smash']],
  lickitung: [[1, 'lick'], [1, 'tackle'], [7, 'wink'], [13, 'harden'], [19, 'bite'], [25, 'confuseray'], [31, 'slam'], [37, 'glare'], [43, 'takedown']],
  koffing: [[1, 'toxicgas'], [1, 'tackle'], [9, 'acidspray'], [17, 'harden'], [25, 'confuseray'], [33, 'sludge'], [41, 'megastrike']],
  rhyhorn: [[1, 'tackle'], [1, 'wink'], [9, 'rockthrow'], [13, 'quake'], [19, 'furyswipes'], [25, 'stiffen'], [31, 'glare'], [37, 'rockfall'], [43, 'takedown'], [49, 'bigquake'], [55, 'boulder']],
  chansey: [[1, 'tackle'], [5, 'growl'], [9, 'wink'], [13, 'rest'], [17, 'furyswipes'], [23, 'harden'], [29, 'lullaby'], [35, 'slam'], [41, 'calm'], [49, 'takedown']],
  tangela: [[1, 'tackle'], [4, 'sleepspore'], [10, 'leechvine'], [13, 'poisonspore'], [19, 'leafshot'], [25, 'harden'], [31, 'bigleech'], [34, 'stunspore'], [40, 'slam'], [46, 'petalstorm']],
  kangaskhan: [[1, 'scratch'], [7, 'glare'], [13, 'bite'], [19, 'wink'], [25, 'furyswipes'], [31, 'slam'], [37, 'focus'], [43, 'takedown'], [49, 'megastrike']],
  horsea: [[1, 'bubble'], [8, 'dirtkick'], [15, 'glare'], [22, 'watershot'], [26, 'wavecrash'], [29, 'dragonbreath'], [36, 'scale'], [43, 'tsunami'], [51, 'geyser']],
  goldeen: [[1, 'peck'], [1, 'wink'], [10, 'watershot'], [15, 'confuseray'], [24, 'furyswipes'], [29, 'wavecrash'], [38, 'slam'], [43, 'tsunami'], [52, 'megastrike']],
  staryu: [[1, 'tackle'], [1, 'harden'], [7, 'watershot'], [13, 'quick'], [19, 'rest'], [25, 'starfall'], [31, 'wavecrash'], [37, 'calm'], [43, 'tsunami'], [50, 'geyser']],
  mrmime: [[1, 'harden'], [6, 'psywave'], [11, 'wink'], [16, 'focus'], [21, 'furyswipes'], [26, 'calm'], [31, 'confuseray'], [36, 'starfall'], [41, 'mindblast'], [46, 'rest']],
  scyther: [[1, 'quick'], [1, 'glare'], [6, 'focus'], [12, 'feint'], [18, 'bugbite'], [24, 'wingbeat'], [30, 'slash'], [38, 'bugcharge'], [46, 'dive']],
  jynx: [[1, 'tackle'], [1, 'lick'], [9, 'lullaby'], [13, 'icechip'], [21, 'furyswipes'], [25, 'coldwind'], [30, 'psywave'], [35, 'slam'], [41, 'frostbeam'], [47, 'mindblast'], [51, 'blizzard']],
  electabuzz: [[1, 'quick'], [1, 'glare'], [9, 'spark'], [17, 'chop'], [25, 'starfall'], [30, 'shock'], [36, 'wink'], [41, 'punch'], [47, 'discharge'], [58, 'lightning']],
  magmar: [[1, 'ember'], [7, 'glare'], [13, 'acidspray'], [19, 'flamewheel'], [25, 'dirtkick'], [33, 'confuseray'], [41, 'flamecannon'], [49, 'firefang'], [57, 'inferno']],
  pinsir: [[1, 'scratch'], [7, 'focus'], [13, 'chop'], [19, 'lowsweep'], [25, 'harden'], [31, 'kick'], [37, 'punch'], [43, 'bugcharge'], [49, 'smash']],
  tauros: [[1, 'tackle'], [4, 'wink'], [8, 'focus'], [13, 'quick'], [19, 'glare'], [26, 'feint'], [34, 'rest'], [43, 'slam'], [53, 'takedown'], [60, 'megastrike']],
  magikarp: [[1, 'splash'], [15, 'tackle']],
  gyarados: [[1, 'tackle'], [20, 'bite'], [25, 'dragonrage'], [30, 'glare'], [35, 'wavecrash'], [40, 'tsunami'], [45, 'crunch'], [50, 'megastrike'], [55, 'geyser']],
  lapras: [[1, 'watershot'], [1, 'growl'], [1, 'lullaby'], [8, 'icechip'], [15, 'slam'], [22, 'confuseray'], [29, 'wavecrash'], [36, 'frostbeam'], [43, 'tsunami'], [50, 'rest'], [57, 'blizzard']],
  ditto: [[1, 'transform']],
  eevee: [[1, 'tackle'], [1, 'wink'], [8, 'dirtkick'], [16, 'growl'], [23, 'quick'], [30, 'bite'], [36, 'starfall'], [42, 'takedown']],
  vaporeon: [[1, 'tackle'], [1, 'wink'], [8, 'dirtkick'], [16, 'watershot'], [23, 'quick'], [30, 'bite'], [36, 'wavecrash'], [42, 'coldwind'], [47, 'harden'], [52, 'tsunami']],
  jolteon: [[1, 'tackle'], [1, 'wink'], [8, 'dirtkick'], [16, 'spark'], [23, 'quick'], [30, 'kick'], [36, 'shock'], [42, 'paralyze'], [47, 'discharge'], [52, 'lightning']],
  flareon: [[1, 'tackle'], [1, 'wink'], [8, 'dirtkick'], [16, 'ember'], [23, 'quick'], [30, 'bite'], [36, 'flamewheel'], [42, 'acidspray'], [47, 'glare'], [52, 'flamecannon']],
  porygon: [[1, 'tackle'], [1, 'harden'], [9, 'quick'], [12, 'psywave'], [20, 'rest'], [24, 'focus'], [32, 'shock'], [36, 'starfall'], [44, 'discharge']],
  omanyte: [[1, 'tackle'], [1, 'harden'], [13, 'bite'], [19, 'watershot'], [25, 'rockthrow'], [31, 'glare'], [37, 'stiffen'], [43, 'rockfall'], [49, 'tsunami']],
  kabuto: [[1, 'scratch'], [1, 'harden'], [10, 'leech'], [13, 'watershot'], [19, 'glare'], [28, 'dirtkick'], [34, 'rockthrow'], [40, 'slash'], [46, 'rockfall'], [52, 'tsunami']],
  aerodactyl: [[1, 'wingbeat'], [8, 'quick'], [15, 'bite'], [22, 'confuseray'], [29, 'rockfall'], [36, 'glare'], [40, 'dive'], [43, 'takedown'], [50, 'megastrike']],
  snorlax: [[1, 'tackle'], [8, 'calm'], [15, 'harden'], [22, 'focus'], [29, 'fang'], [36, 'rest'], [43, 'slam'], [50, 'quake'], [57, 'megastrike']],
  articuno: [[1, 'gust'], [1, 'icechip'], [13, 'coldwind'], [25, 'calm'], [37, 'wingbeat'], [49, 'frostbeam'], [55, 'dive'], [61, 'rest'], [73, 'blizzard']],
  zapdos: [[1, 'peck'], [1, 'spark'], [13, 'paralyze'], [25, 'shock'], [37, 'wingbeat'], [49, 'discharge'], [55, 'dive'], [61, 'calm'], [73, 'lightning']],
  moltres: [[1, 'wingbeat'], [1, 'ember'], [13, 'flamewheel'], [25, 'glare'], [37, 'dive'], [49, 'flamecannon'], [61, 'calm'], [73, 'inferno']],
  dratini: [[1, 'tackle'], [1, 'glare'], [8, 'paralyze'], [15, 'dragonbreath'], [22, 'dragonrage'], [29, 'slam'], [36, 'scale'], [50, 'dragonwave'], [57, 'megastrike']],
  mewtwo: [[1, 'psywave'], [1, 'glare'], [11, 'harden'], [22, 'starfall'], [33, 'calm'], [44, 'shadowball'], [55, 'rest'], [66, 'mindblast'], [77, 'megastrike']],
  mew: [[1, 'tackle'], [10, 'transform'], [15, 'psywave'], [20, 'slam'], [30, 'calm'], [40, 'mindblast'], [50, 'rockfall'], [60, 'rest']],
} satisfies Record<string, Learnset>;

const S = (d: Omit<SpeciesData, 'no'>) => d;

// 아롱이 (도감 번호 000)
const ARONG_LIST: Omit<SpeciesData, 'no'>[] = [
  // 아롱이: 우리집 검은 포메라니안 (무상성, 수컷). 기술 개수 제한이 없고, 배울 기술을 직접 고른다 (파일 아래쪽 ARONG_BASIC 참고).
  S({ key: 'arong', name: '아롱이', types: ['typeless'], base: b(55, 55, 50, 55, 50, 60), growth: 'mediumFast', expYield: 70, catchRate: 45, female: 0,
    learnset: [], unlimitedMoves: true, evolve: { to: 'arong2', level: 18 }, category: '애기 강아지', height: 0.2, weight: 1.5,
    dex: '우리 집의 소중한 막내.\n복슬복슬한 털뭉치 같다.\n무엇이든 배울 수 있다.' }),
  S({ key: 'arong2', name: '아롱이', types: ['typeless'], base: b(70, 75, 65, 70, 65, 80), growth: 'mediumFast', expYield: 150, catchRate: 45, female: 0,
    learnset: [], unlimitedMoves: true, evolve: { to: 'arong3', level: 32 }, category: '성장기 강아지', height: 0.3, weight: 2.8,
    dex: '호기심이 많아 혀를 내밀고\n여기저기 뛰어다닌다.\n가슴의 별이 자랑이다.' }),
  S({ key: 'arong3', name: '아롱이', types: ['typeless'], base: b(90, 100, 85, 95, 85, 100), growth: 'mediumFast', expYield: 230, catchRate: 45, female: 0,
    learnset: [], unlimitedMoves: true, category: '다 큰 강아지', height: 0.4, weight: 3.5,
    dex: '좋아하는 후드티를 입고\n어디든 함께 간다.\n가족을 지키는 든든한 친구.' }),
];

const lv = (to: string, level: number) => ({ evolve: { to, level } });
const stone = (to: string, item: ItemId) => ({ evolveItem: [{ to, item }] });

/** 1세대 포켓몬 한 줄: 키, 이름, 타입, 종족값, [성장, 경험치, 포획률, 암컷 비율], 기술, [분류, 키, 몸무게], 도감 설명, 진화 */
const G1 = (
  key: string, name: string, types: SpeciesData['types'], base: BaseStats,
  [growth, expYield, catchRate, female]: [Growth, number, number, number | null],
  learnset: Learnset, [category, height, weight]: [string, number, number], dex: string,
  evo: Pick<SpeciesData, 'evolve' | 'evolveItem'> = {},
): Omit<SpeciesData, 'no'> => ({ key, name, types, base, growth, expYield, catchRate, female, learnset, category, height, weight, dex, ...evo });

// 1세대 포켓몬 151종 (도감 번호 순). 능력치는 2세대 기준(특수공격/특수방어 분리, 코일 계열 강철).
// 통신교환 진화는 레벨 진화로 바꿨다.
const GEN1_LIST: Omit<SpeciesData, 'no'>[] = [
  G1('bulbasaur', '이상해씨', ['grass', 'poison'], b(45, 49, 49, 65, 65, 45), ['mediumSlow', 64, 45, 0.125], LS.bulbasaur, ['씨앗', 0.7, 6.9], '태어날 때부터 등에 씨앗을\n지고 있다. 씨앗은 몸과 함께\n조금씩 자란다.', lv('ivysaur', 16)),
  G1('ivysaur', '이상해풀', ['grass', 'poison'], b(60, 62, 63, 80, 80, 60), ['mediumSlow', 141, 45, 0.125], LS.bulbasaur, ['씨앗', 1.0, 13.0], '등의 봉오리가 부풀면 달콤한\n향기가 난다. 꽃이 필 날이\n머지않았다는 신호다.', lv('venusaur', 32)),
  G1('venusaur', '이상해꽃', ['grass', 'poison'], b(80, 82, 83, 100, 100, 80), ['mediumSlow', 208, 45, 0.125], LS.bulbasaur, ['씨앗', 2.0, 100.0], '커다란 꽃잎으로 햇빛을 모아\n힘으로 바꾼다. 맑은 날에\n더욱 기운이 넘친다.'),
  G1('charmander', '파이리', ['fire'], b(39, 52, 43, 60, 50, 65), ['mediumSlow', 65, 45, 0.125], LS.charmander, ['도롱뇽', 0.6, 8.5], '꼬리 끝의 불꽃은 생명의 등불.\n기분이 좋으면 불꽃이\n살랑살랑 흔들린다.', lv('charmeleon', 16)),
  G1('charmeleon', '리자드', ['fire'], b(58, 64, 58, 80, 65, 80), ['mediumSlow', 142, 45, 0.125], LS.charmander, ['화염', 1.1, 19.0], '성격이 거칠어 강한 상대를\n찾아다닌다. 흥분하면 꼬리의\n불꽃이 푸르스름해진다.', lv('charizard', 36)),
  G1('charizard', '리자몽', ['fire', 'flying'], b(78, 84, 78, 109, 85, 100), ['mediumSlow', 209, 45, 0.125], [...LS.charmander, [36, 'wingbeat'], [52, 'dive']], ['화염', 1.7, 90.5], '큰 날개로 하늘 높이 날아올라\n바위도 녹이는 불꽃을 뿜는다.\n약한 상대에게는 뿜지 않는다.'),
  G1('squirtle', '꼬부기', ['water'], b(44, 48, 65, 50, 64, 43), ['mediumSlow', 66, 45, 0.125], LS.squirtle, ['꼬마거북', 0.5, 9.0], '위험을 느끼면 등껍질 속으로\n쏙 숨는다. 입에서 물을\n힘차게 쏘아 반격한다.', lv('wartortle', 16)),
  G1('wartortle', '어니부기', ['water'], b(59, 63, 80, 65, 80, 58), ['mediumSlow', 143, 45, 0.125], LS.squirtle, ['거북', 1.0, 22.5], '복슬복슬한 꼬리는 오래 산\n증거라고 한다. 귀로 균형을\n잡으며 헤엄친다.', lv('blastoise', 36)),
  G1('blastoise', '거북왕', ['water'], b(79, 83, 100, 85, 105, 78), ['mediumSlow', 210, 45, 0.125], LS.squirtle, ['껍질', 1.6, 85.5], '등껍질의 대포에서 쏘는 물은\n두꺼운 철판도 꿰뚫는다.\n일부러 몸을 무겁게 키운다.'),
  G1('caterpie', '캐터피', ['bug'], b(45, 30, 35, 20, 20, 45), ['mediumFast', 53, 255, 0.5], LS.caterpie, ['애벌레', 0.3, 2.9], '발끝이 빨판이라 벽도 나무도\n쉬지 않고 오른다. 머리의\n더듬이에서 냄새를 풍긴다.', lv('metapod', 7)),
  G1('metapod', '단데기', ['bug'], b(50, 20, 55, 25, 25, 30), ['mediumFast', 72, 120, 0.5], [[1, 'harden'], [7, 'harden']], ['번데기', 0.7, 9.9], '단단한 껍질 속에서 진화를\n기다린다. 거의 움직이지\n못해서 그저 버틸 뿐이다.', lv('butterfree', 10)),
  G1('butterfree', '버터플', ['bug', 'flying'], b(60, 45, 50, 80, 80, 70), ['mediumFast', 160, 45, 0.5], LS.butterfree, ['나비', 1.1, 32.0], '날개의 가루는 물을 튕겨 내어\n빗속에서도 날 수 있다.\n꽃의 꿀을 무척 좋아한다.'),
  G1('weedle', '뿔충이', ['bug', 'poison'], b(40, 35, 30, 20, 20, 50), ['mediumFast', 52, 255, 0.5], LS.weedle, ['송충이', 0.3, 3.2], '머리에 날카로운 독침이 있다.\n숲속 풀잎 사이에 숨어\n잎을 갉아 먹는다.', lv('kakuna', 7)),
  G1('kakuna', '딱충이', ['bug', 'poison'], b(45, 25, 50, 25, 25, 35), ['mediumFast', 71, 120, 0.5], [[1, 'harden'], [7, 'harden']], ['번데기', 0.6, 10.0], '나무에 매달려 꼼짝도 않지만\n껍질 속에서는 진화 준비로\n몸이 뜨겁게 달아오른다.', lv('beedrill', 10)),
  G1('beedrill', '독침붕', ['bug', 'poison'], b(65, 80, 40, 45, 80, 75), ['mediumFast', 159, 45, 0.5], LS.beedrill, ['독벌', 1.0, 29.5], '양팔과 꼬리의 독침 세 개로\n쉴 새 없이 찌른다. 무리 지어\n날아다녀 건드리면 위험하다.'),
  G1('pidgey', '구구', ['normal', 'flying'], b(40, 45, 40, 35, 35, 56), ['mediumSlow', 55, 255, 0.5], LS.pidgey, ['아기새', 0.3, 1.8], '싸움을 좋아하지 않아 풀숲에\n숨어 지낸다. 날개로 모래를\n일으켜 몸을 지킨다.', lv('pidgeotto', 18)),
  G1('pidgeotto', '피죤', ['normal', 'flying'], b(63, 60, 55, 50, 50, 71), ['mediumSlow', 113, 120, 0.5], LS.pidgey, ['새', 1.1, 30.0], '넓은 영역을 날며 지킨다.\n발톱이 잘 발달해서 먹이를\n쥔 채 멀리까지 나른다.', lv('pidgeot', 36)),
  G1('pidgeot', '피죤투', ['normal', 'flying'], b(83, 80, 75, 70, 70, 91), ['mediumSlow', 172, 45, 0.5], LS.pidgey, ['새', 1.5, 39.5], '윤기 나는 긴 머리깃이 아름답다.\n힘껏 날갯짓하면 큰 나무도\n휘청거릴 바람이 인다.'),
  G1('rattata', '꼬렛', ['normal'], b(30, 56, 35, 25, 35, 72), ['mediumFast', 57, 255, 0.5], LS.rattata, ['쥐', 0.3, 3.5], '앞니가 평생 자라서 단단한\n것을 갉아 다듬는다.\n어디서든 잘 살아간다.', lv('raticate', 20)),
  G1('raticate', '레트라', ['normal'], b(55, 81, 60, 50, 70, 97), ['mediumFast', 116, 90, 0.5], LS.rattata, ['쥐', 0.7, 18.5], '튼튼한 앞니로 무엇이든 갉는다.\n뒷발의 물갈퀴로 강도\n헤엄쳐 건넌다.'),
  G1('spearow', '깨비참', ['normal', 'flying'], b(40, 60, 30, 31, 31, 70), ['mediumFast', 58, 255, 0.5], LS.spearow, ['아기새', 0.3, 2.0], '짧은 날개를 바쁘게 퍼덕여\n난다. 큰 소리로 울어서\n영역을 알린다.', lv('fearow', 20)),
  G1('fearow', '깨비드릴조', ['normal', 'flying'], b(65, 90, 65, 61, 61, 100), ['mediumFast', 162, 90, 0.5], LS.spearow, ['부리', 1.2, 38.0], '길고 가는 부리로 땅속이나\n물속의 먹이를 집어낸다.\n하루 종일 날아도 지치지 않는다.'),
  G1('ekans', '아보', ['poison'], b(35, 60, 44, 40, 54, 55), ['mediumFast', 62, 255, 0.5], LS.ekans, ['뱀', 2.0, 6.9], '풀밭을 소리 없이 미끄러지듯\n다닌다. 쉴 때는 몸을\n둥글게 말고 있다.', lv('arbok', 22)),
  G1('arbok', '아보크', ['poison'], b(60, 85, 69, 65, 79, 80), ['mediumFast', 147, 90, 0.5], LS.ekans, ['코브라', 3.5, 65.0], '배의 무늬가 무서운 얼굴처럼\n보인다. 무늬를 펼쳐 보이면\n상대는 얼어붙고 만다.'),
  G1('pikachu', '피카츄', ['electric'], b(35, 55, 30, 50, 40, 90), ['mediumFast', 82, 190, 0.5], LS.pikachu, ['쥐', 0.4, 6.0], '볼의 빨간 주머니에 전기를\n모은다. 꼬리를 세워 주변의\n기척을 살핀다.', stone('raichu', 'thunderstone')),
  G1('raichu', '라이츄', ['electric'], b(60, 90, 55, 90, 80, 100), ['mediumFast', 122, 75, 0.5], LS.pikachu, ['쥐', 0.8, 30.0], '전기가 너무 모이면 꼬리를\n땅에 대어 흘려보낸다.\n어두운 곳에서는 몸이 빛난다.'),
  G1('sandshrew', '모래두지', ['ground'], b(50, 75, 85, 20, 30, 40), ['mediumFast', 93, 255, 0.5], LS.sandshrew, ['쥐', 0.6, 12.0], '메마른 땅에 굴을 파고 산다.\n위험하면 몸을 공처럼\n둥글게 말아 지킨다.', lv('sandslash', 22)),
  G1('sandslash', '고지', ['ground'], b(75, 100, 110, 45, 55, 65), ['mediumFast', 163, 90, 0.5], LS.sandshrew, ['쥐', 1.0, 29.5], '등의 가시는 딱딱해진 피부다.\n몸을 말고 굴러서 덤벼드는\n상대를 찌른다.'),
  G1('nidoranf', '니드런♀', ['poison'], b(55, 47, 52, 40, 40, 41), ['mediumSlow', 59, 235, 1], LS.nidoranf, ['독침', 0.4, 7.0], '몸은 작아도 독침을 지녔다.\n얌전한 성격이라 싸우기보다\n도망치는 쪽을 고른다.', lv('nidorina', 16)),
  G1('nidorina', '니드리나', ['poison'], b(70, 62, 67, 55, 55, 56), ['mediumSlow', 117, 120, 1], LS.nidoranf, ['독침', 0.8, 20.0], '동료와 있을 때는 가시를 눕혀\n서로 다치지 않게 한다.\n혼자가 되면 불안해한다.', stone('nidoqueen', 'moonstone')),
  G1('nidoqueen', '니드퀸', ['poison', 'ground'], b(90, 82, 87, 75, 85, 76), ['mediumSlow', 194, 45, 1], [...LS.nidoranf, [23, 'slam']], ['드릴', 1.3, 60.0], '단단한 비늘로 온몸을 감쌌다.\n새끼를 지킬 때 가장 큰 힘을\n낸다고 한다.'),
  G1('nidoranm', '니드런♂', ['poison'], b(46, 57, 40, 40, 40, 50), ['mediumSlow', 60, 235, 0], LS.nidoranm, ['독침', 0.5, 9.0], '큰 귀를 세워 멀리서 나는\n소리도 알아챈다. 화가 나면\n이마의 뿔로 들이받는다.', lv('nidorino', 16)),
  G1('nidorino', '니드리노', ['poison'], b(61, 72, 57, 55, 55, 65), ['mediumSlow', 118, 120, 0], LS.nidoranm, ['독침', 0.9, 19.5], '성미가 급해 금세 덤벼든다.\n다이아몬드보다 단단한 뿔로\n바위도 뚫는다고 한다.', stone('nidoking', 'moonstone')),
  G1('nidoking', '니드킹', ['poison', 'ground'], b(81, 92, 77, 85, 75, 85), ['mediumSlow', 195, 45, 0], [...LS.nidoranm, [23, 'slam']], ['드릴', 1.4, 62.0], '굵은 꼬리를 한 번 휘두르면\n철탑도 꺾인다. 한번 날뛰면\n아무도 말릴 수 없다.'),
  G1('clefairy', '삐삐', ['normal'], b(70, 45, 48, 60, 65, 35), ['fast', 68, 150, 0.75], LS.clefairy, ['요정', 0.6, 7.5], '보름달이 뜬 밤에 모여 춤춘다.\n사랑스러운 모습이라 인기가\n많지만 좀처럼 볼 수 없다.', stone('clefable', 'moonstone')),
  G1('clefable', '픽시', ['normal'], b(95, 70, 73, 85, 90, 60), ['fast', 129, 25, 0.75], LS.clefairy, ['요정', 1.3, 40.0], '귀가 무척 밝아 멀리서 바늘\n떨어지는 소리도 듣는다.\n조용한 산속에 산다.'),
  G1('vulpix', '식스테일', ['fire'], b(38, 41, 40, 50, 65, 65), ['mediumFast', 63, 190, 0.75], LS.vulpix, ['여우', 0.6, 9.9], '태어날 때는 꼬리가 하나지만\n자라면서 여섯 갈래로 나뉜다.\n꼬리 끝이 따뜻하다.', stone('ninetales', 'firestone')),
  G1('ninetales', '나인테일', ['fire'], b(73, 76, 75, 81, 100, 100), ['mediumFast', 178, 75, 0.75], LS.vulpix, ['여우', 1.1, 19.9], '아홉 개의 꼬리에 신비한 힘이\n깃들었다고 전해진다.\n천 년을 산다는 이야기도 있다.'),
  G1('jigglypuff', '푸린', ['normal'], b(115, 45, 20, 45, 25, 20), ['fast', 76, 170, 0.75], LS.jigglypuff, ['풍선', 0.5, 5.5], '동그란 눈으로 바라보며\n자장가를 부른다. 끝까지\n듣고 깨어 있는 이가 없다.', stone('wigglytuff', 'moonstone')),
  G1('wigglytuff', '푸크린', ['normal'], b(140, 70, 45, 75, 50, 45), ['fast', 109, 50, 0.75], LS.jigglypuff, ['풍선', 1.0, 12.0], '털이 아주 부드러워 한번\n만지면 손을 떼기 어렵다.\n숨을 들이쉬면 몸이 부푼다.'),
  G1('zubat', '주뱃', ['poison', 'flying'], b(40, 45, 35, 30, 40, 55), ['mediumFast', 54, 255, 0.5], LS.zubat, ['박쥐', 0.8, 7.5], '눈이 없지만 입에서 내는\n소리의 울림으로 길을 찾는다.\n어두운 동굴에 모여 산다.', lv('golbat', 22)),
  G1('golbat', '골뱃', ['poison', 'flying'], b(75, 80, 70, 65, 75, 90), ['mediumFast', 171, 90, 0.5], LS.zubat, ['박쥐', 1.6, 55.0], '커다란 입과 날카로운 이빨을\n지녔다. 밤이 되면 동굴을\n나와 하늘을 누빈다.'),
  G1('oddish', '뚜벅쵸', ['grass', 'poison'], b(45, 50, 55, 75, 65, 30), ['mediumSlow', 78, 255, 0.5], LS.oddish, ['잡초', 0.5, 5.4], '낮에는 땅에 몸을 묻고 자다가\n밤이 되면 뚜벅뚜벅 걸어\n다니며 씨를 뿌린다.', lv('gloom', 21)),
  G1('gloom', '냄새꼬', ['grass', 'poison'], b(60, 65, 70, 85, 75, 40), ['mediumSlow', 132, 120, 0.5], LS.oddish, ['잡초', 0.8, 8.6], '입가에 흐르는 꿀에서 지독한\n냄새가 난다. 그 냄새를\n좋아하는 사람도 드물게 있다.', stone('vileplume', 'leafstone')),
  G1('vileplume', '라플레시아', ['grass', 'poison'], b(75, 80, 85, 100, 90, 50), ['mediumSlow', 184, 45, 0.5], LS.oddish, ['꽃', 1.2, 18.6], '세상에서 손꼽히게 큰 꽃잎을\n지녔다. 걸을 때마다 꽃가루가\n흩날린다.'),
  G1('paras', '파라스', ['bug', 'grass'], b(35, 70, 55, 45, 55, 25), ['mediumFast', 70, 190, 0.5], LS.paras, ['버섯', 0.3, 5.4], '등에 버섯 두 송이가 자란다.\n버섯은 파라스에게서 양분을\n받아 함께 커 간다.', lv('parasect', 24)),
  G1('parasect', '파라섹트', ['bug', 'grass'], b(60, 95, 80, 60, 80, 30), ['mediumFast', 128, 75, 0.5], LS.paras, ['버섯', 1.0, 29.5], '등의 큰 버섯갓에서 포자를\n뿌린다. 축축하고 어두운\n곳을 좋아한다.'),
  G1('venonat', '콘팡', ['bug', 'poison'], b(60, 55, 50, 40, 55, 45), ['mediumFast', 75, 190, 0.5], LS.venonat, ['곤충', 1.0, 30.0], '커다란 눈은 작은 눈이 잔뜩\n모인 것이다. 밤이면 불빛에\n이끌려 모여든다.', lv('venomoth', 31)),
  G1('venomoth', '도나리', ['bug', 'poison'], b(70, 65, 60, 90, 75, 90), ['mediumFast', 138, 75, 0.5], [...LS.venonat, [31, 'gust'], [46, 'wingbeat']], ['독나방', 1.5, 12.5], '날개의 가루는 색에 따라\n효과가 다르다. 날갯짓할\n때마다 가루가 흩어진다.'),
  G1('diglett', '디그다', ['ground'], b(10, 55, 25, 35, 45, 95), ['mediumFast', 81, 255, 0.5], LS.diglett, ['두더지', 0.2, 0.8], '땅속 얕은 곳을 파고 다닌다.\n지나간 자리는 흙이 부드러워져\n밭으로 쓰기 좋다.', lv('dugtrio', 26)),
  G1('dugtrio', '닥트리오', ['ground'], b(35, 80, 50, 50, 70, 120), ['mediumFast', 153, 50, 0.5], LS.diglett, ['두더지', 0.7, 33.3], '셋이 한마음으로 움직인다.\n힘을 합쳐 아주 깊은 곳까지\n순식간에 파 내려간다.'),
  G1('meowth', '나옹', ['normal'], b(40, 45, 35, 40, 40, 90), ['mediumFast', 69, 255, 0.5], LS.meowth, ['요괴고양이', 0.4, 4.2], '반짝이는 것을 무척 좋아해서\n밤마다 주우러 다닌다.\n발톱은 넣었다 뺐다 한다.', lv('persian', 28)),
  G1('persian', '페르시온', ['normal'], b(65, 70, 60, 65, 65, 115), ['mediumFast', 148, 90, 0.5], LS.meowth, ['샴고양이', 1.0, 32.0], '이마의 보석과 매끄러운 털이\n우아하다. 기분이 변덕스러워\n다루기 어렵다.'),
  G1('psyduck', '고라파덕', ['water'], b(50, 52, 48, 65, 50, 55), ['mediumFast', 80, 190, 0.5], LS.psyduck, ['오리', 0.8, 19.6], '늘 두통에 시달려 머리를\n감싸 쥔다. 두통이 심해지면\n신비한 힘이 터져 나온다.', lv('golduck', 33)),
  G1('golduck', '골덕', ['water'], b(80, 82, 78, 95, 80, 85), ['mediumFast', 174, 75, 0.5], LS.psyduck, ['오리', 1.7, 76.6], '물갈퀴 달린 손발로 누구보다\n빠르게 헤엄친다. 이마의\n구슬이 빛나면 힘이 솟는다.'),
  G1('mankey', '망키', ['fighting'], b(40, 80, 35, 35, 45, 70), ['mediumFast', 74, 190, 0.5], LS.mankey, ['돼지원숭이', 0.5, 28.0], '사소한 일에도 벌컥 화를 낸다.\n화가 나면 무리 전체가\n한꺼번에 날뛴다.', lv('primeape', 28)),
  G1('primeape', '성원숭', ['fighting'], b(65, 105, 60, 60, 70, 95), ['mediumFast', 149, 75, 0.5], LS.mankey, ['돼지원숭이', 1.0, 32.0], '눈이 마주치기만 해도 화를\n내며 쫓아온다. 화가 풀릴\n때까지 절대 멈추지 않는다.'),
  G1('growlithe', '가디', ['fire'], b(55, 70, 45, 70, 50, 60), ['slow', 91, 190, 0.25], LS.growlithe, ['강아지', 0.7, 19.0], '주인에게 충실하고 용감하다.\n낯선 상대가 영역에 들어오면\n크게 짖어 쫓아낸다.', stone('arcanine', 'firestone')),
  G1('arcanine', '윈디', ['fire'], b(90, 110, 80, 100, 80, 95), ['slow', 213, 75, 0.25], [...LS.growlithe, [54, 'megastrike']], ['전설', 1.9, 155.0], '갈기를 휘날리며 달리는 모습이\n당당하고 아름답다.\n하루에 아주 먼 길을 달린다.'),
  G1('poliwag', '발챙이', ['water'], b(40, 50, 40, 40, 40, 90), ['mediumSlow', 77, 255, 0.5], LS.poliwag, ['올챙이', 0.6, 12.4], '갓 생긴 다리로는 걷는 것이\n서툴다. 배의 소용돌이 무늬는\n비쳐 보이는 속이다.', lv('poliwhirl', 25)),
  G1('poliwhirl', '슈륙챙이', ['water'], b(65, 65, 65, 50, 50, 90), ['mediumSlow', 131, 120, 0.5], LS.poliwag, ['올챙이', 1.0, 20.0], '물 밖에서도 지낼 수 있지만\n피부가 마르지 않게 늘\n땀으로 몸을 적신다.', stone('poliwrath', 'waterstone')),
  G1('poliwrath', '강챙이', ['water', 'fighting'], b(90, 85, 95, 70, 90, 70), ['mediumSlow', 185, 45, 0.5], [...LS.poliwag, [1, 'chop'], [35, 'punch'], [51, 'smash']], ['올챙이', 1.3, 54.0], '단련된 근육으로 넓은 바다도\n쉬지 않고 헤엄쳐 건넌다.\n수영도 싸움도 뛰어나다.'),
  G1('abra', '캐이시', ['psychic'], b(25, 20, 15, 105, 55, 90), ['mediumSlow', 73, 200, 0.25], LS.abra, ['초능력', 0.9, 19.5], '하루의 대부분을 잠으로 보낸다.\n자면서도 위험을 느끼면\n순식간에 자리를 옮긴다.', lv('kadabra', 16)),
  G1('kadabra', '윤겔라', ['psychic'], b(40, 35, 30, 120, 70, 105), ['mediumSlow', 145, 100, 0.25], LS.abra, ['초능력', 1.3, 56.5], '숟가락을 쥐고 정신을 모으면\n힘이 강해진다. 곁에 있으면\n시계가 이상해진다고 한다.', lv('alakazam', 36)),
  G1('alakazam', '후딘', ['psychic'], b(55, 50, 45, 135, 85, 120), ['mediumSlow', 186, 50, 0.25], LS.abra, ['초능력', 1.5, 48.0], '한번 본 것은 절대 잊지 않는다.\n머리가 너무 좋아서 힘 대신\n초능력으로 몸을 움직인다.'),
  G1('machop', '알통몬', ['fighting'], b(70, 80, 50, 35, 35, 35), ['mediumSlow', 88, 180, 0.25], LS.machop, ['괴력', 0.8, 19.5], '온몸이 근육이라 어른도 번쩍\n들어 올린다. 바위를 들며\n날마다 몸을 단련한다.', lv('machoke', 28)),
  G1('machoke', '근육몬', ['fighting'], b(80, 100, 70, 50, 60, 45), ['mediumSlow', 146, 90, 0.25], LS.machop, ['괴력', 1.5, 70.5], '넘치는 힘을 벨트로 누르고\n있다. 무거운 짐 나르는 일을\n기꺼이 돕는다.', lv('machamp', 38)),
  G1('machamp', '괴력몬', ['fighting'], b(90, 130, 80, 65, 85, 55), ['mediumSlow', 193, 45, 0.25], LS.machop, ['괴력', 1.6, 130.0], '네 개의 팔로 눈 깜짝할 사이에\n주먹을 퍼붓는다. 섬세한\n일은 팔이 엉켜서 서툴다.'),
  G1('bellsprout', '모다피', ['grass', 'poison'], b(50, 75, 35, 70, 30, 40), ['mediumSlow', 84, 255, 0.5], LS.bellsprout, ['꽃', 0.7, 4.0], '가느다란 몸을 휘청이며 걷는다.\n뿌리 같은 발을 땅에 박고\n물을 빨아올린다.', lv('weepinbell', 21)),
  G1('weepinbell', '우츠동', ['grass', 'poison'], b(65, 90, 50, 85, 45, 55), ['mediumSlow', 151, 120, 0.5], LS.bellsprout, ['파리잡이', 1.0, 6.4], '줄기 끝의 갈고리로 나뭇가지에\n매달려 잔다. 아침이면 가끔\n바닥에 떨어져 있다.', stone('victreebel', 'leafstone')),
  G1('victreebel', '우츠보트', ['grass', 'poison'], b(80, 105, 65, 100, 60, 70), ['mediumSlow', 191, 45, 0.5], LS.bellsprout, ['파리잡이', 1.7, 15.5], '머리의 긴 덩굴을 살랑거려\n먹이를 꾀어낸다. 달콤한\n꿀 냄새를 풍긴다.'),
  G1('tentacool', '왕눈해', ['water', 'poison'], b(40, 40, 35, 50, 100, 70), ['slow', 105, 190, 0.5], LS.tentacool, ['해파리', 0.9, 45.5], '몸의 대부분이 물이라 바다에\n둥둥 떠다닌다. 촉수의\n독침에 쏘이면 얼얼하다.', lv('tentacruel', 30)),
  G1('tentacruel', '독파리', ['water', 'poison'], b(80, 70, 65, 80, 120, 100), ['slow', 205, 60, 0.5], LS.tentacool, ['해파리', 1.6, 55.0], '머리의 붉은 구슬이 빛나면\n조심해야 한다. 수많은 촉수를\n그물처럼 펼친다.'),
  G1('geodude', '꼬마돌', ['rock', 'ground'], b(40, 80, 100, 30, 30, 20), ['mediumSlow', 86, 255, 0.5], LS.geodude, ['암석', 0.4, 20.0], '산길의 돌과 똑같이 생겨서\n모르고 밟기 쉽다. 밟히면\n화를 내며 팔을 휘두른다.', lv('graveler', 25)),
  G1('graveler', '데구리', ['rock', 'ground'], b(55, 95, 115, 45, 45, 35), ['mediumSlow', 134, 120, 0.5], LS.geodude, ['암석', 1.0, 105.0], '비탈길을 데굴데굴 굴러서\n내려간다. 구르다 몸이 깎여도\n조금도 신경 쓰지 않는다.', lv('golem', 36)),
  G1('golem', '딱구리', ['rock', 'ground'], b(80, 110, 130, 55, 65, 45), ['mediumSlow', 177, 45, 0.5], LS.geodude, ['메가톤', 1.4, 300.0], '바위 같은 껍질로 몸을 덮었다.\n해마다 허물을 벗으며 껍질이\n더 크고 단단해진다.'),
  G1('ponyta', '포니타', ['fire'], b(50, 85, 55, 65, 65, 90), ['mediumFast', 152, 190, 0.5], LS.ponyta, ['불꽃말', 1.0, 30.0], '갓 태어났을 때는 겨우 서지만\n달리면서 다리가 튼튼해진다.\n갈기의 불은 믿는 이에겐 뜨겁지 않다.', lv('rapidash', 40)),
  G1('rapidash', '날쌩마', ['fire'], b(65, 100, 70, 80, 80, 105), ['mediumFast', 192, 60, 0.5], LS.ponyta, ['불꽃말', 1.7, 95.0], '빠른 것을 보면 겨루고 싶어\n쫓아간다. 전속력으로 달리면\n갈기가 불화살처럼 보인다.'),
  G1('slowpoke', '야돈', ['water', 'psychic'], b(90, 65, 65, 40, 40, 15), ['mediumFast', 99, 190, 0.5], LS.slowpoke, ['얼간이', 1.2, 36.0], '언제나 멍하니 있어서 무슨\n생각을 하는지 알 수 없다.\n꼬리로 낚시하는 것이 특기.', lv('slowbro', 37)),
  G1('slowbro', '야도란', ['water', 'psychic'], b(95, 75, 110, 100, 80, 30), ['mediumFast', 164, 75, 0.5], LS.slowpoke, ['기생', 1.6, 78.5], '꼬리를 문 조개와 한 몸처럼\n지낸다. 조개가 물고 있어도\n아픈 줄을 모른다.'),
  G1('magnemite', '코일', ['electric', 'steel'], b(25, 35, 70, 95, 55, 45), ['mediumFast', 89, 190, null], LS.magnemite, ['자석', 0.3, 6.0], '양쪽의 자석에서 나오는 힘으로\n공중에 떠 있다. 전선 근처에\n자주 나타난다.', lv('magneton', 30)),
  G1('magneton', '레어코일', ['electric', 'steel'], b(50, 60, 95, 120, 70, 70), ['mediumFast', 161, 60, null], LS.magnemite, ['자석', 1.0, 60.0], '코일 셋이 강한 자력으로\n붙었다. 가까이 가면 기계가\n고장 나기도 한다.'),
  G1('farfetchd', '파오리', ['normal', 'flying'], b(52, 65, 55, 58, 62, 60), ['mediumFast', 94, 45, 0.5], LS.farfetchd, ['청둥오리', 0.8, 15.0], '늘 들고 다니는 파 줄기는\n무기이자 보물이다.\n마음에 드는 파를 찾아 헤맨다.'),
  G1('doduo', '두두', ['normal', 'flying'], b(35, 85, 45, 35, 35, 75), ['mediumFast', 96, 190, 0.5], LS.doduo, ['쌍둥이새', 1.4, 39.2], '나는 것은 서툴지만 달리기는\n아주 빠르다. 두 머리가\n번갈아 자며 주위를 살핀다.', lv('dodrio', 31)),
  G1('dodrio', '두트리오', ['normal', 'flying'], b(60, 110, 70, 60, 60, 100), ['mediumFast', 158, 45, 0.5], LS.doduo, ['세쌍둥이새', 1.8, 85.2], '세 머리가 기쁨, 슬픔, 화를\n따로 느낀다. 셋이 다투면\n한 발짝도 움직이지 못한다.'),
  G1('seel', '쥬쥬', ['water'], b(65, 45, 55, 45, 70, 45), ['mediumFast', 100, 190, 0.5], LS.seel, ['강치', 1.1, 90.0], '차가운 바다를 좋아해서 추울\n수록 기운이 난다. 머리의\n뿔로 얼음을 깨고 나온다.', lv('dewgong', 34)),
  G1('dewgong', '쥬레곤', ['water', 'ice'], b(90, 70, 80, 70, 95, 70), ['mediumFast', 176, 75, 0.5], LS.seel, ['강치', 1.7, 120.0], '눈처럼 흰 털로 온몸을 덮었다.\n얼음 위에서 자는 것을\n가장 좋아한다.'),
  G1('grimer', '질퍽이', ['poison'], b(80, 80, 50, 40, 50, 25), ['mediumFast', 90, 190, 0.5], LS.grimer, ['진흙', 0.9, 30.0], '더러운 진흙에서 태어났다.\n몸이 흐물흐물해서 좁은\n틈으로도 스며든다.', lv('muk', 38)),
  G1('muk', '질뻐기', ['poison'], b(105, 105, 75, 65, 100, 50), ['mediumFast', 157, 75, 0.5], LS.grimer, ['진흙', 1.2, 30.0], '지나간 자리에는 한동안 풀이\n자라지 않는다. 지저분한\n곳일수록 좋아한다.'),
  G1('shellder', '셀러', ['water'], b(30, 65, 100, 45, 25, 40), ['slow', 97, 190, 0.5], LS.shellder, ['두조개', 0.3, 4.0], '다이아몬드보다 단단한 껍데기를\n지녔다. 껍데기를 여닫으며\n뒤쪽으로 헤엄친다.', stone('cloyster', 'waterstone')),
  G1('cloyster', '파르셀', ['water', 'ice'], b(50, 95, 180, 85, 45, 70), ['slow', 203, 60, 0.5], [...LS.shellder, [1, 'furyswipes'], [45, 'blizzard']], ['두조개', 1.5, 132.5], '껍데기를 닫으면 어떤 공격도\n통하지 않는다. 속이 어떻게\n생겼는지 아무도 모른다.'),
  G1('gastly', '고오스', ['ghost', 'poison'], b(30, 35, 30, 100, 35, 80), ['mediumSlow', 95, 190, 0.5], LS.gastly, ['가스', 1.3, 0.1], '몸의 대부분이 가스라서 센\n바람이 불면 날아가 버린다.\n낡은 건물에 숨어 산다.', lv('haunter', 25)),
  G1('haunter', '고우스트', ['ghost', 'poison'], b(45, 50, 45, 115, 55, 95), ['mediumSlow', 126, 90, 0.5], LS.gastly, ['가스', 1.6, 0.1], '어둠 속에서 벽을 통과해\n다가온다. 누가 보고 있는\n기분이 들면 이 녀석일지도.', lv('gengar', 36)),
  G1('gengar', '팬텀', ['ghost', 'poison'], b(60, 65, 60, 130, 75, 110), ['mediumSlow', 190, 45, 0.5], LS.gastly, ['그림자', 1.5, 40.5], '그림자 속에 숨어 장난칠\n기회를 엿본다. 근처에 있으면\n갑자기 으스스 추워진다.'),
  G1('onix', '롱스톤', ['rock', 'ground'], b(35, 45, 160, 30, 45, 70), ['mediumFast', 108, 45, 0.5], LS.onix, ['돌뱀', 8.8, 210.0], '땅속을 파고들며 바위를 삼켜\n몸을 키운다. 지나간 자리는\n굴이 되어 남는다.'),
  G1('drowzee', '슬리프', ['psychic'], b(60, 48, 45, 43, 90, 42), ['mediumFast', 102, 190, 0.5], LS.drowzee, ['최면', 1.0, 32.4], '상대를 잠재우고 꿈을 먹는다.\n즐거운 꿈을 특히 좋아한다고\n한다.', lv('hypno', 26)),
  G1('hypno', '슬리퍼', ['psychic'], b(85, 73, 70, 73, 115, 67), ['mediumFast', 165, 75, 0.5], LS.drowzee, ['최면', 1.6, 75.6], '손에 든 추를 흔들어 졸음을\n부른다. 추를 보다 보면 방금\n일도 깜빡 잊는다.'),
  G1('krabby', '크랩', ['water'], b(30, 105, 90, 25, 25, 50), ['mediumFast', 115, 225, 0.5], LS.krabby, ['갯가게', 0.4, 6.5], '모래사장에 구멍을 파고 산다.\n집게는 떨어져도 금세\n다시 자라난다.', lv('kingler', 28)),
  G1('kingler', '킹크랩', ['water'], b(55, 130, 115, 50, 50, 75), ['mediumFast', 206, 60, 0.5], LS.krabby, ['집게', 1.3, 60.0], '커다란 집게는 힘이 엄청나지만\n너무 무거워서 겨누는 데\n시간이 걸린다.'),
  G1('voltorb', '찌리리공', ['electric'], b(40, 30, 50, 55, 55, 100), ['mediumFast', 103, 190, null], LS.voltorb, ['볼', 0.5, 10.4], '몬스터볼과 꼭 닮았다.\n모르고 건드리면 찌릿하고\n전기를 뿜는다.', lv('electrode', 30)),
  G1('electrode', '붐볼', ['electric'], b(60, 50, 70, 80, 80, 140), ['mediumFast', 150, 60, null], LS.voltorb, ['볼', 1.2, 66.6], '전기를 잔뜩 모으면 몸이\n부풀어 바람에 떠다닌다.\n작은 자극에도 펑 터진다.'),
  G1('exeggcute', '아라리', ['grass', 'psychic'], b(60, 40, 80, 60, 45, 40), ['slow', 98, 90, 0.5], LS.exeggcute, ['알', 0.4, 2.5], '여섯이 모여 하나로 지낸다.\n서로 마음으로 이야기해서\n떨어져도 금세 다시 모인다.', stone('exeggutor', 'leafstone')),
  G1('exeggutor', '나시', ['grass', 'psychic'], b(95, 95, 85, 125, 65, 55), ['slow', 212, 45, 0.5], [...LS.exeggcute, [19, 'slam'], [31, 'mindblast'], [40, 'petalstorm']], ['야자열매', 2.0, 120.0], '머리마다 따로 생각을 한다.\n걸어 다니는 열대 나무라고\n불리기도 한다.'),
  G1('cubone', '탕구리', ['ground'], b(50, 50, 95, 40, 50, 35), ['mediumFast', 87, 190, 0.5], LS.cubone, ['외톨이', 0.4, 6.5], '뼈로 된 투구를 한 번도 벗지\n않아 맨얼굴을 본 이가 없다.\n달밤이면 혼자 운다.', lv('marowak', 28)),
  G1('marowak', '텅구리', ['ground'], b(60, 80, 110, 50, 80, 45), ['mediumFast', 124, 75, 0.5], LS.cubone, ['뼈다귀', 1.0, 45.0], '슬픔을 딛고 씩씩해졌다.\n손에 든 뼈를 부메랑처럼\n능숙하게 던진다.'),
  G1('hitmonlee', '시라소몬', ['fighting'], b(50, 120, 53, 35, 110, 87), ['mediumFast', 139, 45, 0], LS.hitmonlee, ['킥', 1.5, 49.8], '다리가 용수철처럼 늘어나서\n먼 곳의 상대도 걷어찬다.\n싸운 뒤엔 다리를 주무른다.'),
  G1('hitmonchan', '홍수몬', ['fighting'], b(50, 105, 79, 35, 110, 76), ['mediumFast', 140, 45, 0], LS.hitmonchan, ['펀치', 1.4, 50.2], '눈에 보이지 않을 만큼 빠른\n주먹을 날린다. 3분쯤 싸우면\n숨을 돌려야 한다.'),
  G1('lickitung', '내루미', ['normal'], b(90, 55, 75, 60, 75, 30), ['mediumFast', 127, 45, 0.5], LS.lickitung, ['핥기', 1.2, 65.5], '키의 두 배나 되는 혀를 손처럼\n쓴다. 처음 보는 것은 일단\n핥아서 맛을 기억한다.'),
  G1('koffing', '또가스', ['poison'], b(40, 65, 95, 60, 45, 35), ['mediumFast', 114, 190, 0.5], LS.koffing, ['독가스', 0.6, 1.0], '풍선 같은 몸에 가스가 가득\n차서 둥실 떠다닌다.\n더우면 몸이 더 부푼다.', lv('weezing', 35)),
  G1('weezing', '또도가스', ['poison'], b(65, 90, 120, 85, 70, 60), ['mediumFast', 173, 60, 0.5], LS.koffing, ['독가스', 1.2, 9.5], '쌍둥이처럼 붙은 두 몸이\n번갈아 부풀고 줄어들며\n가스를 섞는다.'),
  G1('rhyhorn', '뿔카노', ['ground', 'rock'], b(80, 85, 95, 30, 30, 25), ['slow', 135, 120, 0.5], LS.rhyhorn, ['뿔', 1.0, 115.0], '한번 달리기 시작하면 곧장\n나아갈 뿐 방향을 못 바꾼다.\n왜 달렸는지도 곧 잊는다.', lv('rhydon', 42)),
  G1('rhydon', '코뿌리', ['ground', 'rock'], b(105, 130, 120, 45, 45, 40), ['slow', 204, 60, 0.5], LS.rhyhorn, ['드릴', 1.9, 120.0], '뒷다리로 일어서면서 머리가\n좋아졌다. 드릴 같은 뿔로\n단단한 바위도 뚫는다.'),
  G1('chansey', '럭키', ['normal'], b(250, 5, 5, 35, 105, 50), ['fast', 255, 30, 1], LS.chansey, ['알', 1.1, 34.6], '다친 이를 보면 영양 가득한\n알을 나눠 준다. 만나면\n행운이 온다고 전해진다.'),
  G1('tangela', '덩쿠리', ['grass'], b(65, 55, 115, 100, 40, 60), ['mediumFast', 166, 45, 0.5], LS.tangela, ['덩굴', 1.0, 35.0], '온몸이 푸른 덩굴에 덮여\n속모습은 아무도 모른다.\n덩굴은 끊겨도 다시 자란다.'),
  G1('kangaskhan', '캥카', ['normal'], b(105, 95, 80, 40, 80, 90), ['mediumFast', 175, 45, 1], LS.kangaskhan, ['부모자식', 2.2, 80.0], '배의 주머니에서 새끼를 키운다.\n새끼를 지키기 위해서라면\n어떤 상대에게도 물러서지 않는다.'),
  G1('horsea', '쏘드라', ['water'], b(30, 40, 70, 70, 25, 60), ['mediumFast', 83, 225, 0.5], LS.horsea, ['드래곤', 0.4, 8.0], '꼬리를 산호에 감고 쉰다.\n위험하면 입에서 먹물을\n쏘고 달아난다.', lv('seadra', 32)),
  G1('seadra', '시드라', ['water'], b(55, 65, 95, 95, 45, 85), ['mediumFast', 155, 75, 0.5], LS.horsea, ['드래곤', 1.2, 25.0], '온몸에 뾰족한 가시가 돋았다.\n지느러미를 재빨리 움직여\n뒤로도 헤엄친다.'),
  G1('goldeen', '콘치', ['water'], b(45, 67, 60, 35, 50, 63), ['mediumFast', 111, 225, 0.5], LS.goldeen, ['금붕어', 0.6, 15.0], '하늘거리는 지느러미가 드레스\n같아 물의 무희라 불린다.\n뿔은 보기보다 날카롭다.', lv('seaking', 33)),
  G1('seaking', '왕콘치', ['water'], b(80, 92, 65, 65, 80, 68), ['mediumFast', 170, 60, 0.5], LS.goldeen, ['금붕어', 1.3, 39.0], '가을이 되면 강을 거슬러\n오른다. 뿔로 바위에 구멍을\n내어 보금자리를 만든다.'),
  G1('staryu', '별가사리', ['water'], b(30, 45, 55, 70, 55, 85), ['slow', 106, 225, null], LS.staryu, ['별모양', 0.8, 34.5], '가운데 붉은 핵이 밤이면\n깜빡깜빡 빛난다. 몸이\n떨어져 나가도 다시 자란다.', stone('starmie', 'waterstone')),
  G1('starmie', '아쿠스타', ['water', 'psychic'], b(60, 75, 85, 100, 85, 115), ['slow', 207, 60, null], [...LS.staryu, [1, 'psywave'], [46, 'mindblast']], ['수수께끼', 1.1, 80.0], '보석 같은 핵이 일곱 빛깔로\n반짝인다. 몸을 회전시켜\n물속을 헤엄친다.'),
  G1('mrmime', '마임맨', ['psychic'], b(40, 45, 65, 100, 120, 90), ['mediumFast', 136, 45, 0.5], LS.mrmime, ['배리어', 1.3, 54.5], '몸짓으로 벽이 있는 척하면\n정말로 보이지 않는 벽이\n생긴다. 방해받는 걸 싫어한다.'),
  G1('scyther', '스라크', ['bug', 'flying'], b(70, 110, 80, 55, 80, 105), ['mediumFast', 187, 45, 0.5], LS.scyther, ['사마귀', 1.5, 56.0], '낫 같은 양팔로 풀숲을 가르며\n달린다. 너무 빨라서 여럿으로\n보일 때도 있다.'),
  G1('jynx', '루주라', ['ice', 'psychic'], b(65, 50, 35, 115, 95, 95), ['mediumFast', 137, 45, 1], LS.jynx, ['인간형', 1.4, 40.6], '춤추듯 허리를 흔들며 걷는다.\n사람 말 비슷한 소리를 내지만\n뜻은 아직 알 수 없다.'),
  G1('electabuzz', '에레브', ['electric'], b(65, 83, 57, 95, 85, 105), ['mediumFast', 156, 45, 0.25], LS.electabuzz, ['전격', 1.1, 30.0], '전기를 무척 좋아해서 발전소\n근처에 나타난다. 폭풍우 치는\n날엔 높은 곳에 오른다.'),
  G1('magmar', '마그마', ['fire'], b(65, 95, 57, 100, 85, 93), ['mediumFast', 167, 45, 0.25], LS.magmar, ['불뿜기', 1.3, 44.5], '화산 근처에서 태어났다.\n온몸이 불타고 있어 숨결만으로\n주변이 아지랑이처럼 일렁인다.'),
  G1('pinsir', '쁘사이저', ['bug'], b(65, 125, 100, 55, 70, 85), ['slow', 200, 45, 0.5], LS.pinsir, ['사슴벌레', 1.5, 55.0], '두 개의 긴 뿔로 상대를 꽉\n집어 놓지 않는다. 추위에\n약해 겨울엔 나무 위에서 잔다.'),
  G1('tauros', '켄타로스', ['normal'], b(75, 100, 95, 40, 70, 110), ['slow', 211, 45, 0], LS.tauros, ['난폭소', 1.4, 88.4], '세 개의 꼬리로 제 몸을 치며\n기운을 돋운다. 한번 달리면\n곧장 내달린다.'),
  G1('magikarp', '잉어킹', ['water'], b(20, 10, 55, 15, 20, 80), ['slow', 20, 255, 0.5], LS.magikarp, ['물고기', 0.9, 10.0], '힘도 속도도 거의 없어 그저\n팔딱거릴 뿐이다. 그래도\n어떤 물에서든 꿋꿋이 산다.', lv('gyarados', 20)),
  G1('gyarados', '갸라도스', ['water', 'flying'], b(95, 125, 79, 60, 100, 81), ['slow', 214, 45, 0.5], LS.gyarados, ['흉악', 6.5, 235.0], '한번 날뛰기 시작하면 좀처럼\n가라앉지 않는다. 잉어킹\n시절과는 딴판인 성격이다.'),
  G1('lapras', '라프라스', ['water', 'ice'], b(130, 85, 80, 85, 95, 60), ['slow', 219, 45, 0.5], LS.lapras, ['탈것', 2.5, 220.0], '사람의 말을 알아듣는 상냥한\n포켓몬. 등에 사람을 태우고\n바다 건너는 것을 좋아한다.'),
  G1('ditto', '메타몽', ['normal'], b(48, 48, 48, 48, 48, 48), ['mediumFast', 61, 35, null], LS.ditto, ['변신', 0.3, 4.0], '몸을 자유롭게 바꿔 무엇이든\n흉내 낸다. 웃음이 터지면\n모습이 흐트러진다.'),
  G1('eevee', '이브이', ['normal'], b(55, 55, 50, 45, 65, 55), ['mediumFast', 92, 45, 0.125], LS.eevee, ['진화', 0.3, 6.5], '주변 환경에 맞춰 여러 모습으로\n진화할 수 있는 신기한\n포켓몬. 어떤 돌에 반응할까?',
    { evolveItem: [{ to: 'vaporeon', item: 'waterstone' }, { to: 'jolteon', item: 'thunderstone' }, { to: 'flareon', item: 'firestone' }] }),
  G1('vaporeon', '샤미드', ['water'], b(130, 65, 60, 110, 95, 65), ['mediumFast', 196, 45, 0.125], LS.vaporeon, ['거품뿜기', 1.0, 29.0], '물가에서 살도록 지느러미와\n아가미가 생겼다. 물에 들어가면\n녹은 듯 보이지 않는다.'),
  G1('jolteon', '쥬피썬더', ['electric'], b(65, 65, 60, 110, 95, 130), ['mediumFast', 197, 45, 0.125], LS.jolteon, ['번개', 0.8, 24.5], '화가 나거나 놀라면 온몸의\n털이 바늘처럼 곤두선다.\n털 사이로 전기가 튄다.'),
  G1('flareon', '부스터', ['fire'], b(65, 130, 60, 95, 110, 65), ['mediumFast', 198, 45, 0.125], LS.flareon, ['불꽃', 0.9, 25.0], '몸속에 불꽃 주머니가 있다.\n복슬복슬한 털로 남는 열을\n밖으로 내보낸다.'),
  G1('porygon', '폴리곤', ['normal'], b(65, 60, 70, 85, 75, 40), ['mediumFast', 130, 45, null], LS.porygon, ['가상', 0.8, 36.5], '사람이 프로그램으로 만들어 낸\n포켓몬. 숨을 쉬지 않아\n어디서든 움직일 수 있다.'),
  G1('omanyte', '암나이트', ['rock', 'water'], b(35, 40, 100, 90, 55, 35), ['mediumFast', 120, 45, 0.125], LS.omanyte, ['소용돌이', 0.4, 7.5], '아주 먼 옛날 바다에 살았다.\n화석에서 되살아났다.\n촉수를 저어 헤엄친다.', lv('omastar', 40)),
  G1('omastar', '암스타', ['rock', 'water'], b(70, 60, 125, 115, 70, 55), ['mediumFast', 199, 45, 0.125], LS.omanyte, ['소용돌이', 1.0, 35.0], '껍데기가 너무 무거워져서\n재빨리 움직이지 못한다.\n촉수의 힘은 무척 세다.'),
  G1('kabuto', '투구', ['rock', 'water'], b(30, 80, 90, 55, 45, 55), ['mediumFast', 119, 45, 0.125], LS.kabuto, ['갑각', 0.5, 11.5], '화석에서 되살아난 포켓몬.\n단단한 등딱지 아래 숨어\n바다 밑바닥을 기어 다닌다.', lv('kabutops', 40)),
  G1('kabutops', '투구푸스', ['rock', 'water'], b(60, 115, 105, 65, 70, 80), ['mediumFast', 201, 45, 0.125], LS.kabuto, ['갑각', 1.3, 40.5], '날렵한 몸으로 물살을 가른다.\n낫 같은 양팔은 무엇이든\n베어 버린다.'),
  G1('aerodactyl', '프테라', ['rock', 'flying'], b(80, 105, 65, 60, 75, 130), ['slow', 202, 45, 0.125], LS.aerodactyl, ['화석', 1.8, 59.0], '호박 속에서 되살아난 옛날\n하늘의 왕. 톱날 같은 이빨과\n큰 날개를 지녔다.'),
  G1('snorlax', '잠만보', ['normal'], b(160, 110, 65, 65, 110, 30), ['slow', 154, 25, 0.125], LS.snorlax, ['졸음', 2.1, 460.0], '먹고 자는 것이 하루의 전부.\n배가 푹신해서 아이들의\n놀이터가 되기도 한다.'),
  G1('articuno', '프리져', ['ice', 'flying'], b(90, 85, 100, 95, 125, 85), ['slow', 215, 3, null], LS.articuno, ['냉동', 1.7, 55.4], '눈 덮인 산에 나타난다는\n전설의 새. 날갯짓하면\n공기가 얼어 눈이 내린다.'),
  G1('zapdos', '썬더', ['electric', 'flying'], b(90, 90, 85, 125, 90, 100), ['slow', 216, 3, null], LS.zapdos, ['전기', 1.6, 52.6], '먹구름 속에 산다는 전설의 새.\n날개를 칠 때마다 번개가\n떨어진다고 한다.'),
  G1('moltres', '파이어', ['fire', 'flying'], b(90, 100, 90, 125, 85, 90), ['slow', 217, 3, null], LS.moltres, ['화염', 2.0, 60.0], '불타는 날개를 지닌 전설의 새.\n모습을 드러내면 봄이\n찾아온다고 전해진다.'),
  G1('dratini', '미뇽', ['dragon'], b(41, 64, 45, 50, 50, 50), ['slow', 67, 45, 0.5], LS.dratini, ['드래곤', 1.8, 3.3], '허물을 거듭 벗으며 자란다.\n오랫동안 아무도 본 적 없어\n환상의 포켓몬이라 불렸다.', lv('dragonair', 30)),
  G1('dragonair', '신뇽', ['dragon'], b(61, 84, 65, 70, 70, 70), ['slow', 144, 45, 0.5], LS.dratini, ['드래곤', 4.0, 16.5], '몸의 구슬이 빛나면 날씨가\n바뀐다고 한다. 호수 깊은\n곳에 조용히 산다.', lv('dragonite', 55)),
  G1('dragonite', '망나뇽', ['dragon', 'flying'], b(91, 134, 95, 100, 100, 80), ['slow', 218, 45, 0.5], [...LS.dratini, [55, 'wingbeat'], [61, 'dive']], ['드래곤', 2.2, 210.0], '큰 몸으로 넓은 바다 위를\n훨훨 난다. 물에 빠진 사람을\n구해 주는 상냥한 마음씨.'),
  G1('mewtwo', '뮤츠', ['psychic'], b(106, 110, 90, 154, 90, 130), ['slow', 220, 3, null], LS.mewtwo, ['유전', 2.0, 122.0], '연구로 만들어진 포켓몬.\n싸움을 위해 힘을 한계까지\n끌어올렸다고 한다.'),
  G1('mew', '뮤', ['psychic'], b(100, 100, 100, 100, 100, 100), ['mediumSlow', 64, 45, null], LS.mew, ['신종', 0.4, 4.0], '모든 기술을 쓸 수 있다는\n환상의 포켓몬. 맑은 마음을\n가진 이 앞에만 나타난다.'),
];

// 아롱이는 짖기/물기/몸통박치기/애교부리기로 시작한다. 그 뒤로는 정해진 기술이 없고,
// Lv.10부터 5레벨마다 한 번, 성장할 때(성장기, 다 큼)는 세 번씩
// 아직 모르는 기술 중 레벨에 맞는 무작위 후보에서 하나를 직접 골라 배운다. 배운 기술은 잊지 않는다.
export const ARONG_BASIC: MoveId[] = ['bark', 'nibble', 'bodycheck', 'charm'];
ARONG_LIST.forEach((s, stage) => {
  s.learnset = ARONG_BASIC.map((id) => [1, id]);
  s.movePicks = { from: 10, every: 5, onEvolve: stage === 0 ? 0 : 3 };
});

// 도감 번호: 1세대는 001~151 그대로, 아롱이는 000
export const SPECIES: Record<string, SpeciesData> = Object.fromEntries([
  ...ARONG_LIST.map((s) => [s.key, { ...s, no: 0 }]),
  ...GEN1_LIST.map((s, i) => [s.key, { ...s, no: i + 1 }]),
]);
export const SPECIES_LIST = Object.values(SPECIES);
export const species = (key: string) => SPECIES[key];
