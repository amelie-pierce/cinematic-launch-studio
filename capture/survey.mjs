// Quick survey: screenshot each app's landing state.
import { chromium } from 'playwright';
const apps = ['ACE', 'ADC', 'ADM', 'AGPD', 'FD', 'HCS', 'HS', 'PBS', 'PFD', 'RWS'];
const only = process.argv[2];
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const [i, a] of apps.entries()) {
  if (only && only !== a) continue;
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log(a, 'pageerror', e.message.slice(0, 200)));
  await page.goto(`http://127.0.0.1:${9101 + i}/`, { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `survey/${a}-0.png` });
  console.log(a, await page.title());
  await page.close();
}
await browser.close();
