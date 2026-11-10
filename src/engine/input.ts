// 게임보이 버튼 입력. 가장 위에 쌓인 핸들러 하나만 버튼 누름을 받는다.
import { useEffect, useRef } from 'react';
import { unlockAudio } from './sound';

export type Button = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select';
export const DIRS: Button[] = ['up', 'down', 'left', 'right'];

const KEYMAP: Record<string, Button> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyZ: 'a', Space: 'a', KeyX: 'b', Escape: 'b', Backspace: 'b',
  Enter: 'start', ShiftLeft: 'select', ShiftRight: 'select',
};

type Handler = (b: Button) => void;

class Input {
  held = new Set<Button>();
  /** 방향키를 누른 순서 (마지막이 우선) */
  dirOrder: Button[] = [];
  private stack: { fn: Handler }[] = [];
  private repeatTimer: number | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const b = KEYMAP[e.code];
      if (!b) return;
      e.preventDefault();
      if (e.repeat) {
        if (DIRS.includes(b)) this.dispatch(b);
        return;
      }
      this.press(b);
    });
    window.addEventListener('keyup', (e) => {
      const b = KEYMAP[e.code];
      if (b) this.release(b);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
      this.dirOrder = [];
    });
  }

  press(b: Button) {
    unlockAudio();
    if (this.held.has(b)) return;
    this.held.add(b);
    if (DIRS.includes(b)) this.dirOrder.push(b);
    this.dispatch(b);
  }

  release(b: Button) {
    this.held.delete(b);
    this.dirOrder = this.dirOrder.filter((d) => d !== b);
  }

  /** 화면 버튼용: 누르고 있으면 방향키는 반복 입력 */
  pressVirtual(b: Button) {
    this.press(b);
    if (DIRS.includes(b)) {
      this.stopRepeat();
      this.repeatTimer = window.setTimeout(() => {
        this.repeatTimer = window.setInterval(() => this.held.has(b) && this.dispatch(b), 90);
      }, 350);
    }
  }
  releaseVirtual(b: Button) {
    this.release(b);
    this.stopRepeat();
  }
  private stopRepeat() {
    if (this.repeatTimer !== null) {
      clearTimeout(this.repeatTimer);
      clearInterval(this.repeatTimer);
      this.repeatTimer = null;
    }
  }

  heldDir(): Button | null {
    return this.dirOrder[this.dirOrder.length - 1] ?? null;
  }

  dispatch(b: Button) {
    this.stack[this.stack.length - 1]?.fn(b);
  }

  push(fn: Handler): () => void {
    const entry = { fn };
    this.stack.push(entry);
    return () => {
      const i = this.stack.indexOf(entry);
      if (i >= 0) this.stack.splice(i, 1);
    };
  }

  /** 이 핸들러가 지금 입력을 받는 중인가 */
  topIs(fn: Handler) {
    return this.stack[this.stack.length - 1]?.fn === fn;
  }
}

export const input = new Input();

/** 컴포넌트가 화면에 있는 동안 버튼 입력을 받는다. 나중에 등록한 쪽이 우선. */
export function useButtons(handler: Handler, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    return input.push((b) => ref.current(b));
  }, [active]);
}
