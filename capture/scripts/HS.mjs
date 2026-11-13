// HS — Input | 2.5D connection view over Output
export async function run(d) {
  const p = d.page;
  // A — inputs (0 → 6)
  await d.hold(0.4);
  await d.click(p.getByText('Truss (Flush Bottom)', { exact: true }), { move: 0.5 });
  await d.hold(1.0);
  await d.click(p.getByText('Joist (Flush Top)', { exact: true }), { move: 0.45 });
  await d.hold(0.6);
  await d.pick(d.comboNear('Download Duration'), 'Floor (100)', { browse: ['Snow (115)', 'Roof (125)'] });
  await d.until(6);
  // B — viewer (6 → 10): the view rotates on click
  const view = p.locator('[data-hs-viewer-svg]').first();
  await d.click(view, { move: 0.5 });
  await d.hold(0.9);
  await d.press();
  await d.hold(0.9);
  await d.tick(p.getByText('Loading', { exact: true }).first(), { move: 0.4 });
  await d.until(10);
  // C — output (10 → 14)
  const rows = p.getByRole('row').filter({ has: p.getByRole('radio') });
  await d.moveTo(rows.nth(0), 0.5);
  await d.click(rows.nth(0).getByRole('radio').first(), { move: 0.3 });
  await d.hold(0.4);
  await d.click(p.getByText('Add to Job List', { exact: true }), { move: 0.5 });
  await d.hold(0.4);
  await d.click(p.getByText(/^Job List/).first(), { move: 0.4 });
  await d.until(14);
  // D — wide
  await d.click(p.getByText('Output', { exact: true }).first(), { move: 0.6 });
  await d.until(16.5);
}
