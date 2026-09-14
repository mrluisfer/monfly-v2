/*
 * The app shell — the sticky header every (app) route wears:
 * brand → back → tabs → theme → account.
 */

const HEADER_HEIGHT = 80;
const PAGE_WIDTH = 1440;
/** Page gutters: px-4 sm:px-6 lg:px-8. At 1440 the lg gutter applies. */
const GUTTER = 32;

const TABS = [
	{ label: 'Overview', href: '/dashboard' },
	{ label: 'Transactions', href: '/transactions' },
	{ label: 'Insights', href: '/insights' }
];

/** A screen frame on the canvas: the grey ground everything else sits on. */
function screenFrame(name, height) {
	const frame = figma.createFrame();
	frame.name = name;
	frame.resize(PAGE_WIDTH, height);
	frame.clipsContent = true;
	fill(frame, 'color/canvas');
	return frame;
}

/** The logo and the wordmark, divided by a hairline rule. */
async function brand() {
	const group = row(14, { name: 'Brand' });

	const mark = buildLogo();
	// The component form lives in Atoms; a screen carries an instance of it.
	const instance = mark.createInstance();
	mark.remove();
	instance.resize(42, 28);
	group.appendChild(instance);

	const divider = figma.createFrame();
	divider.name = 'Divider';
	divider.resize(1, 24);
	fill(divider, 'color/line-strong');
	group.appendChild(divider);

	group.appendChild(await TXT('Monfly', 'Display/Brand 20', 'color/fg'));
	return group;
}

/**
 * The active tab's surface: browser-tab style, running down into the canvas
 * with a concave shoulder either side. Each shoulder is a canvas square with a
 * quarter disc of window painted back over its inner corner — the same shape
 * the CSS mask cuts.
 */
function tabSurface(parent, x, width) {
	const top = 10;
	const height = HEADER_HEIGHT - top;

	const body = figma.createFrame();
	body.name = 'Tab surface';
	body.resize(width, height);
	body.x = x;
	body.y = top;
	body.topLeftRadius = 20;
	body.topRightRadius = 20;
	body.bottomLeftRadius = 0;
	body.bottomRightRadius = 0;
	fill(body, 'color/canvas');
	parent.appendChild(body);

	for (const side of ['left', 'right']) {
		const shoulder = figma.createFrame();
		shoulder.name = `Shoulder ${side}`;
		shoulder.resize(16, 16);
		shoulder.x = side === 'left' ? x - 16 : x + width;
		shoulder.y = HEADER_HEIGHT - 16;
		shoulder.clipsContent = true;
		fill(shoulder, 'color/canvas');

		const cut = figma.createEllipse();
		cut.name = 'Cut';
		cut.resize(32, 32);
		cut.x = side === 'left' ? -16 : 0;
		cut.y = -16;
		fill(cut, 'color/window');
		shoulder.appendChild(cut);

		parent.appendChild(shoulder);
	}
	return body;
}

/**
 * The header. `active` is the tab in force, or null for a route outside the
 * strip; `back` shows the dashed back button — everywhere but /dashboard.
 */
async function header(active, back) {
	const bar = figma.createFrame();
	bar.name = 'TopBar';
	bar.resize(PAGE_WIDTH, HEADER_HEIGHT);
	bar.clipsContent = true;
	fill(bar, 'color/window');

	const left = row(20, { name: 'Left' });
	left.x = GUTTER;
	left.y = 0;
	left.resize(10, HEADER_HEIGHT);
	left.layoutSizingVertical = 'FIXED';
	left.counterAxisAlignItems = 'CENTER';
	left.appendChild(await brand());

	if (back) {
		const button = await buildIconButton({ Size: 'md', Style: 'dashed', State: 'default' });
		button.name = 'Back';
		const wrap = row(0, { name: 'Back slot' });
		pad(wrap, 0, 20, 0, 8);
		wrap.appendChild(button);
		left.appendChild(wrap);
	}

	bar.appendChild(left);

	// The strip: pl-5 leaves room for the surface's left shoulder to overhang.
	const stripX = left.x + left.width + 20;
	let x = stripX;
	const tabNodes = [];

	for (const tab of TABS) {
		const isActive = tab.label === active;
		const node = row(12, { name: tab.label });
		node.resize(10, 44);
		node.layoutSizingHorizontal = 'HUG';
		node.layoutSizingVertical = 'FIXED';
		node.primaryAxisAlignItems = 'CENTER';
		pad(node, 0, 20);
		radius(node, 'radius/chip');
		if (isActive) node.fills = [];
		else fill(node, 'color/sunken');

		node.appendChild(await TXT(tab.label, 'Body/md 15', isActive ? 'color/fg' : 'color/fg-muted'));
		// The ✕ is always rendered so tab widths stay fixed and nothing reflows mid-slide.
		const close = icon('x', 14, isActive ? 'color/fg' : 'color/fg-muted', 1.5);
		close.opacity = isActive ? 0.45 : 0;
		node.appendChild(close);

		bar.appendChild(node);
		node.x = x;
		node.y = (HEADER_HEIGHT - 44) / 2;
		tabNodes.push({ node, isActive });
		x += node.width + 24;
	}

	// Drawn after the tabs so it can be sent behind them.
	const activeTab = tabNodes.find((t) => t.isActive);
	if (activeTab) {
		const surface = tabSurface(bar, activeTab.node.x, activeTab.node.width);
		bar.insertChild(0, surface);
		// The shoulders were appended last; move them behind the tabs too.
		for (const shoulder of bar.children.filter((c) => c.name.startsWith('Shoulder'))) {
			bar.insertChild(1, shoulder);
		}
	}

	const newTab = await buildIconButton({ Size: 'sm', Style: 'dashed', State: 'default' });
	newTab.name = 'New tab';
	for (const glyph of newTab.children) glyph.remove();
	newTab.appendChild(icon('plus', 18, 'color/fg', 1.5));
	bar.appendChild(newTab);
	newTab.x = x + 4;
	newTab.y = (HEADER_HEIGHT - 36) / 2;

	// Right: theme, then the account's blobatar.
	const right = row(12, { name: 'Right' });
	right.resize(10, HEADER_HEIGHT);
	right.layoutSizingVertical = 'FIXED';
	right.counterAxisAlignItems = 'CENTER';

	const theme = await buildIconButton({ Size: 'md', Style: 'solid', State: 'default' });
	theme.name = 'Theme';
	for (const glyph of theme.children) glyph.remove();
	theme.appendChild(icon('eye', 18, 'color/fg', 1.5));
	theme.strokes = [];
	right.appendChild(theme);

	const avatar = buildAvatar();
	const avatarInstance = avatar.createInstance();
	avatar.remove();
	right.appendChild(avatarInstance);

	bar.appendChild(right);
	right.x = PAGE_WIDTH - GUTTER - right.width;
	right.y = 0;

	return bar;
}

/** The page title band every (app) route opens with. */
async function heroBand(title, style, aside) {
	const band = row(48, { name: 'Hero' });
	band.resize(PAGE_WIDTH - GUTTER * 2, 10);
	band.layoutSizingHorizontal = 'FIXED';
	band.layoutSizingVertical = 'HUG';
	band.counterAxisAlignItems = 'CENTER';
	pad(band, 32, 0);

	band.appendChild(await TXT(title, style, 'color/fg'));
	if (aside) {
		band.appendChild(aside);
		aside.layoutGrow = 1;
	}
	return band;
}
