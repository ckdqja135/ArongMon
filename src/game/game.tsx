// 게임 전체 진행: 세이브, 스크립트 실행, 배틀 연결, 진화, 기절 처리.
import { runBattle, type BattleOpts, type BattleResult } from '../battle/engine';
import { learnMoves, pickMoves, type LearnIO } from '../battle/learn';
import { createMon, healMon, maxHp, monName, movesLearnedAt, spec, type Mon } from '../battle/mon';
import { BattleSession } from '../battle/session';
import { FISH, RODS, ROD_BITE, type RodId } from '../data/fishing';
import { itemData, type ItemId } from '../data/items';
import { MAPS, type MapDef, type NpcDef } from '../data/maps';
import type { MoveId } from '../data/moves';
import { SPECIES } from '../data/species';
import { josa } from '../engine/josa';
import { rand, randInt, weighted } from '../engine/rng';
import { createStore } from '../engine/store';
import { playMusic, setSoundEnabled, sfx } from '../engine/sound';
import { ask, say, yesNo } from '../ui/dialog';
import { openOverlay } from '../ui/overlay';
import { askName } from '../ui/screens/NameInput';
import { EvolutionScreen } from '../ui/screens/Evolution';
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
      followerSpecies: () => this.save.party.find((m) => m.hp > 0)?.species ?? null,
      talkFollower: () => void this.run(() => SCRIPTS.follower()),
      riding: () => this.riding,
      water: (dir) => void this.run(() => this.atWater(dir)),
      select: () => void this.run(() => this.toggleBike()),
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
    // 바깥과 동굴처럼 야생 몬스터가 나오는 곳은 들어설 때 이름을 띄운다
    if ((map.outdoor || map.encounters) && map.name !== this.lastOutdoor) {
      this.lastOutdoor = map.name;
      app.set({ banner: { text: map.name, key: ++this.bannerKey } });
    }
    if (!map.outdoor) {
      this.lastOutdoor = '';
      this.riding = false;
    }
  }

  /** 물을 마주 보고 A: 낚싯대가 있으면 낚시, 파도타기가 있으면 물 위로. 물 위에서는 가방에서 낚싯대를 꺼내 쓴다 */
  private async atWater(dir: Dir) {
    if (this.world.surfing) return;
    const rod = RODS.find((r) => this.save.bag[r]);
    const canSurf = !!this.save.bag.surf && this.save.party.some((x) => x.hp > 0);
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
    const m = this.save.party.find((x) => x.hp > 0)!;
    await say(`${josa(monName(m), '과/와')} 함께\n파도타기를 시작했다!`);
    this.riding = false;
    this.world.startSurf(dir);
  }

  /** 낚싯줄을 드리우고 기다린다. 입질이 오면 바로 배틀 */
  async fish(rod: RodId) {
    const w = this.world;
    if (!this.save.party.some((m) => m.hp > 0)) return say('싸울 수 있는 몬스터가 없다!');
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
      if (this.flag(`beat_${d.trainer.id}`)) await say(d.trainer.after);
      else await this.trainerBattle(d);
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

  async trainerBattle(d: NpcDef) {
    const tr = d.trainer!;
    await say(tr.intro);
    const sprite = d.sprite !== 'item' && 'base' in d.sprite ? d.sprite : { base: 'cap' as const, pal: 'player' as const };
    const res = await this.battle({
      kind: 'trainer',
      enemy: tr.team.map(([sp, lv]) => createMon(sp, lv)),
      trainer: { className: tr.className, name: tr.name, prize: tr.prize, sprite, lose: tr.lose },
    });
    if (res.outcome === 'win') {
      this.setFlag(`beat_${tr.id}`);
      if (tr.afterScript) await SCRIPTS[tr.afterScript]();
    }
    return res;
  }

  private grassStep() {
    const enc = this.world.map.encounters;
    if (!enc || rand(256) >= enc.rate) return;
    if (!this.save.party.some((m) => m.hp > 0)) return;
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
    else await say(`${josa(this.player, '은/는')} 서둘러 돌아와\n몬스터를 회복시켰다...`);
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
