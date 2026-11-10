import { useEffect, useRef } from 'react';
import { useStore } from '../engine/store';
import { app, G } from '../game/game';
import { SCREEN_H, SCREEN_W } from '../gfx/sprites';

export function WorldView() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { banner } = useStore(app);
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      G.world.update(dt);
      G.world.render(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <>
      <canvas ref={ref} width={SCREEN_W} height={SCREEN_H} className="pix world-canvas" />
      {banner && (
        <div key={banner.key} className="map-banner">
          {banner.text}
        </div>
      )}
    </>
  );
}
