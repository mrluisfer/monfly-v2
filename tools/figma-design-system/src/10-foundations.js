/*
 * Foundations → Spacing and radius. The one documentation section the MCP run
 * did not reach; Cover, Color and Type are already in the file.
 */

const SPACING_STEPS = [
	[2, '0.5'],
	[4, '1'],
	[6, '1.5'],
	[8, '2'],
	[10, '2.5'],
	[12, '3'],
	[14, '3.5'],
	[16, '4'],
	[20, '5'],
	[24, '6'],
	[28, '7'],
	[32, '8'],
	[40, '10'],
	[48, '12']
];

const RADII = [
	['card', 24, 'The card'],
	['chip', 16, 'Chips, tabs, layers'],
	['tile', 20, 'Signup tiles'],
	['menu-item', 10, 'A menu row'],
	['lg', 8, 'Badge, tooltip'],
	['md', 6, 'A keycap'],
	['checkbox', 5, 'The checkbox'],
	['full', 9999, 'Pills and orbs']
];

async function stepFoundationsSpacing() {
	const page = await pageNamed('Foundations');
	const node = section(page, 'Spacing and radius', 0, 5964, 1440, 100);
	const root = sheet(node, 'Spacing and radius', 1440);

	// ── Spacing ──────────────────────────────────────────────────────────────
	const spacing = col(16, { name: 'Spacing' });
	root.appendChild(spacing);
	spacing.layoutSizingHorizontal = 'FILL';
	const spacingHead = await heading(
		spacing,
		'Spacing',
		'Page gutters px-4 sm:px-6 lg:px-8; cards gap-4; table columns 24 px apart. The header is 80 tall and sticky.'
	);
	spacingHead.paddingBottom = 8;

	for (const [px, tw] of SPACING_STEPS) {
		const line = row(24, { name: `spacing/${px}` });

		const label = await TXT(`spacing/${px}`, 'Body/sm medium 14', 'color/fg');
		line.appendChild(label);
		label.textAutoResize = 'HEIGHT';
		label.resize(120, label.height);

		const bar = figma.createFrame();
		bar.name = 'Bar';
		bar.resize(px, 20);
		fill(bar, 'color/blue');
		bar.cornerRadius = 2;
		line.appendChild(bar);
		bar.setBoundVariable('width', token(`spacing/${px}`));

		line.appendChild(
			await TXT(`${px} px · ${px / 16}rem · Tailwind ${tw}`, 'Body/xs 12', 'color/fg-muted')
		);

		spacing.appendChild(line);
		line.layoutSizingHorizontal = 'FILL';
	}

	// ── Radius ───────────────────────────────────────────────────────────────
	const radii = col(24, { name: 'Radius' });
	root.appendChild(radii);
	radii.layoutSizingHorizontal = 'FILL';
	await heading(
		radii,
		'Radius',
		'The card corner and the chip corner carry the look; the smaller ones belong to rows, badges and keycaps.'
	);

	const grid = row(24, { name: 'Samples' });
	grid.layoutWrap = 'WRAP';
	grid.counterAxisSpacing = 24;
	grid.counterAxisAlignItems = 'MIN';
	radii.appendChild(grid);
	grid.layoutSizingHorizontal = 'FILL';

	for (const [name, px, note] of RADII) {
		const cell = col(12, { name: `radius/${name}` });

		const sample = figma.createFrame();
		sample.name = 'Sample';
		sample.resize(128, 96);
		fill(sample, 'color/card');
		stroke(sample, 'color/hairline');
		radius(sample, `radius/${name}`);
		cell.appendChild(sample);

		const meta = col(2, { name: 'Meta' });
		meta.appendChild(await TXT(`radius/${name}`, 'Body/sm medium 14', 'color/fg'));
		meta.appendChild(
			await TXT(`${px === 9999 ? 'full' : px + ' px'} · ${note}`, 'Body/xs 12', 'color/fg-muted')
		);
		cell.appendChild(meta);

		grid.appendChild(cell);
	}

	node.resizeWithoutConstraints(1440, root.height);
	return `Foundations → Spacing and radius: ${SPACING_STEPS.length} steps, ${RADII.length} radii.`;
}
