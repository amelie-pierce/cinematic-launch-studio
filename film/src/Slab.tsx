import React from 'react';
import { Img, staticFile } from 'remotion';
import { H, W } from './timeline';

export const UI_W = 1600;
export const UI_H = 900;

export type Cam = {
  fx: number; // focal point, UI px
  fy: number;
  sx: number; // focal point on screen
  sy: number;
  mag: number;
  pitch: number;
  yaw: number;
  roll: number;
  persp: number;
  band: number;
  ramp: number;
  maxBlur: number;
  light: { lx: number; ly: number; sw: number; sh: number; open: number };
  wide?: boolean;
};

const rad = (d: number) => (d * Math.PI) / 180;

// depth gradient of the plane in UI coordinates (z = A*u + B*v)
function depthDir(c: Cam) {
  const p = rad(c.pitch), y = rad(c.yaw), r = rad(c.roll);
  const A = Math.sin(r) * Math.sin(p) - Math.cos(r) * Math.sin(y) * Math.cos(p);
  const B = Math.cos(r) * Math.sin(p) + Math.sin(r) * Math.sin(y) * Math.cos(p);
  const len = Math.hypot(A, B) || 1;
  return { dx: A / len, dy: B / len };
}

function bandMask(c: Cam, dLoNear: number, dHiNear: number, farK: number) {
  const { dx, dy } = depthDir(c);
  // CSS gradient angle: direction (sin t, -cos t)
  const t = Math.atan2(dx, -dy);
  const L = Math.abs(UI_W * Math.sin(t)) + Math.abs(UI_H * Math.cos(t));
  const tF = (c.fx - UI_W / 2) * dx + (c.fy - UI_H / 2) * dy + L / 2;
  const fLo = dLoNear / farK, fHi = dHiNear / farK; // far side (lower t) ramps sooner
  const s = (v: number) => `${v.toFixed(1)}px`;
  return `linear-gradient(${((t * 180) / Math.PI).toFixed(2)}deg, #000 ${s(tF - fHi - 4000)}, #000 ${s(tF - fHi)}, transparent ${s(tF - fLo)}, transparent ${s(tF + dLoNear)}, #000 ${s(tF + dHiNear)}, #000 ${s(tF + dHiNear + 4000)})`;
}

export const planeTransform = (c: Cam) =>
  `rotateX(${c.pitch}deg) rotateY(${c.yaw}deg) rotateZ(${c.roll}deg) scale(${c.mag})`;

export const Slab: React.FC<{
  src: string;
  cam: Cam;
  layers?: number;
  grade?: string;
  children?: React.ReactNode;
}> = ({ src, cam, layers = 3, grade, children }) => {
  const url = staticFile(src);
  const planeStyle: React.CSSProperties = {
    position: 'absolute',
    left: cam.sx - cam.fx,
    top: cam.sy - cam.fy,
    width: UI_W,
    height: UI_H,
    transformOrigin: `${cam.fx}px ${cam.fy}px`,
    transform: planeTransform(cam),
    borderRadius: 14,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  };
  const img: React.CSSProperties = { width: UI_W, height: UI_H, display: 'block' };
  const blurLayers = [];
  for (let i = 1; i <= layers; i++) {
    const lo = cam.band + (cam.ramp * (i - 1)) / layers;
    const hi = cam.band + (cam.ramp * i) / layers;
    const blurScreen = (cam.maxBlur * i) / layers;
    const local = blurScreen / cam.mag;
    const mask = bandMask(cam, lo, hi, 1.35);
    blurLayers.push(
      <div key={i} style={{ ...planeStyle, WebkitMaskImage: mask, maskImage: mask }}>
        <Img src={url} style={{ ...img, filter: `blur(${local.toFixed(2)}px)` }} />
      </div>,
    );
  }
  const L = cam.light;
  // light stage: a soft key that darkens the slab by at most ~12% away from the subject
  const k = 0.12 * (1 - L.open * 0.5);
  const A = [0, 0.04, 0.14, 0.3, 0.48, 0.66, 0.82, 0.94, 1];
  const E = [0, 8, 20, 35, 50, 65, 80, 92, 100];
  const pool = `radial-gradient(ellipse ${L.sw * 1.6}px ${L.sh * 1.6}px at ${L.lx}px ${L.ly}px, ${A.map((a, i) => `rgba(0,0,0,${(k * a).toFixed(4)}) ${E[i]}%`).join(', ')})`;
  return (
    <div style={{ position: 'absolute', inset: 0, perspective: cam.persp, perspectiveOrigin: `${W / 2}px ${H / 2}px`, filter: grade }}>
      <div style={{ ...planeStyle, boxShadow: '0 26px 40px rgba(0,0,0,0.18), 0 1px 6px rgba(0,0,0,0.10)' }}>
        <Img src={url} style={img} />
      </div>
      {blurLayers}
      <div style={{ ...planeStyle, background: pool }} />
      <div style={{ ...planeStyle, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)', background: 'transparent' }} />
      {children}
    </div>
  );
};
