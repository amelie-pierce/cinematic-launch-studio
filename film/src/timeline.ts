// Film timeline: 120 BPM, 30 fps -> one beat = 15 frames, one bar = 60 frames.
export const FPS = 30;
export const BEAT = 15;
export const BAR = 60;
export const W = 1920;
export const H = 1080;
export const GROUND = '#E6E3DE';
export const INK = '#1B1B18';

export const APP_BARS = 10; // 8 bars main + 2 bars flashback/transition
export const MAIN_BARS = 8;
export const APP_FRAMES = APP_BARS * BAR; // 600
export const MAIN_FRAMES = MAIN_BARS * BAR; // 480
export const FLASH_FRAMES = 90; // 3s flashback
export const EXIT_FRAMES = APP_FRAMES - MAIN_FRAMES - FLASH_FRAMES; // 30
export const ENDING_BARS = 6;
export const ENDING_FRAMES = ENDING_BARS * BAR;

export type Region = { x: number; y: number; w: number; h: number };

export type Shot = {
  from: number; // capture seconds
  to: number;
  region: Region; // UI css px the shot is about
  mag: number;
  pitch: number;
  roll: number;
  yaw: number;
  persp?: number;
  screen?: [number, number]; // where the focal point sits on screen
  drift?: [number, number]; // screen px over the shot
  push?: number; // scale change over the shot (fraction)
  follow?: number; // 0..1 how much the focal point follows the interaction
  band?: number; // sharp half-band, UI px
  ramp?: number; // UI px from band edge to max blur
  maxBlur?: number; // screen px
  wide?: boolean;
  open?: number; // how far the light pool opens up (0 tight .. 1 flat)
};

export type AppDef = {
  id: string;
  name: string;
  full: string;
  layout: '3-panel' | '2-panel';
  regions: Record<string, Region>;
  shots: Shot[];
};

const r = (x: number, y: number, w: number, h: number): Region => ({ x, y, w, h });

// alternating diagonals; wide shot near-frontal
const A = (region: Region, o: Partial<Shot> = {}): Shot => ({ from: 0, to: 6, region, mag: 2.3, pitch: 34, roll: -12, yaw: 7, follow: 0.9, drift: [-70, -20], push: 0.04, band: 70, ramp: 260, maxBlur: 14, ...o });
const B = (region: Region, o: Partial<Shot> = {}): Shot => ({ from: 6, to: 10, region, mag: 1.75, pitch: 28, roll: 10, yaw: -8, follow: 0.5, drift: [80, 0], push: 0.03, band: 120, ramp: 320, maxBlur: 12, open: 0.5, ...o });
const C = (region: Region, o: Partial<Shot> = {}): Shot => ({ from: 10, to: 14, region, mag: 2.1, pitch: 32, roll: -9, yaw: -6, follow: 0.85, drift: [-40, -50], push: 0.04, band: 80, ramp: 260, maxBlur: 13, ...o });
const D = (o: Partial<Shot> = {}): Shot => ({ from: 14, to: 16, region: r(0, 0, 1600, 900), mag: 1.0, pitch: 9, roll: 0, yaw: -1.5, persp: 2200, follow: 0, screen: [960, 545], drift: [0, -10], push: 0.03, band: 700, ramp: 500, maxBlur: 4, wide: true, ...o });

const P3 = (input: Region, viewer: Region, output: Region) => ({ input, viewer, output });

export const APPS: AppDef[] = [
  { id: 'ADC', name: 'ADC', full: 'Anchor Designer for Concrete', layout: '3-panel', regions: P3(r(8, 110, 432, 748), r(452, 108, 694, 750), r(1155, 110, 437, 748)), shots: [] },
  {
    id: 'HCS', name: 'HCS', full: 'Hinge Connector Selector', layout: '3-panel',
    regions: P3(r(8, 40, 667, 850), r(683, 40, 909, 425), r(683, 475, 909, 415)),
    // output before viewer: a passed connector must be picked before it can be orbited
    shots: [],
  },
  { id: 'ACE', name: 'ACE', full: 'Adhesive Cartridge Estimator', layout: '2-panel', regions: { input: r(8, 40, 600, 850), output: r(620, 40, 972, 850) }, shots: [] },
  { id: 'ADM', name: 'ADM', full: 'Anchor Designer for Masonry', layout: '3-panel', regions: P3(r(8, 40, 667, 850), r(683, 40, 909, 425), r(683, 470, 909, 420)), shots: [] },
  { id: 'AGPD', name: 'AGPD', full: 'Architectural Gable Plate Designer', layout: '3-panel', regions: P3(r(8, 40, 567, 850), r(583, 40, 1009, 415), r(583, 460, 1009, 430)), shots: [] },
  { id: 'FD', name: 'FDA', full: 'Fastener Designer', layout: '3-panel', regions: P3(r(8, 40, 660, 850), r(683, 40, 909, 415), r(683, 460, 909, 430)), shots: [] },
  { id: 'HS', name: 'HGRS', full: 'Hanger Selector', layout: '3-panel', regions: P3(r(8, 40, 580, 850), r(590, 40, 1002, 415), r(590, 460, 1002, 430)), shots: [] },
  { id: 'PBS', name: 'PBS', full: 'Post-to-Beam Selector', layout: '3-panel', regions: P3(r(8, 40, 667, 850), r(683, 40, 909, 425), r(683, 470, 909, 420)), shots: [] },
  { id: 'PFD', name: 'PFD', full: 'Post-to-Foundation Designer', layout: '2-panel', regions: { input: r(8, 40, 667, 850), output: r(683, 40, 909, 850) }, shots: [] },
  { id: 'RWS', name: 'TWS', full: 'Roof to Wall Selector', layout: '3-panel', regions: P3(r(8, 40, 567, 850), r(583, 40, 1009, 415), r(583, 460, 1009, 430)), shots: [] },
];

APPS.forEach((a, i) => {
  const g = a.regions;
  // flip the diagonal from app to app so consecutive films never repeat a camera
  const s = i % 2 ? -1 : 1;
  const f = (o: Shot): Shot => ({ ...o, roll: o.roll * s, yaw: o.yaw * s, drift: o.drift ? [o.drift[0] * s, o.drift[1]] : undefined });
  if (a.id === 'HCS') a.shots = [A(g.input), C(g.output, { from: 6, to: 10 }), B(g.viewer, { from: 10, to: 14 }), D()].map(f);
  else if (a.layout === '3-panel') a.shots = [A(g.input), B(g.viewer), C(g.output), D()].map(f);
  else a.shots = [A(g.input, { to: 8 }), C(g.output, { from: 8 }), D()].map(f);
});

export const TOTAL_FRAMES = APPS.length * APP_FRAMES + ENDING_FRAMES;
