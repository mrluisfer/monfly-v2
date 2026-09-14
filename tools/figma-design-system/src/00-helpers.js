/*
 * Shared ground. Everything below builds on these: tokens looked up by name
 * (never by id, so the plugin survives a rebuilt file), auto-layout frames with
 * the default white fill cleared, and text that always carries a style.
 */

/** The four faces the system uses. Loaded once, before anything writes text. */
const FONTS = [
	{ family: 'Space Grotesk', style: 'Light' },
	{ family: 'Space Grotesk', style: 'Medium' },
	{ family: 'Outfit', style: 'Regular' },
	{ family: 'Outfit', style: 'Medium' }
];

/** name → Variable, name → style id. Filled by `loadTokens`. */
const V = {};
const TS = {};
const ES = {};
/**
 * name → the RGBA a colour token resolves to. Gradient stops cannot carry a
 * variable the way a solid paint can, so the few gradients here read their
 * colour from this instead.
 */
const RESOLVED = {};

async function loadTokens() {
	for (const font of FONTS) await figma.loadFontAsync(font);

	for (const key of Object.keys(V)) delete V[key];
	for (const key of Object.keys(RESOLVED)) delete RESOLVED[key];

	const all = await figma.variables.getLocalVariablesAsync();
	const byId = {};
	for (const variable of all) {
		V[variable.name] = variable;
		byId[variable.id] = variable;
	}

	const mode = {};
	for (const collection of await figma.variables.getLocalVariableCollectionsAsync()) {
		mode[collection.id] = collection.defaultModeId;
	}

	// Semantic tokens alias primitives, so this walks the chain to the raw value.
	const resolve = (variable, depth) => {
		if (depth > 8) return null;
		const value = variable.valuesByMode[mode[variable.variableCollectionId]];
		if (value && value.type === 'VARIABLE_ALIAS') {
			const next = byId[value.id];
			return next ? resolve(next, depth + 1) : null;
		}
		return value;
	};
	for (const variable of all) {
		if (variable.resolvedType === 'COLOR') RESOLVED[variable.name] = resolve(variable, 0);
	}

	for (const style of await figma.getLocalTextStylesAsync()) TS[style.name] = style.id;
	for (const style of await figma.getLocalEffectStylesAsync()) ES[style.name] = style.id;

	const missing = ['color/card', 'color/hairline', 'radius/full'].filter((n) => !V[n]);
	if (missing.length) {
		throw new Error(
			`Foundations are missing (${missing.join(', ')}). This plugin expects the Monfly v2 design system file, where the variables already exist.`
		);
	}
}

/** A token by name, with a readable error rather than `undefined` downstream. */
function token(name) {
	const variable = V[name];
	if (!variable) throw new Error(`No variable named "${name}"`);
	return variable;
}

function styleId(name) {
	const id = TS[name];
	if (!id) throw new Error(`No text style named "${name}"`);
	return id;
}

// ── Paint ──────────────────────────────────────────────────────────────────

/** A paint bound to a colour token: the fill follows the variable, not a copy. */
function tokenPaint(name, opacity) {
	const paint = figma.variables.setBoundVariableForPaint(
		{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: opacity === undefined ? 1 : opacity },
		'color',
		token(name)
	);
	return paint;
}

function fill(node, name, opacity) {
	node.fills = [tokenPaint(name, opacity)];
	return node;
}

function stroke(node, name, weight) {
	node.strokes = [tokenPaint(name)];
	node.strokeWeight = weight === undefined ? 1 : weight;
	node.strokeAlign = 'INSIDE';
	return node;
}

/** A literal colour, for the few places a token would be a lie (the logo's gradient stops). */
function hex(value, alpha) {
	return {
		r: parseInt(value.slice(1, 3), 16) / 255,
		g: parseInt(value.slice(3, 5), 16) / 255,
		b: parseInt(value.slice(5, 7), 16) / 255,
		a: alpha === undefined ? 1 : alpha
	};
}

function solid(value, alpha) {
	const { r, g, b, a } = hex(value, alpha);
	return { type: 'SOLID', color: { r, g, b }, opacity: a };
}

const CORNERS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];

function radius(node, name) {
	const variable = token(name);
	for (const corner of CORNERS) node.setBoundVariable(corner, variable);
	return node;
}

/** A pill: bound to radius/full, which is larger than any control here. */
function pill(node) {
	return radius(node, 'radius/full');
}

// ── Layout ─────────────────────────────────────────────────────────────────

/**
 * An auto-layout frame with the default white fill cleared — a container, not a
 * surface. Anything that should paint says so with `fill()`.
 *
 * Written against the plain Plugin API on purpose: `figma.createAutoLayout` is
 * a convenience of the MCP sandbox and does not exist in a plugin.
 */
function AL(direction, options) {
	const opts = options || {};
	const frame = figma.createFrame();
	frame.layoutMode = direction;
	frame.primaryAxisSizingMode = 'AUTO';
	frame.counterAxisSizingMode = 'AUTO';
	frame.clipsContent = false;
	frame.fills = [];
	if (opts.name) frame.name = opts.name;
	if (opts.itemSpacing !== undefined) frame.itemSpacing = opts.itemSpacing;
	return frame;
}

function row(gap, options) {
	const frame = AL('HORIZONTAL', Object.assign({ itemSpacing: gap }, options || {}));
	frame.counterAxisAlignItems = 'CENTER';
	return frame;
}

function col(gap, options) {
	return AL('VERTICAL', Object.assign({ itemSpacing: gap }, options || {}));
}

function pad(frame, top, right, bottom, left) {
	frame.paddingTop = top;
	frame.paddingRight = right === undefined ? top : right;
	frame.paddingBottom = bottom === undefined ? top : bottom;
	frame.paddingLeft = left === undefined ? (right === undefined ? top : right) : left;
	return frame;
}

// ── Text ───────────────────────────────────────────────────────────────────

/**
 * Text that always carries a style and a bound colour. `width` makes it wrap:
 * a wrapping block needs an explicit width and HEIGHT auto-resize, or it
 * collapses to a thread.
 */
async function TXT(characters, style, color, options) {
	const node = figma.createText();
	node.characters = characters;
	await node.setTextStyleIdAsync(styleId(style));
	fill(node, color || 'color/fg');
	const opts = options || {};
	if (opts.width) {
		node.textAutoResize = 'HEIGHT';
		node.resize(opts.width, node.height);
	}
	if (opts.align) node.textAlignHorizontal = opts.align;
	if (opts.name) node.name = opts.name;
	return node;
}

// ── Icons ──────────────────────────────────────────────────────────────────

/**
 * A Lucide glyph, at the size and stroke the app draws it. SVG stroke-width is
 * in viewBox units, so it is scaled up here by 24/size to land on the intended
 * pixel weight once Figma maps the viewBox onto the frame.
 */
function icon(name, size, color, strokeWidth) {
	const body = LUCIDE[name];
	if (!body) throw new Error(`No Lucide glyph named "${name}" — add it to ICONS in build.mjs`);

	const px = size || 16;
	const weight = (strokeWidth === undefined ? 1.5 : strokeWidth) * (24 / px);
	const node = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="${weight}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
	);
	node.name = name;
	node.fills = [];

	const paint = tokenPaint(color || 'color/fg');
	for (const child of node.findAll((n) => 'strokes' in n && n.strokes.length > 0)) {
		child.strokes = [paint];
	}
	return node;
}

/** The four-pointed star, shared by Sparkle and the expenses dial's hub. */
const STAR_PATH =
	'M12 0C12 6.6 17.4 12 24 12C17.4 12 12 17.4 12 24C12 17.4 6.6 12 0 12C6.6 12 12 6.6 12 0Z';

function star(size, color) {
	const node = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${STAR_PATH}" fill="#000000"/></svg>`
	);
	node.name = 'Sparkle';
	node.fills = [];
	const paint = tokenPaint(color);
	for (const child of node.findAll((n) => 'fills' in n && n.type !== 'FRAME'))
		child.fills = [paint];
	return node;
}

// ── Pages, sections, idempotency ───────────────────────────────────────────

async function pageNamed(name) {
	const page = figma.root.children.find((p) => p.name === name);
	if (!page) throw new Error(`No page named "${name}"`);
	await figma.setCurrentPageAsync(page);
	return page;
}

/**
 * A section by name, emptied if it is already there. Re-running a step replaces
 * its own work and never touches anyone else's: the match is the exact name.
 */
function section(page, name, x, y, width, height) {
	for (const child of page.children) {
		if (child.type === 'SECTION' && child.name === name) child.remove();
	}
	const node = figma.createSection();
	node.name = name;
	node.x = x;
	node.y = y;
	node.resizeWithoutConstraints(width, height);
	fill(node, 'color/canvas');
	page.appendChild(node);
	return node;
}

/** The standard inner frame of a documentation section. */
function sheet(parent, name, width, gapSize) {
	const frame = col(gapSize === undefined ? 56 : gapSize, { name });
	frame.resize(width, 100);
	parent.appendChild(frame);
	frame.layoutSizingHorizontal = 'FIXED';
	frame.layoutSizingVertical = 'HUG';
	pad(frame, 80, 96);
	return frame;
}

/** A heading and its note, the shape every documentation group opens with. */
async function heading(parent, title, note) {
	const head = col(6, { name: 'Heading' });
	head.appendChild(await TXT(title, 'Display/Card title 24', 'color/fg'));
	if (note) head.appendChild(await TXT(note, 'Body/md 15', 'color/fg-muted', { width: 900 }));
	parent.appendChild(head);
	head.layoutSizingHorizontal = 'FILL';
	return head;
}

// ── Components ─────────────────────────────────────────────────────────────

/**
 * Lays a component set out as a grid. `combineAsVariants` stacks every variant
 * at (0,0), so this is not optional.
 */
function gridVariants(set, columns, spacing) {
	const step = spacing === undefined ? 24 : spacing;
	const widest = Math.max(...set.children.map((c) => c.width));
	const tallest = Math.max(...set.children.map((c) => c.height));
	set.children.forEach((child, i) => {
		child.x = (i % columns) * (widest + step);
		child.y = Math.floor(i / columns) * (tallest + step);
	});
	set.resizeWithoutConstraints(
		Math.min(columns, set.children.length) * (widest + step) - step + 48,
		Math.ceil(set.children.length / columns) * (tallest + step) - step + 48
	);
	return set;
}

/** Turns a frame into a component, keeping its layout. */
function toComponent(frame, name, description) {
	const component = figma.createComponentFromNode(frame);
	component.name = name;
	if (description) component.description = description;
	return component;
}

/**
 * Builds one component per combination and combines them into a set.
 * `combos` is a list of `{ Property: 'value' }` objects — the variant name is
 * derived from it, so the property axes come from the data rather than a
 * second list that could drift out of step with it.
 */
async function variantSet(name, combos, build, columns, description) {
	const components = [];
	for (const combo of combos) {
		const frame = await build(combo);
		const component = figma.createComponentFromNode(frame);
		component.name = Object.keys(combo)
			.map((key) => `${key}=${combo[key]}`)
			.join(', ');
		components.push(component);
	}
	const set = figma.combineAsVariants(components, figma.currentPage);
	set.name = name;
	if (description) set.description = description;
	gridVariants(set, columns || components.length);
	return set;
}

/** Every combination of the given axes, in declaration order. */
function combos(axes) {
	const keys = Object.keys(axes);
	return keys.reduce(
		(rows, key) =>
			rows.flatMap((row) => axes[key].map((value) => Object.assign({}, row, { [key]: value }))),
		[{}]
	);
}
