// 이야기 진행 스크립트. 지도 데이터의 script 이름으로 불린다.
import { calcStats, createMon, monName, spec } from '../battle/mon';
import type { RodId } from '../data/fishing';
import { ITEMS, type ItemId } from '../data/items';
import { exitOf } from '../data/maps';
import { SPECIES } from '../data/species';
import { josa } from '../engine/josa';
import { pick } from '../engine/rng';
import type { CharBase } from '../gfx/charArt';
import type { CharPalName } from '../gfx/palettes';
import { sfx } from '../engine/sound';
import { say, yesNo } from '../ui/dialog';
import { openCredits } from '../ui/screens/Credits';
import { openMart } from '../ui/screens/MartScreen';
import { G } from './game';
import type { NpcRt } from './world';

type Script = (npc?: NpcRt) => Promise<void>;

const P = () => G.player;
const RIVAL = () => G.save.rivalName;

/** 라이벌이 연구소 책상에서 고르는 몬스터 */
const RIVAL_CHOICES = ['bulbasaur', 'charmander', 'squirtle'];

const MART_STOCK: Record<string, ItemId[]> = {
  dewMart: ['capsule', 'potion', 'antidote', 'parlyzheal', 'awakening', 'burnheal'],
  danpungMart: ['capsule', 'supercapsule', 'potion', 'superpotion', 'antidote', 'parlyzheal', 'awakening', 'burnheal', 'iceheal'],
  boraMart: [
    'capsule', 'supercapsule', 'hypercapsule', 'potion', 'superpotion', 'hyperpotion', 'antidote', 'parlyzheal', 'awakening',
    'burnheal', 'iceheal', 'fullheal', 'revive',
  ],
  harborMart: [
    'capsule', 'supercapsule', 'hypercapsule', 'superpotion', 'hyperpotion', 'antidote', 'parlyzheal', 'awakening',
    'burnheal', 'iceheal', 'fullheal', 'revive',
  ],
  hanbitMart: [
    'capsule', 'supercapsule', 'potion', 'superpotion', 'hyperpotion', 'antidote', 'parlyzheal', 'awakening', 'burnheal', 'iceheal',
    'fullheal', 'revive', 'firestone', 'waterstone', 'thunderstone', 'leafstone', 'moonstone',
  ],
};

/** 라이벌 첫 몬스터의 진화형 */
const RIVAL_EVOLVED: Record<string, string> = { bulbasaur: 'ivysaur', charmander: 'charmeleon', squirtle: 'wartortle' };
/** 라이벌 첫 몬스터의 최종 진화형 */
const RIVAL_FINAL: Record<string, string> = { bulbasaur: 'venusaur', charmander: 'charizard', squirtle: 'blastoise' };

export const SCRIPTS: Record<string, Script> = {
  /** 뒤따라오는 몬스터에게 말 걸기 */
  async follower() {
    const m = G.save.party.find((x) => x.hp > 0);
    const f = G.world.follower;
    if (!m || !f) return;
    const name = monName(m);
    const nj = (pair: string) => josa(name, pair);
    const tired = m.hp < calcStats(m).hp / 3;
    const sick: Record<string, string> = {
      par: `${nj('은/는')} 몸이 저려서\n힘들어 보인다...`,
      psn: `${nj('은/는')} 독 때문에\n괴로워 보인다...`,
      brn: `${nj('은/는')} 화상이\n아픈 것 같다...`,
      slp: `${nj('은/는')} 꾸벅꾸벅\n졸고 있다...`,
      frz: `${nj('은/는')} 추워서\n덜덜 떨고 있다...`,
    };
    if (m.status) return say(sick[m.status]);
    if (tired) return say(`${nj('은/는')} 많이 지쳐 보인다...\n회복이 필요할 것 같다.`);
    f.heart = 1;
    const night = G.world.map.outdoor && new Date().getHours() >= 21;
    const lines = spec(m).unlimitedMoves
      ? [
          `${josa(name, '은/는')} 꼬리를\n살랑살랑 흔들고 있다!`,
          `${josa(name, '은/는')} ${P()}의 발에\n몸을 부비부비 비볐다!`,
          `${name}: 멍! 멍멍!`,
          `${josa(name, '은/는')} 코를 킁킁거리며\n냄새를 맡고 있다.`,
          `${josa(name, '은/는')} 쓰다듬어 달라는 듯\n머리를 내밀었다.`,
          `${josa(name, '은/는')} ${josa(P(), '을/를')} 올려다보며\n방긋 웃었다!`,
          G.world.map.outdoor ? `${josa(name, '은/는')} 신나서\n폴짝폴짝 뛰고 있다!` : `${josa(name, '은/는')} 신기한 듯\n두리번거리고 있다.`,
          ...(night ? [`${josa(name, '은/는')} 졸린지\n크게 하품을 했다.`] : []),
        ]
      : [
          `${josa(name, '은/는')}\n즐거워 보인다!`,
          `${josa(name, '은/는')} ${josa(P(), '을/를')}\n빤히 쳐다보고 있다.`,
          `${josa(name, '은/는')} 기분이\n좋아 보인다!`,
        ];
    await say(pick(lines));
  },

  async blockRoute() {
    if (G.flag('starter')) return;
    await say('잠깐!');
    await say('풀숲에는 야생 몬스터가 있어서\n위험해! 몬스터 없이는 갈 수 없어.');
    await say('느티 박사님 연구소에 먼저\n들러 보는 게 어때?');
    await G.world.walk(G.world.player, ['down']);
  },

  async mom() {
    if (!G.flag('talkedMom')) {
      G.setFlag('talkedMom');
      await say(`엄마: ${josa(P(), '아/야')}, 일어났구나!\n느티 박사님이 널 찾으셨단다.`);
      await say('박사님 연구소는 마을 오른쪽\n초록 지붕 건물이야.');
      await say('아롱이도 너를 따라가고 싶은지\n아까부터 신이 나 있더라.');
      return;
    }
    if (!G.flag('starter')) {
      await say('엄마: 박사님 연구소는\n초록 지붕 건물이란다.');
      return;
    }
    await say(`엄마: ${josa(P(), '아/야')}, 힘들지 않니?\n잠깐 쉬었다 가렴.`);
    G.healParty();
    G.save.lastHeal = { map: 'home', x: 3, y: 4, dir: 'up' };
    await say('몬스터들이 기운을 되찾았다!');
    await say('엄마: 몸조심하고, 다녀오렴!');
  },

  async arongHome() {
    await say('아롱이: 멍! 멍멍!');
    await say('아롱이는 신이 나서\n빙글빙글 돌고 있다!');
  },

  async prof() {
    if (!G.flag('starter')) {
      await say(`느티 박사: 오오, ${josa(P(), '이/가')} 왔구나!\n기다리고 있었단다.`);
      await say('이 세계에는 몬스터라 불리는\n신기한 생물들이 살고 있지.');
      await say('나는 몬스터가 어떻게 자라고\n진화하는지 연구하고 있단다.');
      await say('그래서 말인데, 너에게 몬스터를\n한 마리 맡기려고 했는데...');
      await say('...응? 아롱이가 따라왔구나!');
      await say('아롱이가 너를 지키겠다는 듯\n앞으로 나서는구나.');
      await say('허허, 너희 둘은 이미 최고의\n파트너인 것 같구나!');
      await say('아롱이를 몬스터로 등록해 주마.\n앞으로 아롱이와 함께 여행하렴!');
      const mon = createMon('arong', 5, { ot: P(), otId: G.save.playerId, map: '느티 연구소' });
      G.giveMon(mon);
      G.setFlag('starter');
      G.setFlag('arongJoined');
      await say(`${josa(P(), '은/는')} ${josa(monName(mon), '과/와')}\n함께 여행을 떠나게 되었다!`);
      G.addItem('dexdevice');
      G.setFlag('dex');
      await say('그리고 이것도 받으렴.\n만난 몬스터를 기록하는 도감이란다.');
      await say(`${josa(P(), '은/는')} 몬스터도감을\n받았다!`);
      await rivalBattle();
      return;
    }
    const caught = G.save.caught.length;
    await say(`느티 박사: 도감은 잘 채우고 있니?\n지금까지 ${caught}종류를 잡았구나!`);
    await say(caught < 5 ? '여러 곳을 다니며 다양한 몬스터를\n만나 보렴!' : '훌륭해! 그 기세로 계속하렴!');
  },

  async rivalLab() {
    await say(`${RIVAL()}: 어, ${P()}도 왔네?\n박사님이 나도 부르셨어!`);
    await say(`${RIVAL()}: 난 제일 센 녀석을\n고를 거야!`);
  },

  async nurse() {
    await say('회복센터에 어서 오세요!\n몬스터를 회복시켜 드릴까요?');
    if (!(await yesNo('몬스터를 맡기시겠습니까?'))) {
      await say('또 오세요!');
      return;
    }
    await say('그럼 잠시 맡겨 주세요!');
    sfx('heal');
    await G.world.wait(1.2);
    G.healParty();
    const out = exitOf(G.world.map.id);
    if (out) G.save.lastHeal = { ...out, dir: 'down' };
    await say('오래 기다리셨습니다!\n몬스터가 모두 건강해졌어요!');
    await say('또 오세요!');
  },

  async mart() {
    await openMart(MART_STOCK[G.world.map.id] ?? MART_STOCK.dewMart);
  },

  async gymLeader() {
    if (G.save.badges.includes('feather')) {
      await say('나래: 2번도로 공사가 끝나면\n다음 체육관으로 갈 수 있을 거야.');
      await say('나래: 하늘처럼 넓은 세상을\n마음껏 날아 보렴!');
      return;
    }
    await say('나래: 이슬시티 체육관에 온 걸\n환영해! 난 관장 나래야.');
    await say('나래: 비행 타입 몬스터의 진짜\n힘을 보여 줄게!');
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('pidgey', 7), createMon('spearow', 8), createMon('pidgeotto', 9)],
      trainer: { className: '관장', name: '나래', prize: 1100, sprite: { base: 'long', pal: 'purple' }, lose: '나래: 내 날개가... 꺾였어!' },
    });
    if (res.outcome !== 'win') return;
    G.save.badges.push('feather');
    sfx('badge');
    G.setFlag('beat_gymT1');
    G.setFlag('beat_gymT2');
    await say('나래: 졌어! 이 배지는\n네 거야.');
    await say(`${josa(P(), '은/는')} 나래에게서\n깃털배지를 받았다!`);
    await say('나래: 깃털배지가 있으면 몬스터가\n더 말을 잘 듣게 될 거야.');
    await say('나래: 북쪽 2번도로는 공사 중이지만\n곧 길이 열릴 거야. 힘내!');
  },

  async gymGuide() {
    if (G.save.badges.includes('feather')) {
      await say('대단해! 첫 번째 배지를\n땄구나!');
      return;
    }
    await say('도전자구나! 조언을 해 줄게.');
    await say('관장 나래는 비행 타입을 써.\n전기, 바위, 얼음 타입이 유리해!');
  },

  // ── 단풍마을 ──
  async rival2() {
    if (G.flag('rival2') || G.flag('rival2Active')) return;
    G.setFlag('rival2Active');
    const w = G.world;
    const rival = w.npc('rival2');
    if (!rival) return;
    rival.emote = 0.8;
    await w.wait(0.8);
    const p = w.player;
    await w.walk(rival, p.x === 11 ? ['left', 'down'] : ['down']);
    rival.dir = 'down';
    p.dir = 'up';
    await say(`${RIVAL()}: 어, ${P()}! 여기까지 왔구나.`);
    await say(`${RIVAL()}: 난 벌써 깃털배지를 땄어.\n내 몬스터가 얼마나 강해졌는지 보여 줄게!`);
    // 아직 진화 전 스타팅 (진화한 모습은 3차전부터)
    const starter = G.save.rivalStarter ?? 'charmander';
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('zubat', 9), createMon('gastly', 10), createMon(starter, 11)],
      trainer: { className: '라이벌', name: RIVAL(), prize: 960, sprite: { base: 'cap', pal: 'rival' }, lose: `${RIVAL()}: 칫... 이번엔 내가 졌어.` },
    });
    if (res.outcome === 'win') {
      await say(`${RIVAL()}: 다음엔 절대 안 질 거야!`);
      await say(`${RIVAL()}: 그건 그렇고, 로켓단이라는\n녀석들이 체육관 앞을 막고 있어.`);
      await say(`${RIVAL()}: 난 관심 없지만...\n넌 어떻게 할래?`);
      await w.walk(rival, ['up', 'up', 'up']);
    }
    G.setFlag('rival2');
  },

  /** 로켓단 조무래기 둘을 모두 이기면 도망간다 */
  async shadowCheck() {
    if (!G.flag('beat_grunt1') || !G.flag('beat_grunt2')) {
      await say('로켓단 조무래기:\n아직 한 명 남았다!');
      return;
    }
    await say('로켓단 조무래기: 크윽...\n후퇴다, 후퇴!');
    await say('로켓단 조무래기: 기억해 둬라!\n로켓단은 이걸로 끝나지 않는다!');
    await G.world.fadeTo(1, 4);
    G.setFlag('shadowFled');
    await G.world.fadeTo(0, 4);
    await say('로켓단이 달아났다!\n체육관에 들어갈 수 있게 되었다.');
  },

  async gymLeader2() {
    if (G.save.badges.includes('antenna')) {
      await say('여름: 로켓단을 쫓아내 주고\n배지까지 땄구나. 대단해!');
      await say('여름: 로켓단이 또 나타나면\n조심해. 녀석들은 끈질기거든.');
      return;
    }
    await say('여름: 로켓단을 쫓아낸 게\n너였구나! 정말 고마워.');
    await say('여름: 하지만 체육관 승부는 별개야!\n작은 벌레의 큰 힘을 보여 줄게!');
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('metapod', 12), createMon('kakuna', 12), createMon('scyther', 14)],
      trainer: { className: '관장', name: '여름', prize: 1600, sprite: { base: 'long', pal: 'green' }, lose: '여름: 우와, 완전히 졌어!' },
    });
    if (res.outcome !== 'win') return;
    G.save.badges.push('antenna');
    sfx('badge');
    G.setFlag('beat_gym2T1');
    G.setFlag('beat_gym2T2');
    await say(`${josa(P(), '은/는')} 여름에게서\n더듬이배지를 받았다!`);
    await say('여름: 더듬이배지가 있으면\n몬스터가 더 잘 따를 거야.');
    await say('여름: 이제 북쪽 단풍숲을 지나갈 수\n있어. 숲 너머에는 한빛시티가 있어!');
    await say('여름: 숲은 길이 꼬불꼬불하니까\n길을 잃지 않게 조심해!');
  },

  async gymGuide2() {
    if (G.save.badges.includes('antenna')) {
      await say('두 번째 배지라니!\n점점 강해지고 있구나!');
      return;
    }
    await say('이곳 관장 여름은 벌레 타입을 써.\n불꽃, 비행, 바위 타입이 유리해!');
  },

  async bikeAide() {
    if (G.flag('gotBike')) {
      await say('조수: 자전거 잘 타고 있니?\nSELECT 버튼으로 바로 탈 수 있어.');
      return;
    }
    await say(`조수: 어, ${josa(P(), '이/가')} 왔구나!\n난 느티 박사님의 조수야.`);
    await say('조수: 박사님이 여행에 쓰라고\n이걸 전해 주라고 하셨어!');
    G.addItem('bicycle');
    G.setFlag('gotBike');
    await say(`${josa(P(), '은/는')} 자전거를 받았다!`);
    await say('조수: SELECT 버튼을 누르면 타고\n내릴 수 있어. 건물 안에서는 못 타!');
  },

  async dpKid() {
    if (G.flag('shadowFled')) await say('검은 옷 아저씨들이 도망갔어!\n고마워, 형아!');
    else await say('검은 옷 아저씨들이 체육관 앞에\n서 있어. 무서워!');
  },

  // ── 단풍숲 ──
  async charcoalKid() {
    if (G.flag('farfetchdReward')) {
      await say('숯장이 견습생: 파오리를 찾아 줘서\n정말 고마워!');
      await say('숯장이 견습생: 이제 한눈팔지 않고\n나무를 해 갈게.');
      return;
    }
    if (G.flag('farfetchdFound')) {
      await say('숯장이 견습생: 파오리가 돌아왔어!\n네가 찾아 준 거지? 고마워!');
      await say('숯장이 견습생: 이건 숲에서 주운 거야.\n답례로 받아 줘!');
      G.addItem('leafstone');
      sfx('item');
      G.setFlag('farfetchdReward');
      await say(`${josa(P(), '은/는')} ${josa(ITEMS.leafstone.name, '을/를')}\n받았다!`);
      return;
    }
    await say('숯장이 견습생: 큰일 났어!\n숯 만들 나무를 하러 왔다가\n파오리를 놓쳐 버렸어.');
    await say('숯장이 견습생: 숲 깊은 곳으로\n들어간 것 같아. 혹시 보면\n데려와 줄 수 있니?');
  },

  async farfetchdLost() {
    await say('파오리: 꽥! 꽥꽥!');
    await say(`파오리는 ${josa(P(), '을/를')} 보더니\n반가운 듯 날개를 퍼덕였다.`);
    await G.world.fadeTo(1, 4);
    G.setFlag('farfetchdFound');
    await G.world.fadeTo(0, 4);
    await say('파오리는 숲 입구 쪽으로\n뒤뚱뒤뚱 달려갔다!');
  },

  async farfetchdHome() {
    await say('파오리: 꽥꽥!');
    await say('파오리는 파 줄기를 꼭 쥐고\n주인 곁을 떠나지 않는다.');
  },

  // ── 한빛시티 ──
  async gymLeader3() {
    if (G.save.badges.includes('heart')) {
      if (!G.save.bag.wakebell) return giveWakebell();
      await say('다솜: 아까는 울어서 미안해.\n그래도 다음엔 안 질 거야!');
      await say('다솜: 한빛방송국 근처에 수상한\n사람들이 있대. 조심해!');
      return;
    }
    if (G.flag('beatLeader3')) {
      await say('다솜: 훌쩍... 미안, 너무 분해서\n울어 버렸어.');
      await say('다솜: 약속은 약속이니까...\n이거 받아. 하트배지야!');
      G.save.badges.push('heart');
      sfx('badge');
      await say(`${josa(P(), '은/는')} 다솜에게서\n하트배지를 받았다!`);
      await say('다솜: 하트배지가 있으면 몬스터가\n더 씩씩하게 싸워 줄 거야.');
      await giveWakebell();
      return;
    }
    await say('다솜: 안녕! 한빛시티 체육관\n관장 다솜이야!');
    await say('다솜: 다들 내 몬스터가 귀엽다고만\n하는데... 귀여운 게 다가 아니야!');
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('clefairy', 16), createMon('tauros', 18)],
      trainer: { className: '관장', name: '다솜', prize: 2000, sprite: { base: 'long', pal: 'mom' }, lose: '다솜: 이럴 수가...!' },
    });
    if (res.outcome !== 'win') return;
    G.setFlag('beatLeader3');
    G.setFlag('beat_gym3T1');
    G.setFlag('beat_gym3T2');
    await say('다솜: 으앙...! 너무해!\n흑흑... 으아앙!');
    await say('다솜은 울음을 그치지 않는다...\n조금 있다가 다시 말을 걸어 보자.');
  },

  async gymGuide3() {
    if (G.save.badges.includes('heart')) {
      await say('세 번째 배지라니!\n관장이 울어서 놀랐지?');
      return;
    }
    if (G.flag('beatLeader3')) {
      await say('관장님이 울고 계셔?\n다시 말을 걸면 배지를 줄 거야.');
      return;
    }
    await say('이곳 관장 다솜은 노말 타입을 써.\n격투 타입이 유리해!');
    await say('특히 켄타로스는 빠르고 세니까\n회복약을 꼭 챙겨!');
  },

  async eeveeGift() {
    if (G.flag('gotEevee')) {
      await say('한별: 이브이는 잘 지내나?\n물의돌, 천둥의돌, 불꽃의돌에\n반응한다네.');
      return;
    }
    await say('한별: 오, 몬스터 트레이너로군!\n나는 몬스터를 모으는 한별이라네.');
    await say('한별: 이 녀석을 맡아 줄 사람을\n찾고 있었지. 아주 희귀한 몬스터라네.');
    if (!(await yesNo('이브이를 받겠습니까?'))) {
      await say('한별: 그런가... 마음이 바뀌면\n언제든 다시 오게나.');
      return;
    }
    const mon = createMon('eevee', 20, { ot: P(), otId: G.save.playerId, map: '한빛시티' });
    const where = G.giveMon(mon);
    sfx('item');
    G.setFlag('gotEevee');
    await say(`${josa(P(), '은/는')} 이브이를 받았다!`);
    if (where === 'box') await say('이브이는 PC 박스로\n전송되었다!');
    await say('한별: 이브이는 어떤 진화의 돌을\n쓰느냐에 따라 모습이 달라진다네.');
  },

  // ── 4번도로 ──
  async snorlax() {
    await say('커다란 몬스터가 길을 막고\n쿨쿨 자고 있다...');
    if (!G.save.bag.wakebell) {
      await say('흔들어도 꿈쩍도 하지 않는다.');
      return;
    }
    if (!(await yesNo('깨움방울을 울리겠습니까?'))) return;
    sfx('exclaim');
    await say(`${josa(P(), '은/는')} 깨움방울을 울렸다!\n딸랑딸랑~`);
    await say('잠만보가 눈을 번쩍 떴다!\n잠을 깨워서 화가 났다!');
    const res = await G.battle({ kind: 'wild', enemy: [createMon('snorlax', 23)] });
    if (res.outcome === 'lose') return;
    await G.world.fadeTo(1, 4);
    G.setFlag('snorlaxGone');
    await G.world.fadeTo(0, 4);
    if (res.outcome !== 'caught') await say('잠만보는 하품을 하며\n숲속으로 어슬렁어슬렁 사라졌다.');
  },

  // ── 불탄 탑 ──
  async rival3() {
    if (G.flag('rival3')) return;
    const w = G.world;
    if (!G.flag('rival3Active')) {
      G.setFlag('rival3Active');
      const rival = w.npc('rival3');
      if (!rival) return;
      rival.emote = 0.8;
      await w.wait(0.8);
      await w.walk(rival, ['down']);
      w.player.dir = 'up';
      await say(`${RIVAL()}: ...${P()}? 너도 여기 온 거야?`);
      await say(`${RIVAL()}: 이 탑에 전설의 새가 잠들어\n있다길래 잡으러 왔는데...`);
      await say(`${RIVAL()}: 아무것도 없잖아!\n짜증 나니까 너랑 승부나 하자!`);
    } else {
      await say(`${RIVAL()}: 다시 왔냐? 덤벼!`);
    }
    const evo = RIVAL_EVOLVED[G.save.rivalStarter ?? 'charmander'] ?? 'charmeleon';
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('gastly', 18), createMon('zubat', 18), createMon('magnemite', 16), createMon(evo, 20)],
      trainer: { className: '라이벌', name: RIVAL(), prize: 1320, sprite: { base: 'cap', pal: 'rival' }, lose: `${RIVAL()}: ...쳇. 또 졌네.` },
    });
    if (res.outcome !== 'win') return;
    await say(`${RIVAL()}: 너, 그 검은 강아지랑\n점점 강해지는구나.`);
    await say(`${RIVAL()}: 아까 검은 옷 녀석들이 지하로\n내려가는 걸 봤어. 그 강아지 얘기를\n하던데... 조심해.`);
    await w.fadeTo(1, 4);
    G.setFlag('rival3');
    await w.fadeTo(0, 4);
  },

  async birdsAwaken() {
    if (G.flag('birdsAwake')) return;
    const w = G.world;
    const birds: [string, string, string][] = [
      ['birdArticuno', 'articuno', '프리져: 큐오오오-!'],
      ['birdZapdos', 'zapdos', '썬더: 갸아아아-!'],
      ['birdMoltres', 'moltres', '파이어: 키유오오-!'],
    ];
    w.player.dir = 'up';
    await say('탑 깊은 곳에 세 마리의 새가\n날개를 접고 잠들어 있다...');
    const arong = G.save.party.find((m) => spec(m).unlimitedMoves && m.hp > 0);
    if (arong) await say(`${monName(arong)}: 멍! 멍멍!`);
    for (const [id] of birds) {
      const n = w.npc(id);
      if (n) n.emote = 0.8;
    }
    await w.wait(0.8);
    await say('세 마리의 새가 눈을 떴다!');
    for (const [id, key, cry] of birds) {
      await say(cry);
      sfx('exclaim');
      await w.fadeTo(0.6, 8);
      G.setFlag(`birdGone_${key}`);
      w.npc(id) && (w.npc(id)!.emote = 0);
      await w.fadeTo(0, 8);
    }
    G.setFlag('birdsAwake');
    await say('프리져, 썬더, 파이어는\n탑을 빠져나가 하늘 멀리\n날아가 버렸다!');
    await w.wait(0.5);
    G.setFlag('towerExec');
    const exec = w.npc('towerExec');
    if (exec) exec.emote = 0.8;
    await w.wait(0.8);
    w.player.dir = 'down';
    await say('???: 쳇, 한발 늦었나.\n전설의 새를 놓치다니.');
    await towerExecBattle();
  },

  async towerExec() {
    if (G.flag('execGone')) return;
    await say('흑월: 아직 볼일이 남았다.\n그 검은 강아지를 넘겨라!');
    await towerExecBattle();
  },

  // ── 보라시티 체육관 ──
  async gymGuide4() {
    if (G.save.badges.includes('spirit')) {
      await say('네 번째 배지라니! 이제 서쪽\n항구시티로 가 보는 건 어때?');
      return;
    }
    if (!G.flag('birdsAwake')) {
      await say('해솔 관장님은 지금 자리에 안\n계셔. 불탄 탑에 조사하러 가셨어.');
      await say('탑은 마을 왼쪽 위의\n검게 그을린 건물이야.');
      return;
    }
    await say('관장 해솔은 고스트 타입을 써.\n노말과 격투 기술은 통하지 않아!');
    await say('악 타입이나 고스트 타입 기술로\n공격해 봐!');
  },

  async gymLeader4() {
    if (G.save.badges.includes('spirit')) {
      if (!G.save.bag.surf) return giveSurf();
      await say('해솔: 전설의 새는 언젠가\n진정한 실력자 앞에 다시\n모습을 드러낼 거야.');
      await say('해솔: 로켓단이 아롱이를 노린다니...\n그 녀석을 꼭 지켜 줘.');
      return;
    }
    await say('해솔: 탑에서 다시 만났네.\n전설의 새를 깨운 건 너였구나.');
    await say('해솔: 나는 어릴 때부터 그 새들을\n만나기 위해 수행해 왔어.');
    await say('해솔: 네가 새들에게 선택받을 만한\n트레이너인지 시험해 보겠어!');
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('gastly', 19), createMon('haunter', 19), createMon('haunter', 21), createMon('gengar', 23)],
      trainer: { className: '관장', name: '해솔', prize: 2500, sprite: { base: 'hat', pal: 'purple' }, lose: '해솔: ...보이지 않는 힘에서 졌어.' },
    });
    if (res.outcome !== 'win') return;
    G.save.badges.push('spirit');
    sfx('badge');
    G.setFlag('beat_gym4T1');
    G.setFlag('beat_gym4T2');
    await say(`${josa(P(), '은/는')} 해솔에게서\n혼령배지를 받았다!`);
    await say('해솔: 혼령배지가 있으면 몬스터가\n더 침착하게 싸울 거야.');
    await say('해솔: 서쪽 항구시티로 가는 길이\n열려 있을 거야. 거기 관장도\n만만치 않아.');
    await giveSurf();
  },

  // ── 항구시티 등대 ──
  async lightRaichu() {
    if (G.flag('raichuHealed')) {
      await say('라이츄: 라이라이!');
      await say('꼬리 끝이 환하게 빛나며\n밤바다를 비추고 있다.');
      return;
    }
    await say('라이츄: 라이...');
    await say('숨소리가 약하다.\n꼬리의 빛도 꺼져 간다...');
  },

  async jasmineTop() {
    const w = G.world;
    if (G.save.bag.secretpotion) {
      await say('시린: 그건... 섬도시 약국의\n비상약이잖아요!');
      await say(`${josa(P(), '은/는')} 시린에게\n비상약을 건넸다.`);
      G.removeItem('secretpotion');
      await say('시린은 라이츄에게\n조심스럽게 약을 먹였다...');
      await w.wait(0.6);
      sfx('heal');
      await say('라이츄: 라이...? 라이라이!');
      await w.fadeTo(1, 3);
      G.setFlag('raichuHealed');
      await w.fadeTo(0, 3);
      await say('라이츄의 꼬리가 환하게 빛나며\n등대에 다시 불이 켜졌다!');
      await say('시린: 고마워요... 정말 고마워요.\n빛나 대신 인사할게요.');
      await say('시린: 불이 꺼진 밤에 로켓단이\n배에 몬스터들을 싣는 걸 봤어요.\n보라시티 동쪽 호수 쪽이었어요.');
      await say('시린: 이제 체육관으로 돌아갈게요.\n관장으로서 정식으로 승부해요.');
      await w.fadeTo(1, 4);
      G.setFlag('lighthouseHealed');
      await w.fadeTo(0, 4);
      return;
    }
    if (!G.flag('lighthouseVisited')) {
      G.setFlag('lighthouseVisited');
      if (!G.flag('rivalLight')) {
        const rival = w.npc('rivalLight');
        if (rival) rival.emote = 0.8;
        await w.wait(0.8);
        await say(`${RIVAL()}: ...아픈 몬스터나 돌보고 있는\n관장이라니. 한심하네.`);
        await say(`${RIVAL()}: 약한 녀석은 버리고 강한\n녀석만 데리고 다니면 되잖아.`);
        await say('시린: ......');
        await say(`${RIVAL()}: 흥. ${P()}, 너도 그 강아지한테\n너무 정 주지 마. 약해진다고.`);
        await w.fadeTo(1, 4);
        G.setFlag('rivalLight');
        await w.fadeTo(0, 4);
      }
      await say('시린: ...미안해요. 저는 이 마을\n체육관 관장 시린이에요.');
      await say('시린: 이 아이는 빛나. 밤마다 꼬리\n빛으로 등대를 밝혀 주는\n라이츄예요.');
      await say('시린: 며칠 전 밤에 검은 옷\n사람들이 등대에 숨어든 뒤로\n계속 기운이 없어요...');
      await say('시린: 바다 건너 섬도시 약국의\n비상약이면 나을 텐데, 저는 이\n아이 곁을 떠날 수가 없어요.');
      await say(G.save.bag.surf ? '시린: 혹시... 대신 다녀와 줄 수\n있나요? 섬은 항구에서 서쪽\n바다 건너에 있어요.' : '시린: 바다를 건너려면\n파도타기가 필요해요.');
      return;
    }
    await say('시린: 섬도시는 항구에서 서쪽으로\n바다를 건너면 있어요.');
    await say('시린: 빛나야, 조금만 더 힘내...');
  },

  async pharmacist() {
    if (G.flag('gotSecretPotion')) {
      await say('약사: 라이츄는 좀 나았나?\n그 약이면 금방 털고 일어날 걸세.');
      return;
    }
    if (!G.flag('lighthouseVisited')) {
      await say('약사: 어서 오게. 이 섬의 약초로\n만든 약은 무엇이든 낫게 하지.');
      await say('약사: 아픈 몬스터가 있으면\n언제든 말하게.');
      return;
    }
    await say('약사: 뭐라고? 항구 등대의\n라이츄가 아프다고?');
    await say('약사: 그 녀석이 아프면 밤바다가\n위험해지지. 이걸 가져가게!');
    G.addItem('secretpotion');
    G.setFlag('gotSecretPotion');
    sfx('item');
    await say(`${josa(P(), '은/는')} 비상약을 받았다!`);
    await say('약사: 서두르게. 등대 불이 꺼진\n바다는 나쁜 녀석들 차지야.');
  },

  // ── 섬도시 체육관 (격투) ──
  async gymGuide5() {
    if (G.save.badges.includes('fist')) {
      await say('주먹배지를 땄구나!\n대단한 근성이야!');
      return;
    }
    await say('관장 무쇠는 격투 타입을 써.\n에스퍼나 비행 타입이 유리해!');
    await say('강챙이는 물 타입이기도 하니까\n전기 기술도 잘 들어.');
  },

  async gymLeader5() {
    if (G.save.badges.includes('fist')) {
      await say('무쇠: 와하하! 좋은 승부였다!\n몸도 마음도 단련을 게을리\n하지 마라!');
      return;
    }
    await say('무쇠: 와하하! 도전자로군!\n나는 섬도시 관장 무쇠!');
    await say('무쇠: 폭포를 맞으며 단련한\n이 근육을 보아라! 간다!');
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('primeape', 25), createMon('poliwrath', 28)],
      trainer: { className: '관장', name: '무쇠', prize: 3000, sprite: { base: 'bald', pal: 'brown' }, lose: '무쇠: 크으윽! 근육이 부족했다!' },
    });
    if (res.outcome !== 'win') return;
    G.save.badges.push('fist');
    sfx('badge');
    G.setFlag('beat_gym5T1');
    G.setFlag('beat_gym5T2');
    await say(`${josa(P(), '은/는')} 무쇠에게서\n주먹배지를 받았다!`);
    await say('무쇠: 주먹배지가 있으면 몬스터가\n더 힘차게 싸울 거다!');
    if (!G.flag('raichuHealed')) await say('무쇠: 항구 등대 일은 들었다.\n약국 영감님께 가 봐라!');
  },

  // ── 항구시티 체육관 (강철) ──
  async gymGuide6() {
    if (G.save.badges.includes('steel')) {
      await say('강철배지까지! 이제 반이나\n넘었어!');
      return;
    }
    if (!G.flag('lighthouseHealed')) {
      await say('관장 시린은 지금 등대 꼭대기에\n있어. 아픈 라이츄 곁을 지키고\n있대.');
      return;
    }
    await say('관장 시린은 강철 타입을 써.\n불꽃, 격투, 땅 기술이 잘 들어!');
    await say('코일은 전기 타입이기도 하니까\n땅 기술이 특히 좋아.');
  },

  async gymLeader6() {
    if (G.save.badges.includes('steel')) {
      await say('시린: 빛나도 이제 건강해졌어요.\n정말 고마워요.');
      await say('시린: 보라시티 동쪽 호수에서\n빨간 갸라도스가 날뛴다는\n소문이 있어요. 조심하세요.');
      return;
    }
    await say('시린: 다시 만났네요.\n빛나를 구해 줘서 고마워요.');
    await say('시린: 하지만 관장으로서는 봐주지\n않을 거예요. 강철처럼 단단한\n제 몬스터들을 넘어 보세요!');
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('magnemite', 28), createMon('magnemite', 28), createMon('magneton', 33)],
      trainer: { className: '관장', name: '시린', prize: 3500, sprite: { base: 'long', pal: 'clerk' }, lose: '시린: ...멋진 승부였어요.' },
    });
    if (res.outcome !== 'win') return;
    G.save.badges.push('steel');
    sfx('badge');
    G.setFlag('beat_gym6T1');
    await say(`${josa(P(), '은/는')} 시린에게서\n강철배지를 받았다!`);
    await say('시린: 강철배지가 있으면 몬스터가\n더 단단하게 버틸 거예요.');
    await say('시린: 로켓단이 실어 나르던\n몬스터들... 보라시티 동쪽\n호수로 가는 길에 단서가 있을\n거예요.');
  },

  // ── 서리마을 ──
  async frostOld() {
    if (G.flag('hideoutCleared')) {
      await say('체육관을 되찾았다는구나!\n백설 영감도 다시 체육관에\n나가셨다네.');
      return;
    }
    await say('검은 옷 녀석들이 체육관을\n빼앗고 관장 백설 영감을\n집으로 쫓아냈다네...');
  },

  async souvenirClerk() {
    if (G.flag('hideoutCleared')) {
      await say('점원: 히익! 저, 저는 그냥\n가게를 지키라고 해서...!');
      return;
    }
    await say('점원: 어서 오세... 아니,\n기념품은 다 팔렸습니다.');
    await say('점원: 볼일 없으면 나가 주시죠.');
  },

  async stairsBlocker() {
    await say('수상한 손님: 여긴 직원 전용이다.\n손님은 돌아가 줘야겠어.');
  },

  async lanceShop() {
    const w = G.world;
    await say('진: 왔구나. 이 가게 안쪽 계단이\n로켓단 아지트로 통한다.');
    const blocker = w.npc('stairsBlocker');
    if (blocker) blocker.emote = 0.8;
    await say('수상한 손님: 뭐, 뭐야 너희는!');
    await say('진: 망나뇽, 파괴광선!');
    sfx('exclaim');
    await w.fadeTo(1, 6);
    G.setFlag('hideoutOpen');
    await w.fadeTo(0, 6);
    await say('수상한 손님은\n저 멀리 날아가 버렸다!');
    await say('진: 나는 다른 길로 들어가겠다.\n안쪽의 전파 발생기를 멈춰야 해.');
    await say('진: 녀석들이 노리는 건 네\n강아지다. 조심해라.');
  },

  // ── 분노의 호수 ──
  async redGyarados() {
    const w = G.world;
    await say('갸라도스가 분노에 차서\n날뛰고 있다!');
    const arong = G.save.party.find((m) => spec(m).unlimitedMoves && m.hp > 0);
    if (arong) await say(`${monName(arong)}: 멍! 멍멍멍!`);
    const res = await G.battle({ kind: 'wild', enemy: [createMon('gyarados', 30, { shiny: true })] });
    if (res.outcome === 'lose') return;
    await w.fadeTo(1, 4);
    G.setFlag('redGyarados');
    await w.fadeTo(0, 4);
    if (res.outcome !== 'caught') await say('빨간 갸라도스는 정신을 차린 듯\n호수 깊이 사라졌다.');
    const lance = w.npc('lanceLake');
    if (lance) lance.emote = 0.8;
    await w.wait(0.8);
    await say('???: 그 갸라도스를 상대하다니,\n꽤 하는 트레이너로군.');
    await say('진: 나는 드래곤 조련사 진.\n이 호수의 갸라도스들이 억지로\n진화당해 날뛰고 있어 조사하러 왔다.');
    await say('진: 원인은 서리마을에서 나오는\n이상한 전파다. 기념품 가게가\n수상하더군.');
    if (arong) await say(`진: ...그 강아지, 어떤 타입의\n기운도 느껴지지 않는구나.\n로켓단이 노릴 만하군.`);
    await say('진: 서리마을 기념품 가게에서\n만나자. 함께 녀석들을 멈추자.');
    await w.fadeTo(1, 4);
    G.setFlag('lanceMet');
    await w.fadeTo(0, 4);
  },

  // ── 로켓단 아지트 ──
  async hideoutExec() {
    const w = G.world;
    const arong = G.save.party.find((m) => spec(m).unlimitedMoves);
    await say('흑월: 또 너냐! 여기까지\n쫓아오다니 끈질긴 꼬마로군.');
    await say('흑월: 마침 잘됐다. 그 검은 강아지,\n이번에야말로 데려가 주지!');
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('weezing', 28), createMon('golbat', 28), createMon('gengar', 29)],
      trainer: { className: '로켓단 간부', name: '흑월', prize: 2400, sprite: { base: 'hat', pal: 'shadow' }, lose: '흑월: 이, 이럴 수가...!' },
    });
    if (res.outcome !== 'win') return;
    await say('흑월: 크윽... 좋다, 알려 주지.\n이 전파는 실험일 뿐이다.');
    await say('흑월: 보스께서는 한빛방송국을\n접수해 이 지방 모든 몬스터를\n조종하는 전파를 쏘실 거다.');
    await say("흑월: 그 장치의 마지막 열쇠는\n어떤 타입에도 물들지 않은\n'무상성' 몬스터...");
    await say('흑월: 바로 네 강아지다!');
    if (arong) await say(`${josa(monName(arong), '은/는')} 털을 곤두세우고\n으르렁거렸다!`);
    await say('흑월: 발생기는 저 붐볼들이\n돌리고 있지. 멈출 수 있으면\n멈춰 보시지! 크하하!');
    await w.fadeTo(1, 4);
    G.setFlag('hideoutExecGone');
    await w.fadeTo(0, 4);
  },

  electrode1: () => electrode(1),
  electrode2: () => electrode(2),
  electrode3: () => electrode(3),

  // ── 서리마을 체육관 (얼음) ──
  async gymGuide7() {
    if (G.save.badges.includes('glacier')) {
      await say('얼음배지라니! 이제 배지가\n일곱 개야!');
      return;
    }
    await say('관장 백설은 얼음 타입을 써.\n불꽃, 격투, 바위, 강철 기술이\n잘 들어!');
    await say('파르셀은 방어가 엄청 단단하니까\n특수 기술로 공격해 봐.');
    await say('바닥이 얼음이라 한번 미끄러지면\n뭔가에 부딪칠 때까지 못 멈춰.\n길을 잘 생각해 봐!');
  },

  async gymLeader7() {
    if (G.save.badges.includes('glacier')) {
      G.setFlag('radioTakeover');
      await say('백설: 한빛시티 방송국에서 이상한\n방송이 나온다는 소식이 들리는구나.');
      await say('백설: 로켓단이 마지막 판을\n벌이려는 게지. 강아지를 꼭\n지키거라.');
      return;
    }
    await say('백설: 체육관을 되찾아 줘서 고맙구나.\n나는 이곳 관장 백설이란다.');
    await say('백설: 얼음은 견디는 힘을 가르쳐\n준다. 긴 겨울을 견딘 내 몬스터들을\n이겨 보거라!');
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('dewgong', 29), createMon('cloyster', 30), createMon('jynx', 32)],
      trainer: { className: '관장', name: '백설', prize: 3400, sprite: { base: 'old', pal: 'clerk' }, lose: '백설: 허허... 봄이 온 것 같구나.' },
    });
    if (res.outcome !== 'win') return;
    G.save.badges.push('glacier');
    sfx('badge');
    G.setFlag('beat_gym7T1');
    G.setFlag('beat_gym7T2');
    await say(`${josa(P(), '은/는')} 백설에게서\n얼음배지를 받았다!`);
    await say('백설: 얼음배지가 있으면 몬스터가\n추위에도 지치지 않을 게다.');
    await say('백설: 진이라는 젊은이가 한빛시티로\n가는 걸 봤다. 너도 서두르거라.');
    G.setFlag('radioTakeover');
    await say('...그때 라디오에서 잡음 섞인\n목소리가 흘러나왔다.');
    await say('???: 여기는 한빛방송국. 지금부터\n이 방송은 로켓단이 맡는다!\n크하하하!');
  },

  // ── 한빛방송국 (7장) ──
  async radioDesk() {
    if (G.flag('radioCleared')) {
      await say('직원: 방송국을 구해 줘서\n정말 고마워요! 오늘부터 다시\n즐거운 방송을 전해 드릴게요.');
      return;
    }
    if (G.flag('radioTakeover')) {
      await say('직원: (덜덜 떨고 있다...)\n위, 위층에 무서운 사람들이...');
      return;
    }
    await say('한빛방송국에 어서 오세요!\n오늘도 즐거운 몬스터 방송을\n전해 드리고 있답니다.');
  },

  async lobbyGruntMove() {
    const w = G.world;
    await say('조무래기: 큭... 위에 계신 분들이\n가만두지 않을 거다!');
    await w.fadeTo(1, 5);
    G.setFlag('lobbyGruntGone');
    await w.fadeTo(0, 5);
  },

  async rival4() {
    if (G.flag('rival4')) return;
    const w = G.world;
    if (!G.flag('rival4Active')) {
      G.setFlag('rival4Active');
      const rival = w.npc('rival4');
      if (!rival) return;
      rival.emote = 0.8;
      await w.wait(0.8);
      const p = w.player;
      const steps = Math.max(0, rival.x - p.x - 1);
      await w.walk(rival, Array(steps).fill('left'));
      p.dir = 'right';
      await say(`${RIVAL()}: ${P()}! 너도 왔냐.`);
      await say(`${RIVAL()}: 로켓단이 네 강아지를 노린다며.\n...흥, 착각하지 마.`);
      await say(`${RIVAL()}: 네가 약해서 그 강아지를\n빼앗기면, 내가 이길 상대가\n없어지잖아. 그러니까...`);
      await say(`${RIVAL()}: 여기서 나한테 지면 그냥\n돌아가! 덤벼!`);
    } else {
      await say(`${RIVAL()}: 또 왔냐. 이번에도 덤벼!`);
    }
    const fin = RIVAL_FINAL[G.save.rivalStarter ?? 'charmander'] ?? 'charizard';
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('golbat', 31), createMon('magneton', 31), createMon('haunter', 32), createMon('kadabra', 32), createMon(fin, 34)],
      trainer: { className: '라이벌', name: RIVAL(), prize: 2160, sprite: { base: 'cap', pal: 'rival' }, lose: `${RIVAL()}: ...그래, 네가 더 강해.` },
    });
    if (res.outcome !== 'win') return;
    await say(`${RIVAL()}: ...몬스터를 믿는 마음이라.\n그딴 거 웃기다고 생각했는데.`);
    await say(`${RIVAL()}: 위층은 네가 가.\n나는 여기 남은 녀석들을\n쓸어버릴 테니까.`);
    await w.fadeTo(1, 4);
    G.setFlag('rival4');
    await w.fadeTo(0, 4);
  },

  /** 방송실 앞: 간부 흑월과의 마지막 승부 */
  async radioExecScene() {
    if (G.flag('radioExecBeaten')) return;
    const w = G.world;
    await walkToColumn(8);
    w.player.dir = 'up';
    const exec = w.npc('radioExec');
    if (exec) exec.emote = 0.8;
    await w.wait(0.8);
    await say('흑월: 기다리고 있었다, 꼬마.\n이번이 마지막이다!');
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('weezing', 30), createMon('golbat', 30), createMon('arbok', 31), createMon('gengar', 32)],
      trainer: { className: '로켓단 간부', name: '흑월', prize: 3600, sprite: { base: 'hat', pal: 'shadow' }, lose: '흑월: 보, 보스... 죄송합니다...' },
    });
    if (res.outcome !== 'win') return;
    await say('흑월: 보스께서 기다리고 계신다...\n각오는 됐겠지.');
    await w.fadeTo(1, 5);
    G.setFlag('radioExecBeaten');
    await w.fadeTo(0, 5);
    await say('방송실 안쪽에서 누군가가\n기다리고 있다... 준비가 되면\n앞으로 나아가자.');
  },

  async radioClimax() {
    if (G.flag('radioCleared') || !G.flag('radioExecBeaten')) return;
    const w = G.world;
    const arong = [...G.save.party, ...G.save.box].find((m) => spec(m).unlimitedMoves);
    const inParty = !!arong && G.save.party.includes(arong);
    const name = arong ? monName(arong) : '그 강아지';
    await walkToColumn(7);
    w.player.dir = 'up';

    // 보스 등장, 아롱이를 빼앗으려 한다
    const boss = w.npc('radioBoss');
    if (!G.flag('arongScene')) {
      G.setFlag('arongScene');
      if (boss) boss.emote = 0.8;
      await w.wait(0.8);
      await say('???: 흑월을 쓰러뜨리다니.\n제법이로군.');
      await say('암영: 나는 로켓단의 보스, 암영.\n이 방송국에서 이 지방 모든\n몬스터를 움직일 전파를 쏠 것이다.');
      await say(`암영: 다만 그 전파를 실어 나를\n'텅 빈 파동'이 필요하지. 어떤 타입에도\n물들지 않은 몬스터... 바로 ${name}.`);
      if (inParty && arong) {
        await say(`암영: ${josa(name, '을/를')} 내놓아라.`);
        await yesNo(`${josa(name, '을/를')} 넘기겠습니까?`);
        await say('암영: 대답은 필요 없다.\n포획 장치, 가동!');
        sfx('exclaim');
        await w.fadeTo(0.8, 8);
        const taken = w.npc('arongTaken');
        if (taken) taken.def.sprite = { mon: arong.species };
        G.setFlag('arongTaken');
        if (w.follower) w.follower.hidden = true;
        await w.fadeTo(0, 8);
        await say(`${josa(name, '이/가')} 장치의 빛에 끌려가\n암영 곁에 붙잡혔다!`);
        await say(`${name}: 끼잉... 끼잉...!`);
        await say(`${P()}: ${callName(name)}!`);
        await say('암영: 크하하! 이제 이 녀석의 텅 빈\n파동으로 방송을 시작하면...');
        await w.wait(0.6);
        await say(`${name}: ......`);
        await say(`${name}: 멍!!`);
        sfx('exclaim');
        await say(`${josa(name, '이/가')} 장치의 줄을\n있는 힘껏 물어뜯었다!`);
        await w.fadeTo(1, 6);
        G.setFlag('arongFree');
        await w.fadeTo(0, 6);
        await say(`장치가 불꽃을 튀기며 멈췄다!\n${josa(name, '은/는')} ${P()}에게\n한달음에 달려왔다!`);
        await say(`${josa(name, '은/는')} ${P()}의 품에\n얼굴을 묻고 꼬리를 흔들었다...`);
        await say('암영: 이, 이 녀석이...!\n장치를 스스로 끊어 내다니!');
      } else {
        await say('암영: ...그 강아지는 데려오지 않았나.\n상관없다. 너를 쓰러뜨리고\n찾아내면 그만이다.');
      }
      await say('암영: 좋다. 힘으로 빼앗아 주마!');
    } else {
      await say('암영: 다시 왔나. 이번에야말로\n그 강아지를 빼앗아 주마!');
    }

    // 보스전
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('persian', 30), createMon('dugtrio', 31), createMon('nidoqueen', 32), createMon('nidoking', 32), createMon('rhydon', 33)],
      trainer: { className: '로켓단 보스', name: '암영', prize: 8000, sprite: { base: 'hat', pal: 'shadow' }, lose: '암영: ...내가, 지다니.' },
    });
    if (res.outcome !== 'win') return;

    // 결말
    await say('암영: 장치보다... 그 강아지와\n너의 유대가 더 강했다는 건가.');
    await say('암영: 좋다. 로켓단은 오늘부로\n해산한다. ...언젠가 다시 만나지.');
    await w.fadeTo(1, 4);
    G.setFlag('radioCleared');
    await w.fadeTo(0, 4);
    const lance = w.npc('lance3F');
    if (lance) lance.emote = 0.8;
    await w.wait(0.8);
    w.player.dir = 'left';
    await say('진: 다 끝났구나. 아래층은\n네 친구가 정리해 줬다.');
    await say(`${RIVAL()}: 친구는 무슨. ...흥.\n그래도 이번엔 네가 해냈네.`);
    if (arong) await say(`진: ${josa(name, '이/가')} 스스로 장치를\n끊어 냈다고? 타입이 없는 게\n아니라, 무엇에도 물들지 않는 거였군.`);
    await say('진: 이걸 받아라. 어떤 몬스터든\n반드시 잡을 수 있는 볼이다.');
    G.addItem('mastercapsule');
    sfx('item');
    await say(`${josa(P(), '은/는')} 마스터볼을 받았다!`);
    await say('진: 마지막 배지는 내 고향 용의\n마을에 있다. 서리마을 동쪽 얼음\n동굴을 지나면 닿을 거다.');
    await say(`${RIVAL()}: 나도 간다. 리그에서\n누가 먼저 챔피언이 되나 보자!`);
    await w.fadeTo(1, 4);
    G.setFlag('radioEpilogue');
    await w.fadeTo(0, 4);
    if (arong && inParty) {
      await say(`${josa(name, '은/는')} ${josa(P(), '을/를')} 올려다보며\n힘차게 짖었다!`);
      await say(`${josa(name, '은/는')} 이번 일로\n무언가를 깨달은 것 같다!`);
      await G.pickMovesFor(arong, 1);
    }
  },

  // ── 용의 마을 (8장) ──
  async gymGuide8() {
    if (G.save.badges.includes('dragon')) {
      await say('배지 여덟 개! 이제 리그에\n도전할 수 있어!');
      return;
    }
    await say('관장 단비는 드래곤 타입을 써.\n얼음 기술과 드래곤 기술이\n잘 들어!');
    await say('신뇽은 빠르고 끈질기니까\n회복약을 넉넉히 챙겨!');
  },

  async gymLeader8() {
    if (G.save.badges.includes('dragon')) {
      await say('단비: 할아버지가 인정한\n트레이너라니... 흥, 다음엔\n안 질 거야.');
      await say('단비: 리그에서 오빠, 아니\n진 오빠를 만나면 안부 전해 줘.');
      return;
    }
    if (G.flag('beatLeader8')) {
      if (!G.flag('elderPassed')) {
        await say('단비: 배지가 갖고 싶으면\n용의 굴에 계신 할아버지께\n인정받고 와!');
        await say('단비: 굴은 마을 오른쪽 위야.\n물을 건너야 하니까\n파도타기를 잊지 마.');
        return;
      }
      await say('단비: ...할아버지께 들었어.\n인정해 줄게. 받아!');
      G.save.badges.push('dragon');
      sfx('badge');
      G.setFlag('beat_gym8T1');
      G.setFlag('beat_gym8T2');
      await say(`${josa(P(), '은/는')} 단비에게서\n용비늘배지를 받았다!`);
      await say('단비: 배지 여덟 개가 모였네.\n이제 리그에 도전할 수 있어.');
      await say('단비: 리그로 가는 챔피언로드는\n새싹마을 동쪽 바다 건너에 있어.\n진 오빠도 거기서 기다릴 거야.');
      return;
    }
    await say('단비: 내가 이 마을 체육관 관장\n단비야. 세계 최강의 드래곤\n조련사가 될 사람이지!');
    await say('단비: 로켓단을 쫓아냈다고?\n흥, 그래 봤자 내 용들한테는\n안 될걸!');
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('dragonair', 35), createMon('gyarados', 35), createMon('seadra', 36), createMon('dragonair', 38)],
      trainer: { className: '관장', name: '단비', prize: 4000, sprite: { base: 'long', pal: 'dragon' }, lose: '단비: 말도 안 돼... 내가 지다니!' },
    });
    if (res.outcome !== 'win') return;
    G.setFlag('beatLeader8');
    await say('단비: ...인정 못 해!\n이번 건 운이 좋았던 거야!');
    await say('단비: 배지가 갖고 싶으면\n용의 굴에 계신 할아버지께\n인정받고 와!');
  },

  async dragonElder() {
    const w = G.world;
    if (G.flag('elderPassed')) {
      await say('장로: 단비에게 가 보거라.\n그 아이도 이제 너를 인정할\n게다.');
      return;
    }
    if (!G.flag('beatLeader8')) {
      await say('장로: 진이 말하던 아이로구나.\n먼저 체육관에서 단비와 겨뤄\n보거라.');
      return;
    }
    const arong = G.save.party.find((m) => spec(m).unlimitedMoves);
    const name = arong ? monName(arong) : '네 강아지';
    await say('장로: 나는 이 마을의 장로이자\n진의 할아버지란다.');
    await say('장로: 용을 다루려면 힘보다 마음이\n먼저지. 몇 가지 묻겠다.\n솔직하게 대답하거라.');
    const quiz: [string, boolean][] = [
      ['장로: 강해지기 위해서라면 약한\n몬스터는 버려도 된다고\n생각하느냐?', false],
      [`장로: ${josa(name, '이/가')} 무섭다며 앞에\n나서지 못한다면, 그래도 함께\n여행하겠느냐?`, true],
      ['장로: 몬스터는 트레이너의 명령을\n따르기만 하는 도구라고\n생각하느냐?', false],
    ];
    for (const [q, right] of quiz) {
      await say(q);
      const yes = await yesNo('대답하시오.');
      if (yes !== right) {
        await say('장로: 흠... 아직 깨달음이\n부족하구나.');
        await say('장로: 몬스터의 마음을 다시\n생각해 보고 오거라.');
        return;
      }
    }
    await say('장로: 허허허! 훌륭하다.\n그 강아지가 장치를 끊고 네게\n돌아온 이유를 알겠구나.');
    if (arong) await say(`${josa(name, '은/는')} 장로를 보고\n꼬리를 살랑살랑 흔들었다.`);
    G.setFlag('elderPassed');
    await say('장로: 이 아이를 데려가거라.\n이 굴에서 태어난 미뇽이란다.');
    const mon = createMon('dratini', 15, { ot: P(), otId: G.save.playerId, map: '용의 굴' });
    const where = G.giveMon(mon);
    sfx('item');
    await say(`${josa(P(), '은/는')} 미뇽을 받았다!`);
    if (where === 'box') await say('미뇽은 PC 박스로\n전송되었다!');
    await say('장로: 단비에게 가 보거라.\n내가 이야기해 두마.');
    await w.wait(0.2);
  },

  // ── 10번수로·챔피언로드 (9장) ──
  async leagueGate() {
    const w = G.world;
    const n = G.save.badges.length;
    if (n < 8) {
      await say(`경비원: 이 앞은 챔피언로드.\n배지 여덟 개가 있어야 지나갈 수\n있습니다. (지금 ${n}개)`);
      return;
    }
    await say('경비원: 배지를 확인하겠습니다.\n...깃털, 더듬이, 하트, 혼령,\n주먹, 강철, 얼음, 용비늘!');
    await say('경비원: 여덟 개 모두 확인했습니다!\n지나가셔도 좋습니다.');
    await w.fadeTo(1, 5);
    G.setFlag('gatePassed');
    await w.fadeTo(0, 5);
  },

  async rival5() {
    if (G.flag('rival5')) return;
    const w = G.world;
    if (!G.flag('rival5Active')) {
      G.setFlag('rival5Active');
      const rival = w.npc('rival5');
      if (!rival) return;
      rival.emote = 0.8;
      await w.wait(0.8);
      await w.walk(rival, ['down']);
      w.player.dir = 'up';
      await say(`${RIVAL()}: ...왔구나, ${P()}.`);
      await say(`${RIVAL()}: 방송국에서 그 강아지가 너한테\n달려가는 걸 봤을 때... 처음으로\n부러웠어.`);
      await say(`${RIVAL()}: 내 몬스터들도 그렇게 날 믿어 줄까\n싶어서, 처음부터 다시 함께\n단련했어. 확인해 줘!`);
    } else {
      await say(`${RIVAL()}: 한 번 더다. 덤벼!`);
    }
    const fin = RIVAL_FINAL[G.save.rivalStarter ?? 'charmander'] ?? 'charizard';
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('golbat', 36), createMon('magneton', 36), createMon('gengar', 37), createMon('alakazam', 37), createMon(fin, 39)],
      trainer: { className: '라이벌', name: RIVAL(), prize: 4100, sprite: { base: 'cap', pal: 'rival' }, lose: `${RIVAL()}: ...그래. 이게 너희의 힘이구나.` },
    });
    if (res.outcome !== 'win') return;
    await say(`${RIVAL()}: 졌다. ...근데 이상하게\n기분이 나쁘지 않네.`);
    await say(`${RIVAL()}: 가, ${P()}. 챔피언 해 버려.\n그리고 언젠가 꼭 다시 붙자.`);
    await w.fadeTo(1, 4);
    G.setFlag('rival5');
    await w.fadeTo(0, 4);
  },

  // ── 몬스터리그 ──
  e4psychic: () =>
    eliteFour('e4psychic', '수정', { base: 'long', pal: 'purple' },
      [['slowbro', 40], ['jynx', 39], ['exeggutor', 39], ['hypno', 41], ['alakazam', 42]],
      ['수정: 몬스터리그에 온 걸 환영해.\n나는 사천왕 수정. 에스퍼 타입을\n다루지.', '수정: ...그 강아지의 마음이 보여.\n온통 너로 가득하구나. 그 마음,\n시험해 볼게!'],
      '수정: 마음과 마음이 이어진 힘...\n내 예지로도 막을 수 없었어.'),
  e4poison: () =>
    eliteFour('e4poison', '청사', { base: 'hat', pal: 'green' },
      [['arbok', 38], ['venomoth', 39], ['tentacruel', 40], ['muk', 40], ['golbat', 42]],
      ['청사: 크크... 사천왕 청사다.\n독은 천천히, 확실하게 스며들지.', '청사: 너의 끈기, 독보다 질긴지\n보자!'],
      '청사: 독이... 통하지 않다니.'),
  e4fighting: () =>
    eliteFour('e4fighting', '태산', { base: 'bald', pal: 'brown' },
      [['onix', 40], ['hitmonlee', 40], ['hitmonchan', 40], ['onix', 41], ['machamp', 44]],
      ['태산: 사천왕 태산이다!\n단련, 또 단련! 그것뿐이다!', '태산: 작은 강아지라고 봐주지\n않는다! 간다!'],
      '태산: 크하하! 졌다! 좋은 단련이었다!'),
  e4dark: () =>
    eliteFour('e4dark', '밤비', { base: 'bun', pal: 'shadow' },
      [['persian', 40], ['vileplume', 40], ['golbat', 42], ['gengar', 43], ['arbok', 45]],
      ['밤비: 사천왕의 마지막, 밤비야.\n강한 몬스터, 약한 몬스터...\n그건 사람이 정한 거야.', '밤비: 진짜 트레이너라면 좋아하는\n몬스터로 이겨야지. 보여 줘!'],
      '밤비: ...그래, 좋아하는 몬스터와\n함께라면 이렇게 강해지는구나.'),

  async champion() {
    const w = G.world;
    if (G.flag('champion')) {
      await say('진: 챔피언, 언제든 다시 오너라.');
      return;
    }
    const arong = G.save.party.find((m) => spec(m).unlimitedMoves);
    const name = arong ? monName(arong) : '그 강아지';
    await say('진: 기다리고 있었다, ' + P() + '.');
    await say('진: 분노의 호수에서 처음 만났을 때,\n그 작은 강아지가 이렇게 멀리\n올 줄은 몰랐지.');
    await say(`진: 나는 이 리그의 챔피언, 진.\n드래곤과 함께 정상에 섰다.\n이제 ${josa(name, '과/와')} 너를 시험하겠다!`);
    const res = await G.battle({
      kind: 'trainer',
      enemy: [createMon('gyarados', 42), createMon('dragonite', 45), createMon('dragonite', 45), createMon('aerodactyl', 44), createMon('charizard', 44), createMon('dragonite', 48)],
      trainer: { className: '챔피언', name: '진', prize: 10000, sprite: { base: 'cap', pal: 'dragon' }, lose: '진: ...훌륭하다. 정말 훌륭하다.' },
    });
    if (res.outcome !== 'win') {
      for (const k of ['e4psychic', 'e4poison', 'e4fighting', 'e4dark']) G.setFlag(`${k}Done`, false);
      return;
    }
    await say('진: 새로운 챔피언의 탄생이다!');
    await say(`진: 강함이란 몬스터를 부리는 힘이\n아니라, 서로를 믿는 마음이라는 걸\n너와 ${josa(name, '이/가')} 보여 주었다.`);
    if (arong) await say(`${josa(name, '은/는')} ${josa(P(), '을/를')} 향해\n힘껏 꼬리를 흔들었다!`);
    await say('진: 자, 명예의 전당으로 가자.\n너희의 이름을 새기러.');
    G.setFlag('champion');
    await w.fadeTo(1, 2);
    await openCredits();
    // 엔딩 뒤: 집으로
    G.healParty();
    G.save.lastHeal = { map: 'home', x: 3, y: 4, dir: 'up' };
    w.fade = 1;
    await w.warpTo('home', 5, 3, 'down');
    await say(`엄마: 어서 오렴, ${P()}.\n...아니, 이제는 챔피언이라고\n불러야겠구나!`);
    if (arong) await say(`${josa(name, '은/는')} 익숙한 집 냄새를 맡고\n신이 나서 빙글빙글 돌았다!`);
    await say('엄마: 그러고 보니 요즘 연못가에\n분홍색 몬스터가 자주 보인다더라.\n아롱이랑 놀고 싶은 걸까?');
    G.writeSave();
    await say('모험 기록이 저장되었다.');
  },

  // ── 엔딩 뒤 ──
  async mewtwo() {
    const w = G.world;
    await say('...!');
    await say('깊은 어둠 속에서 차가운\n눈빛이 이쪽을 바라보고 있다.');
    const res = await G.battle({ kind: 'wild', enemy: [createMon('mewtwo', 70)] });
    if (res.outcome === 'lose') return;
    await w.fadeTo(1, 4);
    G.setFlag('mewtwoDone');
    await w.fadeTo(0, 4);
    if (res.outcome !== 'caught') await say('뮤츠는 동굴 깊은 곳으로\n사라져 버렸다...');
  },

  async mew() {
    const w = G.world;
    const arong = G.save.party.find((m) => spec(m).unlimitedMoves);
    await say('분홍색 몬스터가 연못 위를\n둥실둥실 떠다니고 있다.');
    if (arong) await say(`${josa(monName(arong), '이/가')} 다가가자 분홍색\n몬스터는 장난스럽게 웃었다!`);
    await say('뮤: 뮤우~♪');
    const res = await G.battle({ kind: 'wild', enemy: [createMon('mew', 30)] });
    if (res.outcome === 'lose') return;
    await w.fadeTo(1, 4);
    G.setFlag('mewDone');
    await w.fadeTo(0, 4);
    if (res.outcome !== 'caught') await say('뮤는 즐거운 듯 웃으며\n하늘 높이 날아가 버렸다.');
  },

  async giftLady() {
    if (G.flag('giftLady')) {
      await say('볼은 몬스터가 약해졌을 때\n던지면 잘 잡혀.');
      return;
    }
    await say('어머, 여행 중이구나?\n이걸 가져가렴.');
    G.addItem('supercapsule', 2);
    G.setFlag('giftLady');
    await say(`${josa(P(), '은/는')} ${ITEMS.supercapsule.name} 2개를\n받았다!`);
  },

  // ── 낚시꾼 ──
  async oldRodFisher() {
    await rodFisher('oldrod', ['낚시꾼: 연못에서 낚시하는 게\n내 유일한 낙이지.', '낚시꾼: 너도 해 볼래? 집에\n낡은 낚싯대가 하나 더 있거든.\n자, 받아!'],
      '낚시꾼: 낡은낚싯대로는 거의\n잉어킹만 낚여. 그게 또 재밌지.');
  },
  async goodRodFisher() {
    await rodFisher('goodrod', ['낚시꾼: 바다낚시는 처음이냐?\n바다엔 별별 몬스터가 다 있지.', '낚시꾼: 이 좋은낚싯대라면\n낡은 것보다 훨씬 센 녀석들이\n걸려든다고!'],
      '낚시꾼: 바다에서 좋은낚싯대를\n쓰면 셀러나 쏘드라도 걸린다네.');
  },
  async superRodFisher() {
    await rodFisher('superrod', ['낚시꾼: 용의 굴 물속에는 아주\n귀한 몬스터가 산다는 소문이\n있지.', '낚시꾼: 웬만한 낚싯대로는\n어림없어. 이 대단한낚싯대를\n가져가!'],
      '낚시꾼: 대단한낚싯대로 용의 굴에서\n낚아 봐. 미뇽이 걸릴지도 몰라!');
  },
};

/** 아지트의 전파 발생기를 돌리는 붐볼. 셋을 모두 멈추면 아지트 소탕 */
async function electrode(n: number) {
  const w = G.world;
  await say('붐볼이 발생기에 붙어\n전기를 보내고 있다!');
  const res = await G.battle({ kind: 'wild', enemy: [createMon('electrode', 24)] });
  if (res.outcome === 'lose') return;
  await w.fadeTo(1, 6);
  G.setFlag(`electrode${n}`);
  await w.fadeTo(0, 6);
  if (![1, 2, 3].every((k) => G.flag(`electrode${k}`))) {
    await say('발생기 소리가 조금 약해졌다.');
    return;
  }
  await say('발생기가 멈췄다!\n윙윙거리던 소리가 사라졌다.');
  G.setFlag('signalOff');
  const lance = w.npc('lanceHideout');
  if (lance) lance.emote = 0.8;
  await w.wait(0.8);
  await say('진: 해냈구나! 이제 호수의\n갸라도스들도 진정될 거다.');
  await say('진: 흑월이 말한 한빛방송국...\n로켓단 보스가 직접 움직이겠군.');
  await say('진: 녀석들이 아롱이를 노리는 건\n분명하다. 하지만 녀석들을 막을 수\n있는 것도 너희뿐일지 모른다.');
  await say('진: 먼저 서리마을 관장 백설에게\n도전해 힘을 키워라. 나는 방송국을\n살피고 있겠다.');
  await w.fadeTo(1, 4);
  G.setFlag('hideoutCleared');
  await w.fadeTo(0, 4);
}

/** 몬스터 이름을 부르는 말: 아롱이 → 아롱아 */
function callName(name: string) {
  const base = name.length > 1 && name.endsWith('이') ? name.slice(0, -1) : name;
  return josa(base, '아/야');
}

/** 같은 줄에서 x칸까지 걸어간다 (사건 장면을 화면 가운데서 보이게) */
async function walkToColumn(x: number) {
  const p = G.world.player;
  const n = Math.abs(x - p.x);
  if (n) await G.world.walk(p, Array(n).fill(x > p.x ? 'right' : 'left'));
}

/** 사천왕 한 명과의 승부. 지면 사천왕 기록이 처음부터 다시 시작된다 */
async function eliteFour(flag: string, name: string, sprite: { base: CharBase; pal: CharPalName }, team: [string, number][], intro: string[], lose: string) {
  const w = G.world;
  if (G.flag(`${flag}Done`)) {
    await say(`${name}: 다음 방으로 가. 기다리고\n있을 거야.`);
    return;
  }
  for (const line of intro) await say(line);
  const res = await G.battle({
    kind: 'trainer',
    enemy: team.map(([sp, lv]) => createMon(sp, lv)),
    trainer: { className: '사천왕', name, prize: team[team.length - 1][1] * 100, sprite, lose },
  });
  if (res.outcome !== 'win') {
    for (const k of ['e4psychic', 'e4poison', 'e4fighting', 'e4dark']) G.setFlag(`${k}Done`, false);
    return;
  }
  await say(`${name}: 다음 방으로 가.\n문이 열렸어.`);
  await w.fadeTo(0.6, 8);
  G.setFlag(`${flag}Done`);
  await w.fadeTo(0, 8);
}

async function giveSurf() {
  await say('해솔: 그리고 이걸 가져가.\n물 위를 건널 수 있게 해 줄 거야.');
  G.addItem('surf');
  sfx('item');
  await say(`${josa(P(), '은/는')} 파도타기를 받았다!`);
  await say('해솔: 물가에서 A 버튼을 누르면\n몬스터와 함께 물 위를 건널 수\n있어.');
}

async function giveWakebell() {
  await say('다솜: 맞다! 4번도로에 잠만보가\n길을 막고 자고 있대.');
  await say('다솜: 이 방울 소리면 금방\n깰 거야. 가져가!');
  G.addItem('wakebell');
  sfx('item');
  await say(`${josa(P(), '은/는')} 깨움방울을 받았다!`);
}

/** 불탄 탑 지하: 로켓단 간부 흑월이 아롱이를 노린다 */
async function towerExecBattle() {
  const w = G.world;
  const arong = G.save.party.find((m) => spec(m).unlimitedMoves);
  const name = arong ? monName(arong) : '그 강아지';
  await say('흑월: 나는 로켓단 간부 흑월.\n...응? 그 검은 강아지는?');
  await say(`흑월: 어떤 타입에도 속하지 않는\n몬스터라니... 보스께서 찾던\n'무상성' 몬스터가 바로 이 녀석이군!`);
  await say(`흑월: 전설의 새보다 더 좋은 걸\n찾았군. ${josa(name, '을/를')} 넘겨라!`);
  const res = await G.battle({
    kind: 'trainer',
    enemy: [createMon('koffing', 20), createMon('golbat', 20), createMon('haunter', 21)],
    trainer: { className: '로켓단 간부', name: '흑월', prize: 1500, sprite: { base: 'hat', pal: 'shadow' }, lose: '흑월: 큭... 꼬마 주제에!' },
  });
  if (res.outcome !== 'win') return;
  await say('흑월: 오늘은 물러나 주지.\n하지만 기억해 둬라.');
  await say(`흑월: ${josa(name, '은/는')} 반드시\n로켓단이 데려간다!`);
  await w.fadeTo(1, 4);
  G.setFlag('execGone');
  await w.fadeTo(0, 4);
  if (arong) await say(`${josa(name, '은/는')} ${P()}의 다리에\n바짝 붙어 낑낑거렸다...`);
  await w.wait(0.4);
  G.setFlag('mortyTower');
  const morty = w.npc('mortyTower');
  if (morty) morty.emote = 0.8;
  await w.wait(0.8);
  w.player.dir = 'right';
  await say('???: 지금 그 기운은...!\n세 마리 새가 깨어났구나!');
  await say('해솔: 나는 보라시티 체육관 관장\n해솔. 새들이 날아가는 걸 봤어.');
  await say('해솔: 로켓단이 아롱이를...?\n...알겠어. 체육관에서 기다릴게.\n네 실력을 보여 줘.');
  await w.fadeTo(1, 4);
  G.setFlag('mortyLeft');
  await w.fadeTo(0, 4);
}

async function rivalBattle() {
  const w = G.world;
  const rival = w.npc('rival');
  if (!rival) return;
  const choice = pick(RIVAL_CHOICES);
  G.save.rivalStarter = choice;
  await say(`${RIVAL()}: 그럼 책상 위 몬스터는\n내가 고를게!`);
  await say(`${RIVAL()}: 난 이 녀석!\n${josa(SPECIES[choice].name, '이/가')} 마음에 들어!`);
  await say(`${RIVAL()}: 몬스터를 받았으면\n승부해 봐야지! 덤벼!`);
  const res = await G.battle(
    {
      kind: 'trainer',
      enemy: [createMon(choice, 5)],
      trainer: { className: '라이벌', name: RIVAL(), prize: 300, sprite: { base: 'cap', pal: 'rival' }, lose: `${RIVAL()}: 칫... 운이 좋았을 뿐이야!` },
    },
    { canLose: true },
  );
  if (res.outcome === 'win') await say(`${RIVAL()}: 다음엔 안 질 거야!`);
  else await say(`${RIVAL()}: 거 봐, 내가 이겼지!`);
  await say(`${RIVAL()}: 난 먼저 이슬시티로 갈게.\n체육관 배지를 모을 거야!`);
  await w.walk(rival, ['down', 'down', 'right', 'right', 'down']);
  G.setFlag('rivalLeftLab');
  await say('느티 박사: 허허, 기운이 넘치는구나.\n몬스터는 회복시켜 두었단다.');
  G.healParty();
  await say('느티 박사: 1번도로를 따라 북쪽으로\n가면 이슬시티가 나온단다.');
  await say('느티 박사: 몬스터와 함께\n좋은 여행 하렴!');
}

/** 낚시꾼이 낚싯대를 준다. 이미 받았으면 낚시 이야기만 한다 */
async function rodFisher(rod: RodId, give: string[], after: string) {
  if (G.save.bag[rod]) {
    await say(after);
    return;
  }
  for (const t of give) await say(t);
  G.addItem(rod);
  sfx('item');
  await say(`${josa(P(), '은/는')} ${josa(ITEMS[rod].name, '을/를')}\n받았다!`);
  await say('낚시꾼: 물을 마주 보고 A 버튼을\n누르거나, 가방에서 꺼내 쓰면 돼.');
}
