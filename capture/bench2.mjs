import { chromium } from 'playwright';
import { enterApp, startRecorder, PORTS, pause } from './lib.mjs';
const app = process.argv[2] || 'HCS';
const browser = await chromium.launch({ channel: 'chromium', args: ['--ignore-gpu-blocklist', '--use-angle=metal'] });
const ctx = await browser.newContext({ viewport: { width: 3200, height: 1800 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.zoom = '2'; }); });
const page = await ctx.newPage();
await enterApp(page, `http://127.0.0.1:${PORTS[app]}/`);
await page.screenshot({ path: `survey/${app}-zoom.png` });
const rec = await startRecorder(page, `frames/bench2-${app}`);
for (let i = 0; i < 4; i++) { await page.mouse.move(200 + i * 100, 300, { steps: 30 }); await pause(page, 500); }
const r = await rec.stop();
console.log('frames', r.frames.length);
await browser.close();
