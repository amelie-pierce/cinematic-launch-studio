// ADM — Inputs | 3D viewer (svg) over Output
export async function run(d) {
  const p = d.page;
  // A — inputs (0 → 6)
  await d.hold(0.4);
  await d.click(p.getByText('Partially Grouted CMU', { exact: true }), { move: 0.5 });
  await d.hold(0.5);
  await d.pick(d.comboNear('Compression Strength'), '3000 psi', { browse: ['2500 psi'] });
  await d.pick(d.comboNear('CMU State'), 'Uncracked');
  await d.until(6);
  // B — viewer (6 → 10): the flat viewer has no orbit; rotate the base plate and toggle overlays
  const rot = p.getByRole('button', { name: 'Rotate Base Plate 90°' });
  await d.click(rot, { move: 0.4 });
  await d.hold(0.9);
  await d.tick(p.getByText('Load Point Dimensions', { exact: true }), { move: 0.5 });
  await d.hold(0.7);
  await d.click(rot, { move: 0.5 });
  await d.until(10);
  // C — output (10 → 14)
  await d.moveTo(p.getByText('Governing Tension Ratio', { exact: false }).first(), 0.5);
  await d.hold(0.4);
  await d.click(p.getByText('Calculation Result', { exact: true }).first(), { move: 0.5 });
  await d.hold(0.6);
  await d.wheel(220, 1.0);
  await d.until(14);
  // D — wide
  await d.click(p.getByText('Calculation Summary', { exact: true }).first(), { move: 0.6 });
  await d.until(16.5);
}
