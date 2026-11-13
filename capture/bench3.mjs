import { chromium } from 'playwright';
import fs from 'node:fs';
import { enterApp, PORTS } from './lib.mjs';
const app = process.argv[2] || 'HCS';
const browser = await chromium.launch({ channel: 'chromium', args: ['--ignore-gpu-blocklist', '--use-angle=metal'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await enterApp(page, `http://127.0.0.1:${PORTS[app]}/`);
const cdp = await ctx.newCDPSession(page);
fs.mkdirSync('frames/bench3', { recursive: true });
let n = 0; const t0 = Date.now(); let run = true;
const loop = (async () => {
  while (run) {
    const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1600, height: 900, scale: 2 } });
    fs.writeFileSync(`frames/bench3/f${n++}.jpg`, Buffer.from(r.data, 'base64'));
  }
})();
for (let i = 0; i < 4; i++) { await page.mouse.move(200 + i * 100, 300, { steps: 30 }); await page.waitForTimeout(500); }
run = false; await loop;
console.log('fps', (n / ((Date.now() - t0) / 1000)).toFixed(1));
await browser.close();
