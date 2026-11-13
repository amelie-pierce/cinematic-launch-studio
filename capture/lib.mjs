// Shared capture helpers: enter app past EULA/walkthrough, CDP screencast recorder, gentle input helpers.
import fs from 'node:fs';
import path from 'node:path';

export const PORTS = { ACE: 9101, ADC: 9102, ADM: 9103, AGPD: 9104, FD: 9105, HCS: 9106, HS: 9107, PBS: 9108, PFD: 9109, RWS: 9110 };

export const tap = (l) => l.click({ timeout: 2500 }).catch(() => l.evaluate((e) => e.click()).catch(() => {}));

async function dismissOnce(page) {
  const accept = page.getByRole('button', { name: /^Accept( Application License Agreement)?$/i }).first();
  if (await accept.isVisible().catch(() => false)) {
    await page.evaluate(() => {
      document.querySelectorAll('[role=dialog] *, dialog *').forEach((el) => {
        if (el.scrollHeight > el.clientHeight + 4) el.scrollTop = el.scrollHeight;
      });
    });
    await page.waitForTimeout(400);
    if (await accept.isEnabled().catch(() => false)) { await tap(accept); return true; }
  }
  const skip = page.getByRole('button', { name: /^(Skip|Skip tour|Skip walkthrough|Close tour|End tour|Got it|Dismiss|No thanks|Maybe later)$/i }).first();
  if (await skip.isVisible().catch(() => false)) { await tap(skip); return true; }
  // walkthrough popovers: a small card with NEXT and a close button
  const closed = await page.evaluate(() => {
    const nexts = [...document.querySelectorAll('button')].filter((b) => /^\s*next\b/i.test(b.innerText) && b.getBoundingClientRect().width > 0);
    for (const n of nexts) {
      let card = n.parentElement;
      for (let i = 0; i < 6 && card; i++, card = card.parentElement) {
        const c = [...card.querySelectorAll('button')].find((b) => b !== n && (/close|dismiss|skip/i.test(b.getAttribute('aria-label') || '') || /^[×✕x]$/i.test(b.innerText.trim())));
        if (c) { c.click(); return true; }
      }
    }
    const dlgClose = [...document.querySelectorAll('[role=dialog] button, [role=alertdialog] button')].find((b) => /close/i.test(b.getAttribute('aria-label') || '') && b.getBoundingClientRect().width > 0);
    if (dlgClose) { dlgClose.click(); return true; }
    return false;
  });
  return closed;
}

export async function enterApp(page, url, { theme = 'dark' } = {}) {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  for (let r = 0; r < 8; r++) { if (!(await dismissOnce(page))) await page.waitForTimeout(500); }
  // reload so session-only walkthroughs/toasts are gone; EULA acceptance persists in storage
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2500);
  for (let r = 0; r < 6; r++) { if (!(await dismissOnce(page))) await page.waitForTimeout(300); }
  if (theme) await setTheme(page, theme);
  await page.mouse.move(1, 1);
  await page.waitForTimeout(800);
}

export async function setTheme(page, want) {
  const isDark = () => page.evaluate(() => {
    const el = document.querySelector('[data-aui-theme]');
    if (el) return el.getAttribute('data-aui-theme') === 'dark';
    const bg = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number);
    return bg[0] + bg[1] + bg[2] < 200;
  });
  if ((await isDark()) === (want === 'dark')) return;
  await tap(page.getByRole('button', { name: /Toggle theme|Switch to (dark|light) theme/i }).first());
  await page.waitForTimeout(600);
}

// CDP screencast recorder: stores JPEG frames with timestamps, later resampled to CFR.
export async function startRecorder(page, outDir, { quality = 92, maxWidth = 3200, maxHeight = 1800 } = {}) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let n = 0;
  cdp.on('Page.screencastFrame', async (f) => {
    const file = path.join(outDir, `f${String(n++).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, maxWidth, maxHeight, everyNthFrame: 1 });
  const marks = [];
  const t0 = Date.now() / 1000;
  return {
    mark(name) { marks.push({ name, t: Date.now() / 1000 }); },
    async stop() {
      await cdp.send('Page.stopScreencast');
      await new Promise((r) => setTimeout(r, 300));
      fs.writeFileSync(path.join(outDir, 'frames.json'), JSON.stringify({ t0, frames, marks }, null, 1));
      return { t0, frames, marks };
    },
  };
}

// Visible, human-paced helpers
export const pause = (page, ms) => page.waitForTimeout(ms);

export async function glide(page, x, y, steps = 18) {
  await page.mouse.move(x, y, { steps });
}

export async function clickAt(page, locator, { hold = 120 } = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const b = await locator.boundingBox();
  if (!b) throw new Error('no box for ' + locator);
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await glide(page, x, y);
  await page.waitForTimeout(150);
  await page.mouse.down();
  await page.waitForTimeout(hold);
  await page.mouse.up();
  return { x, y };
}

export async function typeInto(page, locator, text, { delay = 85 } = {}) {
  await clickAt(page, locator);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.waitForTimeout(120);
  await page.keyboard.type(text, { delay });
}

// Rotate a 3D canvas by dragging.
export async function orbit(page, locator, { dx = 260, dy = 30, ms = 2600, button = 'left' } = {}) {
  const b = await locator.boundingBox();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await page.mouse.move(cx - dx / 2, cy - dy / 2);
  await page.mouse.down({ button });
  const steps = Math.round(ms / 16);
  for (let i = 1; i <= steps; i++) {
    const p = i / steps;
    const e = 0.5 - 0.5 * Math.cos(Math.PI * p);
    await page.mouse.move(cx - dx / 2 + dx * e, cy - dy / 2 + dy * Math.sin(Math.PI * p));
    await page.waitForTimeout(16);
  }
  await page.mouse.up({ button });
}
