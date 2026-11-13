// ACE — 2 panel: Input | Output (job tally)
export async function run(d) {
  const p = d.page;
  // A — inputs (0 → 8)
  await d.hold(0.4);
  await d.click(p.getByText('Rebar', { exact: true }).first(), { move: 0.5 });
  await d.hold(0.5);
  await d.click(p.getByText('AT-3G', { exact: false }).first(), { move: 0.45 });
  await d.hold(0.6);
  await d.click(p.getByRole('button', { name: 'Change Adhesive Anchor' }), { move: 0.4 });
  await d.hold(0.4);
  await d.pick(d.comboNear('Insert Diameter (Rebar)'), /^#6/, { browse: [/^#4/, /^#5/] });
  await d.fill(d.inputNear('Embedment Depth'), '9');
  await d.fill(d.inputNear('Number of Installations'), '24');
  await d.until(8);
  // C — output (8 → 14)
  await d.moveTo(p.getByText('Job Tally', { exact: true }), 0.6);
  await d.hold(0.4);
  await d.click(p.getByText('Add New Job', { exact: false }), { move: 0.5 });
  await d.hold(0.6);
  await d.moveTo(p.getByText('SET3G22-N', { exact: false }).last(), 0.8).catch(() => {});
  await d.until(14);
  // D — wide
  await d.moveTo({ x: 800, y: 450 }, 0.8);
  await d.until(16.5);
}
