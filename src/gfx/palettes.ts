import type { Palette } from './pixel';

// 타일 팔레트 (DS 시절 느낌의 밝은 색). 0이 가장 밝고 3이 가장 어둡다.
export const PAL = {
  // 바깥 (DS 다이아몬드/펄 느낌, fieldArt.ts의 색 번호와 짝)
  grass: ['#d0f4a8', '#a8e080', '#90cc68', '#70b050', '#58983c'],
  tallgrass: ['#c8f098', '#80c858', '#5aa840', '#3c8030', '#285c24', '#a8e080'],
  tree: ['#c8f090', '#80c850', '#58a838', '#3c8030', '#245824', '#b88050', '#7c5030', '#80b858', '#183c18'],
  path: ['#fff4d8', '#ecd8a8', '#dcc290', '#c4a474', '#9c7c54'],
  water: ['#f4fcff', '#a8dcf8', '#78bcf0', '#5898e0', '#3c74c0', '#e8f8ff'],
  flower: ['#ffffff', '#a8e080', '#f8607c', '#c03850', '#f8d850', '#4c9038'],
  fence: ['#fff0d0', '#e8c890', '#c09058', '#8c6034', '#5c3c1c', '#80b858'],
  lighthouse: ['#ffffff', '#d8dce4', '#e04040', '#2c2c3a', '#ffe878', '#a0c8e8', '#a82828'],
  sand: ['#fffaf0', '#f4e4c0', '#e0c898', '#b8987c'],
  ledge: ['#d0f4a8', '#a8e080', '#90cc68', '#70b050', '#58983c', '#e0c088', '#b89060', '#80603c'],
  rock: ['#f4f4f8', '#d8d4cc', '#b4ada0', '#8c8478', '#5c564c', '#80b858', '#1c1814'],
  /** 바다 바위: 바위 밑 그림자 대신 부서지는 물보라 */
  reef: ['#f4f4f8', '#d8d4cc', '#b4ada0', '#8c8478', '#5c564c', '#f4fcff', '#1c1814'],
  wall: ['#ffffff', '#f4f0e4', '#e0d8c4', '#5c5040', '#c4b8a0', '#a09078', '#d4f0ff', '#7cb4e8', '#b07c4c', '#784c28'],
  roofHouse: ['#ffe8d8', '#f4a07c', '#e07850', '#5c2414', '#b85838', '#8c3c24'],
  roofCenter: ['#fff0f0', '#ff8c8c', '#e85454', '#5c1418', '#bc3838', '#8c2428'],
  roofMart: ['#f0f4ff', '#8cb4ff', '#5884e8', '#142458', '#3c60c0', '#28428c'],
  roofLab: ['#f0fff4', '#a8dcb8', '#70b890', '#143c28', '#4c9070', '#346650'],
  roofGym: ['#fbf0ff', '#d0a8f0', '#a878d8', '#2c1450', '#8050b8', '#5c3490'],
  roofBurnt: ['#c8b8a8', '#806c60', '#5c4c44', '#1c1410', '#463830', '#342822'],
  // 실내
  floor: ['#fff4e0', '#f0d8b0', '#e0c090', '#a87c50', '#c8a070'],
  gymFloor: ['#ffffff', '#ececf6', '#d4d6e8', '#8a8cae', '#b8bad4'],
  wallIn: ['#ffffff', '#eaf0fa', '#d2def2', '#30406c', '#a8bce0', '#7890c0'],
  wood: ['#fff4e0', '#ecc488', '#c89058', '#4c2c14', '#a87038', '#7c4c24'],
  books: ['#fff8ee', '#e4b474', '#d0503c', '#3c2410', '#4c78c8', '#58a050', '#9c6834', '#f0c850'],
  plant: ['#e8ffd8', '#8cd464', '#3c8a38', '#163c1c', '#5cb048', '#c87848', '#8c4c2c'],
  machine: ['#ffffff', '#f4a4ac', '#8c94ac', '#2c3040', '#d0d4e0', '#e04858', '#9cd4f8'],
  mat: ['#fff4e6', '#f4a494', '#c45444', '#5c2418'],
  bed: ['#ffffff', '#8cb4f4', '#4464b4', '#1c2850'],
  statue: ['#ffffff', '#d0d0dc', '#8a8a9c', '#2c2c3c'],
  burnt: ['#b0a08c', '#7c6a58', '#5a4a3e', '#241a14', '#948470', '#c8b8a0'],
  ghostFloor: ['#9c8cc8', '#5a4c80', '#4a3e6c', '#1e1832', '#6c5c98'],
  candle: ['#fff8c0', '#f8a040', '#c8a048', '#2a1c10', '#f0e8e0', '#8c6c28'],
  metal: ['#d4d8e4', '#8c94a8', '#6c7488', '#2c3040', '#4c5468'],
  ice: ['#ffffff', '#d8f0ff', '#b0dcf8', '#5890c0', '#88c0e8'],
  // 동굴
  cave: ['#f8ecd4', '#e0c49c', '#c8a67c', '#5c3c24', '#ac8a62', '#8c6a46'],
  caveWall: ['#f0dcbc', '#d8b88c', '#b08860', '#3c2414', '#8c6844', '#6c4c30'],
  ui: ['#f8f8f8', '#b0b0b0', '#585858', '#181818'],
} satisfies Record<string, Palette>;

export type PalName = keyof typeof PAL;

// 캐릭터 팔레트: 0 흰색, 1 검정, 2 살색, 3 포인트색 (게임보이 컬러처럼 인물마다 포인트색 하나)
const cp = (accent: string): Palette => ['#ffffff', '#101010', '#f89048', accent];

export const CHAR_PAL = {
  player: cp('#f83808'),
  rival: cp('#5058d8'),
  mom: cp('#e85888'),
  prof: cp('#8890a8'),
  green: cp('#30a048'),
  yellow: cp('#d8a010'),
  brown: cp('#a05820'),
  purple: cp('#9048c8'),
  nurse: cp('#f06890'),
  clerk: cp('#2878d8'),
  shadow: cp('#585870'),
  dragon: cp('#8838b8'),
} satisfies Record<string, Palette>;

export type CharPalName = keyof typeof CHAR_PAL;
