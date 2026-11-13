// ADC — 3 panel: Inputs | 3D model | Calculation summary
export async function prep(page) {
  await page.getByRole('button', { name: 'Dismiss beta release notice' }).click().catch(() => {});
}

export async function run(d) {
  const p = d.page;
  const layout = await d.layout({
    input: p.locator('text=Inputs').first().locator('xpath=ancestor::*[.//button[@aria-label="Collapse inputs panel"]][1]'),
    viewer: p.getByRole('tab', { name: '3D-Model' }).locator('xpath=ancestor::*[2]'),
    output: p.getByText('Calculation summary').locator('xpath=ancestor::*[2]'),
  }).catch(async () => ({}));
  const opt = (name) => p.getByRole('option', { name, exact: true });
  const combo = (name) => p.getByRole('combobox', { name });

  // Shot A — inputs (0 → 6s)
  await d.hold(0.5);
  d.mark('A');
  await d.click(combo('Compressive strength'));
  await d.hold(0.35);
  await d.moveTo(opt('3,500 psi'), 0.35);
  await d.moveTo(opt('4,000 psi'), 0.25);
  await d.click(opt('4,500 psi'), { move: 0.25 });
  await d.hold(0.4);
  await d.click(combo('State'));
  await d.hold(0.3);
  await d.click(opt('Uncracked'), { move: 0.3 });
  await d.hold(0.3);
  await d.click(p.getByText('Supplemental edge reinforcement'));
  await d.until(6);

  // Shot B — 3D viewer (6 → 10s); ADC's model is a static render, so drive its view controls
  d.mark('B');
  await d.tick(p.getByText('Loads', { exact: true }).last(), { move: 0.6 });
  await d.hold(0.7);
  await d.tick(p.getByText('Dimensions', { exact: true }).last(), { move: 0.35 });
  await d.hold(0.7);
  await d.tick(p.getByText('Loads', { exact: true }).last(), { move: 0.35 });
  await d.until(10);

  // Shot C — output (10 → 14s)
  d.mark('C');
  const out = p.getByText('Calculation summary').locator('xpath=ancestor::*[2]');
  await d.click(p.getByRole('button', { name: 'Recalculate' }), { move: 0.5 });
  await d.hold(0.5);
  await d.moveTo(p.getByText('Governing tension ratio', { exact: false }).first(), 0.5);
  await d.hold(0.3);
  await d.moveTo(out.getByText('Adhesive', { exact: true }).first(), 0.4);
  await d.hold(0.3);
  await d.moveTo(out.getByText('Concrete breakout', { exact: true }).first(), 0.4);
  await d.wheel(260, 1.2);
  await d.until(14);

  // Shot D — wide (14 → 16.5s)
  d.mark('D');
  await d.click(p.getByRole('button', { name: 'Copy' }), { move: 0.6 });
  await d.until(16.5);
  return { layout };
}
