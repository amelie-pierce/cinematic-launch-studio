import { chromium } from 'playwright';
import { enterApp, PORTS } from './lib.mjs';
const apps = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chromium', args: ['--ignore-gpu-blocklist', '--use-angle=metal'] });
for (const a of apps) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await enterApp(page, `http://127.0.0.1:${PORTS[a]}/`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `survey/${a}-dark.png` });
  const info = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('canvas, svg').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 150 && r.height > 120) out.push(`${el.tagName} @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} ${el.getAttribute('aria-label') || ''} ${[...el.attributes].map((x) => x.name).filter((n) => n.startsWith('data-')).join(',')}`);
    });
    return out;
  });
  console.log(a, info.join(' | '));
  await ctx.close();
}
await browser.close();
