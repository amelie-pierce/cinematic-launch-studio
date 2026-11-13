import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';

export const Vignette: React.FC<{ strong?: boolean }> = ({ strong }) => (
  <AbsoluteFill
    style={{ background: `radial-gradient(120% 95% at 50% 50%, transparent ${strong ? 48 : 55}%, rgba(120,115,108,${strong ? 0.2 : 0.14}) 100%)`, pointerEvents: 'none' }}
  />
);

// fine film grain: 8 pre-baked tiles, picked and offset per frame with a fixed hash
export const Grain: React.FC<{ seed?: number; opacity?: number }> = ({ seed = 0, opacity = 0.14 }) => {
  const f = useCurrentFrame();
  const h = (n: number) => {
    let x = (n + seed * 9973) | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967295;
  };
  const tile = Math.floor(h(f) * 8);
  const ox = Math.floor(h(f + 101) * 512), oy = Math.floor(h(f + 211) * 512);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', mixBlendMode: 'overlay', opacity, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: -ox, top: -oy, width: 1920 + 1024, height: 1080 + 1024, backgroundImage: `url(${staticFile(`grain/g${tile}.png`)})`, backgroundSize: '512px 512px' }} />
    </AbsoluteFill>
  );
};

export const Pre: React.FC<{ srcs: string[] }> = ({ srcs }) => (
  <div style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}>
    {srcs.map((s) => <Img key={s} src={staticFile(s)} />)}
  </div>
);
