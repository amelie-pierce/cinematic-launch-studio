// Probe: open each combobox in an app and list its options (real time, no capture).
import { chromium } from 'playwright';
import { enterApp, PORTS } from './lib.mjs';
const app = process.argv[2];
const browser = await chromium.launch({ channel: 'chromium' });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await enterApp(page, `http://127.0.0.1:${PORTS[app]}/`);
const combos = page.getByRole('combobox');
const n = await combos.count();
for (let i = 0; i < n; i++) {
  const c = combos.nth(i);
  if (!(await c.isVisible())) continue;
  const label = (await c.getAttribute('aria-label')) || (await c.innerText()).slice(0, 40);
  const b = await c.boundingBox();
  await c.click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(400);
  const opts = await page.getByRole('option').allInnerTexts().catch(() => []);
  console.log(`[${i}] @${Math.round(b.x)},${Math.round(b.y)} "${label}" -> ${opts.map((o) => o.replace(/\s+/g, ' ').trim()).slice(0, 12).join(' | ')}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}
await page.screenshot({ path: `survey/${app}-probe.png` });
await browser.close();
