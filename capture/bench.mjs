import { chromium } from 'playwright';
import { enterApp, startRecorder, PORTS, clickAt, pause } from './lib.mjs';
const app = process.argv[2] || 'ADC';
const dsf = Number(process.argv[3] || 2);
const browser = await chromium.launch({ channel: 'chromium', args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=metal'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: dsf });
const page = await ctx.newPage();
await enterApp(page, `http://127.0.0.1:${PORTS[app]}/`);
await page.screenshot({ path: `survey/${app}-entered.png` });
const rec = await startRecorder(page, `frames/bench-${app}`);
for (let i = 0; i < 4; i++) {
  await page.mouse.move(200 + i * 100, 300, { steps: 30 });
  await pause(page, 600);
}
const r = await rec.stop();
const span = r.frames.at(-1).t - r.frames[0].t;
console.log(app, 'dsf', dsf, 'frames', r.frames.length, 'span', span.toFixed(2), 'fps', (r.frames.length / span).toFixed(1));
await browser.close();
