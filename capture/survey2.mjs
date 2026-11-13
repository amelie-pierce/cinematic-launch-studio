// Survey 2: get past EULA + walkthrough generically, then screenshot + dump controls.
import { chromium } from 'playwright';
import fs from 'node:fs';
const apps = ['ACE', 'ADC', 'ADM', 'AGPD', 'FD', 'HCS', 'HS', 'PBS', 'PFD', 'RWS'];
const only = process.argv[2];
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

const tap = (l) => l.click({ timeout: 2500 }).catch(() => l.evaluate((e) => e.click()).catch(() => {}));
export async function enterApp(page) {
  for (let round = 0; round < 6; round++) {
    await page.waitForTimeout(800);
    const accept = page.getByRole('button', { name: /^Accept( Application License Agreement)?$/i }).first();
    if (await accept.isVisible().catch(() => false)) {
      // scroll any scrollable dialog body to the bottom to enable Accept
      await page.evaluate(() => {
        document.querySelectorAll('[role=dialog] *, dialog *').forEach((el) => {
          if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight;
        });
      });
      await page.waitForTimeout(400);
      if (await accept.isEnabled().catch(() => false)) { await tap(accept); continue; }
    }
    const skip = page.getByRole('button', { name: /^(Skip|Skip tour|Skip walkthrough|Close tour|End tour|Got it|Dismiss|No thanks|Maybe later)$/i }).first();
    if (await skip.isVisible().catch(() => false)) { await tap(skip); continue; }
    const close = page.locator('[role=dialog] button[aria-label*="lose" i]').first();
    if (await close.isVisible().catch(() => false)) { await tap(close); continue; }
  }
}

for (const [i, a] of apps.entries()) {
  if (only && only !== a) continue;
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${9101 + i}/`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await enterApp(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `survey/${a}-1.png` });
  const tg = page.getByRole('button', { name: /Toggle theme|Switch to (dark|light) theme/i }).first();
  await tap(tg);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `survey/${a}-2.png` });
  const dump = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.left < innerWidth; };
    const out = [];
    document.querySelectorAll('button, [role=combobox], [role=tab], select, input, [role=radio], [role=checkbox], canvas, svg[data-hs-viewer-svg], [role=dialog]').forEach((el) => {
      if (!vis(el)) return;
      const r = el.getBoundingClientRect();
      const label = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
      out.push(`${el.tagName.toLowerCase()}${el.getAttribute('role') ? '[' + el.getAttribute('role') + ']' : ''}${el.type ? '(' + el.type + ')' : ''} @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} "${label}"`);
    });
    return { ls: Object.keys(localStorage), items: out };
  });
  fs.writeFileSync(`survey/${a}-controls.txt`, `${dump.ls.join(', ')}\n${dump.items.join('\n')}`);
  console.log(a, 'ok', dump.items.length);
  await ctx.close();
}
await browser.close();
