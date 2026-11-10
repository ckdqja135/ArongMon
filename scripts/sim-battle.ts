// 헤드리스 배틀 시뮬레이션: npx tsx scripts/sim-battle.ts
import { runBattle, type BattleIO } from '../src/battle/engine';
import { createMon, monName, calcStats } from '../src/battle/mon';
import { MOVES } from '../src/data/moves';
import { SPECIES } from '../src/data/species';

const log: string[] = [];
let turn = 0;
const io: BattleIO = {
  async message(t) { log.push(t.replace(/\n/g, ' ')); },
  refresh() {},
  setActive() {},
  async anim() {},
  async hp() {},
  async exp() {},
  async chooseAction(_mon, moves) {
    turn++;
    if (turn > 60) return { kind: 'run' };
    const usable = moves.map((s, i) => ({ s, i })).filter((x) => x.s.pp > 0 && MOVES[x.s.id].power > 0);
    if (process.argv[2] === 'catch' && turn % 3 === 0) return { kind: 'item', item: 'capsule' };
    return { kind: 'fight', move: usable.length ? usable[Math.floor(Math.random() * usable.length)].i : -1 };
  },
  async chooseSwitch() { return party.findIndex((m) => m.hp > 0); },
  async chooseForget() { return 0; },
  async chooseMove(_mon, options) { return options[0]; },
  async yesNo() { return true; },
  async showLevelStats() {},
};

const party = [createMon('arong', 5), createMon('charmander', 6)];
const bag = { capsule: 5, potion: 2 };
const res = await runBattle(
  process.argv[2] === 'trainer'
    ? { kind: 'trainer', enemy: [createMon('pidgey', 6), createMon('pidgeotto', 8)], trainer: { className: '관장', name: '나래', prize: 800, sprite: { base: 'long', pal: 'purple' } } }
    : { kind: 'wild', enemy: [createMon('rattata', 4)] },
  { playerName: '아롱', party, bag, onSeen() {}, async onCaught(m) { log.push(`[caught ${monName(m)}]`); } },
  io,
);
console.log(log.join('\n'));
console.log('RESULT', res.outcome, 'prize', res.prize, 'leveled', res.leveled.map(monName));
console.log(party.map((m) => `${monName(m)} Lv${m.level} HP${m.hp}/${calcStats(m).hp} moves=${m.moves.length}`).join(' | '));
console.log('arong learnset size', SPECIES.arong.learnset.length, 'max lv', Math.max(...SPECIES.arong.learnset.map(([l]) => l)));
