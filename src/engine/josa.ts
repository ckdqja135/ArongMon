// 한국어 조사 처리: josa('토실', '이/가') → '토실이'
const DIGIT_BATCHIM: Record<string, number> = { '0': 21, '1': 8, '2': 0, '3': 16, '4': 0, '5': 0, '6': 1, '7': 8, '8': 8, '9': 0 };

function lastBatchim(word: string): number {
  const ch = word.trim().slice(-1);
  if (!ch) return 0;
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28;
  if (ch in DIGIT_BATCHIM) return DIGIT_BATCHIM[ch];
  return 0;
}

export function josa(word: string, pair: string): string {
  const [withB, withoutB] = pair.split('/');
  const b = lastBatchim(word);
  if (pair === '으로/로') return word + (b === 0 || b === 8 ? '로' : '으로');
  return word + (b ? withB : withoutB);
}
