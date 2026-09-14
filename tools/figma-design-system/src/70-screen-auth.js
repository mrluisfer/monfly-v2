/*
 * The signed-out screens. /signup is the designed one; the landing is still the
 * stub the code says it is — two shortcut links, no app shell.
 */

/**
 * The dashed gauge ring with pointer marks. Drawn from the same numbers the
 * component uses: r 48 in a 100 viewBox, 64 ticks, a dash 1/2.6 of each.
 */
function orbitRing(size, markers) {
	const R = 48;
	const circumference = 2 * Math.PI * R;
	const tick = circumference / 64;
	const dash = tick / 2.6;

	const pointers = (markers || [0, 0.5])
		.map((at) => {
			const angle = at * 2 * Math.PI - Math.PI / 2;
			const x = 50 + R * Math.cos(angle);
			const y = 50 + R * Math.sin(angle);
			return `<polygon points="-3.4,-2.6 3.4,-2.6 0,3.4" fill="#050f1c" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${at * 360})"/>`;
		})
		.join('');

	const node = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" fill="none" stroke="#050f1c" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="${dash.toFixed(3)} ${(tick - dash).toFixed(3)}"/>${pointers}</svg>`
	);
	node.name = 'OrbitRing';
	node.fills = [];
	for (const child of node.findAll((n) => 'strokes' in n && n.strokes.length > 0)) {
		child.strokes = [tokenPaint('color/hairline')];
	}
	for (const child of node.findAll((n) => n.type === 'VECTOR' && n.fills && n.fills.length)) {
		child.fills = [tokenPaint('color/fg')];
	}
	return node;
}

/** A soft bloom behind a panel, as the preview's two corner blobs are. */
function bloom(size, colorToken, blurPx, spread, opacity) {
	const node = buildOrb(size, blurPx, spread, colorToken, 'Blob');
	node.opacity = opacity;
	node.clipsContent = false;
	return node;
}

const PROMISES = [
	['Every card, budget and loan in one view', 'color/lime'],
	['Numbers that update as you spend', 'color/blue'],
	['Sign-in secured by Auth0', 'color/violet']
];

const CHIPS = [
	['Groceries', 'color/lime'],
	['Rent', 'color/blue'],
	['Savings goal', 'color/violet'],
	['Loan repaid', 'color/lime']
];

async function signupPreview(width, height) {
	const panel = col(0, { name: 'Preview' });
	panel.resize(width, height);
	panel.layoutSizingHorizontal = 'FIXED';
	panel.layoutSizingVertical = 'FIXED';
	panel.clipsContent = true;
	pad(panel, 40);
	fill(panel, 'color/card');
	radius(panel, 'radius/card');
	panel.primaryAxisAlignItems = 'SPACE_BETWEEN';

	// The two corner blooms sit behind everything, out of the layout flow.
	const violet = bloom(480, 'color/violet', 40, 70, 0.6);
	violet.x = width - 368;
	violet.y = height - 336;
	violet.layoutPositioning = 'ABSOLUTE';
	panel.appendChild(violet);

	const lime = bloom(320, 'color/lime', 36, 70, 0.5);
	lime.x = -80;
	lime.y = -112;
	lime.layoutPositioning = 'ABSOLUTE';
	panel.appendChild(lime);

	panel.appendChild(await brand());

	const bottom = col(0, { name: 'Bottom' });
	panel.appendChild(bottom);
	bottom.layoutSizingHorizontal = 'FILL';

	const headline = await TXT('Your money, in one calm view.', 'Display/Page title 60', 'color/fg', {
		width: width - 80
	});
	headline.name = 'Headline';
	bottom.appendChild(headline);

	const lede = await TXT(
		'Track cards, budgets and loans side by side — the same dashboard you are about to open.',
		'Body/md 15',
		'color/fg-muted',
		{ width: 448 }
	);
	bottom.appendChild(lede);
	bottom.itemSpacing = 16;

	// ── The two tiles ────────────────────────────────────────────────────────
	const tiles = row(12, { name: 'Tiles' });
	tiles.counterAxisAlignItems = 'STRETCH';
	bottom.appendChild(tiles);
	tiles.layoutSizingHorizontal = 'FILL';

	const budget = col(20, { name: 'Monthly budget' });
	pad(budget, 24, 20, 20, 20);
	fill(budget, 'color/sunken', 0.85);
	radius(budget, 'radius/tile');
	tiles.appendChild(budget);
	budget.layoutGrow = 1.35;

	const budgetHead = row(12, { name: 'Head' });
	budgetHead.primaryAxisAlignItems = 'SPACE_BETWEEN';
	budgetHead.counterAxisAlignItems = 'BASELINE';
	budgetHead.appendChild(await TXT('Monthly budget', 'Body/sm 14', 'color/fg-muted'));
	budgetHead.appendChild(await TXT('$2,400.00', 'Figure/xs 18', 'color/fg'));
	budget.appendChild(budgetHead);
	budgetHead.layoutSizingHorizontal = 'FILL';

	const meter = await buildMeter();
	const meterInstance = meter.createInstance();
	meter.remove();
	budget.appendChild(meterInstance);

	const balance = row(16, { name: 'Balance' });
	balance.counterAxisAlignItems = 'CENTER';
	pad(balance, 20);
	fill(balance, 'color/sunken', 0.85);
	radius(balance, 'radius/tile');
	tiles.appendChild(balance);
	balance.layoutGrow = 1;

	const ring = figma.createFrame();
	ring.name = 'Ring';
	ring.resize(64, 64);
	ring.fills = [];
	ring.clipsContent = false;
	const orb = buildOrb(46, 6, 80, 'color/blue');
	orb.x = 9;
	orb.y = 9;
	ring.appendChild(orb);
	ring.appendChild(orbitRing(64, [0.25, 0.75]));
	balance.appendChild(ring);

	const balanceText = col(2, { name: 'Text' });
	balanceText.appendChild(await TXT('Balance', 'Body/sm 14', 'color/fg-muted'));
	balanceText.appendChild(await TXT('$12,435.00', 'Figure/sm 24', 'color/fg'));
	balance.appendChild(balanceText);

	// ── Example categories ───────────────────────────────────────────────────
	const chips = row(8, { name: 'Categories' });
	chips.layoutWrap = 'WRAP';
	chips.counterAxisSpacing = 8;
	bottom.appendChild(chips);
	chips.layoutSizingHorizontal = 'FILL';

	for (const [label, color] of CHIPS) {
		const chip = row(8, { name: label });
		pad(chip, 6, 12);
		fill(chip, 'color/card');
		stroke(chip, 'color/hairline');
		pill(chip);
		chip.appendChild(star(14, color));
		chip.appendChild(await TXT(label, 'Body/sm 14', 'color/fg'));
		chips.appendChild(chip);
	}

	return panel;
}

async function signupCard(width, height) {
	const card = col(0, { name: 'Auth card' });
	card.resize(width, height);
	card.layoutSizingHorizontal = 'FIXED';
	card.layoutSizingVertical = 'FIXED';
	pad(card, 48);
	fill(card, 'color/card');
	radius(card, 'radius/card');
	card.primaryAxisAlignItems = 'SPACE_BETWEEN';

	// Header row, like the dashboard's cards: title left, action right.
	const head = row(16, { name: 'Header' });
	head.primaryAxisAlignItems = 'SPACE_BETWEEN';
	head.counterAxisAlignItems = 'CENTER';
	head.appendChild(await TXT('Create account', 'Display/Card title 24', 'color/fg'));

	const login = row(0, { name: 'Log in' });
	login.resize(10, 40);
	login.layoutSizingHorizontal = 'HUG';
	login.layoutSizingVertical = 'FIXED';
	login.primaryAxisAlignItems = 'CENTER';
	login.counterAxisAlignItems = 'CENTER';
	pad(login, 0, 20);
	login.fills = [];
	stroke(login, 'color/hairline');
	pill(login);
	login.appendChild(await TXT('Log in', 'Body/sm 14', 'color/fg'));
	head.appendChild(login);

	card.appendChild(head);
	head.layoutSizingHorizontal = 'FILL';

	// Anchored to the bottom, like the preview's headline, so both cards end together.
	const body = col(0, { name: 'Body' });
	card.appendChild(body);
	body.layoutSizingHorizontal = 'FILL';
	body.maxWidth = 448;

	body.appendChild(
		await TXT('Start with Monfly', 'Display/Page title 48', 'color/fg', { width: 448 })
	);
	const lede = await TXT(
		'One account for every card, budget and loan.',
		'Body/md 15',
		'color/fg-muted',
		{ width: 448 }
	);
	body.appendChild(lede);
	body.itemSpacing = 12;

	const list = col(12, { name: 'Promises' });
	body.appendChild(list);
	list.layoutSizingHorizontal = 'FILL';

	for (const [text, color] of PROMISES) {
		const line = row(12, { name: text });
		line.counterAxisAlignItems = 'CENTER';
		line.appendChild(star(16, color));
		line.appendChild(await TXT(text, 'Body/md 15', 'color/fg'));
		list.appendChild(line);
	}

	const cta = row(8, { name: 'Create account' });
	cta.resize(448, 48);
	cta.layoutSizingVertical = 'FIXED';
	cta.primaryAxisAlignItems = 'CENTER';
	cta.counterAxisAlignItems = 'CENTER';
	fill(cta, 'color/fg');
	pill(cta);
	cta.appendChild(await TXT('Create account', 'Body/md medium 15', 'color/window'));
	cta.appendChild(icon('arrow-right', 16, 'color/window', 1.5));
	body.appendChild(cta);
	cta.layoutSizingHorizontal = 'FILL';

	const legal = row(8, { name: 'Legal' });
	legal.counterAxisAlignItems = 'MIN';
	legal.appendChild(icon('lock-keyhole', 14, 'color/fg-subtle', 1.5));
	legal.appendChild(
		await TXT(
			'Secured by Auth0. By continuing you agree to the Terms and the Privacy Policy.',
			'Body/xs 12',
			'color/fg-subtle',
			{ width: 400 }
		)
	);
	body.appendChild(legal);

	return card;
}

async function stepScreenAuth() {
	const page = await pageNamed('Screens');
	const node = section(page, 'Signed out', 0, 0, 3100, 1200);

	const height = 1024;
	const inner = height - 64;
	// grid lg:grid-cols-[1.15fr_1fr] with gap-4, inside p-8.
	const content = PAGE_WIDTH - 64;
	const previewWidth = Math.round(((content - 16) * 1.15) / 2.15);
	const cardWidth = content - 16 - previewWidth;

	// ── /signup ──────────────────────────────────────────────────────────────
	const signup = screenFrame('/signup', height);
	signup.x = 0;
	signup.y = 0;
	node.appendChild(signup);

	const layout = row(16, { name: 'Layout' });
	layout.x = 32;
	layout.y = 32;
	layout.resize(content, inner);
	layout.layoutSizingHorizontal = 'FIXED';
	layout.layoutSizingVertical = 'FIXED';
	layout.counterAxisAlignItems = 'STRETCH';
	signup.appendChild(layout);
	layout.appendChild(await signupPreview(previewWidth, inner));
	layout.appendChild(await signupCard(cardWidth, inner));

	// ── / (landing) ──────────────────────────────────────────────────────────
	const landing = screenFrame('/ (landing)', height);
	landing.x = PAGE_WIDTH + 220;
	landing.y = 0;
	node.appendChild(landing);

	const shortcuts = row(12, { name: 'Shortcuts' });
	shortcuts.counterAxisAlignItems = 'CENTER';

	const login = row(0, { name: 'Log in' });
	login.resize(10, 44);
	login.layoutSizingHorizontal = 'HUG';
	login.layoutSizingVertical = 'FIXED';
	login.primaryAxisAlignItems = 'CENTER';
	login.counterAxisAlignItems = 'CENTER';
	pad(login, 0, 24);
	login.fills = [];
	stroke(login, 'color/hairline');
	pill(login);
	login.appendChild(await TXT('Log in', 'Body/md 15', 'color/fg'));
	shortcuts.appendChild(login);

	const open = row(8, { name: 'Open dashboard' });
	open.resize(10, 44);
	open.layoutSizingHorizontal = 'HUG';
	open.layoutSizingVertical = 'FIXED';
	open.primaryAxisAlignItems = 'CENTER';
	open.counterAxisAlignItems = 'CENTER';
	pad(open, 0, 24);
	fill(open, 'color/fg');
	pill(open);
	open.appendChild(await TXT('Open dashboard', 'Body/md medium 15', 'color/window'));
	open.appendChild(icon('arrow-right', 16, 'color/window', 1.5));
	shortcuts.appendChild(open);

	landing.appendChild(shortcuts);
	shortcuts.x = Math.round((PAGE_WIDTH - shortcuts.width) / 2);
	shortcuts.y = Math.round((height - shortcuts.height) / 2);

	const note = await TXT(
		'The landing is not designed yet — in code it holds only these two shortcuts, as plain links, so it never loads the app shell.',
		'Body/xs 12',
		'color/fg-subtle',
		{ width: 420, align: 'CENTER' }
	);
	landing.appendChild(note);
	note.x = Math.round((PAGE_WIDTH - 420) / 2);
	note.y = shortcuts.y + shortcuts.height + 24;

	return 'Screens: /signup and the landing stub.';
}
