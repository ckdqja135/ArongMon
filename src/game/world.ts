// 필드: 타일 이동, 충돌, 맵 연결, NPC, 그리기.
import { MAPS, type MapDef, type NpcDef, type TimeOfDay, type Warp } from '../data/maps';
import { input, type Button } from '../engine/input';
import { sfx } from '../engine/sound';
import { chance, pick, randInt } from '../engine/rng';
import type { Dir } from '../gfx/charArt';
import {
  CHAR_SIZE, SCREEN_H, SCREEN_W, TILE, arongRiderCanvas, bikeCanvas, charCanvas, exclaimCanvas, grassOverlay, heartCanvas, monFieldCanvas, groundBallCanvas, shadowCanvas, tileCanvas, tubeCanvas,
} from '../gfx/sprites';
import { hasFieldArt } from '../gfx/arongField';
import { TILES, tileVariant, type TileDef } from '../gfx/tileArt';

export const DIR_V: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const WALK_SPEED = 4; // 초당 타일
/** 서 있다가 다른 방향을 누르면 이만큼 누르고 있어야 걷기 시작한다 (초) */
const TURN_TIME = 0.1;
const PLAYER_SX = 120;
const PLAYER_SY = 88;

export interface Actor {
  x: number;
  y: number;
  px: number;
  py: number;
  dir: Dir;
  moving: boolean;
  fromX: number;
  fromY: number;
  t: number;
  dist: number;
  /** 이동 속도 배율 (자전거 2) */
  speed: number;
  jump: boolean;
  step: number;
  /** 스크립트 이동 경로 */
  path: Dir[];
  /** 한 칸을 다 가고 남은 시간 (다음 칸으로 이어서 쓴다) */
  over: number;
}

export interface NpcRt extends Actor {
  def: NpcDef;
  hidden: boolean;
  timer: number;
  emote: number;
  homeX: number;
  homeY: number;
}

export interface WorldHooks {
  flag(name: string): boolean;
  playerSprite(): { base: 'cap'; pal: 'player' };
  onMapEnter(map: MapDef, viaWarp: boolean): void;
  interact(npc: NpcRt): void;
  sign(text: string): void;
  trigger(script: string): void;
  trainerSpotted(npc: NpcRt): void;
  grassStep(): void;
  openMenu(): void;
  pc(): void;
  /** 뒤따라 걷는 몬스터 (파티 선두). 없으면 null */
  followerSpecies(): string | null;
  talkFollower(): void;
  /** 자전거를 타고 있는지 */
  riding(): boolean;
  /** 자전거 뒷자리에 태울 몬스터 (파티의 아롱이). 없으면 null */
  bikeBuddy(): string | null;
  /** 물을 마주 보고 A를 눌렀을 때 (파도타기) */
  water(dir: Dir): void;
  select(): void;
}

/** 플레이어 뒤를 따라 걷는 몬스터 */
export interface Follower extends Actor {
  hidden: boolean;
  /** 머리 위 하트가 남은 시간 */
  heart: number;
}

const makeActor = (x: number, y: number, dir: Dir): Actor => ({
  x, y, px: x * TILE, py: y * TILE, dir, moving: false, fromX: x, fromY: y, t: 0, dist: 1, speed: 1, jump: false, step: 0, path: [], over: 0,
});

export function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h >= 4 && h < 10) return 'morning';
  if (h >= 10 && h < 18) return 'day';
  return 'night';
}

export class World {
  map: MapDef = MAPS.home;
  player: Actor = makeActor(0, 0, 'down');
  npcs: NpcRt[] = [];
  follower: Follower | null = null;
  /** 스크립트/연출이 진행 중이면 조작 불가 */
  busy = 0;
  fade = 0;
  private fadeTarget = 0;
  private fadeSpeed = 4;
  time = 0;
  private turnTimer = 0;
  /** 방금까지 걷고 있었는지 (걷는 중 방향을 바꾸면 멈추지 않고 바로 꺾는다) */
  private walking = false;
  /** 파도타기 중: 물 위를 다닐 수 있다 */
  surfing = false;
  /** 얼음 위를 미끄러지는 중 (방향키가 듣지 않는다) */
  private sliding = false;
  /** 낚싯줄을 드리운 중. bite면 찌가 물속으로 끌려 들어간다 */
  fishing: { bite: boolean } | null = null;
  private lastBump = 0;
  private waiters: { check: () => boolean; resolve: () => void }[] = [];
  private unsubInput: (() => void) | null = null;
  private readonly handler = (b: Button) => this.onButton(b);

  constructor(public hooks: WorldHooks) {}

  // ── 맵 ──
  load(mapId: string, x: number, y: number, dir: Dir, viaWarp = true) {
    this.map = MAPS[mapId];
    if (viaWarp && !TILES[this.map.tiles[y]?.[x]]?.water) this.surfing = false;
    this.player = makeActor(x, y, dir);
    this.npcs = this.map.npcs.map((def) => ({
      ...makeActor(def.x, def.y, def.dir ?? 'down'),
      def,
      hidden: false,
      timer: 1 + Math.random() * 2,
      emote: 0,
      homeX: def.x,
      homeY: def.y,
    }));
    this.refreshNpcs();
    this.placeFollower(viaWarp);
    this.hooks.onMapEnter(this.map, viaWarp);
  }

  /** 맵에 들어오면 플레이어 바로 뒤에 둔다. 문으로 들어왔거나 뒤가 막혀 있으면 첫 걸음 때 나타난다 */
  private placeFollower(viaWarp: boolean) {
    const p = this.player;
    const [dx, dy] = DIR_V[p.dir];
    const bx = p.x - dx, by = p.y - dy;
    const ok = !viaWarp && this.inBounds(bx, by) && !this.tile(bx, by).solid && !this.npcAt(bx, by) && !this.warpAt(bx, by);
    this.follower = { ...makeActor(ok ? bx : p.x, ok ? by : p.y, p.dir), hidden: !ok, heart: 0 };
  }

  /** 플레이어가 한 걸음 떼면, 따라오는 몬스터는 플레이어가 있던 칸으로 */
  private trail(px: number, py: number) {
    const f = this.follower;
    if (!f) return;
    // 파도타기 중이거나 플레이어가 물에서 막 올라왔으면 아직 나타나지 않는다
    if (this.surfing || this.tile(px, py).water) {
      f.hidden = true;
      return;
    }
    if (f.hidden) {
      Object.assign(f, makeActor(px, py, this.player.dir), { hidden: false });
      return;
    }
    const dx = px - f.x, dy = py - f.y;
    const d = Math.abs(dx) + Math.abs(dy);
    if (d === 0) return;
    const dir: Dir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    if (d === 1) this.startMove(f, dir);
    else if (d === 2 && (dx === 0 || dy === 0)) this.startMove(f, dir, 2, true);
    else Object.assign(f, makeActor(px, py, dir), { hidden: false });
  }

  followerAt(x: number, y: number) {
    const f = this.follower;
    // 자전거를 탈 때는 볼에 들어가 있다
    if (!f || f.hidden || this.hooks.riding() || !this.hooks.followerSpecies()) return false;
    return (f.x === x && f.y === y) || (f.moving && f.fromX === x && f.fromY === y);
  }

  refreshNpcs() {
    for (const n of this.npcs) {
      const d = n.def;
      n.hidden = (!!d.hideIf && this.hooks.flag(d.hideIf)) || (!!d.showIf && !this.hooks.flag(d.showIf));
    }
  }

  npc(id: string) {
    return this.npcs.find((n) => n.def.id === id);
  }

  private neighbor(x: number, y: number): { map: MapDef; x: number; y: number } | null {
    const m = this.map;
    const h = m.tiles.length, w = m.tiles[0].length;
    const c = m.connections ?? {};
    const tryConn = (key: keyof typeof c, nx: (n: MapDef) => number, ny: (n: MapDef) => number) => {
      const conn = c[key];
      if (!conn) return null;
      const n = MAPS[conn.map];
      const X = nx(n), Y = ny(n);
      if (Y < 0 || Y >= n.tiles.length || X < 0 || X >= n.tiles[0].length) return null;
      return { map: n, x: X, y: Y };
    };
    if (y < 0) return tryConn('north', () => x - c.north!.offset, (n) => n.tiles.length + y);
    if (y >= h) return tryConn('south', () => x - c.south!.offset, () => y - h);
    if (x < 0) return tryConn('west', (n) => n.tiles[0].length + x, () => y - c.west!.offset);
    if (x >= w) return tryConn('east', () => x - w, () => y - c.east!.offset);
    return null;
  }

  inBounds(x: number, y: number) {
    return y >= 0 && y < this.map.tiles.length && x >= 0 && x < this.map.tiles[0].length;
  }

  tileChar(x: number, y: number): string {
    if (this.inBounds(x, y)) return this.map.tiles[y][x];
    const n = this.neighbor(x, y);
    if (n) return n.map.tiles[n.y][n.x];
    return this.map.border ?? 'X';
  }

  tile(x: number, y: number): TileDef {
    return TILES[this.tileChar(x, y)] ?? TILES.X;
  }

  npcAt(x: number, y: number) {
    return this.npcs.find((n) => !n.hidden && ((n.x === x && n.y === y) || (n.moving && n.fromX === x && n.fromY === y)));
  }

  /** 플레이어가 지나갈 수 없는 사람: 이야기 때문에 길을 막는 사람(조건이 되면 사라진다), 몬스터, 떨어진 도구, 아직 이기지 않은 트레이너.
   *  그 밖의 마을 사람과 이긴 트레이너는 지나갈 수 있다 */
  private solidNpc(n: NpcRt) {
    const d = n.def;
    if (d.hideIf || d.sprite === 'item' || 'mon' in d.sprite) return true;
    return !!d.trainer && !this.hooks.flag(`beat_${d.trainer.id}`);
  }

  private blocked(x: number, y: number, self?: Actor): boolean {
    if (!this.inBounds(x, y) && !this.neighbor(x, y)) return true;
    const t = this.tile(x, y);
    if (t.solid && !(t.water && self === this.player && this.surfing)) return true;
    const n = this.npcAt(x, y);
    if (n && n !== self && (self !== this.player || this.solidNpc(n))) return true;
    const p = this.player;
    if (self !== p && ((p.x === x && p.y === y) || (p.moving && p.fromX === x && p.fromY === y))) return true;
    if (self !== p && self !== this.follower && this.followerAt(x, y)) return true;
    return false;
  }

  warpAt(x: number, y: number): Warp | undefined {
    return this.map.warps.find((w) => w.x === x && w.y === y);
  }

  // ── 대기 도우미 ──
  waitFor(check: () => boolean): Promise<void> {
    return new Promise((resolve) => {
      if (check()) resolve();
      else this.waiters.push({ check, resolve });
    });
  }
  wait(sec: number) {
    const until = this.time + sec;
    return this.waitFor(() => this.time >= until);
  }
  fadeTo(target: number, speed = 5) {
    this.fadeTarget = target;
    this.fadeSpeed = speed;
    return this.waitFor(() => this.fade === target);
  }

  async walk(actor: Actor, dirs: Dir[]) {
    actor.path.push(...dirs);
    await this.waitFor(() => !actor.moving && actor.path.length === 0);
  }

  async warpTo(map: string, x: number, y: number, dir: Dir) {
    this.busy++;
    sfx('door');
    await this.fadeTo(1);
    this.load(map, x, y, dir, true);
    await this.wait(0.05);
    await this.fadeTo(0);
    this.busy--;
    this.afterArrive();
  }

  /** 도착 직후 트레이너 시선 확인 */
  private afterArrive() {
    this.checkTrainers();
  }

  // ── 입력 ──
  attachInput() {
    this.unsubInput?.();
    this.unsubInput = input.push(this.handler);
  }
  detachInput() {
    this.unsubInput?.();
    this.unsubInput = null;
  }

  /** 메뉴나 대화창이 떠 있지 않고 필드가 입력을 받는 중 */
  hasFocus() {
    return input.topIs(this.handler);
  }

  canControl() {
    return this.busy === 0 && !this.player.moving && this.player.path.length === 0 && this.fade === 0 && this.hasFocus();
  }

  private onButton(b: Button) {
    if (!this.canControl()) return;
    if (b === 'start') this.hooks.openMenu();
    if (b === 'select') this.hooks.select();
    if (b === 'a') this.interact();
  }

  private interact() {
    const p = this.player;
    const [dx, dy] = DIR_V[p.dir];
    let tx = p.x + dx, ty = p.y + dy;
    if (this.followerAt(tx, ty)) {
      this.follower!.dir = OPPOSITE[p.dir];
      this.hooks.talkFollower();
      return;
    }
    let npc = this.npcAt(tx, ty);
    if (!npc && this.tile(tx, ty).counter) {
      tx += dx;
      ty += dy;
      npc = this.npcAt(tx, ty);
    }
    if (npc) {
      if (npc.def.sprite !== 'item') npc.dir = OPPOSITE[p.dir];
      this.hooks.interact(npc);
      return;
    }
    if (this.tile(tx, ty).pc && p.dir === 'up') {
      this.hooks.pc();
      return;
    }
    if (this.tile(tx, ty).sign) {
      const s = this.map.signs?.find((g) => g.x === tx && g.y === ty);
      if (s && (p.dir === 'up' || p.dir === 'left' || p.dir === 'right')) this.hooks.sign(s.text);
      return;
    }
    if (this.tile(tx, ty).water && !this.npcAt(tx, ty)) this.hooks.water(p.dir);
  }

  /** 바로 앞 칸이 물인지 (낚시할 수 있는지) */
  facingWater() {
    const p = this.player;
    const [dx, dy] = DIR_V[p.dir];
    return !!this.tile(p.x + dx, p.y + dy).water && !this.npcAt(p.x + dx, p.y + dy);
  }

  /** 파도타기 시작: 바라보는 물 칸으로 뛰어든다 */
  startSurf(dir: Dir) {
    this.surfing = true;
    if (this.follower) this.follower.hidden = true;
    this.startMove(this.player, dir);
  }

  // ── 갱신 ──
  update(dt: number) {
    this.time += dt;
    if (this.fade !== this.fadeTarget) {
      const d = this.fadeSpeed * dt;
      this.fade = this.fade < this.fadeTarget ? Math.min(this.fadeTarget, this.fade + d) : Math.max(this.fadeTarget, this.fade - d);
    }
    const calm = this.busy === 0 && this.hasFocus();
    for (const n of this.npcs) {
      if (n.hidden) continue;
      if (n.emote > 0) n.emote = Math.max(0, n.emote - dt);
      this.updateActor(n, dt);
      if (calm) this.wander(n, dt);
    }
    this.updatePlayer(dt);
    if (this.follower) {
      this.updateActor(this.follower, dt);
      if (this.follower.heart > 0) this.follower.heart = Math.max(0, this.follower.heart - dt);
    }
    const ready = this.waiters.filter((w) => w.check());
    if (ready.length) {
      this.waiters = this.waiters.filter((w) => !ready.includes(w));
      ready.forEach((w) => w.resolve());
    }
  }

  private startMove(a: Actor, dir: Dir, dist = 1, jump = false) {
    const [dx, dy] = DIR_V[dir];
    a.dir = dir;
    a.fromX = a.x;
    a.fromY = a.y;
    a.x += dx * dist;
    a.y += dy * dist;
    a.moving = true;
    a.t = 0;
    a.dist = dist;
    a.jump = jump;
    a.step++;
    if (a === this.player) {
      a.speed = this.hooks.riding() ? 2 : 1;
      if (this.follower) this.follower.speed = a.speed;
      this.trail(a.fromX, a.fromY);
    }
  }

  /** 이동 진행. 한 칸을 다 가면 true */
  private updateActor(a: Actor, dt: number): boolean {
    if (!a.moving && a.path.length) {
      const d = a.path.shift()!;
      this.startMove(a, d);
    }
    if (!a.moving) return false;
    const rate = (WALK_SPEED * a.speed) / a.dist;
    const t = a.t + dt * rate;
    a.t = Math.min(1, t);
    a.px = (a.fromX + (a.x - a.fromX) * a.t) * TILE;
    a.py = (a.fromY + (a.y - a.fromY) * a.t) * TILE;
    if (t >= 1) {
      a.moving = false;
      a.jump = false;
      a.over = (t - 1) / rate;
      return true;
    }
    return false;
  }

  private wander(n: NpcRt, dt: number) {
    const mode = n.def.move ?? 'still';
    if (mode === 'still' || n.moving) return;
    n.timer -= dt;
    if (n.timer > 0) return;
    n.timer = 1.5 + Math.random() * 2.5;
    const d = pick<Dir>(['up', 'down', 'left', 'right']);
    if (mode === 'look' || chance(40)) {
      n.dir = d;
      return;
    }
    const [dx, dy] = DIR_V[d];
    const tx = n.x + dx, ty = n.y + dy;
    n.dir = d;
    if (Math.abs(tx - n.homeX) > 2 || Math.abs(ty - n.homeY) > 2) return;
    if (!this.inBounds(tx, ty) || this.blocked(tx, ty, n) || this.warpAt(tx, ty) || this.tile(tx, ty).grass) return;
    this.startMove(n, d);
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const scripted = p.path.length > 0 || (p.moving && this.busy > 0);
    if (p.moving || p.path.length) {
      if (this.updateActor(p, dt)) {
        if (scripted) this.crossEdge();
        else {
          this.onStepDone();
          if (this.slide()) return;
          // 방향키를 계속 누르고 있으면 같은 프레임에 다음 칸으로 이어 간다 (칸마다 멈칫하지 않게)
          this.walking = true;
          this.control(p.over);
        }
      }
      return;
    }
    this.control(dt);
  }

  /** 얼음 위에 서 있으면 바라보는 방향으로 한 칸 더 미끄러진다. 막히면 멈춘다 */
  private slide(): boolean {
    const p = this.player;
    const [dx, dy] = DIR_V[p.dir];
    if (!this.tile(p.x, p.y).ice || !this.canControl() || this.blocked(p.x + dx, p.y + dy, p)) {
      this.sliding = false;
      return false;
    }
    this.sliding = true;
    this.startMove(p, p.dir);
    this.updateActor(p, p.over);
    return true;
  }

  /** 방향키 입력으로 돌거나 걷는다. 서 있을 때 다른 방향을 짧게 누르면 제자리에서 돌기만 한다 */
  private control(dt: number) {
    const p = this.player;
    const held = this.canControl() ? (input.heldDir() as Dir | null) : null;
    if (!held) {
      this.turnTimer = 0;
      this.walking = false;
      return;
    }
    if (held !== p.dir && !this.walking) {
      p.dir = held;
      this.turnTimer = TURN_TIME;
      return;
    }
    if (this.turnTimer > 0) {
      this.turnTimer -= dt;
      return;
    }
    this.tryStep(held);
    if (p.moving) this.updateActor(p, dt);
    else this.walking = false;
  }

  private tryStep(dir: Dir) {
    const p = this.player;
    const w = this.warpAt(p.x, p.y);
    if (w?.exit === dir) {
      void this.warpTo(w.to, w.tx, w.ty, w.dir);
      return;
    }
    const [dx, dy] = DIR_V[dir];
    const tx = p.x + dx, ty = p.y + dy;
    const t = this.tile(tx, ty);
    if (t.ledge === dir && !this.blocked(tx + dx, ty + dy, p)) {
      sfx('jump');
      this.startMove(p, dir, 2, true);
      return;
    }
    // 따라오는 몬스터는 막지 않는다: 그 칸으로 걸어가면 서로 자리를 바꾼다
    if (this.blocked(tx, ty, p)) {
      if (this.time - this.lastBump > 0.3) sfx('bump');
      this.lastBump = this.time;
      p.step++;
      return;
    }
    this.startMove(p, dir);
  }

  /** 맵 가장자리를 넘었으면 연결된 맵으로 바꾼다 */
  private crossEdge(): boolean {
    const p = this.player;
    if (this.inBounds(p.x, p.y)) return false;
    const n = this.neighbor(p.x, p.y);
    if (!n) return false;
    const dir = p.dir;
    const step = p.step;
    const f = this.follower;
    const sx = n.x - p.x, sy = n.y - p.y;
    this.load(n.map.id, n.x, n.y, dir, false);
    this.player.step = step;
    if (f) {
      f.x += sx; f.y += sy; f.fromX += sx; f.fromY += sy;
      f.px += sx * TILE; f.py += sy * TILE;
      this.follower = f;
    }
    return true;
  }

  private onStepDone() {
    this.crossEdge();
    const p = this.player;
    const w = this.warpAt(p.x, p.y);
    if (w && !w.exit) {
      void this.warpTo(w.to, w.tx, w.ty, w.dir);
      return;
    }
    const tr = this.map.triggers?.find((t) => t.x === this.player.x && t.y === this.player.y);
    if (tr) {
      this.hooks.trigger(tr.script);
      return;
    }
    if (this.checkTrainers()) return;
    const t = this.tile(this.player.x, this.player.y);
    if (this.surfing && !t.water) this.surfing = false;
    if (t.grass || t.wild || (this.surfing && t.water)) this.hooks.grassStep();
  }

  checkTrainers(): boolean {
    const p = this.player;
    for (const n of this.npcs) {
      const tr = n.def.trainer;
      if (!tr || n.hidden || this.hooks.flag(`beat_${tr.id}`)) continue;
      const [dx, dy] = DIR_V[n.dir];
      for (let k = 1; k <= (n.def.sight ?? 3); k++) {
        const x = n.x + dx * k, y = n.y + dy * k;
        if (p.x === x && p.y === y) {
          this.hooks.trainerSpotted(n);
          return true;
        }
        const t = this.tile(x, y);
        if ((t.solid && !t.water) || this.npcAt(x, y)) break;
      }
    }
    return false;
  }

  // ── 그리기 ──
  /** 낚싯대·낚싯줄·찌. 입질이 오면 찌가 잠기고 머리 위에 느낌표가 뜬다 */
  private drawFishing(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
    const p = this.player;
    const [dx, dy] = DIR_V[p.dir];
    // 손 위치와 낚싯대 끝 (몸 앞으로 뻗는다)
    const hand: Record<Dir, [number, number]> = { down: [12, 10], up: [3, 6], left: [2, 9], right: [13, 9] };
    const [hx, hy] = hand[p.dir];
    const x0 = sx + hx, y0 = sy + hy;
    const x1 = x0 + dx * 6 + (dy ? 2 : 0), y1 = y0 + dy * 5 - (dx ? 5 : 0);
    const bite = this.fishing!.bite;
    // 찌는 바라보는 물 칸 가운데에서 출렁인다
    const bx = sx + dx * TILE + 7;
    const by = sy + dy * TILE + 8 + (bite ? 2 : Math.floor(this.time * 2) % 2);
    const dot = (x: number, y: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    };
    const line = (ax: number, ay: number, bx2: number, by2: number, c: string) => {
      const n = Math.max(Math.abs(bx2 - ax), Math.abs(by2 - ay), 1);
      for (let i = 0; i <= n; i++) dot(Math.round(ax + ((bx2 - ax) * i) / n), Math.round(ay + ((by2 - ay) * i) / n), c);
    };
    line(x0, y0, x1, y1, '#7a4a20');
    line(x1, y1, bx + 1, by, '#e8e8f0');
    if (bite) {
      // 물결
      for (const [ox, oy] of [[-2, 1], [-1, 2], [0, 2], [1, 2], [2, 2], [3, 2], [4, 1]]) dot(bx + ox, by + oy - 1, '#ffffff');
      ctx.drawImage(exclaimCanvas(), sx + 3, sy - (CHAR_SIZE.h - TILE) - 13);
    } else {
      ctx.fillStyle = '#e04040';
      ctx.fillRect(bx, by - 1, 3, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, by + 1, 3, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const camX = Math.round(p.px) - PLAYER_SX;
    const camY = Math.round(p.py) - PLAYER_SY;
    const frame = Math.floor(this.time * 2) % 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const tx0 = Math.floor(camX / TILE), ty0 = Math.floor(camY / TILE);
    for (let ty = ty0; ty <= ty0 + SCREEN_H / TILE + 1; ty++) {
      for (let tx = tx0; tx <= tx0 + SCREEN_W / TILE + 1; tx++) {
        const ch = this.tileChar(tx, ty);
        const v = tileVariant(ch, (dx, dy) => this.tileChar(tx + dx, ty + dy), tx, ty);
        ctx.drawImage(tileCanvas(ch, frame, v), tx * TILE - camX, ty * TILE - camY);
      }
    }

    const fSpecies = this.hooks.followerSpecies();
    const f = this.follower;
    const list: { a: Actor; npc?: NpcRt; mon?: string }[] = [...this.npcs.filter((n) => !n.hidden).map((n) => ({ a: n, npc: n })), { a: p }];
    if (f && !f.hidden && fSpecies && !this.hooks.riding()) list.push({ a: f, mon: fSpecies });
    list.sort((u, v) => u.a.py - v.a.py || (u.a === p ? 1 : v.a === p ? -1 : 0));
    for (const { a, npc, mon } of list) {
      const sx = Math.round(a.px) - camX;
      let sy = Math.round(a.py) - camY;
      // 그림자는 땅에 남기고 몸만 뛰어오른다
      const swimming = (a === p && this.surfing) || !!npc?.def.swim;
      if (npc?.def.sprite !== 'item' && !swimming) {
        const sh = shadowCanvas(mon ? 10 : 12);
        ctx.drawImage(sh, sx + (TILE - sh.width) / 2, sy + TILE - 3);
      }
      if (a.jump) sy -= Math.round(Math.sin(Math.PI * a.t) * 10);
      // 얼음 위를 미끄러질 때는 다리를 움직이지 않는다
      const slidingNow = a === p && this.sliding;
      const walkFrame = (a.moving && !slidingNow && a.t > 0.25 && a.t < 0.75 ? (a.step % 2 ? 1 : 2) : 0) as 0 | 1 | 2;
      const sprite = npc ? npc.def.sprite : mon ? { mon } : this.hooks.playerSprite();
      if (sprite === 'item') {
        ctx.drawImage(groundBallCanvas(), sx, sy);
      } else if ('mon' in sprite) {
        const drawn = hasFieldArt(sprite.mon);
        // 그려 둔 걸음 그림이 있으면 발을 번갈아 딛고, 서 있을 때도 가끔 발을 구른다. 없으면 통통 튀기만 한다
        const fidget = !a.moving && (this.time + a.x * 0.37 + a.y * 0.61) % 1.6 < 0.22;
        const bob = a.moving ? Math.round(Math.sin(a.t * Math.PI) * (drawn ? 1 : 2)) : 0;
        const c = monFieldCanvas(sprite.mon, a.dir, drawn ? (fidget ? 1 : walkFrame) : 0);
        if (c) ctx.drawImage(c, sx + TILE / 2 - c.width / 2, sy + TILE - c.height - bob);
      } else if (swimming && 'base' in sprite) {
        // 물 위: 윗몸만 그리고 허리에 튜브를 끼운다. 물결에 맞춰 살짝 출렁인다
        const bob = Math.floor(this.time * 3) % 2;
        const body = charCanvas(sprite.base, sprite.pal, a.dir, 0);
        ctx.drawImage(body, 0, 0, 16, 11, sx, sy + 2 + bob, 16, 11);
        ctx.drawImage(tubeCanvas(), sx, sy + 9 + bob);
      } else if (a === p && this.hooks.riding()) {
        // 자전거: 몸을 조금 올리고 자전거를 겹쳐 그린다 (뒷모습일 땐 자전거가 몸 뒤)
        const bike = bikeCanvas(a.dir);
        const by = sy + TILE - bike.height + 1;
        const bodyY = sy - (CHAR_SIZE.h - TILE) - 4;
        // 헬멧 쓴 아롱이가 뒷바퀴 위 바구니에 탄다: 옆모습이면 등 뒤, 뒷모습이면 몸 앞(화면 쪽), 앞모습이면 몸에 가려진다
        const buddy = this.hooks.bikeBuddy();
        const rider = buddy && hasFieldArt(buddy) ? arongRiderCanvas(buddy, a.dir) : null;
        const rw = rider?.width ?? 0, rh = rider?.height ?? 0;
        const side = a.dir === 'left' || a.dir === 'right';
        const rx = a.dir === 'left' ? sx + 8 : a.dir === 'right' ? sx + 8 - rw : sx + Math.round((TILE - rw) / 2);
        const ry = by + (side ? 6 : 8) - rh;
        if (a.dir === 'up') ctx.drawImage(bike, sx, by);
        if (rider && a.dir !== 'up') {
          if (side) {
            // 바구니를 받치는 짐받이: 바구니 밑에서 뒷바퀴 축까지
            const hub = sx + (a.dir === 'left' ? 12 : 3);
            ctx.fillStyle = '#2c2c3a';
            ctx.fillRect(Math.min(hub, rx + rw / 2), by + 5, Math.abs(rx + rw / 2 - hub) + 1, 1);
            ctx.fillRect(hub, by + 5, 1, 2);
          }
          ctx.drawImage(rider, rx, ry);
        }
        ctx.drawImage(charCanvas(sprite.base, sprite.pal, a.dir, 0), sx, bodyY);
        if (a.dir !== 'up') ctx.drawImage(bike, sx, by);
        if (rider && a.dir === 'up') ctx.drawImage(rider, rx, ry);
      } else {
        ctx.drawImage(charCanvas(sprite.base, sprite.pal, a.dir, walkFrame), sx, sy - (CHAR_SIZE.h - TILE));
      }
      const gx = Math.round(a.px / TILE), gy = Math.round(a.py / TILE);
      if (this.tile(gx, gy).grass && !a.jump) ctx.drawImage(grassOverlay(), gx * TILE - camX, gy * TILE - camY);
      if (a === p && this.fishing) this.drawFishing(ctx, sx, sy);
      if (npc && npc.emote > 0) ctx.drawImage(exclaimCanvas(), sx + 3, sy - (CHAR_SIZE.h - TILE) - 13);
      if (mon && f && f.heart > 0) ctx.drawImage(heartCanvas(), sx + 3, sy - 18 - Math.round((1 - f.heart) * 4));
    }

    if (this.map.outdoor) {
      const tod = timeOfDay();
      if (tod !== 'day') {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = tod === 'night' ? '#6a78b8' : '#fff0dc';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.restore();
      }
    }
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade})`;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
  }
}

export const randomLevel = (min: number, max: number) => randInt(min, max);
