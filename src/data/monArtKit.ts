// 몬스터 그림을 정의할 때 쓰는 도구 모음 (56x56 좌표계, 발바닥이 y≈53).
// 색: 0 흰색, 1 종족 밝은색, 2 종족 어두운색, 3 검정, 4~ 종족별 추가 색
import type { MonArt } from '../gfx/monsterArt';

export { E, L, P, R, eye, fluff, happyEye, mouth, star, type MonArt } from '../gfx/monsterArt';

export const art = (...shapes: MonArt['shapes'][]): MonArt => ({ shapes: shapes.flat() });
export const F = { front: true } as const;
export const soft = { line: false } as const;
export const spot = { line: false, shade: false } as const;
/** 배, 주둥이처럼 앞모습에서만 보이는 흰 부분 */
export const belly = { line: false, front: true } as const;
