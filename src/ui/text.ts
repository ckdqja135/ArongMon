// 글자 폭을 재서 줄바꿈하고 2줄씩 페이지로 나눈다.
export const FONT_PX = 12;
export const FONT = `${FONT_PX}px Galmuri11`;
let ctx: CanvasRenderingContext2D | null = null;

export function measure(s: string): number {
  ctx ??= document.createElement('canvas').getContext('2d')!;
  ctx.font = FONT;
  return ctx.measureText(s).width;
}

export function wrapText(text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const cand = line ? `${line} ${word}` : word;
      if (measure(cand) <= maxW) {
        line = cand;
        continue;
      }
      if (line) out.push(line);
      line = '';
      for (const ch of word) {
        if (measure(line + ch) > maxW && line) {
          out.push(line);
          line = ch;
        } else line += ch;
      }
    }
    out.push(line);
  }
  return out;
}

export function paginate(text: string, maxW: number, perPage = 2): string[][] {
  const lines = wrapText(text, maxW);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  return pages.length ? pages : [['']];
}
