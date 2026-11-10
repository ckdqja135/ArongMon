// 몬스터볼 도트 그림 (9세대 아이콘을 보고 찍었다: 버튼이 가운데보다 조금 왼쪽 아래, 윗면 왼쪽 위에 반짝임).
// 색: 0 반짝임, 1 외곽선, 2 윗면, 3 윗면 그늘, 4 윗면 빛, 5 아랫면, 6 아랫면 그늘, 7 버튼, 8 무늬, 9 무늬 그늘
import { parseArt, type Grid, type Palette } from './pixel';

export type BallId = 'capsule' | 'supercapsule' | 'hypercapsule' | 'mastercapsule';

/** 아랫면 (16x16 볼 공통): 검은 띠와 동그란 버튼 (버튼은 가운데보다 조금 왼쪽) */
const BOTTOM = [
  '1111777611111111',
  '1111776611111111',
  '1555111155555661',
  '.15555555555661.',
  '.15555555556661.',
  '..155555566661..',
  '...1166666611...',
  '.....111111.....',
];

/** 윗면 (16x16): 볼마다 다르다. 맨 아래 줄에 버튼 테두리 윗부분이 있다 */
const TOP: Record<BallId, string[]> = {
  capsule: [
    '.....111111.....',
    '...1122222211...',
    '..142222222231..',
    '.14400222222231.',
    '.14200222222331.',
    '1422222222222331',
    '1222222222222331',
    '1222111122222331',
  ],
  // 파란 윗면 양옆에 빨간 띠
  supercapsule: [
    '.....111111.....',
    '...1182222811...',
    '..189222222981..',
    '.18920022229881.',
    '.18920022222981.',
    '1889222222229881',
    '1892222222229831',
    '1922111122222931',
  ],
  // 노란 윗면 가운데에 넓은 검은 띠
  hypercapsule: [
    '.....111111.....',
    '...1182222811...',
    '..188222222881..',
    '.18824422228891.',
    '.18824222228891.',
    '1888222222288991',
    '1888222222288991',
    '1988111122288991',
  ],
  // 보라 윗면 양옆에 분홍 혹, 가운데 흰 M
  mastercapsule: [
    '.....111111.....',
    '...1122222211...',
    '..188222222881..',
    '.18090222098081.',
    '.18890020098881.',
    '1499202020299931',
    '1222222222222331',
    '1222111122222331',
  ],
};

/** 필드에 떨어진 도구 (12x12, 몬스터볼) */
const GROUND = [
  '....1111....',
  '..11222211..',
  '.1400222231.',
  '.1400222231.',
  '142222222331',
  '122111122231',
  '111177111111',
  '155111155561',
  '.1555555561.',
  '.1555555661.',
  '..11566611..',
  '....1111....',
];

/** 배틀 HP 창의 가진 몬스터 수 (8x8) */
const SMALL = ['..1111..', '.140231.', '14222231', '11177111', '15555561', '15555661', '.166661.', '..1111..'];
const SMALL_MARKS: Record<BallId, [number, number, number][]> = {
  capsule: [],
  supercapsule: [[1, 2, 8], [6, 2, 8]],
  hypercapsule: [[1, 2, 8], [2, 1, 8], [5, 1, 8], [6, 2, 8]],
  mastercapsule: [[1, 2, 8], [6, 2, 8], [3, 1, 0], [4, 1, 0]],
};

/** [윗면, 그늘, 빛, 무늬, 무늬 그늘] */
const COLORS: Record<BallId, string[]> = {
  capsule: ['#e8402c', '#b02818', '#f88870', '#e8402c', '#b02818'],
  supercapsule: ['#2c78c8', '#1c4c90', '#80b8f0', '#e84838', '#a02820'],
  hypercapsule: ['#3a3a42', '#202024', '#8a8a96', '#f8d040', '#c09820'],
  mastercapsule: ['#7848c0', '#4c2888', '#a888e8', '#e868b8', '#a83880'],
};

export function ballPalette(id: BallId, fainted = false): Palette {
  if (fainted) return ['#d8dae4', '#5c5e70', '#8c8ea0', '#6c6e80', '#a8aab8', '#c4c6d2', '#9a9cac', '#d8dae4', '#8c8ea0', '#6c6e80'];
  const [top, shade, light, mark, markShade] = COLORS[id];
  return ['#ffffff', '#202028', top, shade, light, '#f0eef4', '#b4aac0', '#f8f8fc', mark, markShade];
}

export function ballGrid(id: BallId): Grid {
  return parseArt([...TOP[id], ...BOTTOM].join('\n'), `ball:${id}`);
}

export function smallBallGrid(id: BallId): Grid {
  const g = parseArt(SMALL.join('\n'), `ball-s:${id}`);
  for (const [x, y, c] of SMALL_MARKS[id]) g[y][x] = c;
  return g;
}

/** 필드에 떨어진 도구: 타일 가운데 아래쪽에 놓인 몬스터볼 (16x16) */
export function groundBallGrid(): Grid {
  const ball = parseArt(GROUND.join('\n'), 'ball:ground');
  return Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => ball[y - 3]?.[x - 2] ?? -1));
}
