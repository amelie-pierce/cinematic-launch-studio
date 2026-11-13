import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { APPS, ENDING_FRAMES, GROUND, INK, MAIN_FRAMES } from './timeline';
import { Grain, Vignette } from './Finish';
import { META } from './meta';

const pad = (n: number) => String(n).padStart(5, '0');

// Closing: the ten apps drift as a blurred wall behind one line of copy.
export const Ending: React.FC = () => {
  const f = useCurrentFrame();
  const wallIn = interpolate(f, [0, 40], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const drift = f / ENDING_FRAMES;
  const name = interpolate(f, [30, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const tag = interpolate(f, [90, 114], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const out = interpolate(f, [ENDING_FRAMES - 24, ENDING_FRAMES - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cols = 5, tw = 640, th = 360, gap = 40;
  const gridW = cols * tw + (cols - 1) * gap, gridH = 2 * th + gap;
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      <AbsoluteFill style={{ perspective: 1800, opacity: wallIn * 0.72 * (1 - out), filter: `blur(${(18 - 4 * wallIn).toFixed(1)}px) saturate(0.85)` }}>
        <div
          style={{
            position: 'absolute', left: 960 - gridW / 2, top: 540 - gridH / 2, width: gridW, height: gridH,
            transform: `rotateX(22deg) rotateZ(-8deg) translate3d(${(-120 + 240 * drift).toFixed(1)}px, ${(30 - 60 * drift).toFixed(1)}px, 0) scale(${(0.86 + 0.06 * drift).toFixed(4)})`,
          }}
        >
          {APPS.map((a, i) => {
            const fr = Math.min(META[a.id].frames, MAIN_FRAMES - 30);
            return (
              <Img
                key={a.id}
                src={staticFile(`frames/${a.id}/f${pad(fr)}.jpg`)}
                style={{ position: 'absolute', left: (i % cols) * (tw + gap), top: Math.floor(i / cols) * (th + gap), width: tw, height: th, borderRadius: 10, boxShadow: '0 18px 30px rgba(0,0,0,0.14)' }}
              />
            );
          })}
        </div>
      </AbsoluteFill>
      <Vignette strong />
      {/* soft ground veil keeps the ink legible over the white app wall */}
      <AbsoluteFill style={{ background: `radial-gradient(60% 45% at 50% 50%, rgba(230,227,222,${(0.7 * wallIn).toFixed(3)}) 0%, rgba(230,227,222,0) 100%)` }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: 1 - out }}>
        <div style={{ fontFamily: 'Inter', color: INK, letterSpacing: '-0.02em', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 112, fontWeight: 600, lineHeight: 1.05, opacity: name, filter: `blur(${((1 - name) * 16).toFixed(2)}px)`, transform: `translateY(${((1 - name) * 14).toFixed(1)}px)` }}>Blueprint</span>
          <span style={{ fontSize: 48, fontWeight: 400, lineHeight: 1.3, marginTop: 10, paddingLeft: 64, color: 'rgba(27,27,24,0.68)', opacity: tag, filter: `blur(${((1 - tag) * 12).toFixed(2)}px)`, transform: `translateY(${((1 - tag) * 10).toFixed(1)}px)` }}>
            Powered by <span style={{ color: INK, fontWeight: 600 }}>AAUI</span>
          </span>
        </div>
      </AbsoluteFill>
      <Grain seed={99} />
    </AbsoluteFill>
  );
};
