// 게임 전체 진행: 세이브, 스크립트 실행, 배틀 연결, 진화, 기절 처리.
import { runBattle, type BattleOpts, type BattleResult } from '../battle/engine';
import { learnMoves, pickMoves, type LearnIO } from '../battle/learn';
import {
  MAX_LEVEL, canFight, createMon, expForLevel, healMon, maxHp, monName, movesLearnedAt, picksAtLevel, setLevel, spec, type Mon,
} from '../battle/mon';
import { babyOf, breedChance, hatchSteps } from '../data/breeding';
import { MOM_ARONG, MOM_HINTS, PHONE_TRAINERS, profRating } from '../data/phone';
import { BattleSession } from '../battle/session';
import { FISH, RODS, ROD_BITE, type RodId } from '../data/fishing';
import { itemData, type ItemId } from '../data/items';
import { MAPS, type MapDef, type NpcDef } from '../data/maps';
import { FLY_SPOTS } from '../data/region';
import type { MoveId } from '../data/moves';
import { SPECIES } from '../data/species';
import { josa } from '../engine/josa';
import { pick, rand, randInt, weighted } from '../engine/rng';
import { createStore } from '../engine/store';
import { playMusic, setSoundEnabled, sfx } from '../engine/sound';
import { ask, say, yesNo } from '../ui/dialog';
import { openOverlay } from '../ui/overlay';
import { askName } from '../ui/screens/NameInput';
import { EvolutionScreen } from '../ui/screens/Evolution';
import { HatchScreen } from '../ui/screens/Hatch';
import { MoveChoice } from '../ui/screens/MoveChoice';
import { MoveForget } from '../ui/screens/MoveForget';
import { openParty } from '../ui/screens/PartyScreen';
import { openStartMenu } from '../ui/screens/StartMenu';
import { openPC } from '../ui/screens/PCScreen';
import { SLOTS, newSave, loadSave, writeSave, type SaveData } from './save';
import { SCRIPTS } from './scripts';
import { settings } from './settings';
import type { Dir } from '../gfx/charArt';
import { DIR_V, World, timeOfDay, type NpcRt } from './world';

export type Scene = 'boot' | 'title' | 'world' | 'battle';

export const app = createStore<{
  scene: Scene;
  battle: BattleSession | null;
  banner: { text: string; key: number } | null;
}>({ scene: 'boot', battle: null, banner: null });

export const PARTY_MAX = 6;

/** 장소에 맞는 배경음악 */
export function musicFor(map: MapDef): string {
  if (map.music) return map.music;
  if (map.id.endsWith('Center')) return 'center';
  if (map.id.endsWith('Gym')) return 'gym';
  if (map.outdoor && map.name.endsWith('도로')) return 'route';
  return 'town';
}

class Game {
  save: SaveData = newSave('');
  world: World;
  private lastOutdoor = '';
  /** 자전거 타는 중 */
  riding = false;
  /** 마지막 전화 뒤로 걸은 걸음 수 */
  private callSteps = 0;
  /** 메뉴를 다 닫은 뒤에 할 일 (가방에서 낚싯대를 꺼낸 경우 등) */
  afterMenu: (() => Promise<void>) | null = null;
  private bannerKey = 0;

  constructor() {
    this.world = new World({
      flag: (k) => this.flag(k),
      playerSprite: () => ({ base: 'cap', pal: 'player' }),
      onMapEnter: (map) => this.onMapEnter(map),
      interact: (npc) => void this.run(() => this.interactNpc(npc)),
      sign: (text) => void this.run(() => say(text)),
      trigger: (name) => void this.run(() => SCRIPTS[name]()),
      trainerSpotted: (npc) => void this.run(() => this.trainerSpotted(npc)),
      grassStep: () => this.grassStep(),
      openMenu: () => void this.run(() => openStartMenu()),
      pc: () => void this.run(() => openPC()),
      followerSpecies: () => this.save.party.find(canFight)?.species ?? null,
      talkFollower: () => void this.run(() => SCRIPTS.follower()),
      riding: () => this.riding,
      bikeBuddy: () => this.save.party.find((m) => spec(m).unlimitedMoves)?.species ?? null,
      water: (dir) => void this.run(() => this.atWater(dir)),
      select: () => void this.run(() => this.toggleBike()),
      stepped: () => this.stepped(),
    });
    setInterval(() => {
      if (app.get().scene === 'world' || app.get().scene === 'battle') this.save.playSeconds++;
    }, 1000);
  }

  get player() {
    return this.save.playerName;
  }

  // ── 시작/저장 ──
  startNew(name: string) {
    this.save = newSave(name);
    this.slot = null;
    settings.textSpeed = this.save.options.textSpeed;
    setSoundEnabled(this.save.options.sound ?? true);
    this.enterWorld();
  }

  /** 지금 기록 중인 저장 슬롯 (새 게임은 아직 없음) */
  slot: number | null = null;

  continueGame(slot: number): boolean {
    const s = loadSave(slot);
    if (!s) return false;
    this.slot = slot;
    this.save = s;
    settings.textSpeed = s.options.textSpeed;
    setSoundEnabled(s.options.sound ?? true);
    this.enterWorld();
    return true;
  }

  private enterWorld() {
    const p = this.save.pos;
    this.lastOutdoor = '';
    this.world.surfing = !!this.save.surfing;
    this.world.load(p.map, p.x, p.y, p.dir, true);
    this.world.attachInput();
    app.set({ scene: 'world' });
  }

  /** slot을 주지 않으면 지금 슬롯에 (아직 없으면 빈 슬롯이나 1번에) 기록한다 */
  writeSave(slot = this.slot ?? SLOTS.find((n) => !loadSave(n)) ?? 1) {
    this.slot = slot;
    const p = this.world.player;
    this.save.pos = { map: this.world.map.id, x: p.x, y: p.y, dir: p.dir };
    this.save.surfing = this.world.surfing;
    this.save.options.textSpeed = settings.textSpeed;
    this.save.options.sound = settings.sound;
    writeSave(slot, this.save);
  }

  // ── 상태 ──
  /** badge_xxx 는 배지 보유 여부 */
  flag = (k: string) => (k.startsWith('badge_') ? this.save.badges.includes(k.slice(6)) : !!this.save.flags[k]);
  setFlag(k: string, v = true) {
    this.save.flags[k] = v;
    this.world.refreshNpcs();
  }

  addItem(id: ItemId, n = 1) {
    this.save.bag[id] = (this.save.bag[id] ?? 0) + n;
  }
  removeItem(id: ItemId, n = 1) {
    const left = (this.save.bag[id] ?? 0) - n;
    if (left > 0) this.save.bag[id] = left;
    else delete this.save.bag[id];
  }

  markSeen(sp: string) {
    if (!this.save.seen.includes(sp)) this.save.seen.push(sp);
  }
  markCaught(sp: string) {
    this.markSeen(sp);
    if (!this.save.caught.includes(sp)) this.save.caught.push(sp);
  }

  /** 파티가 가득 차면 PC 박스로 */
  giveMon(m: Mon): 'party' | 'box' {
    m.ot ||= this.player;
    m.otId ||= this.save.playerId;
    this.markCaught(m.species);
    if (this.save.party.length < PARTY_MAX) {
      this.save.party.push(m);
      return 'party';
    }
    this.save.box.push(m);
    return 'box';
  }

  healParty() {
    this.save.party.forEach(healMon);
  }

  // ── 스크립트 ──
  async run(fn: () => Promise<unknown>) {
    this.world.busy++;
    try {
      await fn();
    } finally {
      this.world.busy--;
    }
  }

  private onMapEnter(map: MapDef) {
    if (app.get().scene !== 'battle') playMusic(musicFor(map));
    const p = this.world.player;
    this.save.pos = { map: map.id, x: p.x, y: p.y, dir: p.dir };
    // 바깥과 동굴처럼 야생 포켓몬이 나오는 곳은 들어설 때 이름을 띄운다
    if ((map.outdoor || map.encounters) && map.name !== this.lastOutdoor) {
      this.lastOutdoor = map.name;
      app.set({ banner: { text: map.name, key: ++this.bannerKey } });
    }
    if (!map.outdoor) {
      this.lastOutdoor = '';
      this.riding = false;
    }
    // 공중날기로 갈 수 있게 가 본 마을을 적어 둔다
    if (FLY_SPOTS[map.id] && !this.save.visited?.includes(map.id)) (this.save.visited ??= []).push(map.id);
  }

  /** 공중날기를 쓸 수 있는지: 공중날기가 있고, 싸울 수 있는 포켓몬이 있고, 바깥에 있을 때 */
  canFly() {
    return !!this.save.bag.fly && this.save.party.some(canFight) && !!this.world.map.outdoor;
  }

  /** 공중날기: 날개로 나는 포켓몬(비행 타입, 갸라도스 같은 물 타입은 뒤로)이 있으면 그 녀석과, 없으면 앞장선 포켓몬과 가 본 마을로 날아간다 */
  async flyTo(town: string) {
    const spot = FLY_SPOTS[town];
    const fliers = this.save.party.filter((p) => canFight(p) && spec(p).types.includes('flying'));
    const m = fliers.find((p) => !spec(p).types.includes('water')) ?? fliers[0] ?? this.save.party.find(canFight)!;
    await say(`${josa(monName(m), '과/와')} 함께\n하늘을 날았다!`);
    sfx('fly');
    this.riding = false;
    await this.world.warpTo(town, spot.x, spot.y, 'down');
  }

  /** 물을 마주 보고 A: 낚싯대가 있으면 낚시, 파도타기가 있으면 물 위로. 물 위에서는 가방에서 낚싯대를 꺼내 쓴다 */
  private async atWater(dir: Dir) {
    if (this.world.surfing) return;
    const rod = RODS.find((r) => this.save.bag[r]);
    const canSurf = !!this.save.bag.surf && this.save.party.some(canFight);
    if (!rod && !canSurf) return say('물이 넘실거리고 있다.');
    if (rod && canSurf) {
      const k = await ask('물이 넘실거리고 있다.', ['낚시', '파도타기', '그만두기']);
      if (k === 0) await this.fish(rod);
      else if (k === 1) await this.startSurf(dir);
      return;
    }
    if (rod) {
      if (await yesNo('물이 넘실거리고 있다.\n낚시를 하겠습니까?')) await this.fish(rod);
      return;
    }
    if (await yesNo('물이 넘실거리고 있다.\n파도타기를 하겠습니까?')) await this.startSurf(dir);
  }

  private async startSurf(dir: Dir) {
    const m = this.save.party.find(canFight)!;
    await say(`${josa(monName(m), '과/와')} 함께\n파도타기를 시작했다!`);
    this.riding = false;
    this.world.startSurf(dir);
  }

  /** 낚싯줄을 드리우고 기다린다. 입질이 오면 바로 배틀 */
  async fish(rod: RodId) {
    const w = this.world;
    if (!this.save.party.some(canFight)) return say('싸울 수 있는 포켓몬이 없다!');
    this.riding = false;
    await say(`${josa(this.player, '은/는')} ${josa(itemData(rod).name, '을/를')}\n물에 드리웠다!`);
    w.fishing = { bite: false };
    await w.wait(1.2 + Math.random() * 1.6);
    const table = FISH[w.map.fish ?? 'fresh'][rod];
    if (Math.random() >= ROD_BITE[rod]) {
      w.fishing = null;
      await say('...아무것도 걸리지 않는다.');
      return;
    }
    w.fishing.bite = true;
    sfx('exclaim');
    await w.wait(0.8);
    await say('앗! 뭔가 걸렸다!');
    w.fishing = null;
    const e = weighted(table);
    const mon = createMon(e.species, randInt(e.min, e.max), { shiny: rand(8192) === 0 });
    await this.battle({ kind: 'wild', enemy: [mon], terrain: 'water' });
  }

  /** 자전거 타기/내리기. 실내에서는 탈 수 없다 */
  async toggleBike(fromBag = false): Promise<string | null> {
    if (!this.save.bag.bicycle) return null;
    let msg: string;
    if (!this.world.map.outdoor || this.world.surfing) msg = '여기서는 자전거를\n탈 수 없다!';
    else {
      this.riding = !this.riding;
      sfx('bike');
      msg = this.riding ? `${josa(this.player, '은/는')} 자전거에\n올라탔다!` : `${josa(this.player, '은/는')} 자전거에서\n내렸다.`;
    }
    if (!fromBag) await say(msg);
    return msg;
  }

  private async interactNpc(npc: NpcRt) {
    const d = npc.def;
    if (d.sprite === 'item' && d.item) {
      const it = itemData(d.item);
      this.addItem(d.item);
      sfx('item');
      this.setFlag(`item_${d.id}`);
      await say(`${josa(this.player, '은/는')} ${josa(it.name, '을/를')}\n발견했다!`);
      await say(`${josa(it.name, '을/를')} 가방의\n${it.pocket === 'balls' ? '볼' : '도구'} 주머니에 넣었다.`);
      return;
    }
    if (d.trainer) {
      const tr = d.trainer;
      if (!this.flag(`beat_${tr.id}`)) await this.trainerBattle(d);
      else if (this.flag(`rematch_${tr.id}`)) await this.rematchBattle(d);
      else {
        await say(tr.after);
        await this.offerNumber(tr.id);
      }
      return;
    }
    if (d.script) return SCRIPTS[d.script](npc);
    if (d.text) await say(d.text);
  }

  /** 트레이너가 플레이어를 발견: 느낌표 → 다가옴 → 대사 → 배틀 */
  private async trainerSpotted(npc: NpcRt) {
    const w = this.world;
    npc.emote = 0.9;
    sfx('exclaim');
    await w.wait(0.9);
    const p = w.player;
    const [dx, dy] = DIR_V[npc.dir];
    const steps = Math.abs(p.x - npc.x) + Math.abs(p.y - npc.y) - 1;
    await w.walk(npc, Array(Math.max(0, steps)).fill(npc.dir));
    p.dir = dx > 0 ? 'left' : dx < 0 ? 'right' : dy > 0 ? 'up' : 'down';
    await this.trainerBattle(npc.def);
  }

  async trainerBattle(d: NpcDef, team?: Mon[]) {
    const tr = d.trainer!;
    if (!team) await say(tr.intro);
    const sprite = d.sprite !== 'item' && 'base' in d.sprite ? d.sprite : { base: 'cap' as const, pal: 'player' as const };
    const res = await this.battle({
      kind: 'trainer',
      enemy: team ?? tr.team.map(([sp, lv]) => createMon(sp, lv)),
      trainer: { className: tr.className, name: tr.name, prize: tr.prize, sprite, lose: tr.lose },
    });
    if (res.outcome === 'win' && !team) {
      this.setFlag(`beat_${tr.id}`);
      if (tr.afterScript) await SCRIPTS[tr.afterScript]();
    }
    return res;
  }

  // ── 전화 (포켓기어) ──
  /** 걸 수 있는 연락처: 엄마, 첫 포켓몬을 받았으면 느티 박사, 번호를 교환한 트레이너 */
  phoneContacts() {
    const list = [{ id: 'mom', name: '엄마', place: '새싹마을' }];
    if (this.flag('starter')) list.push({ id: 'prof', name: '느티 박사', place: '느티 연구소' });
    for (const t of PHONE_TRAINERS) if (this.save.phone?.includes(t.id)) list.push({ id: t.id, name: t.name, place: t.place });
    return list;
  }

  /** 통화. incoming이면 상대가 건 전화 */
  async phoneCall(id: string, incoming = false) {
    const c = this.phoneContacts().find((x) => x.id === id)!;
    sfx('ring');
    await say(incoming ? `따르릉...♪\n${c.name}에게서 전화가 왔다!` : `따르릉...♪\n${c.name}에게 전화를 걸었다.`);
    if (id === 'mom') {
      await say(`엄마: ${josa(this.player, '아/야')}, 잘 지내니?`);
      await say(`엄마: ${this.flag('champion') ? '챔피언이 됐다니 정말 장하다!\n가끔은 집에 와서 푹 쉬렴.' : MOM_HINTS[Math.min(MOM_HINTS.length - 1, this.save.badges.length)]}`);
      await say(`엄마: ${pick(MOM_ARONG)}`);
    } else if (id === 'prof') {
      await say(`느티 박사: 오, ${this.player}! 도감은 어떠냐?`);
      await say(`느티 박사: 만난 포켓몬 ${this.save.seen.length}마리,\n잡은 포켓몬 ${this.save.caught.length}마리라...`);
      await say(`느티 박사: ${profRating(this.save.caught.length)}`);
    } else {
      const t = PHONE_TRAINERS.find((x) => x.id === id)!;
      await say(`${t.name}: 여보세요? ${t.place}의\n${josa(t.name, '이야/야')}!`);
      // 지난번 승부 뒤로 배지가 늘었으면 다시 승부하자고 한다
      if (!this.flag(`rematch_${t.id}`) && (this.save.rematch?.[t.id] ?? 0) < this.save.badges.length) {
        this.setFlag(`rematch_${t.id}`);
        await say(`${t.name}: 나 그동안 많이 강해졌어!\n${t.place}에서 다시 승부하자!`);
      } else await say(`${t.name}: ${pick(t.talk)}`);
    }
    await say('뚝!');
  }

  /** 이긴 트레이너가 전화번호를 교환하자고 한다 */
  private async offerNumber(id: string) {
    const t = PHONE_TRAINERS.find((x) => x.id === id);
    if (!t || !this.save.bag.pokegear || this.save.phone?.includes(id)) return;
    if (!(await yesNo(`${t.name}: 저기, 포켓기어 있지?\n전화번호 교환할래?`))) return;
    (this.save.phone ??= []).push(id);
    (this.save.rematch ??= {})[id] = this.save.badges.length;
    sfx('item');
    await say(`${t.name}의 전화번호를\n포켓기어에 등록했다!`);
  }

  /** 전화로 약속한 재대결: 배지 수에 맞춰 레벨이 오르고, 레벨이 되면 진화한 모습으로 */
  private async rematchBattle(d: NpcDef) {
    const tr = d.trainer!;
    const lv = (l: number) => Math.max(l, 8 + this.save.badges.length * 5);
    const evolved = (sp: string, level: number) => {
      for (let e = SPECIES[sp].evolve; e && e.level <= level; e = SPECIES[sp].evolve) sp = e.to;
      return sp;
    };
    await say(`${tr.name}: 기다리고 있었어!\n이번엔 안 질 거야!`);
    const res = await this.trainerBattle(d, tr.team.map(([sp, l]) => createMon(evolved(sp, lv(l)), lv(l))));
    if (res.outcome === 'win') {
      this.setFlag(`rematch_${tr.id}`, false);
      (this.save.rematch ??= {})[tr.id] = this.save.badges.length;
      await say(`${tr.name}: 역시 강하구나...!\n더 강해지면 또 전화할게!`);
    }
  }

  private grassStep() {
    const enc = this.world.map.encounters;
    if (!enc || rand(256) >= enc.rate) return;
    if (!this.save.party.some(canFight)) return;
    const table = this.world.surfing ? enc.surf : enc[timeOfDay()] ?? enc.day;
    if (!table?.length) return;
    const e = weighted(table);
    const mon = createMon(e.species, randInt(e.min, e.max), { shiny: rand(8192) === 0 });
    void this.run(() => this.battle({ kind: 'wild', enemy: [mon] }));
  }

  // ── 배틀 ──
  /** canLose: 져도 기절 처리 없이 계속 (첫 라이벌전 등) */
  async battle(opts: BattleOpts, o: { canLose?: boolean } = {}): Promise<BattleResult> {
    const session = new BattleSession(opts, {
      chooseSwitch: (forced) => openParty({ mode: forced ? 'battleForced' : 'battle', active: session.store.get().sides[0].mon }).then((r) => r ?? -1),
      chooseForget: this.learnIO.chooseForget,
      chooseMove: this.learnIO.chooseMove,
      yesNo: async () => (await ask('', ['예', '아니오'], 1)) === 0,
    });
    this.world.detachInput();
    playMusic(opts.kind === 'wild' ? 'battleWild' : 'battleTrainer');
    app.set({ scene: 'battle', battle: session });
    await session.playIntro();
    const res = await runBattle(
      opts,
      {
        playerName: this.player,
        party: this.save.party,
        bag: this.save.bag,
        onSeen: (sp) => this.markSeen(sp),
        onCaught: async (m) => {
          this.markCaught(m.species);
          m.otId = this.save.playerId;
          m.metMap = this.world.map.name;
          m.metLevel = m.level;
          if (await session.io.yesNo(`잡은 ${monName(m)}에게\n이름을 지어 주겠습니까?`)) {
            const nick = await askName(`${monName(m)}의 이름은?`, monName(m));
            if (nick && nick !== spec(m).name) m.nickname = nick;
          }
          const where = this.giveMon(m);
          if (where === 'box') await session.io.message(`${josa(monName(m), '은/는')}\nPC 박스로 전송되었다!`);
        },
      },
      session.io,
    );
    await session.playOutro();
    app.set({ scene: 'world', battle: null });
    playMusic(musicFor(this.world.map));
    this.world.attachInput();

    if (res.outcome === 'win' && res.prize) this.save.money += res.prize;
    if (res.outcome === 'lose') {
      if (o.canLose) this.healParty();
      else await this.whiteOut();
      return res;
    }
    for (const m of res.leveled) await this.tryEvolve(m);
    return res;
  }

  private async whiteOut() {
    const lost = Math.floor(this.save.money / 2);
    this.save.money -= lost;
    this.world.fade = 1;
    this.healParty();
    const h = this.save.lastHeal;
    await this.world.warpTo(h.map, h.x, h.y, h.dir);
    if (MAPS[h.map].id === 'home') await say(`엄마: ${this.player}, 어서 오렴!\n푹 쉬고 나면 괜찮아질 거야.`);
    else await say(`${josa(this.player, '은/는')} 서둘러 돌아와\n포켓몬을 회복시켰다...`);
    if (lost) await say(`${lost}원을 잃어버렸다...`);
  }

  async tryEvolve(m: Mon) {
    const evo = spec(m).evolve;
    if (!evo || m.hp <= 0 || m.level < evo.level || !this.save.party.includes(m)) return;
    await this.evolveInto(m, evo.to);
  }

  /** 진화의 돌을 쓴다. 진화했으면 true (취소하면 돌은 그대로) */
  async useStone(m: Mon, item: ItemId): Promise<boolean> {
    const evo = this.stoneEvolution(m, item);
    return !!evo && this.evolveInto(m, evo);
  }

  stoneEvolution(m: Mon, item: ItemId): string | undefined {
    return spec(m).evolveItem?.find((e) => e.item === item)?.to;
  }

  /** 필드에서 기술을 배울 때 쓰는 화면들 */
  private learnIO: LearnIO = {
    message: say,
    yesNo,
    chooseForget: (mon, move) => openOverlay<number | null>((done) => <MoveForget mon={mon} move={move} onDone={done} />),
    chooseMove: (mon, options) => openOverlay<MoveId>((done) => <MoveChoice mon={mon} options={options} onDone={done} />),
  };

  // ── 키우미집 ──
  daycare() {
    return (this.save.daycare ??= { mons: [], egg: false, steps: 256 });
  }

  /** 한 걸음마다: 맡긴 포켓몬은 경험치 1, 256걸음마다 알이 생기는지, 데리고 다니는 알은 깨어날 때가 가까워진다 */
  private stepped() {
    const dc = this.save.daycare;
    if (dc) {
      for (const d of dc.mons) if (d.mon.exp < expForLevel(spec(d.mon).growth, MAX_LEVEL)) d.mon.exp += 1;
      if (dc.mons.length === 2 && !dc.egg && --dc.steps <= 0) {
        dc.steps = 256;
        if (Math.random() < breedChance(dc.mons[0].mon, dc.mons[1].mon)) dc.egg = true;
      }
    }
    const egg = this.save.party.find((m) => m.egg !== undefined && --m.egg <= 0);
    if (egg) return void this.run(() => this.hatch(egg));
    // 밖을 걷다 보면 가끔 전화가 걸려 온다 (한 번 오면 300걸음은 조용히)
    if (this.save.bag.pokegear && this.world.map.outdoor && ++this.callSteps > 300 && Math.random() < 1 / 400) {
      this.callSteps = 0;
      const c = pick(this.phoneContacts());
      void this.run(() => this.phoneCall(c.id, true));
    }
  }

  /** 맡긴 포켓몬이 지금 몇 레벨인지 (경험치로) */
  daycareLevel(m: Mon) {
    let lv = m.level;
    while (lv < MAX_LEVEL && m.exp >= expForLevel(spec(m).growth, lv + 1)) lv++;
    return lv;
  }

  async daycareDeposit() {
    const party = this.save.party;
    const i = await openParty({ mode: 'select', title: '어느 포켓몬을 맡길까?' });
    if (i === null) return;
    const m = party[i];
    if (m.egg !== undefined) return say('할머니: 알은 맡을 수 없단다.');
    if (!party.some((p, k) => k !== i && canFight(p))) return say('할머니: 그 포켓몬을 맡기면\n싸울 포켓몬이 없잖니.');
    party.splice(i, 1);
    const dc = this.daycare();
    dc.mons.push({ mon: m, level: m.level });
    dc.steps = 256;
    await say(`할머니: ${josa(monName(m), '을/를')}\n잘 맡아 두마.`);
  }

  async daycareWithdraw() {
    const dc = this.daycare();
    if (this.save.party.length >= PARTY_MAX) return say('할머니: 데려갈 자리가 없구나.\n자리를 비우고 오렴.');
    const k = await ask('할머니: 어느 포켓몬을 데려가겠니?', [...dc.mons.map((d) => `${monName(d.mon)} Lv${this.daycareLevel(d.mon)}`), '그만두기']);
    if (k >= dc.mons.length) return;
    const d = dc.mons[k];
    const lv = this.daycareLevel(d.mon);
    // 2세대처럼 100원 + 오른 레벨마다 100원
    const fee = 100 + 100 * (lv - d.level);
    if (lv > d.level) await say(`할머니: ${josa(monName(d.mon), '은/는')}\n레벨이 ${lv - d.level}만큼 올랐단다.`);
    if (!(await yesNo(`할머니: 맡긴 값으로 ${fee}원이란다.\n데려가겠니?`))) return;
    if (this.save.money < fee) return say('할머니: 돈이 모자라는구나.');
    this.save.money -= fee;
    dc.mons.splice(k, 1);
    // 부모가 한 마리만 남으면 아직 안 받은 알도 없어진다
    if (dc.mons.length < 2) dc.egg = false;
    this.save.party.push(d.mon);
    await say(`${josa(this.player, '은/는')} ${josa(monName(d.mon), '을/를')}\n돌려받았다!`);
    for (let l = d.mon.level + 1; l <= lv; l++) {
      setLevel(d.mon, l);
      await learnMoves(d.mon, movesLearnedAt(spec(d.mon), l), this.learnIO);
      await pickMoves(d.mon, picksAtLevel(spec(d.mon), l), this.learnIO);
    }
  }

  /** 할아버지가 맡고 있던 알: 엄마 쪽 가장 처음 모습의 Lv.5 */
  takeEgg(): Mon {
    const dc = this.daycare();
    const sp = babyOf(dc.mons[0].mon, dc.mons[1].mon);
    const m = createMon(sp, 5, { ot: this.player, otId: this.save.playerId });
    m.egg = hatchSteps(sp);
    dc.egg = false;
    this.save.party.push(m);
    return m;
  }

  /** 알이 깨어난다 */
  private async hatch(m: Mon) {
    await say('어...?');
    await openOverlay<void>((done) => <HatchScreen mon={m} onDone={done} />);
    m.egg = undefined;
    m.metMap = this.world.map.name;
    m.metLevel = m.level;
    this.markCaught(m.species);
    await say(`${josa(spec(m).name, '이/가')}\n알에서 태어났다!`);
    if (await yesNo(`${spec(m).name}에게\n이름을 지어 주겠습니까?`)) {
      const nick = await askName(`${spec(m).name}의 이름은?`, spec(m).name);
      if (nick && nick !== spec(m).name) m.nickname = nick;
    }
  }

  /** 포켓몬에게 도구를 지니게 한다. 원래 지니던 도구는 가방으로 돌아간다. 안내 문구를 돌려준다 */
  giveHeld(m: Mon, id: ItemId): string {
    const prev = m.item;
    this.removeItem(id);
    if (prev) this.addItem(prev);
    m.item = id;
    const name = itemData(id).name;
    return prev
      ? `${josa(itemData(prev).name, '을/를')} 가방에 넣고\n${josa(name, '을/를')} 지니게 했다.`
      : `${monName(m)}에게\n${josa(name, '을/를')} 지니게 했다.`;
  }

  /** 지닌 도구를 가방으로 */
  takeHeld(m: Mon): string {
    const id = m.item!;
    this.addItem(id);
    m.item = undefined;
    return `${monName(m)}에게서\n${josa(itemData(id).name, '을/를')} 받았다.`;
  }

  /** 기술머신으로 기술 하나를 가르친다 (기술이 꽉 찼으면 잊을 기술을 고른다) */
  async teachMove(m: Mon, id: MoveId) {
    await learnMoves(m, [id], this.learnIO);
  }

  /** 이야기 속 사건으로 기술을 골라 배우게 한다 (후보 중 하나씩 n번) */
  async pickMovesFor(m: Mon, n: number) {
    await pickMoves(m, n, this.learnIO);
  }

  private async evolveInto(m: Mon, to: string): Promise<boolean> {
    const ok = await openOverlay<boolean>((done) => <EvolutionScreen mon={m} to={to} onDone={done} />);
    if (!ok) return false;
    const before = maxHp(m);
    m.species = to;
    m.hp += maxHp(m) - before;
    this.markCaught(to);
    await learnMoves(m, movesLearnedAt(SPECIES[to], m.level), this.learnIO);
    await pickMoves(m, SPECIES[to].movePicks?.onEvolve ?? 0, this.learnIO);
    return true;
  }

}

export const G = new Game();
