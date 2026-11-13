import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Cam, Slab, UI_H, UI_W } from './Slab';
import { AppDef, BAR, EXIT_FRAMES, FLASH_FRAMES, FPS, GROUND, H, INK, MAIN_FRAMES, Shot, W } from './timeline';
import { META } from './meta';
import { Grain, Vignette } from './Finish';

const pad = (n: number) => String(n).padStart(5, '0');
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type Box = { x: number; y: number; width: number; height: number } | null;

const filled: Record<string, ({ x: number; y: number } | null)[]> = {};
// frames with no interaction look ahead to the next subject, so the camera is already there when it acts
function filledFocus(app: string) {
  if (filled[app]) return filled[app];
  const src = META[app].focus.map((b: Box) => (b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null));
  const out = [...src];
  let next: { x: number; y: number } | null = null;
  let nextAt = Infinity;
  for (let i = src.length - 1; i >= 0; i--) {
    if (src[i]) { next = src[i]; nextAt = i; continue; }
    if (next && nextAt - i <= 75) out[i] = next;
  }
  filled[app] = out;
  return out;
}

function focusAt(app: string, f: number): { x: number; y: number } | null {
  const arr = filledFocus(app);
  return arr[clamp(f, 0, arr.length - 1)];
}

export function camFor(app: string, s: Shot, local: number, dur: number): Cam {
  const p = dur > 1 ? local / (dur - 1) : 0;
  const capF = Math.round(s.from * FPS + local);
  const rc = { x: s.region.x + s.region.w / 2, y: s.region.y + s.region.h / 2 };
  const inRegion = (pt: { x: number; y: number }) =>
    pt.x >= s.region.x - 40 && pt.x <= s.region.x + s.region.w + 40 && pt.y >= s.region.y - 40 && pt.y <= s.region.y + s.region.h + 40;
  const shotEnd = Math.round(s.to * FPS);
  const subjectAt = (i: number) => {
    for (let j = i; j < shotEnd; j++) {
      const q = focusAt(app, j);
      if (q && inRegion(q)) return q;
      if (j - i > 90) break;
    }
    return rc;
  };
  const lag = (win: number) => {
    let sx = 0, sy = 0, n = 0;
    for (let i = Math.max(Math.round(s.from * FPS), capF - win); i <= capF; i++) {
      const q = subjectAt(i);
      sx += q.x; sy += q.y; n++;
    }
    return { x: sx / n, y: sy / n };
  };
  const subj = lag(12);
  const k = s.follow ?? 0.6;
  let fx = rc.x + (subj.x - rc.x) * k;
  let fy = rc.y + (subj.y - rc.y) * k;
  fx = clamp(fx, s.region.x + 60, s.region.x + s.region.w - 60);
  fy = clamp(fy, s.region.y + 40, s.region.y + s.region.h - 40);
  // light trails a little further behind than the camera
  const lsub = lag(18);
  const ease = Easing.out(Easing.cubic);
  const drift = s.drift ?? [0, 0];
  const dp = p < 0.33 ? ease(p / 0.33) * 0.45 : 0.45 + (p - 0.33) * (0.55 / 0.67);
  const mag = s.mag * (1 + (s.push ?? 0) * dp);
  const screen = s.screen ?? [W / 2 + (s.roll > 0 ? 60 : -60), H / 2 + 30];
  const spillScreenAlong = (s.wide ? 0.78 : s.mag > 2.2 ? 0.44 : 0.52) * (s.open ? 1.3 : 1);
  const sw = (spillScreenAlong * W) / mag;
  const sh = (spillScreenAlong * 0.68 * W) / mag;
  return {
    fx, fy,
    sx: screen[0] + drift[0] * dp,
    sy: screen[1] + drift[1] * dp,
    mag,
    pitch: s.pitch,
    yaw: s.yaw + (s.roll > 0 ? 1.2 : -1.2) * dp,
    roll: s.roll + (s.roll > 0 ? -0.8 : 0.8) * dp,
    persp: s.persp ?? (s.mag > 2.2 ? 1250 : 1400),
    band: s.band ?? 90,
    ramp: s.ramp ?? 260,
    maxBlur: s.maxBlur ?? 13,
    light: { lx: s.wide ? UI_W / 2 : lsub.x + 0.15 * (rc.x - lsub.x), ly: s.wide ? UI_H / 2 : lsub.y, sw, sh, open: s.wide ? 0.75 : s.open ?? 0.45 },
    wide: s.wide,
  };
}

const frameSrc = (app: string, capF: number) => `frames/${app}/f${pad(clamp(capF, 0, META[app].frames))}.jpg`;

export const MainShots: React.FC<{ app: AppDef }> = ({ app }) => {
  const f = useCurrentFrame();
  const shot = app.shots.find((s) => f >= s.from * FPS && f < s.to * FPS) ?? app.shots[app.shots.length - 1];
  const start = shot.from * FPS;
  const dur = (shot.to - shot.from) * FPS;
  const local = f - start;
  const cam = camFor(app.id, shot, local, dur);
  const capF = Math.round(start + local);
  // brief rise out of the ground on the very first frames of an app
  const inFade = interpolate(f, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: GROUND, opacity: inFade }}>
      <Slab src={frameSrc(app.id, capF)} cam={cam} layers={cam.wide ? 2 : 3} />
      <Vignette />
    </AbsoluteFill>
  );
};

// Flashback: a time-compressed recap of the whole session, wide and graded like a memory, then exit to black.
export const Flashback: React.FC<{ app: AppDef; index: number }> = ({ app, index }) => {
  const f = useCurrentFrame();
  const total = FLASH_FRAMES + EXIT_FRAMES;
  const p = clamp(f / (FLASH_FRAMES - 1), 0, 1);
  const capF = Math.round(interpolate(p, [0, 1], [0, MAIN_FRAMES - 1], { easing: Easing.inOut(Easing.sin) }));
  const intro = interpolate(f, [0, 10], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const exit = interpolate(f, [FLASH_FRAMES, total - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  const roll = index % 2 ? 2.5 : -2.5;
  const cam: Cam = {
    fx: UI_W / 2, fy: UI_H / 2, sx: W / 2 + 150, sy: H / 2 - 40,
    mag: 0.8 - 0.05 * p - 0.05 * exit + (1 - intro) * 0.1,
    pitch: 14 + 4 * p, yaw: roll * 1.5 * (1 - p), roll: roll * p, persp: 1900,
    band: 600, ramp: 500, maxBlur: 4,
    light: { lx: UI_W / 2, ly: UI_H / 2, sw: 1500, sh: 1000, open: 0.8 },
    wide: true,
  };
  const grade = `saturate(${0.55 - 0.2 * exit}) contrast(1.04) blur(${(exit * 12 + (1 - intro) * 8).toFixed(2)}px)`;
  // ghost trail: the same recap a few frames behind, faint, for a memory smear
  const ghostF = Math.max(0, capF - 14);
  const nameIn = interpolate(f, [12, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      <AbsoluteFill style={{ opacity: 0.35 * (1 - exit) }}>
        <Slab src={frameSrc(app.id, ghostF)} cam={{ ...cam, mag: cam.mag * 1.012 }} layers={0} grade="saturate(0.3) blur(2px)" />
      </AbsoluteFill>
      <Slab src={frameSrc(app.id, capF)} cam={cam} layers={1} grade={grade} />
      <AbsoluteFill style={{ background: GROUND, opacity: exit }} />
      <Vignette strong />
      <div
        style={{
          position: 'absolute', left: 110, bottom: 70,
          opacity: nameIn * (1 - exit), filter: `blur(${((1 - nameIn) * 10).toFixed(2)}px)`,
          fontFamily: 'Inter', color: INK, letterSpacing: '-0.02em',
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 500, color: 'rgba(27,27,24,0.5)', marginBottom: 6 }}>{String(index + 1).padStart(2, '0')} / 10</div>
        <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.05 }}>{app.name}</div>
        <div style={{ fontSize: 30, fontWeight: 400, color: 'rgba(27,27,24,0.7)', marginTop: 6 }}>{app.full}</div>
      </div>
      <Grain seed={index * 7 + 3} />
    </AbsoluteFill>
  );
};

export const BAR_FRAMES = BAR;
