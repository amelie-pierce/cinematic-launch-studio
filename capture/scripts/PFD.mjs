// PFD — 2 panel: Input | Output
export async function run(d) {
  const p = d.page;
  // A — inputs (0 → 8)
  await d.hold(0.4);
  await d.fill(d.inputNear('Uplift Load (160)(ASD)'), '2000');
  await d.hold(0.8);
  await d.fill(d.inputNear('Uplift Load (160)(ASD)'), '0');
  await d.hold(0.4);
  await d.pick(d.comboNear('Post Fasteners'), 'Screws', { browse: ['Bolts'] });
  await d.until(8);
  // C — output (8 → 14)
  await d.fill(p.getByPlaceholder('Search Table').first(), 'HDU', { enter: false });
  await d.hold(0.6);
  await d.moveTo(p.getByRole('row').nth(1), 0.5);
  await d.hold(0.3);
  await d.moveTo(p.getByRole('row').nth(2), 0.35);
  await d.until(14);
  // D — wide
  await d.moveTo({ x: 800, y: 450 }, 0.8);
  await d.until(16.5);
}
