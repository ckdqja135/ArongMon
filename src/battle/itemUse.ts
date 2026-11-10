import { itemData, type ItemId } from '../data/items';
import { STATUS_NAME, calcStats, monName, nameJ, type Mon } from './mon';

export interface ItemResult {
  ok: boolean;
  message: string;
  hpFrom?: number;
  hpTo?: number;
}

/** 회복 계열 도구를 몬스터에게 쓴다 (필드/배틀 공용) */
export function useItemOn(mon: Mon, id: ItemId): ItemResult {
  const it = itemData(id);
  const max = calcStats(mon).hp;
  const fail = { ok: false, message: '써도 효과가 없다.' };
  if (it.revive) {
    if (mon.hp > 0) return fail;
    const to = Math.max(1, Math.floor(max * it.revive));
    mon.hp = to;
    mon.status = null;
    return { ok: true, message: `${nameJ(mon, '은/는')} 기운을 되찾았다!`, hpFrom: 0, hpTo: to };
  }
  if (mon.hp <= 0) return fail;
  let healed = 0;
  const from = mon.hp;
  if (it.heal) {
    if (mon.hp < max) {
      healed = it.heal === 'full' ? max - mon.hp : Math.min(it.heal, max - mon.hp);
      mon.hp += healed;
    }
  }
  let cured: string | null = null;
  if (it.cure && mon.status && (it.cure === 'all' || it.cure.includes(mon.status))) {
    cured = STATUS_NAME[mon.status];
    mon.status = null;
    mon.sleepTurns = 0;
  }
  if (!healed && !cured) return fail;
  const message = healed
    ? `${monName(mon)}의 HP가\n${healed} 회복되었다!`
    : `${monName(mon)}의 ${cured} 상태가\n나았다!`;
  return { ok: true, message, hpFrom: from, hpTo: mon.hp };
}

export const isUsableOnMon = (id: ItemId) => {
  const it = itemData(id);
  return !!(it.heal || it.cure || it.revive);
};

/** 실제로 효과가 있을지 미리 확인 (배틀에서 대상 고를 때) */
export function canUseOn(mon: Mon, id: ItemId): boolean {
  const it = itemData(id);
  if (it.revive) return mon.hp <= 0;
  if (mon.hp <= 0) return false;
  const healOk = !!it.heal && mon.hp < calcStats(mon).hp;
  const cureOk = !!it.cure && !!mon.status && (it.cure === 'all' || it.cure.includes(mon.status));
  return healOk || cureOk;
}
