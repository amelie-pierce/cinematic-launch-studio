// FD — Input | 3D canvas over Output
export async function run(d) {
  const p = d.page;
  // A — inputs (0 → 6)
  await d.hold(0.4);
  await d.pick(d.comboNear('Installation Type'), 'Edge Grain', { browse: ['Typical'] });
  await d.fill(d.inputNear('Lateral X, F', 0).or(p.locator('input').nth(0)).first(), '250').catch(() => {});
  await d.fill(d.inputNear('Withdrawal, F', 0), '120').catch(() => {});
  await d.until(6);
  // B — viewer (6 → 10)
  await d.orbit(p.locator('canvas').first(), { dx: 400, dy: 50, sec: 3.0 });
  await d.until(10);
  // C — output (10 → 14)
  const rows = p.getByRole('row').filter({ has: p.getByRole('radio') });
  await d.moveTo(rows.nth(1), 0.5);
  await d.click(rows.nth(1).getByRole('radio').first(), { move: 0.3 });
  await d.hold(0.5);
  await d.moveTo(rows.nth(2), 0.4);
  await d.hold(0.3);
  await d.click(p.getByText('CALCULATION RESULT', { exact: false }).first(), { move: 0.5 });
  await d.until(14);
  // D — wide
  await d.click(p.getByText('OUTPUT', { exact: true }).first(), { move: 0.6 });
  await d.until(16.5);
}
