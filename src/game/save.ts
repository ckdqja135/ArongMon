import type { Mon } from '../battle/mon';
import type { ItemId } from '../data/items';
import type { Dir } from '../gfx/charArt';

export interface Place { map: string; x: number; y: number; dir: Dir }

export interface SaveData {
  version: 1;
  playerName: string;
  rivalName: string;
  /** 라이벌이 고른 첫 몬스터 */
  rivalStarter?: string;
  playerId: number;
  money: number;
  badges: string[];
  pos: Place;
  /** 물 위에서 저장했을 때 */
  surfing?: boolean;
  lastHeal: Place;
  party: Mon[];
  box: Mon[];
  bag: Partial<Record<ItemId, number>>;
  flags: Record<string, boolean>;
  seen: string[];
  caught: string[];
  playSeconds: number;
  options: { textSpeed: 'slow' | 'mid' | 'fast'; sound?: boolean };
}

const KEY = 'alongmon-save-v1';

export function newSave(playerName: string): SaveData {
  const home: Place = { map: 'home', x: 5, y: 2, dir: 'down' };
  return {
    version: 1,
    playerName,
    rivalName: '한결',
    playerId: Math.floor(Math.random() * 65536),
    money: 3000,
    badges: [],
    pos: home,
    lastHeal: { map: 'home', x: 3, y: 4, dir: 'up' },
    party: [],
    box: [],
    bag: { potion: 1 },
    flags: {},
    seen: [],
    caught: [],
    playSeconds: 0,
    options: { textSpeed: 'mid' },
  };
}

// 도감을 1세대로 바꾸기 전의 종족 키 → 가장 비슷한 1세대 몬스터
const OLD_SPECIES: Record<string, string> = {
  dotorong: 'bulbasaur', chamnarong: 'ivysaur', geomokrong: 'venusaur',
  bulda: 'charmander', hwada: 'charmeleon', yeomda: 'charizard',
  bangulto: 'squirtle', mulgyeolto: 'wartortle', haeilto: 'blastoise',
  tosil: 'rattata', tosilking: 'raticate', jjaekdol: 'pidgey', jjaeksuri: 'pidgeotto',
  kkomuli: 'caterpie', gochimong: 'metapod', nabimong: 'butterfree',
  jjiritnyang: 'pikachu', beongaenyang: 'raichu', doksongi: 'oddish', dokbeosong: 'gloom',
  doldori: 'geodude', bawidori: 'graveler', dokkaemong: 'gastly', kkamak: 'spearow',
  mongrong: 'drowzee', monghwan: 'hypno', nunkkong: 'seel',
  miri: 'dratini', mireu: 'dragonair', yongmireu: 'dragonite',
  cheolgapdol: 'magnemite', gomjumeok: 'machop', ttanggul: 'diglett',
  pongdang: 'poliwag', pongdanggaegu: 'poliwrath', bandi: 'venonat', seomgwangbandi: 'venomoth',
  bamsongsong: 'bellsprout', neogulkkoe: 'meowth', jipgae: 'pinsir', kkotnoru: 'oddish',
};

/** 예전 세이브의 몬스터를 1세대 몬스터로 바꾼다 */
function migrate(s: SaveData): SaveData {
  const sp = (k: string) => OLD_SPECIES[k] ?? k;
  for (const m of [...s.party, ...s.box]) m.species = sp(m.species);
  s.seen = [...new Set(s.seen.map(sp))];
  s.caught = [...new Set(s.caught.map(sp))];
  if (s.rivalStarter) s.rivalStarter = sp(s.rivalStarter);
  // 기술머신이 생기기 전에 딴 배지: 관장이 주는 기술머신을 챙겨 준다
  for (const b of s.badges) if (BADGE_TM[b] && !s.bag[BADGE_TM[b]]) s.bag[BADGE_TM[b]] = 1;
  return s;
}

/** 배지마다 관장이 함께 주는 기술머신 */
const BADGE_TM: Record<string, ItemId> = {
  feather: 'tm01', antenna: 'tm02', heart: 'tm03', spirit: 'tm04', fist: 'tm05', steel: 'tm06', glacier: 'tm07', dragon: 'tm08',
};

// ── 저장 슬롯 ──
export const SLOTS = [1, 2, 3];
const slotKey = (slot: number) => `${KEY}-slot${slot}`;

/** 슬롯이 생기기 전의 세이브(하나짜리)는 1번 슬롯으로 옮긴다 */
function moveLegacySave() {
  const old = localStorage.getItem(KEY);
  if (!old) return;
  if (!localStorage.getItem(slotKey(1))) localStorage.setItem(slotKey(1), old);
  else if (!localStorage.getItem(slotKey(2))) localStorage.setItem(slotKey(2), old);
  localStorage.removeItem(KEY);
}

export function loadSave(slot: number): SaveData | null {
  moveLegacySave();
  try {
    const raw = localStorage.getItem(slotKey(slot));
    return raw ? migrate(JSON.parse(raw) as SaveData) : null;
  } catch {
    return null;
  }
}

export function writeSave(slot: number, s: SaveData) {
  localStorage.setItem(slotKey(slot), JSON.stringify(s));
}

export const hasSave = () => SLOTS.some((n) => !!loadSave(n));

// ── 파일로 내보내기 / 가져오기 ──
const FILE_TAG = 'alongmon-save';

/** 슬롯의 기록을 파일에 쓸 JSON 글로 */
export function exportSave(slot: number): string | null {
  const s = loadSave(slot);
  return s ? JSON.stringify({ game: FILE_TAG, version: 1, exportedAt: new Date().toISOString(), save: s }, null, 2) : null;
}

/** 내보낸 파일(또는 세이브 JSON 그대로)을 읽는다. 아롱몬 기록이 아니면 null */
export function parseSaveFile(text: string): SaveData | null {
  try {
    const raw = JSON.parse(text);
    const s = (raw?.game === FILE_TAG ? raw.save : raw) as SaveData;
    const ok = s && typeof s.playerName === 'string' && Array.isArray(s.party) && Array.isArray(s.box) && typeof s.pos?.map === 'string';
    return ok ? migrate(s) : null;
  } catch {
    return null;
  }
}

/** 슬롯 고르기 화면에 보여 줄 요약 */
export interface SlotInfo { name: string; map: string; badges: number; caught: number; seconds: number }
export function slotInfo(slot: number): SlotInfo | null {
  const s = loadSave(slot);
  return s ? { name: s.playerName, map: s.pos.map, badges: s.badges.length, caught: s.caught.length, seconds: s.playSeconds } : null;
}
