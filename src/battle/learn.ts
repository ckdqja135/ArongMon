import { MOVES, type MoveId } from '../data/moves';
import { josa } from '../engine/josa';
import { canLearnMore, knows, MAX_MOVES, nameJ, randomNewMoves, type Mon } from './mon';

export interface LearnIO {
  message(text: string): Promise<void>;
  yesNo(text: string): Promise<boolean>;
  /** 잊을 기술 번호, 취소하면 null */
  chooseForget(mon: Mon, newMove: MoveId): Promise<number | null>;
  /** 후보 중에서 배울 기술 하나 고르기 */
  chooseMove(mon: Mon, options: MoveId[]): Promise<MoveId>;
}

/** 한 번에 보여 주는 후보 수 */
const PICK_OPTIONS = 3;

/** 아직 모르는 기술 중 레벨에 맞는 무작위 후보에서 하나를 골라 배운다. count번 되풀이한다 */
export async function pickMoves(m: Mon, count: number, io: LearnIO) {
  for (let i = 0; i < count; i++) {
    const options = randomNewMoves(m.moves.map((s) => s.id), PICK_OPTIONS, m.level);
    if (!options.length) return;
    await io.message(`${nameJ(m, '은/는')} 새로운 기술을\n배울 수 있게 되었다!${count > 1 ? ` (${i + 1}/${count})` : ''}`);
    await learnMoves(m, [await io.chooseMove(m, options)], io);
  }
}

/** 2세대 방식 기술 배우기. 기술 개수 제한이 없는 포켓몬은 바로 배운다. */
export async function learnMoves(m: Mon, ids: MoveId[], io: LearnIO) {
  for (const id of ids) {
    if (knows(m, id)) continue;
    const mv = MOVES[id].name;
    if (canLearnMore(m)) {
      m.moves.push({ id, pp: MOVES[id].pp });
      await io.message(`${nameJ(m, '은/는')} ${josa(mv, '을/를')} 배웠다!`);
      continue;
    }
    await io.message(`${nameJ(m, '은/는')} ${josa(mv, '을/를')}\n배우고 싶다...`);
    await io.message(`하지만 ${nameJ(m, '은/는')} 기술을\n${MAX_MOVES}개까지만 배울 수 있다!`);
    for (;;) {
      if (await io.yesNo(`${mv} 대신 다른 기술을\n잊게 하겠습니까?`)) {
        const idx = await io.chooseForget(m, id);
        if (idx !== null) {
          const old = MOVES[m.moves[idx].id].name;
          await io.message('1, 2, 그리고...\n짠!');
          await io.message(`${nameJ(m, '은/는')} ${josa(old, '을/를')}\n깨끗이 잊었다!`);
          m.moves[idx] = { id, pp: MOVES[id].pp };
          await io.message(`그리고 ${nameJ(m, '은/는')}\n${josa(mv, '을/를')} 배웠다!`);
          break;
        }
      }
      if (await io.yesNo(`${josa(mv, '을/를')} 배우는 것을\n포기하겠습니까?`)) {
        await io.message(`${nameJ(m, '은/는')} ${josa(mv, '을/를')}\n배우지 않았다!`);
        break;
      }
    }
  }
}
