// 몬스터 그림 정의 (56x56 좌표계, 발바닥이 y≈53).
// 색: 0 흰색, 1 종족 밝은색, 2 종족 어두운색, 3 검정
// 1세대 몬스터 그림은 gen1Art/ 아래에 도감 번호 순으로 나뉘어 있다.
import { buildMonPalette } from '../gfx/monPalette';
import * as p1 from './gen1Art/p1';
import * as p2 from './gen1Art/p2';
import * as p3 from './gen1Art/p3';
import * as p4 from './gen1Art/p4';
import * as p5 from './gen1Art/p5';
import * as p6 from './gen1Art/p6';
import { E, F, L, P, R, art, eye, fluff, mouth, spot, star, type MonArt } from './monArtKit';

const PARTS = [p1, p2, p3, p4, p5, p6];

/** 뒷모습 없이 배틀에서도 앞모습을 그대로 쓰는 몬스터 */
export const FRONT_ONLY = new Set(['arong', 'arong2', 'arong3']);

export const MON_ART: Record<string, MonArt> = {
  ...Object.assign({}, ...PARTS.map((p) => p.ART)),
  // 아롱이: 검은 포메라니안, 가슴에 흰 별. 4 회색(주둥이), 5 갈색(후드티), 6 분홍(모자 안감/혀), 7 진한 갈색
  arong: art(
    [E(17, 52, 4.2, 2.6, 0), E(39, 52, 4.2, 2.6, 0), E(24, 53, 3.6, 2.2, 0), E(32, 53, 3.6, 2.2, 0)],
    [fluff(28, 37, 21, 16, 1, { n: 20, d: 2.4 })],
    [fluff(28, 29, 17, 14, 1, { n: 18, d: 2.2, line: false })],
    [E(28, 35, 6.5, 4.6, 4, { ...F, line: false }), E(28, 33, 2.2, 1.5, 3, F)], mouth(28, 37, 1.6),
    eye(21.5, 30, 2.4, 2.6), eye(34.5, 30, 2.4, 2.6),
    [star(28, 45.5, 4.6, 0, { front: true })],
  ),
  arong2: art(
    [fluff(40, 27, 12, 11, 1, { n: 16, d: 2.2 })],
    [R(36, 42, 5, 10, 1), E(38.5, 52.5, 3.4, 1.9, 0), R(29, 43, 5, 9, 1), E(31.5, 52.5, 3.4, 1.9, 0)],
    [fluff(29, 37, 14, 10, 1, { n: 16, d: 1.8 })],
    [R(14, 42, 5, 11, 1), R(22, 43, 5, 10, 1), E(16.5, 53.5, 3.4, 1.9, 0), E(24.5, 53.5, 3.4, 1.9, 0)],
    [P([10, 18, 11, 4, 19, 13], 1), P([22, 12, 28, 3, 30, 15], 1)],
    [P([12, 15, 12.5, 8, 16.5, 13], 4, spot), P([24, 12, 27.5, 6.5, 28.5, 13.5], 4, spot)],
    [fluff(20, 24, 12, 11, 1, { n: 16, d: 1.8 })],
    [E(17, 29, 5.5, 3.6, 4, { ...F, line: false }), E(14, 27.6, 1.9, 1.3, 3, F), E(18, 33.5, 2.2, 2.8, 6, F)],
    eye(15, 23, 2.3, 2.6), eye(25, 23, 2.3, 2.6),
    [star(21, 39, 4, 0, { front: true })],
  ),
  arong3: art(
    [fluff(45, 36, 9, 11, 1, { n: 14, d: 2 })],
    [R(16, 45, 6, 9, 1), R(34, 45, 6, 9, 1), E(19, 54, 3.8, 1.9, 0), E(37, 54, 3.8, 1.9, 0)],
    [E(12, 40, 4.5, 7, 5), E(44, 40, 4.5, 7, 5)],
    [P([14, 31, 42, 31, 45, 47, 11, 47], 5), L(15, 42.5, 41, 42.5, 7, 1.2, spot)],
    [E(15, 28, 5, 5, 6), E(41, 28, 5, 5, 6), E(28, 31, 11, 3.5, 6)],
    [star(28, 34.5, 3.2, 0), L(25.5, 34, 24.5, 42, 0, 1.2, spot), L(30.5, 34, 31.5, 42, 0, 1.2, spot)],
    [P([18, 15, 16, 2, 25, 10], 1), P([38, 15, 40, 2, 31, 10], 1)],
    [P([19, 12, 18, 5, 23, 10], 4, spot), P([37, 12, 38, 5, 33, 10], 4, spot)],
    [fluff(28, 21, 13, 12, 1, { n: 16, d: 1.8 })],
    [E(28, 26, 6, 4, 4, { ...F, line: false }), E(28, 24.2, 2.1, 1.4, 3, F)], mouth(28, 28, 1.8),
    eye(22, 20, 2.4, 2.7), eye(34, 20, 2.4, 2.7),
  ),
};

/** [밝은색, 어두운색] */
export const MON_COLORS: Record<string, [string, string]> = {
  ...Object.assign({}, ...PARTS.map((p) => p.COLORS)),
  arong: ['#4a4a52', '#26262c'],
  arong2: ['#4a4a52', '#26262c'],
  arong3: ['#4a4a52', '#26262c'],
};

// 4번부터 쓰는 추가 기본색
const ARONG_EXTRA = ['#a49ca2', '#c47c3c', '#e8a2b4', '#7c4620'];
export const MON_EXTRA: Record<string, string[]> = {
  ...Object.assign({}, ...PARTS.map((p) => p.EXTRA)),
  arong: ARONG_EXTRA,
  arong2: ARONG_EXTRA,
  arong3: ARONG_EXTRA,
};

/** renderMonster 결과와 짝을 이루는 팔레트 (색마다 TONES개) */
export const monPalette = (key: string, shiny = false): string[] => {
  const [light, dark] = MON_COLORS[key];
  return buildMonPalette(light, dark, MON_EXTRA[key], shiny);
};
