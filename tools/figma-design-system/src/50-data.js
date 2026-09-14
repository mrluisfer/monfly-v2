/*
 * Data marks — how a figure, a share and a date are drawn. Money is always to
 * the cent; only chart labels go compact, and their tooltip gives the exact one.
 */

/**
 * The diagonal stripe that marks room left over rather than a holding.
 * Authored in CSS as `repeating-linear-gradient(-45deg, hatch 0 1px, transparent 1px 6px)`;
 * 6px measured perpendicular to the stripe is 6·√2 along the x axis.
 */
const HATCH_STEP = 6 * Math.SQRT2;

function hatchNode(width, height, color) {
	const lines = [];
	for (let d = -height; d < width + height; d += HATCH_STEP) {
		lines.push(
			`<line x1="${d.toFixed(2)}" y1="${height}" x2="${(d + height).toFixed(2)}" y2="0" stroke="#000000" stroke-width="1"/>`
		);
	}
	const node = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${lines.join('')}</svg>`
	);
	node.name = 'Hatch';
	node.fills = [];
	const paint = tokenPaint(color || 'color/hatch');
	for (const child of node.findAll((n) => 'strokes' in n && n.strokes.length > 0))
		child.strokes = [paint];
	return node;
}

const FIGURE_STYLE = {
	sm: 'Figure/sm 24',
	md: 'Figure/md 32',
	lg: 'Figure/lg 44',
	xl: 'Figure/xl 56'
};

async function buildFigure(combo) {
	const node = figma.createText();
	node.characters = '$12,435.00';
	await node.setTextStyleIdAsync(styleId(FIGURE_STYLE[combo.Size]));
	fill(node, 'color/fg');
	node.name = 'Figure';
	// `accentSymbol` colours the currency sign, as the mockup's Sales figure does.
	if (combo.Accent !== 'none') node.setRangeFills(0, 1, [tokenPaint(`color/${combo.Accent}`)]);
	return node;
}

const METER_WIDTH = 320;
const METER_VALUE = 0.62;

async function buildMeter() {
	const wrapper = figma.createFrame();
	wrapper.name = 'Meter';
	wrapper.resize(METER_WIDTH, 52);
	wrapper.fills = [];
	wrapper.clipsContent = false;

	const track = figma.createFrame();
	track.name = 'Track';
	track.resize(METER_WIDTH, 36);
	track.y = 16;
	track.clipsContent = true;
	track.fills = [];
	stroke(track, 'color/hairline');
	pill(track);
	track.appendChild(hatchNode(METER_WIDTH, 36, 'color/hatch'));
	wrapper.appendChild(track);

	// The fill starts a full track-height left of the track, hidden by the clip,
	// so it is never narrower than it is tall — a capsule that squashes into an
	// oval whose curve no longer matches the track's.
	const bar = figma.createFrame();
	bar.name = 'Fill';
	bar.resize(METER_WIDTH * METER_VALUE + 36, 36);
	bar.x = -36;
	bar.y = 0;
	bar.clipsContent = true;
	fill(bar, 'color/card');
	stroke(bar, 'color/hairline');
	pill(bar);
	const bloom = buildOrb(72, 12, 90, 'color/lime', 'Bloom');
	bloom.x = bar.width - 60;
	bloom.y = -18;
	bar.appendChild(bloom);
	track.appendChild(bar);

	// The marker pin rides the fill boundary, above the track.
	const pin = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="18" viewBox="0 0 10 18"><path d="M5 18C5 18 9.5 9.8 9.5 5.2C9.5 2.3 7.5 0 5 0C2.5 0 0.5 2.3 0.5 5.2C0.5 9.8 5 18 5 18Z" fill="#000000"/></svg>`
	);
	pin.name = 'Pin';
	pin.fills = [];
	for (const child of pin.findAll((n) => 'fills' in n && n.type !== 'FRAME'))
		child.fills = [tokenPaint('color/fg')];
	pin.x = METER_WIDTH * METER_VALUE - 5;
	pin.y = 0;
	wrapper.appendChild(pin);

	return toComponent(
		wrapper,
		'Meter',
		'Hatched track, white capsule fill, pin on the boundary. role="meter", with aria-valuetext in words and an optional details tooltip that points at the fill’s end and opens below the bar.'
	);
}

const SHARE_SEGMENTS = [
	{ share: 0.42, color: 'color/lime' },
	{ share: 0.27, color: 'color/blue' },
	{ share: 0.16, color: 'color/pastel-lavender' },
	{ share: 0.09, color: null }
];

async function buildShareBar(combo) {
	const width = 320;
	const height = 12;
	const hatched = combo.Track === 'hatch';

	const bar = row(2, { name: 'ShareBar' });
	bar.resize(width, height);
	bar.layoutSizingHorizontal = 'FIXED';
	bar.layoutSizingVertical = 'FIXED';
	bar.clipsContent = true;
	pill(bar);

	if (hatched) {
		bar.fills = [];
		stroke(bar, 'color/hairline');
	} else {
		fill(bar, 'color/sunken');
	}

	for (const segment of SHARE_SEGMENTS) {
		const slice = figma.createFrame();
		slice.name = segment.color ? 'Slice' : 'Unknown';
		slice.resize(Math.max(4, width * segment.share), height);
		slice.clipsContent = true;
		pill(slice);

		if (segment.color) {
			fill(slice, segment.color);
			// The gradient that lightens to the right, as one sheet over the colour,
			// so recolouring a segment is one fill rather than two gradient stops.
			const sheen = figma.createRectangle();
			sheen.name = 'Lighten';
			sheen.resize(slice.width, height);
			sheen.fills = [
				{
					type: 'GRADIENT_LINEAR',
					gradientTransform: [
						[1, 0, 0],
						[0, 1, 0]
					],
					gradientStops: [
						{ position: 0, color: { r: 1, g: 1, b: 1, a: 0 } },
						{ position: 1, color: { r: 1, g: 1, b: 1, a: 0.45 } }
					]
				}
			];
			slice.appendChild(sheen);
		} else {
			// A segment with no colour is a gap, not a holding: hatch inside a hairline.
			slice.fills = [];
			stroke(slice, 'color/hairline');
			slice.appendChild(hatchNode(slice.width, height, 'color/hatch'));
		}

		bar.appendChild(slice);
		slice.layoutSizingVertical = 'FILL';
		slice.layoutGrow = segment.share;
	}

	return bar;
}

async function buildSortHeader(combo) {
	const active = combo.State !== 'idle';
	const frame = row(6, { name: 'SortHeader' });
	frame.layoutSizingHorizontal = 'HUG';
	frame.layoutSizingVertical = 'HUG';

	const label = await TXT('Amount', 'Body/sm 14', active ? 'color/fg' : 'color/fg-muted');
	// One arrow that turns over, rather than two that swap.
	const arrow = icon('arrow-up', 14, active ? 'color/fg' : 'color/fg-muted', 1.75);
	if (combo.State === 'desc') arrow.rotation = 180;
	if (!active) arrow.opacity = 0;

	// Right-aligned columns read label-last, so the arrow stays beside the figures.
	if (combo.Align === 'right') {
		frame.appendChild(arrow);
		frame.appendChild(label);
	} else {
		frame.appendChild(label);
		frame.appendChild(arrow);
	}
	return frame;
}

async function buildDateLabel(combo) {
	const open = combo.State === 'hovered';
	const frame = row(0, { name: 'DateLabel' });
	frame.layoutSizingHorizontal = 'HUG';
	frame.layoutSizingVertical = 'HUG';
	pad(frame, 2, open ? 4 : 0);
	radius(frame, 'radius/md');
	// Behind the whole date it wears the hovered row's own ground, only so what
	// it passes over doesn't show through. No rim, no surface of its own.
	if (open) fill(frame, 'color/sunken');
	else frame.fills = [];

	frame.appendChild(
		await TXT(open ? 'September 2, 2026 · 4:45 PM' : 'Sep 2', 'Body/sm 14', 'color/fg')
	);
	return frame;
}

async function stepData() {
	const page = await pageNamed('Components');
	const node = section(page, 'Data', 0, 4200, 1440, 100);
	const root = sheet(node, 'Data', 1440);

	const grid = await shelf(
		root,
		'Data',
		'A figure never spills or truncates: where there is room to take it grows, and where there isn’t it shrinks just enough to fit. A table column holds one thing, and every table names its columns.'
	);

	grid.appendChild(
		await specimen(
			'Figure',
			'Display numbers; the accent colours the symbol.',
			await variantSet(
				'Figure',
				combos({ Size: ['sm', 'md', 'lg', 'xl'], Accent: ['none', 'lime', 'blue', 'violet'] }),
				buildFigure,
				4,
				'Display numbers, tabular so they never reflow mid-tween. `accentSymbol` colours the currency sign. Money always to the cent, in the currency’s home locale; a missing value shows —.'
			)
		)
	);

	grid.appendChild(
		await specimen('Meter', 'Hatched track, capsule fill, pin on the boundary.', await buildMeter())
	);

	grid.appendChild(
		await specimen(
			'ShareBar',
			'Each segment as long as its share.',
			await variantSet(
				'ShareBar',
				[{ Track: 'sunken' }, { Track: 'hatch' }],
				buildShareBar,
				1,
				'A rounded bar of coloured segments, each as long as its share, lightening to the right, with a soft light crossing it every 7s. `sunken` is for segments that fill the track; `hatch` is for a track where the rest is room. A segment with no colour is hatched — a gap, not a holding. Decorative.'
			)
		)
	);

	grid.appendChild(
		await specimen(
			'SortHeader',
			'Names a column and orders by it.',
			await variantSet(
				'SortHeader',
				combos({ State: ['idle', 'asc', 'desc'], Align: ['left', 'right'] }),
				buildSortHeader,
				3,
				'The control that names a column and orders by it: the label, and one arrow that turns over rather than two that swap — quiet until the column is the one in force. It holds no state.'
			)
		)
	);

	grid.appendChild(
		await specimen(
			'DateLabel',
			'The whole date unrolls out of the short one.',
			await variantSet(
				'DateLabel',
				[{ State: 'default' }, { State: 'hovered' }],
				buildDateLabel,
				1,
				'A date in a table: "Sep 2" (with its year when it isn’t this one), and under the pointer the whole of it, unrolling left to right. Plain text laid exactly over the short one — no rim, nothing that reads as a surface. Out of the flow, so no row reflows and no column keeps room for it.'
			)
		)
	);

	node.resizeWithoutConstraints(1440, root.height);
	return 'Data: Figure, Meter, ShareBar, SortHeader, DateLabel.';
}
