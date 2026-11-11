// 가방 화면 그림: 가방(포켓마다 덮개 색이 바뀐다), 포켓 아이콘, 도구 아이콘 (브라우저 전용)
// 아이콘 글자: k 외곽선, a 빛, b 바탕, c 그늘, d 진한 그늘, w 흰 반짝임, x 덧붙인 색, y 덧붙인 색 그늘
import { ITEMS, itemData, type ItemId, type Pocket } from '../data/items';
import { MOVES } from '../data/moves';
import type { Type } from '../data/types';
import { ballCanvas } from './sprites';

const TYPE_HEX: Record<Type, string> = {
  normal: '#a8a878', fire: '#f08030', water: '#6890f0', grass: '#78c850', electric: '#e0b818', ice: '#78c8c8',
  fighting: '#c03028', poison: '#a040a0', ground: '#c8a050', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820',
  rock: '#b8a038', ghost: '#705898', dragon: '#7038f8', dark: '#705848', steel: '#a0a0c0', typeless: '#68a090',
};

const SHAPES = {
  spray: [
    '................', '......kkkk......', '......kwwk......', '.....kkkkkk.....', '......kxyk......', '.....kkxykk.....',
    '....kabbbbck....', '...kabbbbbbck...', '...kawbbbbbck...', '...kawbbbbbck...', '...kabbbbbbck...', '...kabbbbbbck...',
    '...kbbbbbbcck...', '...kccccccddk...', '....kccccddk....', '.....kkkkkk.....',
  ],
  bottle: [
    '................', '................', '......kkkk......', '......kxxk......', '......kkkk......', '......kwak......',
    '.....kwabbk.....', '....kwabbbck....', '...kwabbbbbck...', '...kabbbbbbck...', '...kbbbbbbbck...', '...kbbbbbbcck...',
    '...kcbbbbccck...', '....kccccccdk...', '.....kkkkkkk....', '................',
  ],
  gem: [
    '................', '................', '................', '.....kkkkkk.....', '....kawwabbk....', '...kaawabbbck...',
    '..kaaaabbbbbck..', '..kkkkkkkkkkkk..', '...kabbbbbbck...', '....kabbbbck....', '.....kabbck.....', '......kbck......',
    '.......kk.......', '................', '................', '................',
  ],
  berry: [
    '................', '.........kk.....', '........kxxk....', '.......kxxyk....', '......kkkyk.....', '....kkkbbkk.....',
    '...kabbbbbbk....', '..kawbbbbbbck...', '..kawbbbbbbck...', '..kabbbbbbbck...', '..kbbbbbbbcck...', '..kbbbbbbccck...',
    '...kcbbbcccdk...', '....kccccddk....', '.....kkkkkk.....', '................',
  ],
  disc: [
    '................', '.....kkkkkk.....', '...kkbbbbbbkk...', '..kbbaabbbbbck..', '.kbbaabbbbbbcck.', '.kbaabbbbbbbbck.',
    'kbbabbbkkbbbbcck', 'kbbbbbkwwkbbbbck', 'kbbbbbkwwkbbbbck', 'kcbbbbbkkbbbbbck', '.kcbbbbbbbbbbck.', '.kccbbbbbbbbcck.',
    '..kccbbbbbbccdk.', '...kkccccccdkk..', '.....kkkkkk.....', '................',
  ],
  egg: [
    '................', '......kkkk......', '.....kwwaak.....', '....kwwaaabk....', '....kwaaaabk....', '...kwaaxaaabk...',
    '...kaaxxaaabk...', '..kaaaaaaaxabk..', '..kaaaaaaxxabk..', '..kaaxaaaaaabk..', '..kaxxaaaaabbk..', '..kbaaaaaaabbk..',
    '...kbbaaaabbk...', '....kbbbbbbk....', '.....kkkkkk.....', '................',
  ],
  charm: [
    '................', '......kkkk......', '.....k....k.....', '....k......k....', '....k......k....', '.....k....k.....',
    '......kxxk......', '.....kkxxkk.....', '....kabbbbck....', '...kawbbbbbck...', '...kabbbbbbck...', '...kbbbbbbcck...',
    '...kbbbbbccck...', '....kcccccdk....', '.....kkkkkk.....', '................',
  ],
  device: [
    '................', '................', '..kkkkkkkkkkkk..', '..kabbbbbbbbck..', '..kbkkkkkkkkck..', '..kbkwwwwwwkck..',
    '..kbkwxxwwwkck..', '..kbkwwwwwwkck..', '..kbkkkkkkkkck..', '..kbbbbbbbbbck..', '..kbyybbbkbbck..', '..kbyybbkkkbck..',
    '..kbbbbbbkbbck..', '..kcccccccccck..', '..kkkkkkkkkkkk..', '................',
  ],
  bell: [
    '................', '.......kk.......', '......kxxk......', '.....kkkkkk.....', '....kaabbbck....', '...kawbbbbbck...',
    '...kawbbbbbck...', '...kabbbbbbck...', '...kabbbbbbck...', '..kabbbbbbbbck..', '.kabbbbbbbbbbck.', '.kkkkkkkkkkkkkk.',
    '......kxxk......', '.......kk.......', '................', '................',
  ],
  rod: [
    '................', '.............kk.', '............kbk.', '...........kbk.y', '..........kbk..y', '.........kbk...y',
    '........kbk....y', '.......kbk.....y', '......kbk......y', '..kk.kbk.......y', '.kxxkbk.......kk', '.kxxck..........',
    '..kkcck.........', '...kccck........', '....kdk.........', '.....k..........',
  ],
  bike: [
    '................', '................', '................', '................', '....kkk...kk....', '.....k.....k....',
    '.....kbbbbbk....', '....kb...bk.....', '..kkkk....kkkk..', '.k....k..k....k.', 'k..xx..kk..xx..k', 'k..xx..kk..xx..k',
    '.k....k..k....k.', '..kkkk....kkkk..', '................', '................',
  ],
  key: [
    '................', '................', '................', '................', '..kkkk..........', '.kabbbk.........',
    'kab..bbk........', 'kb....bkkkkkkkk.', 'kb....bbbbbbbbbk', 'kbb..bbkkkbkbkk.', '.kbbbbk...kbkbk.', '..kkkk.....k.k..',
    '................', '................', '................', '................',
  ],
} satisfies Record<string, string[]>;
type Shape = keyof typeof SHAPES;

/** 바탕색 하나로 빛·그늘을 만든다 */
function shades(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [n >> 16, (n >> 8) & 255, n & 255];
  const mix = (t: number, to: number) => `rgb(${rgb.map((v) => Math.round(v + (to - v) * t)).join(',')})`;
  return { a: mix(0.45, 255), b: hex, c: mix(0.25, 0), d: mix(0.45, 0) };
}

interface Look { shape: Shape; base: string; x?: string; y?: string }

const STONE: Record<string, string> = { firestone: '#f06030', waterstone: '#4890f0', thunderstone: '#c8e030', leafstone: '#58b848', moonstone: '#7c7890' };
const CURE: Record<string, string> = { antidote: '#70c050', parlyzheal: '#f0d040', awakening: '#5890e0', burnheal: '#f06040', iceheal: '#80d8f0', fullheal: '#f080c0' };
const KEY: Record<string, Look> = {
  dexdevice: { shape: 'device', base: '#e04848', x: '#60c0f0', y: '#f8d040' },
  pokegear: { shape: 'device', base: '#4878d0', x: '#f8d040', y: '#f04848' },
  wakebell: { shape: 'bell', base: '#f0c040', x: '#e04848' },
  surf: { shape: 'disc', base: '#5070e0' },
  fly: { shape: 'disc', base: '#a890f0' },
  secretpotion: { shape: 'bottle', base: '#40c0b0', x: '#c89058' },
  oldrod: { shape: 'rod', base: '#a87038', x: '#c0c0d0', y: '#e8e8f0' },
  goodrod: { shape: 'rod', base: '#6080d0', x: '#c0c0d0', y: '#e8e8f0' },
  superrod: { shape: 'rod', base: '#e04848', x: '#f8d040', y: '#e8e8f0' },
  bicycle: { shape: 'bike', base: '#e04848', x: '#c0c0c8' },
};

function look(id: ItemId): Look {
  const it = itemData(id);
  if (KEY[id]) return KEY[id];
  if (it.tm) return { shape: 'disc', base: TYPE_HEX[MOVES[it.tm].type] };
  if (it.stone) return { shape: 'gem', base: STONE[id] ?? '#c0c0c0' };
  if (it.revive) return { shape: 'gem', base: '#f8d040' };
  if (it.heal) return { shape: 'spray', base: id === 'potion' ? '#a060d0' : id === 'superpotion' ? '#f0a030' : '#f070a8', x: '#e04848', y: '#a02828' };
  if (it.cure) return { shape: 'bottle', base: CURE[id] ?? '#f080c0', x: '#c89058' };
  const h = it.hold;
  if (h?.kind === 'berry' || h?.kind === 'cure') return { shape: 'berry', base: id === 'goldberry' ? '#f0c030' : id === 'miracleberry' ? '#70c8f0' : '#e05050', x: '#60b040', y: '#3c8028' };
  if (h?.kind === 'luckyegg') return { shape: 'egg', base: '#f0d8b0', x: '#f07080' };
  if (h?.kind === 'boost') return { shape: 'charm', base: TYPE_HEX[h.type], x: '#f8e070' };
  const charm: Record<string, string> = { leftovers: '#c88848', focusband: '#e04040', quickclaw: '#b0b0c0', expshare: '#6090e0' };
  return { shape: 'charm', base: charm[h?.kind ?? ''] ?? '#c0c0c0', x: '#f8e070' };
}

const cache = new Map<string, HTMLCanvasElement>();

function draw(l: Look): HTMLCanvasElement {
  const key = `${l.shape}:${l.base}:${l.x}:${l.y}`;
  let c = cache.get(key);
  if (c) return c;
  const s = shades(l.base);
  // 알은 바탕(a)을 크림색, 그늘(b)을 바탕색으로
  const pal: Record<string, string> =
    l.shape === 'egg'
      ? { k: '#38302a', a: '#fff8ea', b: l.base, w: '#ffffff', x: l.x ?? '#f07080' }
      : { k: '#282830', a: s.a, b: s.b, c: s.c, d: s.d, w: '#f8f8fc', x: l.x ?? s.a, y: l.y ?? s.c };
  c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d')!;
  SHAPES[l.shape].forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (!pal[ch]) return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  cache.set(key, c);
  return c;
}

/** 도구 아이콘 (16x16). 볼은 볼 그림 그대로 */
export function itemIconCanvas(id: ItemId): HTMLCanvasElement {
  if ('ball' in ITEMS[id]) return ballCanvas(id as Parameters<typeof ballCanvas>[0]);
  return draw(look(id));
}

/** 포켓 아이콘 (16x16) */
export function pocketIconCanvas(p: Pocket): HTMLCanvasElement {
  if (p === 'balls') return ballCanvas('capsule');
  if (p === 'tm') return draw({ shape: 'disc', base: '#6890f0' });
  if (p === 'key') return draw({ shape: 'key', base: '#f0c040' });
  return draw({ shape: 'spray', base: '#a060d0', x: '#e04848', y: '#a02828' });
}

/** 포켓마다 가방 덮개 색 */
export const POCKET_COLOR: Record<Pocket, string> = { items: '#e05038', balls: '#4878d8', tm: '#48a848', key: '#9058c8' };

/** 가방 그림 (64x48): 노란 가방, 포켓 색 덮개, 아롱이 발바닥 무늬 */
export function bagCanvas(p: Pocket): HTMLCanvasElement {
  const key = `bag:${p}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 64;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  /** 모서리를 둥글린 상자 (가로줄마다 모서리만큼 안쪽에서 시작) */
  const round = (x: number, y: number, w: number, h: number, r: number, color: string) => {
    for (let dy = 0; dy < h; dy++) {
      const e = Math.min(dy, h - 1 - dy);
      const inset = e < r ? r - Math.round(Math.sqrt(r * r - (r - e - 0.5) ** 2)) : 0;
      px(x + inset, y + dy, w - inset * 2, 1, color);
    }
  };
  const box = (x: number, y: number, w: number, h: number, r: number, fill: string, line = '#4a3010') => {
    round(x, y, w, h, r, line);
    round(x + 1, y + 1, w - 2, h - 2, Math.max(0, r - 1), fill);
  };
  const flap = shades(POCKET_COLOR[p]);
  // 손잡이
  box(21, 1, 22, 16, 7, '#9a6a28');
  round(25, 5, 14, 12, 5, '#4a3010');
  ctx.clearRect(26, 6, 12, 11);
  // 옆 주머니
  box(3, 24, 10, 17, 3, '#e0b040');
  box(51, 24, 10, 17, 3, '#e0b040');
  // 몸통: 위는 밝게, 아래는 그늘
  box(8, 12, 48, 34, 7, '#f2c84a');
  px(10, 14, 44, 2, '#fbe48a');
  round(9, 39, 46, 6, 3, '#d39a2c');
  // 덮개와 고리
  box(12, 11, 40, 17, 6, flap.b);
  px(15, 13, 34, 2, flap.a);
  px(14, 24, 36, 2, flap.c);
  box(28, 22, 8, 8, 2, '#f8f0d0');
  px(30, 24, 4, 4, '#d8b860');
  // 아롱이 발바닥
  round(28, 36, 9, 6, 3, '#7a4a1c');
  for (const [x, y] of [[26, 32], [30, 31], [34, 31], [38, 32]]) round(x, y, 3, 3, 1, '#7a4a1c');
  cache.set(key, c);
  return c;
}
