/*
 * Controls — the things a person presses. Every one wears the near-black
 * hairline; the sunken ground is the hover state, not the resting one.
 */

/** Tailwind's `border-dashed` at 1px. */
const DASH = [3, 3];

async function buildPillButton(combo) {
	const small = combo.Size === 'sm';
	const frame = row(10, { name: 'PillButton' });
	frame.resize(10, small ? 36 : 44);
	frame.layoutSizingHorizontal = 'HUG';
	frame.layoutSizingVertical = 'FIXED';
	frame.primaryAxisAlignItems = 'CENTER';
	pad(frame, 0, small ? 16 : 20);
	frame.fills = [];
	stroke(frame, 'color/hairline');
	pill(frame);

	frame.appendChild(
		await TXT('All time', small ? 'Body/sm 14' : 'Body/md 15', 'color/fg', { name: 'Label' })
	);
	if (combo.Caret === 'on') frame.appendChild(buildCaretNode());

	return frame;
}

/** The caret as a plain node — the component form lives in the Atoms shelf. */
function buildCaretNode() {
	const node = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="6.667" viewBox="0 0 12 8"><path d="M1 1.2C1 0.6 1.5 0.2 2 0.5L6 3.2C6 3.2 6 3.2 6 3.2L10 0.5C10.5 0.2 11 0.6 11 1.2C11 1.4 10.9 1.6 10.8 1.7L6.6 6.9C6.3 7.3 5.7 7.3 5.4 6.9L1.2 1.7C1.1 1.6 1 1.4 1 1.2Z" fill="#000000"/></svg>`
	);
	node.name = 'Caret';
	node.fills = [];
	const paint = tokenPaint('color/fg');
	for (const child of node.findAll((n) => 'fills' in n && n.type !== 'FRAME'))
		child.fills = [paint];
	return node;
}

const ICON_BUTTON_SIZE = { sm: 36, md: 44, lg: 56 };

async function buildIconButton(combo) {
	const size = ICON_BUTTON_SIZE[combo.Size];
	const disabled = combo.State === 'disabled';

	const frame = row(0, { name: 'IconButton' });
	frame.resize(size, size);
	frame.layoutSizingHorizontal = 'FIXED';
	frame.layoutSizingVertical = 'FIXED';
	frame.primaryAxisAlignItems = 'CENTER';
	frame.counterAxisAlignItems = 'CENTER';
	frame.fills = [];
	pill(frame);

	// Disabled, the solid rim gives way to dashes — the ring navigation wears,
	// with nowhere to go — and the glyph steps back.
	stroke(frame, 'color/hairline');
	if (combo.Style === 'dashed' || disabled) frame.dashPattern = DASH;
	if (disabled) frame.strokes = [tokenPaint('color/hairline', 0.35)];

	frame.appendChild(icon('arrow-left', 18, disabled ? 'color/fg-subtle' : 'color/fg', 1.5));
	return frame;
}

async function buildCheckbox(combo) {
	const on = combo.State !== 'unchecked';

	const frame = row(0, { name: 'Checkbox' });
	frame.resize(18, 18);
	frame.layoutSizingHorizontal = 'FIXED';
	frame.layoutSizingVertical = 'FIXED';
	frame.primaryAxisAlignItems = 'CENTER';
	frame.counterAxisAlignItems = 'CENTER';
	radius(frame, 'radius/checkbox');
	fill(frame, on ? 'color/blue' : 'color/card');
	stroke(frame, on ? 'color/blue' : 'color/hairline');
	if (combo.Disabled === 'yes') frame.opacity = 0.5;

	if (on) {
		const glyph = icon(
			combo.State === 'indeterminate' ? 'minus' : 'check',
			14,
			'color/window',
			2.5
		);
		frame.appendChild(glyph);
	}
	return frame;
}

async function buildSwitch(combo) {
	const on = combo.Checked === 'on';

	const frame = row(0, { name: 'Switch' });
	frame.resize(40, 24);
	frame.layoutSizingHorizontal = 'FIXED';
	frame.layoutSizingVertical = 'FIXED';
	frame.counterAxisAlignItems = 'CENTER';
	frame.primaryAxisAlignItems = on ? 'MAX' : 'MIN';
	pad(frame, 0, 2);
	fill(frame, on ? 'color/blue' : 'color/sunken');
	stroke(frame, 'color/hairline');
	pill(frame);
	if (combo.Disabled === 'yes') frame.opacity = 0.5;

	const thumb = figma.createEllipse();
	thumb.name = 'Thumb';
	thumb.resize(18, 18);
	fill(thumb, on ? 'color/window' : 'color/card');
	stroke(thumb, 'color/hairline');
	frame.appendChild(thumb);

	return frame;
}

const SEGMENTED_OPTIONS = ['Quarters', 'Months'];

async function buildSegmented(combo) {
	const at = Number(combo.Selected) - 1;

	const frame = row(0, { name: 'Segmented' });
	frame.resize(10, 36);
	frame.layoutSizingHorizontal = 'HUG';
	frame.layoutSizingVertical = 'FIXED';
	pad(frame, 2);
	fill(frame, 'color/sunken');
	pill(frame);

	for (let i = 0; i < SEGMENTED_OPTIONS.length; i++) {
		const chosen = i === at;
		const item = row(0, { name: SEGMENTED_OPTIONS[i] });
		item.layoutSizingVertical = 'FILL';
		item.primaryAxisAlignItems = 'CENTER';
		item.counterAxisAlignItems = 'CENTER';
		pad(item, 0, 12);
		pill(item);
		// One raised surface rests on the chosen option; the rest sit on the sunken capsule.
		if (chosen) {
			fill(item, 'color/card');
			stroke(item, 'color/hairline');
		} else {
			item.fills = [];
		}
		item.appendChild(
			await TXT(SEGMENTED_OPTIONS[i], 'Body/sm 14', chosen ? 'color/fg' : 'color/fg-muted')
		);
		frame.appendChild(item);
		item.layoutSizingVertical = 'FILL';
	}
	return frame;
}

async function buildSelect(combo) {
	const open = combo.State === 'open';

	if (combo.Variant === 'ghost') {
		const ghost = row(8, { name: 'Select' });
		ghost.layoutSizingHorizontal = 'HUG';
		ghost.layoutSizingVertical = 'HUG';
		ghost.appendChild(
			await TXT('Updated today', 'Body/sm 14', 'color/fg-muted', { name: 'Label' })
		);
		const caret = buildCaretNode();
		if (open) caret.rotation = 180;
		ghost.appendChild(caret);
		return ghost;
	}

	const frame = row(10, { name: 'Select' });
	frame.resize(10, 36);
	frame.layoutSizingHorizontal = 'HUG';
	frame.layoutSizingVertical = 'FIXED';
	frame.primaryAxisAlignItems = 'CENTER';
	pad(frame, 0, 16);
	frame.fills = [];
	stroke(frame, 'color/hairline');
	pill(frame);

	// An option may carry a palette colour, drawn as a dot — an account's.
	const dot = figma.createEllipse();
	dot.name = 'Dot';
	dot.resize(8, 8);
	fill(dot, 'color/lime');
	frame.appendChild(dot);

	frame.appendChild(await TXT('Main', 'Body/sm 14', 'color/fg', { name: 'Label' }));
	const caret = buildCaretNode();
	if (open) caret.rotation = 180;
	frame.appendChild(caret);

	return frame;
}

async function stepControls() {
	const page = await pageNamed('Components');
	const node = section(page, 'Controls', 0, 1700, 1440, 100);
	const root = sheet(node, 'Controls', 1440);

	const grid = await shelf(
		root,
		'Controls',
		'Circular and dashed marks navigation; solid marks an action. Disabled, a rim turns to dashes and the glyph steps back: nowhere to go.'
	);

	grid.appendChild(
		await specimen(
			'PillButton',
			'Text actions and dropdown-style pickers.',
			await variantSet(
				'PillButton',
				combos({ Size: ['sm', 'md'], Caret: ['off', 'on'] }),
				buildPillButton,
				2,
				'Text actions and dropdown-style pickers. `caret` appends the solid triangle, which flips while the layer is open.'
			)
		)
	);

	grid.appendChild(
		await specimen(
			'IconButton',
			'Dashed is navigation, solid is an action.',
			await variantSet(
				'IconButton',
				combos({
					Size: ['sm', 'md', 'lg'],
					Style: ['solid', 'dashed'],
					State: ['default', 'disabled']
				}),
				buildIconButton,
				6,
				'Circular, hairline. `dashed` marks navigation (back, new tab); solid marks actions. Disabled, the rim turns to dashes and the glyph steps back to fg-subtle. Icon-only, so it always carries an aria-label.'
			)
		)
	);

	grid.appendChild(
		await specimen(
			'Checkbox',
			'A dash when some but not all are checked.',
			await variantSet(
				'Checkbox',
				combos({ State: ['unchecked', 'checked', 'indeterminate'], Disabled: ['no', 'yes'] }),
				buildCheckbox,
				3,
				'A hairline square that fills blue when checked, its check springing in; a dash when some but not all are. Name it with `label`, or a <label for> on its id.'
			)
		)
	);

	grid.appendChild(
		await specimen(
			'Switch',
			'Grey off, blue on.',
			await variantSet(
				'Switch',
				combos({ Checked: ['off', 'on'], Disabled: ['no', 'yes'] }),
				buildSwitch,
				2,
				'On or off: a hairline capsule, grey off and blue on, whose thumb springs across.'
			)
		)
	);

	grid.appendChild(
		await specimen(
			'Segmented',
			'A radio group: arrow keys move the choice.',
			await variantSet(
				'Segmented',
				[{ Selected: '1' }, { Selected: '2' }],
				buildSegmented,
				2,
				'A few short choices side by side in a sunken capsule; one raised surface slides to the chosen one. The item count varies with the choice it offers — this set shows two.'
			)
		)
	);

	grid.appendChild(
		await specimen(
			'Select',
			'A pill, or muted text tucked into a header.',
			await variantSet(
				'Select',
				combos({ Variant: ['pill', 'ghost'], State: ['closed', 'open'] }),
				buildSelect,
				2,
				'A trigger that opens a short list. `pill` wears the PillButton; `ghost` is muted text with a caret, for a filter tucked into a header. An option may carry a palette colour, drawn as a dot — an account’s.'
			)
		)
	);

	node.resizeWithoutConstraints(1440, root.height);
	return 'Controls: PillButton, IconButton, Checkbox, Switch, Segmented, Select.';
}
