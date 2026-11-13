// RWS — Input | 3D svg (drag to rotate) over Output
export async function run(d) {
  const p = d.page;
  // A — inputs (0 → 6)
  await d.hold(0.4);
  await d.click(p.getByText('Angle To Wall', { exact: true }), { move: 0.5 });
  await d.hold(1.0);
  await d.click(p.getByText('Parallel To Wall', { exact: true }), { move: 0.45 });
  await d.hold(1.0);
  await d.click(p.getByText('Perpendicular To Wall', { exact: true }), { move: 0.45 });
  await d.hold(0.4);
  await d.pick(d.comboNear('Wall Type'), 'Concrete', { browse: ['Masonry'] });
  await d.until(6);
  // B — viewer (6 → 10)
  await d.orbit(p.locator('svg[aria-label^="3D model"]').first(), { dx: 380, dy: 40, sec: 3.0 });
  await d.until(10);
  // C — output (10 → 14)
  await d.click(p.getByText('Show Optimized Models', { exact: true }), { move: 0.5 });
  await d.hold(0.6);
  await d.moveTo(p.getByRole('row').nth(1), 0.5);
  await d.hold(0.4);
  await d.moveTo(p.getByRole('row').nth(2), 0.4);
  await d.until(14);
  // D — wide
  await d.tick(p.getByText('Connection', { exact: true }).first(), { move: 0.6 });
  await d.until(16.5);
}
