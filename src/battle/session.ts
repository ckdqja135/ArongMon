// 배틀 화면 상태. 엔진의 BattleIO 요청을 화면 상태 변화로 바꾼다.
import type { ItemId } from '../data/items';
import type { MoveId } from '../data/moves';
import type { Type } from '../data/types';
import { playMusic, sfx, type Sfx } from '../engine/sound';
import { createStore } from '../engine/store';
import type { AnimKind, BattleIO, BattleOpts, PlayerAction, SideId, TrainerInfo } from './engine';
import { calcStats, type Mon, type MoveSlot, type Stats } from './mon';

export interface SideView {
  mon: Mon | null;
  hp: number;
  exp: number;
  anim: AnimKind | 'idle';
  animKey: number;
  visible: boolean;
  /** 맞았을 때 이펙트 타입 */
  fx: Type | null;
  /** 변신한 겉모습 */
  form: string | null;
}

export interface BattleViewState {
  kind: BattleOpts['kind'];
  terrain: BattleOpts['terrain'] | null;
  /** 마지막으로 던진 볼 */
  ball: ItemId | null;
  trainer: TrainerInfo | null;
  trainerVisible: boolean;
  /** 상대가 가진 몬스터 전부 (남은 수 표시용) */
  enemyParty: Mon[];
  sides: [SideView, SideView];
  message: { text: string; key: number } | null;
  /** 행동 선택 대기 */
  prompt: { mon: Mon; moves: MoveSlot[]; resolve: (a: PlayerAction) => void } | null;
  levelStats: { mon: Mon; before: Stats; after: Stats; resolve: () => void } | null;
  intro: boolean;
  outro: boolean;
  tick: number;
}

export interface BattleUIHooks {
  chooseSwitch(forced: boolean): Promise<number>;
  chooseForget(mon: Mon, move: MoveId): Promise<number | null>;
  chooseMove(mon: Mon, options: MoveId[]): Promise<MoveId>;
  yesNo(text: string): Promise<boolean>;
}

const ANIM_MS: Record<AnimKind, number> = {
  enter: 500, withdraw: 400, attack: 380, cast: 450, hit: 460, hitBig: 560, faint: 600, statUp: 600, statDown: 600, status: 450,
  throw: 800, shake: 650, caught: 600, breakout: 450, shiny: 800, trainerOut: 450,
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function tween(from: number, to: number, ms: number, step: (v: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      step(from + (to - from) * k);
      if (k < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

const emptySide = (): SideView => ({ mon: null, hp: 0, exp: 0, anim: 'idle', animKey: 0, visible: false, fx: null, form: null });

export class BattleSession {
  store;
  private msgResolve: (() => void) | null = null;
  private msgKey = 0;

  constructor(opts: BattleOpts, private ui: BattleUIHooks) {
    this.store = createStore<BattleViewState>({
      kind: opts.kind,
      terrain: opts.terrain ?? null,
      ball: null,
      trainer: opts.trainer ?? null,
      trainerVisible: !!opts.trainer,
      enemyParty: opts.enemy,
      sides: [emptySide(), emptySide()],
      message: null,
      prompt: null,
      levelStats: null,
      intro: true,
      outro: false,
      tick: 0,
    });
  }

  private side(id: SideId, patch: Partial<SideView>) {
    const sides = [...this.store.get().sides] as [SideView, SideView];
    sides[id] = { ...sides[id], ...patch };
    this.store.set({ sides });
  }

  /** 화면의 글상자가 글을 다 보여주고 넘겼을 때 */
  messageDone() {
    const r = this.msgResolve;
    this.msgResolve = null;
    r?.();
  }

  async playIntro() {
    await sleep(1100);
    this.store.set({ intro: false });
  }

  async playOutro() {
    this.store.set({ outro: true, message: null });
    await sleep(450);
  }

  io: BattleIO = {
    message: (text) =>
      new Promise<void>((resolve) => {
        this.msgResolve = resolve;
        this.store.set({ message: { text, key: ++this.msgKey } });
      }),
    // 실제 HP/경험치로 표시를 맞춘다 (레벨업, 상태이상 후)
    refresh: () =>
      this.store.set((s) => ({
        tick: s.tick + 1,
        sides: s.sides.map((v) => (v.mon ? { ...v, hp: v.mon.hp, exp: v.mon.exp } : v)) as [SideView, SideView],
      })),
    setActive: (id, mon) => {
      if (id === 1 && mon) this.store.set({ trainerVisible: false });
      this.side(id, { mon, hp: mon?.hp ?? 0, exp: mon?.exp ?? 0, visible: !!mon, anim: 'idle', form: null });
    },
    transform: (id, species) => this.side(id, { form: species }),
    throwing: (ball) => this.store.set({ ball }),
    anim: async (id, kind, type) => {
      const sound: Partial<Record<AnimKind, Sfx>> = {
        enter: 'enter', attack: 'attack', hit: 'hit', hitBig: 'hitBig', faint: 'faint', statUp: 'statUp',
        statDown: 'statDown', status: 'status', throw: 'throw', shake: 'shake', caught: 'caught', breakout: 'enter',
      };
      if (sound[kind]) sfx(sound[kind]!);
      if (kind === 'trainerOut') {
        this.store.set({ trainerVisible: false });
        await sleep(ANIM_MS[kind]);
        return;
      }
      const cur = this.store.get().sides[id];
      this.side(id, { anim: kind, animKey: cur.animKey + 1, fx: type ?? null });
      await sleep(ANIM_MS[kind]);
      if (kind === 'faint' || kind === 'withdraw' || kind === 'caught') this.side(id, { visible: false, anim: 'idle' });
      else if (kind !== 'throw' && kind !== 'shake') this.side(id, { anim: 'idle' });
    },
    hp: async (id, to) => {
      const s = this.store.get().sides[id];
      if (!s.mon) return;
      const max = calcStats(s.mon).hp;
      const ms = Math.max(250, Math.min(1100, (Math.abs(to - s.hp) / max) * 1400));
      await tween(s.hp, to, ms, (v) => this.side(id, { hp: v }));
    },
    exp: async (mon, to) => {
      const s = this.store.get().sides[0];
      if (s.mon !== mon) return;
      await tween(s.exp, to, 700, (v) => this.side(0, { exp: v }));
    },
    chooseAction: (mon, moves) =>
      new Promise<PlayerAction>((resolve) => {
        this.store.set({
          message: null,
          prompt: {
            mon,
            moves,
            resolve: (a) => {
              this.store.set({ prompt: null });
              resolve(a);
            },
          },
        });
      }),
    chooseSwitch: (forced) => this.ui.chooseSwitch(forced),
    chooseForget: (mon, move) => this.ui.chooseForget(mon, move),
    chooseMove: (mon, options) => this.ui.chooseMove(mon, options),
    yesNo: async (text) => {
      this.store.set({ message: { text, key: ++this.msgKey } });
      return this.ui.yesNo(text);
    },
    victory: () => playMusic('victory'),
    showLevelStats: (mon, before) =>
      new Promise<void>((resolve) => {
        sfx('levelup');
        this.store.set({
          levelStats: {
            mon,
            before,
            after: calcStats(mon),
            resolve: () => {
              this.store.set({ levelStats: null });
              resolve();
            },
          },
        });
      }),
  };

}
