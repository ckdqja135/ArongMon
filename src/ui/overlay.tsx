// 화면 위에 겹쳐 띄우는 창 (메뉴, 대화창 등). 닫힐 때 값을 돌려준다.
import type { ReactNode } from 'react';
import { createStore, useStore } from '../engine/store';

interface Item {
  id: number;
  node: ReactNode;
}

const store = createStore<{ items: Item[] }>({ items: [] });
let nextId = 1;

export function openOverlay<T>(render: (done: (v: T) => void) => ReactNode): Promise<T> {
  return new Promise((resolve) => {
    const id = nextId++;
    let closed = false;
    const done = (v: T) => {
      if (closed) return;
      closed = true;
      store.set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      resolve(v);
    };
    store.set((s) => ({ items: [...s.items, { id, node: render(done) }] }));
  });
}

export const overlayCount = () => store.get().items.length;

export function OverlayHost() {
  const { items } = useStore(store);
  return (
    <>
      {items.map((i) => (
        <div key={i.id} className="overlay">
          {i.node}
        </div>
      ))}
    </>
  );
}
