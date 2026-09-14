/*
 * Surfaces — the white shapes, and the layers that float over them.
 * Separation is the gap, not a border; only floating layers wear a rule.
 */

/** A card: the white surface, with a padded slot for whatever it holds. */
function cardFrame(width, height, padding) {
	const frame = col(0, { name: 'Card' });
	frame.resize(width, height);
	frame.layoutSizingHorizontal = 'FIXED';
	frame.layoutSizingVertical = 'FIXED';
	pad(frame, padding === undefined ? 28 : padding);
	fill(frame, 'color/card');
	radius(frame, 'radius/card');
	return frame;
}

async function buildCard() {
	const frame = cardFrame(360, 220, 28);

	const header = row(16, { name: 'Header' });
	header.primaryAxisAlignItems = 'SPACE_BETWEEN';
	header.appendChild(await TXT('Where it went', 'Display/Card title 24', 'color/fg'));
	frame.appendChild(header);
	header.layoutSizingHorizontal = 'FILL';

	const slot = figma.createFrame();
	slot.name = 'Content';
	slot.fills = [];
	slot.resize(304, 120);
	frame.appendChild(slot);
	slot.layoutSizingHorizontal = 'FILL';
	slot.layoutSizingVertical = 'FILL';

	return toComponent(
		frame,
		'Card',
		'The white surface. Separation is the gap, never a border. When a card holds less than its cell, keep it full-size and anchor the content: header row on top (title left, action right), content at the bottom.'
	);
}

const BADGE_TONE = {
	positive: { color: 'color/positive', glyph: 'check', words: 'Moved 3 to Main' },
	negative: { color: 'color/negative', glyph: 'x', words: 'Over by $42.10' },
	neutral: { color: 'color/fg-muted', glyph: 'trending-up', words: '+12% this month' }
};

async function buildBadge(combo) {
	const tone = BADGE_TONE[combo.Tone];

	const frame = row(8, { name: 'Badge' });
	frame.layoutSizingHorizontal = 'HUG';
	frame.layoutSizingVertical = 'HUG';
	pad(frame, 4, 10);
	radius(frame, 'radius/lg');
	// Mixed onto the card rather than laid over it: the tint at 12%, or the
	// flat sunken ground when the badge is only news.
	if (combo.Tone === 'neutral') fill(frame, 'color/sunken');
	else fill(frame, tone.color, 0.12);

	frame.appendChild(icon(tone.glyph, 14, tone.color, 1.75));
	frame.appendChild(await TXT(tone.words, 'Body/sm medium 14', tone.color, { name: 'Words' }));
	return frame;
}

function tooltipArrow(pointingDown) {
	const node = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="7" viewBox="0 0 12 7"><path d="M0 0 L6 6 L12 0 Z" fill="#ffffff"/><path d="M0 0.5 L6 6.5 L12 0.5" fill="none" stroke="#e6e6ea" stroke-width="1"/></svg>`
	);
	node.name = 'Arrow';
	node.fills = [];
	for (const child of node.findAll((n) => n.type === 'VECTOR')) {
		if (child.fills && child.fills.length) child.fills = [tokenPaint('color/card')];
		if (child.strokes && child.strokes.length) child.strokes = [tokenPaint('color/line')];
	}
	if (!pointingDown) node.rotation = 180;
	return node;
}

async function buildTooltip(combo) {
	const stack = col(-1, { name: 'Tooltip' });
	stack.counterAxisAlignItems = 'CENTER';
	stack.fills = [];

	const bubble = row(0, { name: 'Bubble' });
	bubble.layoutSizingHorizontal = 'HUG';
	bubble.layoutSizingVertical = 'HUG';
	pad(bubble, 6, 10);
	fill(bubble, 'color/card');
	stroke(bubble, 'color/line');
	radius(bubble, 'radius/lg');
	bubble.effectStyleId = ES['Elevation/Floating layer'] || '';
	bubble.appendChild(await TXT('27% of the monthly budget', 'Body/xs 12', 'color/fg'));

	// The arrow is part of the surface, tucked a pixel under the border so the two join.
	if (combo.Side === 'top') {
		stack.appendChild(bubble);
		stack.appendChild(tooltipArrow(true));
	} else {
		stack.appendChild(tooltipArrow(false));
		stack.appendChild(bubble);
	}
	return stack;
}

/** Menu accents follow meaning, not decoration. */
const MENU_ITEMS = [
	{ label: 'Profile', glyph: 'eye', accent: 'color/blue', keys: 'G P' },
	{ label: 'Settings', glyph: 'settings', accent: 'color/violet', keys: 'G S' },
	{ label: 'Notifications', glyph: 'bell', accent: 'color/lime', keys: '', note: 'Soon' },
	{ separator: true },
	{ label: 'Log out', glyph: 'log-out', accent: 'color/negative', keys: '' }
];

async function buildMenu() {
	const surface = col(0, { name: 'Menu' });
	surface.resize(248, 10);
	surface.layoutSizingHorizontal = 'FIXED';
	surface.layoutSizingVertical = 'HUG';
	pad(surface, 6);
	fill(surface, 'color/card');
	stroke(surface, 'color/line');
	radius(surface, 'radius/chip');
	surface.effectStyleId = ES['Elevation/Floating layer'] || '';

	for (const item of MENU_ITEMS) {
		if (item.separator) {
			const rule = figma.createFrame();
			rule.name = 'Separator';
			rule.resize(236, 1);
			fill(rule, 'color/line');
			surface.appendChild(rule);
			rule.layoutSizingHorizontal = 'FILL';
			rule.layoutSizingVertical = 'FIXED';
			pad(rule, 0);
			surface.itemSpacing = 6;
			continue;
		}

		const line = row(10, { name: item.label });
		line.resize(236, 40);
		line.layoutSizingVertical = 'FIXED';
		pad(line, 0, 6);
		radius(line, 'radius/menu-item');
		// The highlight is the sunken ground; the resting row has none.
		if (item.label === 'Profile') fill(line, 'color/sunken');
		else line.fills = [];

		const chip = row(0, { name: 'Chip' });
		chip.resize(28, 28);
		chip.layoutSizingHorizontal = 'FIXED';
		chip.layoutSizingVertical = 'FIXED';
		chip.primaryAxisAlignItems = 'CENTER';
		chip.counterAxisAlignItems = 'CENTER';
		radius(chip, 'radius/lg');
		fill(chip, item.note ? 'color/fg-subtle' : item.accent, 0.15);
		chip.appendChild(icon(item.glyph, 16, item.note ? 'color/fg-subtle' : item.accent, 1.75));
		line.appendChild(chip);

		const label = await TXT(item.label, 'Body/sm 14', item.note ? 'color/fg-subtle' : 'color/fg');
		line.appendChild(label);
		label.layoutGrow = 1;

		if (item.note) line.appendChild(await TXT(item.note, 'Body/xs 12', 'color/fg-subtle'));
		if (item.keys) {
			const keys = row(4, { name: 'Kbd' });
			for (const key of item.keys.split(' ')) {
				const cap = row(0, { name: 'Key' });
				cap.resize(20, 20);
				cap.layoutSizingHorizontal = 'HUG';
				cap.layoutSizingVertical = 'FIXED';
				cap.primaryAxisAlignItems = 'CENTER';
				cap.minWidth = 20;
				pad(cap, 0, 4);
				fill(cap, 'color/sunken');
				stroke(cap, 'color/line');
				radius(cap, 'radius/md');
				cap.effectStyleId = ES['Elevation/Keycap edge'] || '';
				cap.appendChild(await TXT(key, 'Body/keycap 11', 'color/fg-muted'));
				keys.appendChild(cap);
			}
			line.appendChild(keys);
		}

		surface.appendChild(line);
		line.layoutSizingHorizontal = 'FILL';
	}

	surface.itemSpacing = 2;
	return toComponent(
		surface,
		'Menu',
		'The floating menu surface. Items h-10 rounded-[0.625rem], highlight bg-sunken. Each icon sits in a size-7 chip tinted with its accent, and accents follow meaning: blue for you (profile), violet for configuration (settings), lime for what’s new, negative for leaving. Shortcuts right-aligned; a disabled item greys its chip and says why.'
	);
}

async function buildCardTabs() {
	const wrapper = col(0, { name: 'CardTabs' });
	wrapper.resize(360, 240);
	wrapper.layoutSizingHorizontal = 'FIXED';
	wrapper.layoutSizingVertical = 'FIXED';
	wrapper.fills = [];

	// The strip is inset by the card's own radius, where its top edge stops
	// curving, so the open tab meets a straight edge.
	const strip = row(6, { name: 'Strip' });
	strip.resize(360, 40);
	strip.layoutSizingVertical = 'FIXED';
	strip.counterAxisAlignItems = 'MAX';
	pad(strip, 0, 0, 0, 24);
	strip.fills = [];
	wrapper.appendChild(strip);
	strip.layoutSizingHorizontal = 'FILL';

	for (const [label, open] of [
		['Tips', true],
		['Loans', false]
	]) {
		const tab = row(0, { name: label });
		tab.resize(10, open ? 40 : 36);
		tab.layoutSizingHorizontal = 'HUG';
		tab.layoutSizingVertical = 'FIXED';
		tab.primaryAxisAlignItems = 'CENTER';
		tab.counterAxisAlignItems = 'CENTER';
		pad(tab, 0, 16);
		// The open tab is card-coloured, a touch taller and square at the foot,
		// so it reads as the card's own top edge.
		if (open) {
			fill(tab, 'color/card');
			tab.topLeftRadius = 16;
			tab.topRightRadius = 16;
			tab.bottomLeftRadius = 0;
			tab.bottomRightRadius = 0;
		} else {
			fill(tab, 'color/sunken');
			radius(tab, 'radius/chip');
		}
		tab.appendChild(await TXT(label, 'Body/sm 14', open ? 'color/fg' : 'color/fg-muted'));
		strip.appendChild(tab);
	}

	const panel = cardFrame(360, 200, 28);
	panel.name = 'Panel';
	wrapper.appendChild(panel);
	panel.layoutSizingHorizontal = 'FILL';
	panel.layoutSizingVertical = 'FILL';

	return toComponent(
		wrapper,
		'CardTabs',
		'A card under a small strip of tabs, the header’s in miniature: the open tab is card-coloured, a touch taller and square at the foot, so it reads as the card’s own top edge. Arrow keys move between tabs.'
	);
}

async function stepSurfaces() {
	const page = await pageNamed('Components');
	const node = section(page, 'Surfaces and layers', 0, 2900, 1440, 100);
	const root = sheet(node, 'Surfaces and layers', 1440);

	const grid = await shelf(
		root,
		'Surfaces and layers',
		'Cards read as white shapes on the grey canvas. Only a floating layer wears a rule: rounded-[var(--radius-chip)], border-line, bg-card, shadow-lg — and it opens on the side that doesn’t cover what it explains.'
	);

	grid.appendChild(await specimen('Card', 'The white surface.', await buildCard()));
	grid.appendChild(
		await specimen('CardTabs', 'A card under a strip of tabs.', await buildCardTabs())
	);
	grid.appendChild(
		await specimen(
			'Badge',
			'Says something happened.',
			await variantSet(
				'Badge',
				[{ Tone: 'positive' }, { Tone: 'negative' }, { Tone: 'neutral' }],
				buildBadge,
				1,
				'A tinted chip that says something happened: its tint mixed onto the card, a Lucide icon at its head, figures in full weight. A new `burst` plays it again, so a notice updates in place rather than a second one turning up.'
			)
		)
	);
	grid.appendChild(
		await specimen(
			'Tooltip',
			'Points at the exact thing it describes.',
			await variantSet(
				'Tooltip',
				[{ Side: 'top' }, { Side: 'bottom' }],
				buildTooltip,
				1,
				'A label, or rich content. Its arrow is part of the surface — filled with the card, its two edges in the border’s line, tucked 1px under the border so the two join. Anchor it to the exact point it describes.'
			)
		)
	);
	grid.appendChild(await specimen('Menu', 'The account menu.', await buildMenu()));

	node.resizeWithoutConstraints(1440, root.height);
	return 'Surfaces: Card, CardTabs, Badge, Tooltip, Menu.';
}
