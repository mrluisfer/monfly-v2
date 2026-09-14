/*
 * Atoms — the small marks the rest of the vocabulary is built from.
 * Components page, first shelf.
 */

/** The palette, and the weight its glyph takes on a white card (CategoryIcon). */
const PALETTE_TINT = {
	blue: '#495bff',
	violet: '#ac49ff',
	lime: '#b0ff09',
	sky: '#7ac8f5',
	teal: '#78d7d6',
	mint: '#91ebbb',
	lemon: '#faea89',
	peach: '#fdc495',
	coral: '#ffa189',
	rose: '#fa9fb4',
	pink: '#f4aedc',
	lavender: '#c1b3f2'
};

/**
 * `oklch(from <tint> 0.55 calc(c * 1.7) h)` resolved: the hue kept, the
 * lightness dropped and the chroma pushed, so a pastel reads as strongly on a
 * white card as a brand glyph — and lime stops being a special case.
 */
const PALETTE_GLYPH = {
	blue: '#4b00ff',
	violet: '#b100ff',
	lime: '#008f00',
	sky: '#007cc5',
	teal: '#008b8d',
	mint: '#009047',
	lemon: '#8f6f00',
	peach: '#af5600',
	coral: '#cc2d00',
	rose: '#c42e63',
	pink: '#ae4090',
	lavender: '#795bc0'
};

/** The logo's colours, with every color-mix() already resolved. */
const LOGO = {
	litA: '#495bff',
	litB: '#b0ff09',
	litMid: '#6bb9be',
	band: '#7f52ff',
	deep: '#433490'
};

// ── Shelf plumbing ─────────────────────────────────────────────────────────

/** A labelled slot on a shelf: what it is, what it's for, and the thing itself. */
async function specimen(label, note, node) {
	const cell = col(16, { name: label });
	const meta = col(4, { name: 'Meta' });
	meta.appendChild(await TXT(label, 'Body/sm medium 14', 'color/fg'));
	if (note) meta.appendChild(await TXT(note, 'Body/xs 12', 'color/fg-muted', { width: 300 }));
	cell.appendChild(meta);
	cell.appendChild(node);
	return cell;
}

/** A wrapping row of specimens under a heading. */
async function shelf(root, title, note) {
	const group = col(24, { name: title });
	root.appendChild(group);
	group.layoutSizingHorizontal = 'FILL';
	await heading(group, title, note);
	const grid = row(40, { name: 'Specimens' });
	grid.layoutWrap = 'WRAP';
	grid.counterAxisSpacing = 48;
	grid.counterAxisAlignItems = 'MIN';
	group.appendChild(grid);
	grid.layoutSizingHorizontal = 'FILL';
	return grid;
}

// ── The atoms ──────────────────────────────────────────────────────────────

function buildCaret() {
	// viewBox 12×8 drawn at size-2.5, so it keeps its own ratio rather than squashing.
	const node = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="6.667" viewBox="0 0 12 8"><path d="M1 1.2C1 0.6 1.5 0.2 2 0.5L6 3.2C6 3.2 6 3.2 6 3.2L10 0.5C10.5 0.2 11 0.6 11 1.2C11 1.4 10.9 1.6 10.8 1.7L6.6 6.9C6.3 7.3 5.7 7.3 5.4 6.9L1.2 1.7C1.1 1.6 1 1.4 1 1.2Z" fill="#000000"/></svg>`
	);
	node.name = 'Caret';
	node.fills = [];
	const paint = tokenPaint('color/fg');
	for (const child of node.findAll((n) => 'fills' in n && n.type !== 'FRAME'))
		child.fills = [paint];
	return toComponent(
		node,
		'Caret',
		'The solid triangle a dropdown-style pill wears. It flips while the layer is open.'
	);
}

async function buildKbd() {
	const cap = row(0, { name: 'Kbd' });
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

	const key = await TXT('G', 'Body/keycap 11', 'color/fg-muted', { name: 'Key' });
	cap.appendChild(key);

	const component = toComponent(
		cap,
		'Kbd',
		'One keycap of a shortcut, with a pressed-in bottom edge. Shortcuts are read from the hotkey registry.'
	);
	const propId = component.addComponentProperty('Key', 'TEXT', 'G');
	const text = component.findOne((n) => n.type === 'TEXT');
	if (text) text.componentPropertyReferences = { characters: propId };
	return component;
}

function buildSparkle() {
	const node = star(16, 'color/lime');
	return toComponent(
		node,
		'Sparkle',
		'The four-pointed star, in any palette colour — override the fill. Still by default, for lists and bullets; `animated` brings it alive in code.'
	);
}

/**
 * The blurred sphere. CSS puts the gradient's centre at 42%/38% and fades it
 * out by `reach`; here the same shape is an oversized ellipse clipped by a
 * round frame, which avoids hand-writing Figma's radial gradientTransform.
 */
function buildOrb(size, blurPx, reach, colorToken, name) {
	const frame = figma.createFrame();
	frame.name = name || 'Orb';
	frame.resize(size, size);
	frame.clipsContent = true;
	frame.fills = [];
	pill(frame);

	const cx = size * 0.42;
	const cy = size * 0.38;
	// CSS sizes the ray to the farthest corner, so the reach is measured against that.
	const ray = Math.hypot(Math.max(cx, size - cx), Math.max(cy, size - cy));
	const r = ray * (reach / 100);

	const ellipse = figma.createEllipse();
	ellipse.name = 'Bloom';
	ellipse.resize(r * 2, r * 2);
	ellipse.x = cx - r;
	ellipse.y = cy - r;

	// A gradient stop cannot be bound to a variable, so the colour is read from
	// the token's resolved value. Recolouring an orb is this one fill.
	const base = RESOLVED[colorToken] || { r: 0, g: 0, b: 0, a: 1 };
	const stop = (position, alpha) => ({
		position: position,
		color: { r: base.r, g: base.g, b: base.b, a: alpha }
	});

	ellipse.fills = [
		{
			type: 'GRADIENT_RADIAL',
			gradientTransform: [
				[1, 0, 0],
				[0, 1, 0]
			],
			gradientStops: [stop(0, 1), stop(0.55, 0.72), stop(1, 0)]
		}
	];

	frame.appendChild(ellipse);
	frame.effects = [{ type: 'LAYER_BLUR', radius: blurPx, visible: true }];
	return frame;
}

function buildLogo() {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="85" viewBox="0 0 256 170">
<defs>
<radialGradient id="a" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-93.94978 -1.31187 1.91351 -137.03592 119.07 85.05)"><stop stop-color="${LOGO.litA}"/><stop offset=".5" stop-color="${LOGO.litMid}"/><stop offset="1" stop-color="${LOGO.litB}"/></radialGradient>
<radialGradient id="b" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-50.24352 -14.35492 14.75776 -51.65347 180.635 22.73)"><stop stop-color="${LOGO.litA}"/><stop offset=".5" stop-color="${LOGO.litMid}"/><stop offset="1" stop-color="${LOGO.litB}"/></radialGradient>
<radialGradient id="c" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-50.24352 -14.35492 14.75776 -51.65347 180.635 159.67)"><stop stop-color="${LOGO.litA}"/><stop offset=".5" stop-color="${LOGO.litMid}"/><stop offset="1" stop-color="${LOGO.litB}"/></radialGradient>
<radialGradient id="d" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-45.96601 -20.03622 29.70752 -68.1534 226.095 157.52)"><stop stop-color="${LOGO.litA}"/><stop offset=".5" stop-color="${LOGO.litMid}"/><stop offset="1" stop-color="${LOGO.litB}"/></radialGradient>
<radialGradient id="e" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-45.96601 -20.03622 29.70752 -68.1534 226.095 31.103)"><stop stop-color="${LOGO.litA}"/><stop offset=".5" stop-color="${LOGO.litMid}"/><stop offset="1" stop-color="${LOGO.litB}"/></radialGradient>
<radialGradient id="f" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(29.90682 0 0 147.52703 229.683 83.74)"><stop stop-color="${LOGO.litB}"/><stop offset=".32" stop-color="${LOGO.litB}" stop-opacity="0"/><stop offset=".903" stop-color="${LOGO.litA}"/></radialGradient>
</defs>
<path d="M84.818 0c12.181 0 23.731 2.576 34.196 7.204-23.187 13.153-39.367 42.949-39.367 77.614 0 34.659 16.196 64.46 39.367 77.613a84.358 84.358 0 0 1-34.196 7.204C37.977 169.635 0 131.658 0 84.818 0 37.98 37.977 0 84.818 0Z" fill="url(#a)"/>
<path d="M151.704 32.693c-8.577-10.977-19.777-19.794-32.698-25.489C127.151 2.576 136.145 0 145.607 0c8.926 0 17.46 2.304 25.216 6.435-7.582 5.646-14.161 14.77-19.132 26.258h.013Z" fill="url(#b)"/>
<path d="M151.691 136.942c4.971 11.488 11.55 20.591 19.132 26.258-7.772 4.145-16.29 6.435-25.216 6.435-9.478 0-18.469-2.575-26.601-7.204 12.897-5.695 24.121-14.512 32.698-25.489h-.013Z" fill="url(#c)"/>
<path d="M79.639 84.818c0-34.665 16.196-64.461 39.367-77.614 12.897 5.695 24.121 14.512 32.698 25.489-6.244 14.389-9.959 32.47-9.959 52.125 0 19.646 3.729 37.735 9.959 52.119a85.129 85.129 0 0 1-32.698 25.494c-23.185-13.153-39.367-42.954-39.367-77.613Z" fill="${LOGO.band}"/>
<path d="M203.084 126.414c2.399 12.788 5.872 23.514 10.06 31.083-7.085 7.7-15.391 12.13-24.289 12.13-6.383 0-12.467-2.29-18.023-6.435 13.688-7.283 25.034-20.326 32.252-36.756v-.022Z" fill="url(#d)"/>
<path d="M170.832 6.435C176.388 2.29 182.472 0 188.855 0c8.885 0 17.191 4.433 24.289 12.132-4.175 7.566-7.648 18.287-10.06 31.075-7.218-16.438-18.564-29.476-32.252-36.756v-.016Z" fill="url(#e)"/>
<path d="M151.704 136.929c11.216-14.382 17.92-32.465 17.92-52.12 0-19.652-6.704-37.735-17.92-52.116 4.98-11.48 11.553-20.599 19.141-26.264 13.683 7.281 25.029 20.327 32.247 36.756-2.32 12.29-3.633 26.49-3.633 41.611 0 15.121 1.33 29.312 3.633 41.605-7.218 16.435-18.564 29.481-32.247 36.761-7.588-5.651-14.161-14.767-19.141-26.263v.03Z" fill="${LOGO.band}"/>
<path d="M151.696 136.942c-6.236-14.389-9.951-32.47-9.951-52.124 0-19.647 3.729-37.73 9.951-52.12 11.224 14.39 17.928 32.473 17.928 52.12 0 19.654-6.704 37.735-17.928 52.124Z" fill="${LOGO.deep}"/>
<path d="M213.144 12.132C217.4 4.433 222.38 0 227.724 0 243.343 0 256 37.98 256 84.818c0 46.84-12.657 84.817-28.276 84.817-5.331 0-10.324-4.438-14.58-12.132 13.682-14.85 22.837-41.828 22.837-72.685 0-30.855-9.155-57.85-22.837-72.686Z" fill="${LOGO.litB}"/>
<path d="M213.144 12.132C217.4 4.433 222.38 0 227.724 0 243.343 0 256 37.98 256 84.818c0 46.84-12.657 84.817-28.276 84.817-5.331 0-10.324-4.438-14.58-12.132 13.682-14.85 22.837-41.828 22.837-72.685 0-30.855-9.155-57.85-22.837-72.686Z" fill="url(#f)"/>
<path d="M211.58 84.826c0-15.13-3.087-29.321-8.496-41.611 2.399-12.79 5.872-23.508 10.068-31.077 13.68 14.835 22.834 41.847 22.834 72.688 0 30.832-9.154 57.849-22.834 72.685-4.183-7.574-7.648-18.295-10.068-31.083 5.396-12.29 8.496-26.481 8.496-41.602Z" fill="${LOGO.band}"/>
<path d="M203.084 126.423c-2.317-12.293-3.634-26.484-3.634-41.605 0-15.127 1.33-29.321 3.634-41.611 5.396 12.29 8.496 26.484 8.496 41.611 0 15.121-3.087 29.312-8.496 41.605Z" fill="${LOGO.deep}"/>
</svg>`;
	const node = figma.createNodeFromSvg(svg);
	node.name = 'Logo';
	node.fills = [];
	return toComponent(
		node,
		'Logo',
		'The mark. In code every colour derives from the brand tokens (blue → lime lit faces, a blue/violet band, that band mixed into ink for the deep faces); here those color-mix() results are baked, so recolouring the brand means rebuilding this component.'
	);
}

async function buildCategoryIcon() {
	const chip = row(0, { name: 'CategoryIcon' });
	chip.resize(28, 28);
	chip.layoutSizingHorizontal = 'FIXED';
	chip.layoutSizingVertical = 'FIXED';
	chip.primaryAxisAlignItems = 'CENTER';
	chip.counterAxisAlignItems = 'CENTER';
	chip.fills = [solid(PALETTE_TINT.lavender, 0.15)];
	radius(chip, 'radius/lg');

	const glyph = icon('tag', 16, 'color/fg', 1.75);
	glyph.name = 'Glyph';
	for (const child of glyph.findAll((n) => 'strokes' in n && n.strokes.length > 0)) {
		child.strokes = [solid(PALETTE_GLYPH.lavender)];
	}
	chip.appendChild(glyph);

	return toComponent(
		chip,
		'CategoryIcon',
		"A category's glyph in a chip tinted with its colour, at the head of a row. The tint is the colour at 15% and the glyph is that colour taken to one weight for all twelve — hue kept, lightness dropped, chroma pushed. Decorative: the name is the column beside it."
	);
}

function buildAvatar() {
	const frame = figma.createFrame();
	frame.name = 'Avatar';
	frame.resize(40, 40);
	frame.clipsContent = true;
	pill(frame);
	fill(frame, 'color/sunken');
	stroke(frame, 'color/line');

	const bloom = buildOrb(40, 8, 78, 'color/pastel-lavender', 'Face');
	bloom.effects = [{ type: 'LAYER_BLUR', radius: 8, visible: true }];
	frame.appendChild(bloom);

	return toComponent(
		frame,
		'Avatar',
		'A stand-in. The real avatar is a blobatar generated at runtime from the person’s seed (@blobatar/svelte) — deterministic, and never an image request that leaves the app — so it cannot be drawn here. Use it for placement and size only.'
	);
}

function buildGlyphs() {
	const names = Object.keys(LUCIDE).sort();
	const made = [];
	for (const name of names) {
		const frame = figma.createFrame();
		frame.name = name;
		frame.resize(16, 16);
		frame.fills = [];
		const glyph = icon(name, 16, 'color/fg', 1.5);
		frame.appendChild(glyph);
		made.push(
			toComponent(
				frame,
				`Glyph/${name}`,
				`Lucide "${name}", at 16 with stroke 1.5 — the app's default.`
			)
		);
	}
	return made;
}

async function stepAtoms() {
	const page = await pageNamed('Components');
	const node = section(page, 'Atoms', 0, 0, 1440, 100);
	const root = sheet(node, 'Atoms', 1440);

	const marks = await shelf(
		root,
		'Marks',
		'The small shapes the rest is built from. Sparkle and Orb take any palette colour — override the fill rather than making a variant per colour.'
	);
	marks.appendChild(
		await specimen('Logo', 'Brand mark. Its colours are baked from the brand tokens.', buildLogo())
	);
	marks.appendChild(
		await specimen('Sparkle', 'Four-pointed star. Lime by default.', buildSparkle())
	);
	marks.appendChild(
		await specimen(
			'Orb',
			'The blurred sphere. An account’s colour, everywhere.',
			toComponent(
				buildOrb(48, 10, 62, 'color/blue'),
				'Orb',
				'The blurred gradient sphere, in any palette colour — override the Bloom fill. `editable` makes it a button that opens the palette.'
			)
		)
	);
	marks.appendChild(await specimen('Caret', 'A dropdown pill’s triangle.', buildCaret()));
	marks.appendChild(
		await specimen('Avatar', 'Placement only — see the description.', buildAvatar())
	);
	marks.appendChild(await specimen('Kbd', 'One keycap of a shortcut.', await buildKbd()));
	marks.appendChild(
		await specimen(
			'CategoryIcon',
			'A category’s glyph in its tinted chip.',
			await buildCategoryIcon()
		)
	);

	const glyphs = await shelf(
		root,
		'Glyphs',
		'Every Lucide glyph the app imports, drawn from the same path data @lucide/svelte ships. Swap one into any icon slot.'
	);
	for (const component of buildGlyphs()) glyphs.appendChild(component);

	node.resizeWithoutConstraints(1440, root.height);
	return `Atoms: 7 marks, ${Object.keys(LUCIDE).length} glyphs.`;
}
