// node capture.mjs <APP>  -> frames/<APP>/fNNNNN.jpg + meta.json
import { createDirector } from './director.mjs';
const app = process.argv[2];
const mod = await import(`./scripts/${app}.mjs`);
const d = await createDirector(app, { outDir: `frames/${app}`, theme: mod.theme ?? 'light', prep: mod.prep });
try {
  const extra = (await mod.run(d)) || {};
  await d.finish(extra);
} catch (e) {
  await d.page.screenshot({ path: `survey/${app}-err.png`, timeout: 5000 }).catch(() => {});
  console.log(`${app} FAILED at t=${d.t.toFixed(2)}s:`, e.message.split('\n').slice(0, 3).join(' | '));
  process.exit(1);
}
