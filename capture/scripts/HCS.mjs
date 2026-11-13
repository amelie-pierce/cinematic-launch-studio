// HCS — Input | 3D viewer (R3F) over Output
export async function run(d) {
  const p = d.page;
  // A — inputs (0 → 6)
  await d.hold(0.4);
  await d.click(p.getByText('Top dapped', { exact: true }), { move: 0.5 });
  await d.hold(0.4);
  await d.fill(d.inputNear('Load'), '6500');
  await d.pick(p.getByRole('combobox', { name: 'Load Duration', exact: true }), 'Snow (115)', { browse: ['Floor (100)'] });
  await d.until(6);
  // C — output (6 → 10): pick a passed connector
  const firstRow = p.getByRole('row').filter({ hasText: 'Passed' }).first();
  await d.moveTo(p.getByText('Passed Products', { exact: false }).first(), 0.5);
  await d.hold(0.3);
  await d.moveTo(firstRow, 0.45);
  await d.hold(0.3);
  await d.click(firstRow.getByRole('radio').first(), { move: 0.3 });
  await d.until(10);
  // B — viewer (10 → 14): orbit the connector
  await d.orbit(p.locator('canvas').first(), { dx: 420, dy: 40, sec: 3.2 });
  await d.until(14);
  // D — wide
  await d.tick(p.getByText('Hinge Connector Dimension', { exact: true }), { move: 0.6 });
  await d.until(16.5);
}
