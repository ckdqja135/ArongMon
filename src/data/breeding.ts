// 키우미집 교배: 알 그룹(원작 2세대 기준), 두 포켓몬의 궁합, 태어날 포켓몬
import { gender, type Mon } from '../battle/mon';
import { SPECIES } from './species';

type EggGroup = 'monster' | 'water1' | 'water2' | 'water3' | 'bug' | 'flying' | 'field' | 'fairy' | 'grass' | 'humanlike' | 'mineral' | 'amorphous' | 'dragon' | 'ditto' | 'none';

const G = (...g: EggGroup[]) => g;
/** 1세대 151종의 알 그룹. none = 알을 낳지 않는다 (전설, 니드리나·니드퀸, 아롱이) */
export const EGG_GROUPS: Record<string, EggGroup[]> = {
  bulbasaur: G('monster', 'grass'), ivysaur: G('monster', 'grass'), venusaur: G('monster', 'grass'),
  charmander: G('monster', 'dragon'), charmeleon: G('monster', 'dragon'), charizard: G('monster', 'dragon'),
  squirtle: G('monster', 'water1'), wartortle: G('monster', 'water1'), blastoise: G('monster', 'water1'),
  caterpie: G('bug'), metapod: G('bug'), butterfree: G('bug'), weedle: G('bug'), kakuna: G('bug'), beedrill: G('bug'),
  pidgey: G('flying'), pidgeotto: G('flying'), pidgeot: G('flying'), rattata: G('field'), raticate: G('field'),
  spearow: G('flying'), fearow: G('flying'), ekans: G('field', 'dragon'), arbok: G('field', 'dragon'),
  pikachu: G('field', 'fairy'), raichu: G('field', 'fairy'), sandshrew: G('field'), sandslash: G('field'),
  nidoranf: G('monster', 'field'), nidorina: G('none'), nidoqueen: G('none'),
  nidoranm: G('monster', 'field'), nidorino: G('monster', 'field'), nidoking: G('monster', 'field'),
  clefairy: G('fairy'), clefable: G('fairy'), vulpix: G('field'), ninetales: G('field'),
  jigglypuff: G('fairy'), wigglytuff: G('fairy'), zubat: G('flying'), golbat: G('flying'),
  oddish: G('grass'), gloom: G('grass'), vileplume: G('grass'), paras: G('bug', 'grass'), parasect: G('bug', 'grass'),
  venonat: G('bug'), venomoth: G('bug'), diglett: G('field'), dugtrio: G('field'), meowth: G('field'), persian: G('field'),
  psyduck: G('water1', 'field'), golduck: G('water1', 'field'), mankey: G('field'), primeape: G('field'),
  growlithe: G('field'), arcanine: G('field'), poliwag: G('water1'), poliwhirl: G('water1'), poliwrath: G('water1'),
  abra: G('humanlike'), kadabra: G('humanlike'), alakazam: G('humanlike'),
  machop: G('humanlike'), machoke: G('humanlike'), machamp: G('humanlike'),
  bellsprout: G('grass'), weepinbell: G('grass'), victreebel: G('grass'), tentacool: G('water3'), tentacruel: G('water3'),
  geodude: G('mineral'), graveler: G('mineral'), golem: G('mineral'), ponyta: G('field'), rapidash: G('field'),
  slowpoke: G('monster', 'water1'), slowbro: G('monster', 'water1'), magnemite: G('mineral'), magneton: G('mineral'),
  farfetchd: G('flying', 'field'), doduo: G('flying'), dodrio: G('flying'), seel: G('water1', 'field'), dewgong: G('water1', 'field'),
  grimer: G('amorphous'), muk: G('amorphous'), shellder: G('water3'), cloyster: G('water3'),
  gastly: G('amorphous'), haunter: G('amorphous'), gengar: G('amorphous'), onix: G('mineral'),
  drowzee: G('humanlike'), hypno: G('humanlike'), krabby: G('water3'), kingler: G('water3'),
  voltorb: G('mineral'), electrode: G('mineral'), exeggcute: G('grass'), exeggutor: G('grass'),
  cubone: G('monster'), marowak: G('monster'), hitmonlee: G('humanlike'), hitmonchan: G('humanlike'), lickitung: G('monster'),
  koffing: G('amorphous'), weezing: G('amorphous'), rhyhorn: G('monster', 'field'), rhydon: G('monster', 'field'),
  chansey: G('fairy'), tangela: G('grass'), kangaskhan: G('monster'), horsea: G('water1', 'dragon'), seadra: G('water1', 'dragon'),
  goldeen: G('water2'), seaking: G('water2'), staryu: G('water3'), starmie: G('water3'), mrmime: G('humanlike'),
  scyther: G('bug'), jynx: G('humanlike'), electabuzz: G('humanlike'), magmar: G('humanlike'), pinsir: G('bug'), tauros: G('field'),
  magikarp: G('water2', 'dragon'), gyarados: G('water2', 'dragon'), lapras: G('monster', 'water1'), ditto: G('ditto'),
  eevee: G('field'), vaporeon: G('field'), jolteon: G('field'), flareon: G('field'), porygon: G('mineral'),
  omanyte: G('water1', 'water3'), omastar: G('water1', 'water3'), kabuto: G('water1', 'water3'), kabutops: G('water1', 'water3'),
  aerodactyl: G('flying'), snorlax: G('monster'), articuno: G('none'), zapdos: G('none'), moltres: G('none'),
  dratini: G('water1', 'dragon'), dragonair: G('water1', 'dragon'), dragonite: G('water1', 'dragon'), mewtwo: G('none'), mew: G('none'),
};

const groups = (m: Mon) => EGG_GROUPS[m.species] ?? ['none'];

/** 256걸음마다 알이 생길 확률. 0이면 알이 생기지 않는다 */
export function breedChance(a: Mon, b: Mon): number {
  const ga = groups(a), gb = groups(b);
  if (ga.includes('none') || gb.includes('none')) return 0;
  const da = ga.includes('ditto'), db = gb.includes('ditto');
  if (da && db) return 0;
  // 메타몽은 누구와도 (성별이 없는 포켓몬까지)
  if (da || db) return 0.2;
  const fa = gender(a), fb = gender(b);
  if (!fa || !fb || fa === fb) return 0;
  if (!ga.some((g) => gb.includes(g))) return 0;
  return a.species === b.species ? 0.7 : 0.5;
}

/** 진화 전 모습 */
function preEvolution(key: string): string | null {
  for (const sp of Object.values(SPECIES)) {
    if (sp.evolve?.to === key || sp.evolveItem?.some((e) => e.to === key)) return sp.key;
  }
  return null;
}

/** 알에서 태어날 포켓몬: 엄마(메타몽과 맡겼으면 메타몽이 아닌 쪽)의 가장 처음 모습 */
export function babyOf(a: Mon, b: Mon): string {
  const parent = groups(a).includes('ditto') ? b : groups(b).includes('ditto') ? a : gender(a) === 'f' ? a : b;
  let key = parent.species;
  for (let p = preEvolution(key); p; p = preEvolution(key)) key = p;
  // 니드런은 암수 계열이 달라서 반반
  if (key === 'nidoranf') return Math.random() < 0.5 ? 'nidoranf' : 'nidoranm';
  return key;
}

/** 알이 깨어날 때까지 걸음 수: 흔한 포켓몬은 빨리, 귀한 포켓몬은 오래 */
export const hatchSteps = (species: string) => (SPECIES[species].catchRate >= 100 ? 500 : 900);
