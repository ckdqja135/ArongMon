import 'galmuri/dist/galmuri.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { G, app } from './game/game';
import { loadMonOverrides } from './gfx/monOverrides';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);

Promise.all([document.fonts.load('12px Galmuri11'), document.fonts.load('10px Galmuri9'), loadMonOverrides()])
  .catch(() => undefined)
  .then(() => app.set({ scene: 'title' }));

// 개발 중 콘솔에서 상태를 확인할 수 있게
if (import.meta.env.DEV) Object.assign(window, { G, app });
