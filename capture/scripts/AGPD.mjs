// AGPD — Input | 2D viewer over Output
export async function run(d) {
  const p = d.page;
  // A — inputs (0 → 6)
  await d.hold(0.4);
  await d.click(p.getByText('Fan', { exact: true }), { move: 0.5 });
  await d.hold(0.6);
  await d.fill(d.inputNear('Top Chord Slope'), '8');
  await d.pick(d.comboNear('Web'), '6x8', { browse: ['6x6'] });
  await d.until(6);
  // B — viewer (6 → 10)
  await d.tick(p.getByText('Fasteners', { exact: true }).first(), { move: 0.5 });
  await d.hold(0.6);
  await d.tick(p.getByText('Dimensions', { exact: true }).first(), { move: 0.4 });
  await d.hold(0.6);
  await d.tick(p.getByText('Dimensions', { exact: true }).first(), { move: 0.2 });
  await d.until(10);
  // C — output (10 → 14)
  const rows = p.getByRole('row');
  await d.moveTo(rows.nth(1), 0.5);
  await d.hold(0.3);
  await d.moveTo(rows.nth(2), 0.35);
  await d.hold(0.3);
  await d.moveTo(rows.nth(3), 0.35);
  await d.hold(0.3);
  await d.moveTo(p.getByText('REQUEST A QUOTE', { exact: true }), 0.5);
  await d.until(14);
  // D — wide
  await d.click(p.getByRole('button', { name: /Reset view/i }).first(), { move: 0.6 });
  await d.until(16.5);
}
