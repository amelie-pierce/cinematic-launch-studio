// Deterministic frame-stepped capture: fake clock + stepped web animations + 2x clip screenshots.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { PORTS, enterApp } from './lib.mjs';

export const FPS = 30;
export const VW = 1600, VH = 900, SCALE = 2;

const stepAnimationsSrc = (dt) => {
  const seen = (window.__seenAnims ||= new WeakSet());
  for (const a of document.getAnimations()) {
    if (!seen.has(a)) {
      seen.add(a);
      a.pause();
      continue;
    }
    if (a.playState === 'finished') continue;
    const timing = a.effect?.getComputedTiming?.();
    const end = timing?.endTime;
    const ct = (a.currentTime ?? 0) + dt;
    if (Number.isFinite(end) && ct >= end) a.finish();
    else a.currentTime = ct;
  }
};

export async function createDirector(app, { outDir, theme = 'dark', prep } = {}) {
  const browser = await chromium.launch({ channel: 'chromium', args: ['--ignore-gpu-blocklist', '--use-angle=metal', '--hide-scrollbars'] });
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(app, 'pageerror', e.message.slice(0, 160)));
  await page.clock.install();
  await page.clock.resume();
  await enterApp(page, `http://127.0.0.1:${PORTS[app]}/`, { theme });
  if (prep) await prep(page);
  await page.waitForTimeout(800);
  await page.clock.pauseAt(Date.now() + 1000);
  const cdp = await ctx.newCDPSession(page);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  let frame = 0;
  let mouse = { x: 1, y: 1 };
  const focus = [];
  let curFocus = null;
  const marks = [];
  const presses = [];
  const keys = [];
  // freeze anything already running
  await page.evaluate(stepAnimationsSrc, 0);

  async function snap() {
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: VW, height: VH, scale: SCALE } });
    fs.writeFileSync(path.join(outDir, `f${String(frame).padStart(5, '0')}.jpg`), Buffer.from(r.data, 'base64'));
    focus.push(curFocus);
  }
  await snap();

  async function tick() {
    const prevMs = Math.round((frame * 1000) / FPS);
    frame++;
    const ms = Math.round((frame * 1000) / FPS) - prevMs;
    await page.clock.runFor(ms);
    await page.waitForTimeout(6);
    await page.evaluate(stepAnimationsSrc, ms);
    await snap();
  }

  const d = {
    page,
    get t() { return frame / FPS; },
    async hold(sec) { const n = Math.round(sec * FPS); for (let i = 0; i < n; i++) await tick(); },
    async until(sec) { while (frame < Math.round(sec * FPS)) await tick(); },
    mark(name) { marks.push({ name, frame }); },
    setFocus(box) { curFocus = box; },
    async box(loc) {
      const b = await loc.boundingBox({ timeout: 4000 });
      if (!b) throw new Error(`${app}: no box for ${loc}`);
      return b;
    },
    async moveTo(target, sec = 0.5) {
      const b = target.x !== undefined && target.width === undefined ? { x: target.x, y: target.y, width: 0, height: 0 } : target.boundingBox ? await d.box(target) : target;
      const tx = b.x + b.width / 2, ty = b.y + b.height / 2;
      const n = Math.max(1, Math.round(sec * FPS));
      const sx = mouse.x, sy = mouse.y;
      for (let i = 1; i <= n; i++) {
        const p = i / n, e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        mouse = { x: sx + (tx - sx) * e, y: sy + (ty - sy) * e };
        await page.mouse.move(mouse.x, mouse.y);
        await tick();
      }
      if (b.width) curFocus = b;
      return b;
    },
    async press(holdSec = 0.1) {
      presses.push(frame);
      await page.mouse.down();
      await d.hold(holdSec);
      await page.mouse.up();
      await tick();
    },
    async click(target, { move = 0.45, settle = 0.15 } = {}) {
      const b = await d.moveTo(target, move);
      await d.hold(settle);
      await d.press();
      return b;
    },
    // click the control sitting just left of a text label (checkbox/radio boxes)
    async tick(label, { dx = -18, move = 0.45 } = {}) {
      const b = await d.box(label);
      const pt = { x: b.x + dx, y: b.y + b.height / 2 };
      await d.moveTo(pt, move);
      curFocus = { x: b.x + dx - 12, y: b.y, width: b.width + 24, height: b.height };
      await d.hold(0.12);
      await d.press();
    },
    async type(text, cps = 12.5) {
      const per = FPS / cps;
      let acc = 0;
      for (const ch of text) {
        keys.push(frame);
        await page.keyboard.type(ch);
        acc += per;
        const n = Math.floor(acc); acc -= n;
        for (let i = 0; i < n; i++) await tick();
      }
    },
    async key(k) { await page.keyboard.press(k); await tick(); },
    comboNear(label, nth = 0) {
      return page.getByText(label, { exact: true }).nth(nth).locator('xpath=following::*[@role="combobox"][1]');
    },
    inputNear(label, nth = 0) {
      return page.getByText(label, { exact: true }).nth(nth).locator('xpath=following::input[not(@type="hidden") and not(@aria-hidden="true") and not(@type="checkbox") and not(@type="radio")][1]');
    },
    // open a dropdown, browse a couple of options, pick one
    async pick(combo, option, { browse = [] } = {}) {
      await d.click(combo);
      await d.hold(0.3);
      const opt = (n) => page.getByRole('option', { name: n, exact: typeof n === 'string' }).first();
      for (const b of browse) await d.moveTo(opt(b), 0.25);
      await d.click(opt(option), { move: 0.3 });
      await d.hold(0.25);
    },
    async fill(input, text, { enter = true } = {}) {
      await d.click(input, { move: 0.4 });
      await input.evaluate((el) => el.select?.()).catch(() => {});
      await tick();
      await d.hold(0.1);
      await d.type(text);
      if (enter) await d.key('Enter');
      await d.hold(0.2);
    },
    async selectAll() { await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A'); await tick(); },
    // drag across a canvas to orbit a 3D model
    async orbit(target, { dx = 300, dy = 40, sec = 3, button = 'left' } = {}) {
      const b = target.boundingBox ? await d.box(target) : target;
      const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      curFocus = b;
      await d.moveTo({ x: cx - dx / 2, y: cy }, 0.3);
      await page.mouse.down({ button });
      const n = Math.round(sec * FPS);
      for (let i = 1; i <= n; i++) {
        const p = i / n, e = 0.5 - 0.5 * Math.cos(Math.PI * p);
        mouse = { x: cx - dx / 2 + dx * e, y: cy + dy * Math.sin(Math.PI * p) * (dy < 0 ? -1 : 1) };
        await page.mouse.move(mouse.x, mouse.y);
        await tick();
      }
      await page.mouse.up({ button });
      await tick();
    },
    async wheel(dy, sec = 0.6) {
      const n = Math.round(sec * FPS);
      for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await tick(); }
    },
    async layout(regions) {
      const out = {};
      for (const [k, loc] of Object.entries(regions)) out[k] = await d.box(loc);
      return out;
    },
    async finish(extra = {}) {
      fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ app, fps: FPS, frames: frame, vw: VW, vh: VH, scale: SCALE, marks, presses, keys, focus, ...extra }));
      await browser.close();
      console.log(app, 'captured', frame, 'frames');
    },
  };
  return d;
}
