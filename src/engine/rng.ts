export const rand = (n: number) => Math.floor(Math.random() * n);
export const randInt = (min: number, max: number) => min + rand(max - min + 1);
export const chance = (pct: number) => Math.random() * 100 < pct;
export const pick = <T,>(arr: readonly T[]): T => arr[rand(arr.length)];
export function weighted<T extends { weight: number }>(arr: readonly T[]): T {
  const total = arr.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of arr) {
    r -= a.weight;
    if (r < 0) return a;
  }
  return arr[arr.length - 1];
}
export const uid = () => Math.random().toString(36).slice(2, 10);
