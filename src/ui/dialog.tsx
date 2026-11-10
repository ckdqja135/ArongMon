// 스크립트에서 쓰는 대화 함수: await say('...'), await ask('...', ['예', '아니오'])
import { useState } from 'react';
import { useButtons } from '../engine/input';
import { openOverlay } from './overlay';
import { Frame, Menu, TextBox } from './widgets';

export const DIALOG_W = 226;

export function DialogText({ text, onDone, auto }: { text: string; onDone?: () => void; auto?: number }) {
  return <TextBox text={text} onDone={onDone} auto={auto} width={DIALOG_W} className="textbox dialog" />;
}

/** 글을 보여주고 A를 누를 때까지 기다린다 */
export function say(text: string): Promise<void> {
  return openOverlay<void>((done) => <DialogText text={text} onDone={() => done()} />);
}

/** 질문 글을 보여준 뒤 선택지를 띄운다. B를 누르면 cancel 번호 */
export async function ask(text: string, options: string[], cancel = options.length - 1): Promise<number> {
  // 질문 글이 다 나오면 바로 선택지를 띄운다
  if (text) await openOverlay<void>((done) => <DialogText text={text} auto={80} onDone={() => done()} />);
  return openOverlay<number>((done) => (
    <>
      {text && <DialogText text={text} />}
      <Frame className="choice">
        <Menu items={options} onSelect={done} onCancel={() => done(cancel)} />
      </Frame>
    </>
  ));
}

export const yesNo = async (text: string) => (await ask(text, ['예', '아니오'], 1)) === 0;

/** 개수 고르기 (가게 등). 취소하면 0 */
export function askQuantity(max: number, unitPrice?: number): Promise<number> {
  return openOverlay<number>((done) => <QuantityBox max={max} unitPrice={unitPrice} onDone={done} />);
}

function QuantityBox({ max, unitPrice, onDone }: { max: number; unitPrice?: number; onDone: (n: number) => void }) {
  const [n, setN] = useState(1);
  useButtons((b) => {
    if (b === 'up') setN((v) => (v >= max ? 1 : v + 1));
    if (b === 'down') setN((v) => (v <= 1 ? max : v - 1));
    if (b === 'right') setN((v) => Math.min(max, v + 10));
    if (b === 'left') setN((v) => Math.max(1, v - 10));
    if (b === 'a') onDone(n);
    if (b === 'b') onDone(0);
  });
  return (
    <Frame className="quantity">
      <span>×{String(n).padStart(2, '0')}</span>
      {unitPrice !== undefined && <span className="price">{(n * unitPrice).toLocaleString()}원</span>}
    </Frame>
  );
}
