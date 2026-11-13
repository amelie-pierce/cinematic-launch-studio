// PBS — Input | 3D svg (drag to rotate) over Output
export async function run(d) {
  const p = d.page;
  // A — inputs (0 → 6)
  await d.hold(0.4);
  await d.click(p.getByText('T - Cap', { exact: true }), { move: 0.5 });
  await d.hold(0.5);
  await d.pick(d.comboNear('Post Width'), '6x', { browse: ['4x'] });
  await d.pick(d.comboNear('Height (H1)'), '12', { browse: ['10'] });
  await d.until(6);
  // B — viewer (6 → 10)
  await d.orbit(p.locator('svg[aria-label^="3D model"]').first(), { dx: 380, dy: 40, sec: 3.0 });
  await d.until(10);
  // C — output (10 → 14)
  await d.click(p.getByText('Show Optimized Models', { exact: true }), { move: 0.5 });
  await d.hold(0.6);
  const expand = p.getByRole('row').getByRole('button').first();
  await d.click(expand, { move: 0.5 });
  await d.hold(0.8);
  await d.until(14);
  // D — wide
  await d.click(p.getByText('Connection List', { exact: true }).first(), { move: 0.6 });
  await d.until(16.5);
}
