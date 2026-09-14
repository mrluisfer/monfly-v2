/*
 * The two signed-in screens, drawn against a capture of the running app rather
 * than from the code alone — the card titles, the toolbar and the column set
 * below are what /dashboard and /transactions actually render.
 */

const CONTENT = PAGE_WIDTH - GUTTER * 2;
/** Cards sit gap-4 apart in a three-column grid. */
const COLUMN = Math.round((CONTENT - 32) / 3);

/** A labelled headline, the meter, and a figure at each end (MeterStat). */
async function meterStat(label, total, value, start, end, color, endTone) {
	const block = col(12, { name: label });

	// min-h-9 fits the action button, so meters side by side keep their bars level.
	const head = row(16, { name: 'Head' });
	head.resize(10, 36);
	head.layoutSizingVertical = 'FIXED';
	head.primaryAxisAlignItems = 'SPACE_BETWEEN';
	head.counterAxisAlignItems = 'CENTER';
	head.appendChild(await TXT(label, 'Body/md 15', 'color/fg-muted'));
	head.appendChild(await TXT(total, 'Figure/sm 24', 'color/fg'));
	block.appendChild(head);
	head.layoutSizingHorizontal = 'FILL';

	const width = 470;
	const meter = figma.createFrame();
	meter.name = 'Meter';
	meter.resize(width, 52);
	meter.fills = [];
	meter.clipsContent = false;

	const track = figma.createFrame();
	track.name = 'Track';
	track.resize(width, 36);
	track.y = 16;
	track.clipsContent = true;
	track.fills = [];
	stroke(track, 'color/hairline');
	pill(track);
	track.appendChild(hatchNode(width, 36, 'color/hatch'));

	if (value > 0) {
		// The fill starts a full track-height left of the track, hidden by the
		// clip, so it is never narrower than it is tall.
		const bar = figma.createFrame();
		bar.name = 'Fill';
		bar.resize(width * value + 36, 36);
		bar.x = -36;
		bar.clipsContent = true;
		fill(bar, 'color/card');
		stroke(bar, 'color/hairline');
		pill(bar);
		const bloom = buildOrb(96, 14, 90, `color/${color}`, 'Bloom');
		bloom.x = bar.width - 78;
		bloom.y = -30;
		bar.appendChild(bloom);
		track.appendChild(bar);
	}
	meter.appendChild(track);

	// The marker pin rides the fill boundary, above the track.
	const pin = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="18" viewBox="0 0 10 18"><path d="M5 18C5 18 9.5 9.8 9.5 5.2C9.5 2.3 7.5 0 5 0C2.5 0 0.5 2.3 0.5 5.2C0.5 9.8 5 18 5 18Z" fill="#000000"/></svg>`
	);
	pin.name = 'Pin';
	pin.fills = [];
	for (const child of pin.findAll((n) => 'fills' in n && n.type !== 'FRAME'))
		child.fills = [tokenPaint('color/fg')];
	pin.x = width * value - 5;
	meter.appendChild(pin);

	block.appendChild(meter);
	meter.layoutSizingHorizontal = 'FILL';

	const feet = row(16, { name: 'Feet' });
	feet.primaryAxisAlignItems = 'SPACE_BETWEEN';
	feet.counterAxisAlignItems = 'MIN';

	const left = col(2, { name: 'Start' });
	left.appendChild(await TXT(start[0], 'Figure/sm 24', 'color/fg'));
	left.appendChild(await TXT(start[1], 'Body/sm 14', 'color/fg-muted'));
	feet.appendChild(left);

	const right = col(2, { name: 'End' });
	right.counterAxisAlignItems = 'MAX';
	right.appendChild(await TXT(end[0], 'Figure/sm 24', endTone || 'color/fg-subtle'));
	right.appendChild(await TXT(end[1], 'Body/sm 14', 'color/fg-muted'));
	feet.appendChild(right);

	block.appendChild(feet);
	feet.layoutSizingHorizontal = 'FILL';
	return block;
}

/** A card header: the title, and whatever acts on the card at the right. */
async function cardHeader(card, title, sparkColor, action) {
	const head = row(10, { name: 'Head' });
	head.primaryAxisAlignItems = 'SPACE_BETWEEN';
	head.counterAxisAlignItems = 'CENTER';

	const left = row(10, { name: 'Title' });
	left.counterAxisAlignItems = 'CENTER';
	if (sparkColor) left.appendChild(star(20, `color/${sparkColor}`));
	left.appendChild(await TXT(title, 'Display/Card title 24', 'color/fg'));
	head.appendChild(left);

	if (action) head.appendChild(action);
	card.appendChild(head);
	head.layoutSizingHorizontal = 'FILL';
	return head;
}

async function titledCard(width, height, title, note, sparkColor) {
	const card = cardFrame(width, height, 28);
	card.name = title;
	card.itemSpacing = 6;
	await cardHeader(card, title, sparkColor, null);
	if (note)
		card.appendChild(await TXT(note, 'Body/md 15', 'color/fg-muted', { width: width - 56 }));
	return card;
}

/** A pill Select with the label replaced — the filter a card header carries. */
async function selectPill(label) {
	const node = await buildSelect({ Variant: 'pill', State: 'closed' });
	for (const dot of node.findAll((n) => n.name === 'Dot')) dot.remove();
	for (const text of node.findAll((n) => n.type === 'TEXT')) text.characters = label;
	return node;
}

/** An IconButton with its glyph swapped. */
async function iconButton(glyph, size, dashed) {
	const node = await buildIconButton({
		Size: size || 'sm',
		Style: dashed ? 'dashed' : 'solid',
		State: 'default'
	});
	for (const child of node.children.slice()) child.remove();
	node.appendChild(icon(glyph, 18, 'color/fg', 1.5));
	return node;
}

/**
 * The expenses dial: a pie of the whole period, the top four categories as
 * wedges clockwise from 270°, the hatch everything else — the long tail.
 * Hairline dividers run from the hub out past the rim to a black tag whose tip
 * points back at it.
 */
function expensesDial(size) {
	const r = size / 2;
	const wedges = [
		{ share: 0.31, color: '#495bff' },
		{ share: 0.26, color: '#ac49ff' },
		{ share: 0.12, color: '#b0ff09' },
		{ share: 0.09, color: '#7ac8f5' }
	];

	let at = 0;
	const paths = [];
	const dividers = [];
	const tags = [];

	const point = (turn, radius) => {
		const a = (turn * 360 - 90) * (Math.PI / 180);
		return [r + radius * Math.cos(a), r + radius * Math.sin(a)];
	};

	for (const wedge of wedges) {
		const from = at;
		const to = at + wedge.share;
		const [x0, y0] = point(from, r);
		const [x1, y1] = point(to, r);
		paths.push(
			`<path d="M${r} ${r} L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${wedge.color}"/>`
		);
		at = to;
	}

	// A divider at every boundary, including the last wedge against the hatch.
	for (const turn of [0].concat(
		wedges.map((w, i) => wedges.slice(0, i + 1).reduce((s, x) => s + x.share, 0))
	)) {
		const [x, y] = point(turn, r * 1.34);
		dividers.push(
			`<line x1="${r}" y1="${r}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="#050f1c" stroke-width="1"/>`
		);
		tags.push(
			`<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(turn * 360).toFixed(1)})"><rect x="-13" y="-6" width="26" height="12" rx="6" fill="#050f1c"/></g>`
		);
	}

	const dial = figma.createFrame();
	dial.name = 'Expenses dial';
	dial.resize(size * 1.5, size * 1.5);
	dial.fills = [];
	dial.clipsContent = false;

	const inset = size * 0.25;

	// The long tail: everything past the top four, hatched.
	const tail = figma.createFrame();
	tail.name = 'The long tail';
	tail.resize(size, size);
	tail.x = inset;
	tail.y = inset;
	tail.clipsContent = true;
	tail.fills = [];
	pill(tail);
	tail.appendChild(hatchNode(size, size, 'color/hatch'));
	dial.appendChild(tail);

	const wedgeNode = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths.join('')}</svg>`
	);
	wedgeNode.name = 'Wedges';
	wedgeNode.fills = [];
	wedgeNode.x = inset;
	wedgeNode.y = inset;
	// The wedges stay soft, blurred into one another.
	wedgeNode.effects = [{ type: 'LAYER_BLUR', radius: 24, visible: true }];
	dial.appendChild(wedgeNode);

	const marks = figma.createNodeFromSvg(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" overflow="visible">${dividers.join('')}${tags.join('')}</svg>`
	);
	marks.name = 'Dividers and tags';
	marks.fills = [];
	marks.x = inset;
	marks.y = inset;
	for (const child of marks.findAll((n) => 'strokes' in n && n.strokes.length > 0)) {
		child.strokes = [tokenPaint('color/hairline')];
	}
	for (const child of marks.findAll((n) => n.type === 'RECTANGLE' || n.type === 'VECTOR')) {
		if (child.fills && child.fills.length) child.fills = [tokenPaint('color/fg')];
	}
	dial.appendChild(marks);

	// The hub: a small fixed four-point star every divider runs out from.
	const hub = star(14, 'color/fg');
	hub.x = inset + r - 7;
	hub.y = inset + r - 7;
	dial.appendChild(hub);

	return dial;
}

async function stepScreenDashboard() {
	const page = await pageNamed('Screens');
	const node = section(page, 'Dashboard', 0, 1320, PAGE_WIDTH + 200, 1500);

	const screen = screenFrame('/dashboard', 1400);
	node.appendChild(screen);
	screen.appendChild(await header('Overview', false));

	const body = col(16, { name: 'Body' });
	body.x = GUTTER;
	body.y = HEADER_HEIGHT;
	body.resize(CONTENT, 10);
	body.layoutSizingHorizontal = 'FIXED';
	body.layoutSizingVertical = 'HUG';
	pad(body, 0, 0, 24, 0);
	screen.appendChild(body);

	// ── Hero band ────────────────────────────────────────────────────────────
	const stats = row(48, { name: 'Stats' });
	stats.counterAxisAlignItems = 'MIN';
	// Over budget: the meter is full and the figure that says so wears the alarm.
	const spent = await meterStat(
		'Spent this month',
		'$10,000.00',
		1,
		['$13,621.62', 'Committed'],
		['$3,621.62', 'Over budget'],
		'lime',
		'color/negative'
	);
	const saving = await meterStat(
		'Savings goal',
		'$5,000.00',
		0,
		['$0.00', 'Saved'],
		['$5,000.00', 'To go'],
		'blue'
	);
	stats.appendChild(spent);
	stats.appendChild(saving);
	spent.layoutGrow = 1;
	saving.layoutGrow = 1;

	const hero = await heroBand('Overview', 'Display/Page title 72', stats);
	body.appendChild(hero);
	hero.layoutSizingHorizontal = 'FILL';

	// ── Card grid: three columns of equal height ─────────────────────────────
	const grid = row(16, { name: 'Cards' });
	grid.counterAxisAlignItems = 'STRETCH';
	body.appendChild(grid);
	grid.layoutSizingHorizontal = 'FILL';

	// Expenses ---------------------------------------------------------------
	const expenses = cardFrame(COLUMN, 820, 28);
	expenses.name = 'Expenses';
	expenses.itemSpacing = 0;
	expenses.primaryAxisAlignItems = 'SPACE_BETWEEN';
	await cardHeader(expenses, 'Expenses', null, await selectPill('All time'));

	const dialArea = figma.createFrame();
	dialArea.name = 'Dial';
	dialArea.resize(COLUMN - 56, 470);
	dialArea.fills = [];
	dialArea.clipsContent = true;
	expenses.appendChild(dialArea);
	dialArea.layoutSizingHorizontal = 'FILL';

	const dial = expensesDial(320);
	dial.x = -120;
	dial.y = -10;
	dialArea.appendChild(dial);

	// The chips may cover part of the dial: their own blur keeps it looking right.
	const chips = row(8, { name: 'Categories' });
	chips.layoutWrap = 'WRAP';
	chips.counterAxisSpacing = 8;
	chips.resize(272, 10);
	chips.layoutSizingHorizontal = 'FIXED';
	chips.layoutSizingVertical = 'HUG';
	dialArea.appendChild(chips);
	chips.x = COLUMN - 56 - 272;
	chips.y = 236;

	for (const [label, amount, color] of [
		['Transferencia', '$34,718.12', 'blue'],
		['Tarjeta Credito', '$27,659.53', 'violet'],
		['Compra pendeja', '$548.76', 'lime'],
		['Comida', '$398.77', 'pastel-sky']
	]) {
		const chip = col(6, { name: label });
		chip.resize(132, 10);
		chip.layoutSizingHorizontal = 'FIXED';
		chip.layoutSizingVertical = 'HUG';
		pad(chip, 14);
		fill(chip, 'color/card', 0.72);
		radius(chip, 'radius/chip');
		chip.appendChild(buildOrb(22, 3, 82, `color/${color}`));
		chip.appendChild(await TXT(label, 'Body/xs 12', 'color/fg-muted'));
		chip.appendChild(await TXT(amount, 'Figure/xs 18', 'color/fg'));
		chips.appendChild(chip);
	}

	const totalSpending = col(2, { name: 'Total spending' });
	totalSpending.appendChild(await TXT('$14,903.66', 'Figure/lg 44', 'color/fg'));
	totalSpending.appendChild(await TXT('Total spending', 'Body/sm 14', 'color/fg-muted'));
	expenses.appendChild(totalSpending);
	grid.appendChild(expenses);
	expenses.layoutGrow = 1;

	// Accounts ---------------------------------------------------------------
	const accountsCol = col(16, { name: 'Accounts' });
	accountsCol.counterAxisAlignItems = 'STRETCH';
	grid.appendChild(accountsCol);
	accountsCol.layoutGrow = 1;
	accountsCol.layoutSizingVertical = 'FILL';

	const overview = cardFrame(COLUMN, 210, 28);
	overview.name = 'Accounts';
	overview.itemSpacing = 14;

	const accountActions = row(8, { name: 'Actions' });
	accountActions.appendChild(await iconButton('pencil', 'sm', false));
	accountActions.appendChild(await iconButton('arrow-right', 'sm', true));
	await cardHeader(overview, 'Accounts', null, accountActions);

	const totalBlock = col(2, { name: 'Total balance' });
	totalBlock.appendChild(await TXT('Total balance', 'Body/sm 14', 'color/fg-muted'));
	const totalRow = row(12, { name: 'Figure' });
	totalRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
	totalRow.counterAxisAlignItems = 'CENTER';
	totalRow.appendChild(await TXT('$92.52', 'Figure/md 32', 'color/fg'));
	// This month's net movement: a dot until pointed at or focused.
	const change = row(0, { name: 'Change' });
	change.resize(28, 28);
	change.layoutSizingHorizontal = 'FIXED';
	change.layoutSizingVertical = 'FIXED';
	change.primaryAxisAlignItems = 'CENTER';
	change.counterAxisAlignItems = 'CENTER';
	pill(change);
	fill(change, 'color/negative', 0.12);
	change.appendChild(icon('trending-down', 14, 'color/negative', 1.75));
	totalRow.appendChild(change);
	totalBlock.appendChild(totalRow);
	overview.appendChild(totalBlock);
	totalBlock.layoutSizingHorizontal = 'FILL';
	totalRow.layoutSizingHorizontal = 'FILL';

	const share = await buildShareBar({ Track: 'sunken' });
	overview.appendChild(share);
	share.layoutSizingHorizontal = 'FILL';

	const legend = row(20, { name: 'Legend' });
	for (const [name, percent, colour] of [
		['tarjeta de debito bbva', '92%', 'pastel-sky'],
		['tarjeta de debito NU', '8%', 'violet']
	]) {
		const entry = row(8, { name: name });
		entry.counterAxisAlignItems = 'CENTER';
		entry.appendChild(buildOrb(10, 1.5, 84, `color/${colour}`));
		entry.appendChild(await TXT(name, 'Body/xs 12', 'color/fg-muted'));
		entry.appendChild(await TXT(percent, 'Body/sm medium 14', 'color/fg'));
		legend.appendChild(entry);
	}
	overview.appendChild(legend);
	accountsCol.appendChild(overview);

	// Two featured accounts, a card each, splitting the rest of the column.
	for (const [name, colour, bank, tracked, review, orbA, orbB] of [
		['tarjeta de debito bbva', 'pastel-sky', '$84.93', '$6,851.16', '18', 'pastel-sky', 'blue'],
		['tarjeta de debito NU', 'violet', '$1.39', '$23.04', '0', 'violet', 'blue']
	]) {
		const block = cardFrame(COLUMN, 300, 28);
		block.name = name;
		block.itemSpacing = 20;
		block.primaryAxisAlignItems = 'SPACE_BETWEEN';

		const blockHead = row(10, { name: 'Head' });
		blockHead.counterAxisAlignItems = 'CENTER';
		blockHead.appendChild(star(18, `color/${colour}`));
		const title = await TXT(name, 'Display/Card title 24', 'color/fg');
		blockHead.appendChild(title);
		title.layoutGrow = 1;
		const filter = await buildSelect({ Variant: 'ghost', State: 'closed' });
		for (const text of filter.findAll((n) => n.type === 'TEXT'))
			text.characters = 'Updated yesterday';
		blockHead.appendChild(filter);
		block.appendChild(blockHead);
		blockHead.layoutSizingHorizontal = 'FILL';

		const figures = row(40, { name: 'Figures' });
		for (const [label, value] of [
			['Bank balance', bank],
			['Tracked', tracked]
		]) {
			const cell = col(2, { name: label });
			cell.appendChild(await TXT(label, 'Body/sm 14', 'color/fg-muted'));
			cell.appendChild(await TXT(value, 'Figure/sm 24', 'color/fg'));
			figures.appendChild(cell);
		}
		block.appendChild(figures);
		figures.layoutSizingHorizontal = 'FILL';

		// Balance and this month's spending over orbiting rings that turn opposite ways.
		const rings = row(28, { name: 'Rings' });
		rings.counterAxisAlignItems = 'CENTER';
		for (const [tone, direction] of [
			[orbA, 0],
			[orbB, 1]
		]) {
			const ring = figma.createFrame();
			ring.name = 'OrbitRing';
			ring.resize(94, 94);
			ring.fills = [];
			ring.clipsContent = false;
			const orb = buildOrb(66, 9, 80, `color/${tone}`);
			orb.x = 14;
			orb.y = 14;
			ring.appendChild(orb);
			ring.appendChild(orbitRing(94, direction ? [0.25, 0.75] : [0, 0.5]));
			rings.appendChild(ring);
		}

		const toReview = col(2, { name: 'To review' });
		toReview.counterAxisAlignItems = 'MAX';
		toReview.appendChild(await TXT(review, 'Figure/lg 44', 'color/fg'));
		toReview.appendChild(await TXT('To review', 'Body/sm 14', 'color/fg-muted'));
		rings.appendChild(toReview);
		toReview.layoutGrow = 1;

		block.appendChild(rings);
		rings.layoutSizingHorizontal = 'FILL';
		accountsCol.appendChild(block);
		block.layoutGrow = 1;
	}

	// Income + the Tips / Loans aside ----------------------------------------
	const incomeCol = col(16, { name: 'Income' });
	incomeCol.counterAxisAlignItems = 'STRETCH';
	grid.appendChild(incomeCol);
	incomeCol.layoutGrow = 1;
	incomeCol.layoutSizingVertical = 'FILL';

	const income = cardFrame(COLUMN, 440, 28);
	income.name = 'Income';
	income.itemSpacing = 4;

	const incomeActions = row(10, { name: 'Actions' });
	incomeActions.counterAxisAlignItems = 'CENTER';
	// Violet is configuration: the gear left of the period.
	incomeActions.appendChild(await iconButton('settings', 'sm', false));
	incomeActions.appendChild(await selectPill('This quarter'));
	await cardHeader(income, 'Income', null, incomeActions);

	// The total keeps its lime symbol while its number counts.
	const total = await TXT('$27,896.13', 'Figure/lg 44', 'color/fg');
	total.setRangeFills(0, 1, [tokenPaint('color/lime')]);
	income.appendChild(total);
	income.appendChild(await TXT('This quarter', 'Body/sm 14', 'color/fg-muted'));

	// Hatched columns with accent caps, scaled to the tallest.
	const bars = row(0, { name: 'Bars' });
	bars.counterAxisAlignItems = 'MAX';
	pad(bars, 32, 0, 0, 0);
	income.appendChild(bars);
	bars.layoutSizingHorizontal = 'FILL';
	bars.layoutGrow = 1;

	for (const [month, amount, share01, cap] of [
		['Jul', '$24.5k', 0.83, 'lime'],
		['Aug', '$29.5k', 1, 'violet'],
		['Sep', '$460.8', 0.02, 'blue']
	]) {
		const column = col(6, { name: month });
		column.counterAxisAlignItems = 'MIN';
		column.appendChild(await TXT(amount, 'Body/sm 14', 'color/fg'));

		const height = Math.max(6, Math.round(180 * share01));
		const bar = figma.createFrame();
		bar.name = 'Bar';
		bar.resize(120, height);
		bar.clipsContent = true;
		bar.fills = [];
		stroke(bar, 'color/hairline');
		bar.appendChild(hatchNode(120, height, 'color/hatch'));
		const capNode = figma.createFrame();
		capNode.name = 'Cap';
		capNode.resize(120, 4);
		fill(capNode, `color/${cap}`);
		bar.appendChild(capNode);
		column.appendChild(bar);
		bar.layoutSizingHorizontal = 'FILL';

		column.appendChild(await TXT(month, 'Body/xs 12', 'color/fg-muted'));
		bars.appendChild(column);
		column.layoutGrow = 1;
	}
	incomeCol.appendChild(income);

	const tabs = await buildCardTabs();
	const tabsInstance = tabs.createInstance();
	tabs.remove();
	tabsInstance.resize(COLUMN, 340);
	incomeCol.appendChild(tabsInstance);
	tabsInstance.layoutGrow = 1;

	screen.resize(PAGE_WIDTH, HEADER_HEIGHT + body.height);
	node.resizeWithoutConstraints(PAGE_WIDTH + 200, screen.height + 200);
	return 'Screen: /dashboard.';
}

// ── /transactions ──────────────────────────────────────────────────────────

const LEDGER_ROWS = [
	[
		'Transferencia',
		'sobrante en mi tarjeta NU',
		'Sep 12',
		'+$10.81',
		'arrow-left-right',
		'lavender',
		'violet'
	],
	['Retiro', '—', 'Sep 12', '−$1,000.00', 'tag', 'lavender', 'pastel-sky'],
	[
		'Comida',
		'compra de michoacana',
		'Sep 12',
		'−$105.00',
		'utensils-crossed',
		'coral',
		'pastel-sky'
	],
	[
		'Transferencia',
		'transferencia de mother',
		'Sep 12',
		'+$200.00',
		'arrow-left-right',
		'lavender',
		'pastel-sky'
	],
	['juegos', 'compra de steam', 'Sep 11', '−$245.99', 'gamepad-2', 'pink', 'violet'],
	[
		'Transferencia',
		'transferencia a NU',
		'Sep 11',
		'+$250.00',
		'arrow-left-right',
		'lavender',
		'violet'
	],
	['Tienda Don Juan', '—', 'Sep 11', '−$54.00', 'shopping-cart', 'peach', 'pastel-sky'],
	[
		'Despensa',
		'compra en la guadalajara',
		'Sep 9',
		'−$876.30',
		'shopping-cart',
		'peach',
		'pastel-sky'
	]
];

/** Category, Description, Account, Date, Amount — one fact per column. */
const LEDGER_COLUMNS = [
	{ label: 'Category', grow: 210, align: 'left', sorted: false },
	{ label: 'Description', grow: 250, align: 'left', sorted: false },
	{ label: 'Account', grow: 190, align: 'left', sorted: false },
	{ label: 'Date', grow: 110, align: 'left', sorted: true },
	{ label: 'Amount', grow: 140, align: 'right', sorted: false }
];

/** The ledger's bar: its own search, kind and columns, and the count of what's left. */
async function ledgerToolbar() {
	const bar = row(16, { name: 'LedgerToolbar' });
	bar.counterAxisAlignItems = 'CENTER';

	const search = row(10, { name: 'Search' });
	search.resize(10, 48);
	search.layoutSizingVertical = 'FIXED';
	search.counterAxisAlignItems = 'CENTER';
	pad(search, 0, 20);
	search.fills = [];
	stroke(search, 'color/hairline');
	pill(search);
	search.appendChild(icon('search', 16, 'color/fg-subtle', 1.5));
	search.appendChild(await TXT('Search transactions', 'Body/md 15', 'color/fg-subtle'));
	bar.appendChild(search);
	search.layoutGrow = 1;
	search.layoutSizingVertical = 'FIXED';

	for (const [label, glyph] of [
		['All types', 'tag'],
		['Columns', 'credit-card']
	]) {
		const pillNode = row(10, { name: label });
		pillNode.resize(10, 48);
		pillNode.layoutSizingVertical = 'FIXED';
		pillNode.counterAxisAlignItems = 'CENTER';
		pad(pillNode, 0, 20);
		pillNode.fills = [];
		stroke(pillNode, 'color/hairline');
		pill(pillNode);
		pillNode.appendChild(icon(glyph, 16, 'color/fg', 1.5));
		pillNode.appendChild(await TXT(label, 'Body/md 15', 'color/fg'));
		pillNode.appendChild(buildCaretNode());
		bar.appendChild(pillNode);
	}

	bar.appendChild(await TXT('327 entries', 'Body/sm 14', 'color/fg-muted'));
	return bar;
}

async function stepScreenTransactions() {
	const page = await pageNamed('Screens');
	const node = section(page, 'Transactions', PAGE_WIDTH + 400, 1320, PAGE_WIDTH + 200, 1500);

	const screen = screenFrame('/transactions', 1400);
	node.appendChild(screen);
	screen.appendChild(await header('Transactions', true));

	const body = col(16, { name: 'Body' });
	body.x = GUTTER;
	body.y = HEADER_HEIGHT;
	body.resize(CONTENT, 10);
	body.layoutSizingHorizontal = 'FIXED';
	body.layoutSizingVertical = 'HUG';
	pad(body, 0, 0, 24, 0);
	screen.appendChild(body);

	// ── Hero: the figures cover the whole record, always ─────────────────────
	const summary = row(40, { name: 'Summary' });
	for (const [label, value, tone] of [
		['Total balance', '$54.02', 'color/fg'],
		['Received', '$47,334.27', 'color/positive'],
		['Spent', '$47,586.52', 'color/fg'],
		['Transactions', '98', 'color/fg']
	]) {
		const cell = col(4, { name: label });
		cell.appendChild(await TXT(label, 'Body/md 15', 'color/fg-muted'));
		cell.appendChild(await TXT(value, 'Figure/md 32', tone));
		summary.appendChild(cell);
		cell.layoutGrow = 1;
	}

	const hero = await heroBand('Transactions', 'Display/Page title 60', summary);
	body.appendChild(hero);
	hero.layoutSizingHorizontal = 'FILL';

	// ── The ledger on the left, the charts stacked beside it ─────────────────
	const grid = row(16, { name: 'Grid' });
	grid.counterAxisAlignItems = 'MIN';
	body.appendChild(grid);
	grid.layoutSizingHorizontal = 'FILL';

	const asideWidth = 368;
	const ledgerWidth = CONTENT - asideWidth - 16;
	const tableWidth = ledgerWidth - 56;

	const ledger = cardFrame(ledgerWidth, 780, 28);
	ledger.name = 'Ledger';
	ledger.itemSpacing = 24;
	await cardHeader(ledger, 'Everything', null, await selectPill('All time'));

	const toolbar = await ledgerToolbar();
	ledger.appendChild(toolbar);
	toolbar.layoutSizingHorizontal = 'FILL';

	const table = col(2, { name: 'Table' });
	ledger.appendChild(table);
	table.layoutSizingHorizontal = 'FILL';

	// Every table names its columns, in a header that sticks to its scroller.
	const headRow = row(0, { name: 'Columns' });
	headRow.resize(tableWidth, 36);
	headRow.layoutSizingVertical = 'FIXED';
	headRow.counterAxisAlignItems = 'CENTER';
	pad(headRow, 0, 0, 0, 52);
	for (const column of LEDGER_COLUMNS) {
		const cell = row(6, { name: column.label });
		cell.counterAxisAlignItems = 'CENTER';
		pad(cell, 0, 12);
		if (column.align === 'right') cell.primaryAxisAlignItems = 'MAX';
		const sortHeader = await buildSortHeader({
			State: column.sorted ? 'desc' : 'idle',
			Align: column.align
		});
		for (const text of sortHeader.findAll((n) => n.type === 'TEXT')) text.characters = column.label;
		cell.appendChild(sortHeader);
		headRow.appendChild(cell);
		cell.layoutSizingVertical = 'FILL';
		cell.layoutGrow = column.grow;
	}
	table.appendChild(headRow);
	headRow.layoutSizingHorizontal = 'FILL';

	const rule = figma.createFrame();
	rule.name = 'Rule';
	rule.resize(tableWidth, 1);
	fill(rule, 'color/line');
	table.appendChild(rule);
	rule.layoutSizingHorizontal = 'FILL';

	for (let i = 0; i < LEDGER_ROWS.length; i++) {
		const entry = LEDGER_ROWS[i];
		const category = entry[0];
		const description = entry[1];
		const date = entry[2];
		const amount = entry[3];
		const glyph = entry[4];
		const colour = entry[5];
		const accountColour = entry[6];

		const line = row(0, { name: description === '—' ? category : description });
		line.resize(tableWidth, 52);
		line.layoutSizingVertical = 'FIXED';
		line.counterAxisAlignItems = 'CENTER';
		radius(line, 'radius/lg');
		line.fills = [];

		// The category's glyph at the head of the row, then one fact per column.
		const chipCell = row(0, { name: 'Glyph' });
		chipCell.resize(52, 52);
		chipCell.layoutSizingHorizontal = 'FIXED';
		chipCell.layoutSizingVertical = 'FILL';
		chipCell.primaryAxisAlignItems = 'CENTER';
		chipCell.counterAxisAlignItems = 'CENTER';
		const chip = row(0, { name: 'Chip' });
		chip.resize(28, 28);
		chip.layoutSizingHorizontal = 'FIXED';
		chip.layoutSizingVertical = 'FIXED';
		chip.primaryAxisAlignItems = 'CENTER';
		chip.counterAxisAlignItems = 'CENTER';
		radius(chip, 'radius/lg');
		chip.fills = [solid(PALETTE_TINT[colour], 0.15)];
		const mark = icon(glyph, 16, 'color/fg', 1.75);
		for (const child of mark.findAll((n) => 'strokes' in n && n.strokes.length > 0)) {
			child.strokes = [solid(PALETTE_GLYPH[colour])];
		}
		chip.appendChild(mark);
		chipCell.appendChild(chip);
		line.appendChild(chipCell);

		const cells = [
			[category, 'color/fg', 'Body/md 15', null],
			[description, description === '—' ? 'color/fg-subtle' : 'color/fg-muted', 'Body/sm 14', null],
			['tarjeta de debito …', 'color/fg-muted', 'Body/sm 14', accountColour],
			[date, 'color/fg-muted', 'Body/sm 14', null],
			[amount, amount.charAt(0) === '+' ? 'color/positive' : 'color/negative', 'Body/md 15', null]
		];

		for (let c = 0; c < cells.length; c++) {
			const column = LEDGER_COLUMNS[c];
			const cell = row(8, { name: column.label });
			cell.counterAxisAlignItems = 'CENTER';
			pad(cell, 0, 12);
			if (column.align === 'right') cell.primaryAxisAlignItems = 'MAX';
			// An account carries its colour everywhere: orb, sparkle, slice, dot.
			if (cells[c][3]) cell.appendChild(buildOrb(14, 2, 84, `color/${cells[c][3]}`));
			cell.appendChild(await TXT(cells[c][0], cells[c][2], cells[c][1]));
			line.appendChild(cell);
			cell.layoutSizingVertical = 'FILL';
			cell.layoutGrow = column.grow;
		}

		table.appendChild(line);
		line.layoutSizingHorizontal = 'FILL';

		// The card's own edge closes the list: no line beside the last row.
		if (i < LEDGER_ROWS.length - 1) {
			const divider = figma.createFrame();
			divider.name = 'Rule';
			divider.resize(tableWidth, 1);
			fill(divider, 'color/line');
			table.appendChild(divider);
			divider.layoutSizingHorizontal = 'FILL';
		}
	}

	const leftColumn = col(16, { name: 'Left' });
	leftColumn.counterAxisAlignItems = 'STRETCH';
	grid.appendChild(leftColumn);
	leftColumn.layoutGrow = 1;
	leftColumn.appendChild(ledger);

	const unassigned = await titledCard(
		ledgerWidth,
		220,
		'Without an account',
		'Counted in your total. Giving one an account moves it into that account’s balance.',
		null
	);
	leftColumn.appendChild(unassigned);

	// ── The three charts, each led by one of the brand three ─────────────────
	const aside = col(16, { name: 'Aside' });
	aside.resize(asideWidth, 10);
	aside.layoutSizingHorizontal = 'FIXED';
	aside.layoutSizingVertical = 'HUG';
	grid.appendChild(aside);

	const activity = await titledCard(asideWidth, 330, 'Activity', 'What left each month.', 'violet');
	const activityBars = row(2, { name: 'Bars' });
	activityBars.counterAxisAlignItems = 'MAX';
	pad(activityBars, 32, 0, 0, 0);
	activity.appendChild(activityBars);
	activityBars.layoutSizingHorizontal = 'FILL';
	activityBars.layoutGrow = 1;

	// The picked month with the two before and the one after read at full
	// strength; the rest are set back.
	const months = [
		['Oct', 0.01, 'lime', true],
		['Nov', 0.01, 'violet', true],
		['Dec', 0.01, 'lime', true],
		['Jan', 0.01, 'blue', true],
		['Feb', 0.18, 'violet', true],
		['Mar', 0.55, 'lime', true],
		['Apr', 0.62, 'violet', false],
		['May', 0.95, 'blue', false],
		['Jun', 0.7, 'lime', false],
		['Jul', 0.66, 'violet', false],
		['Aug', 0.78, 'blue', false],
		['Sep', 0.34, 'lime', true]
	];
	for (const [month, share01, cap, faded] of months) {
		const column = col(4, { name: month });
		column.counterAxisAlignItems = 'CENTER';
		const height = Math.max(4, Math.round(120 * share01));
		const bar = figma.createFrame();
		bar.name = 'Bar';
		bar.resize(22, height);
		bar.clipsContent = true;
		bar.fills = [];
		stroke(bar, 'color/hairline');
		bar.appendChild(hatchNode(22, height, 'color/hatch'));
		const capNode = figma.createFrame();
		capNode.name = 'Cap';
		capNode.resize(22, 3);
		fill(capNode, `color/${cap}`);
		bar.appendChild(capNode);
		if (faded) bar.opacity = 0.4;
		column.appendChild(bar);
		bar.layoutSizingHorizontal = 'FILL';
		const label = await TXT(month, 'Body/xs 12', faded ? 'color/fg-subtle' : 'color/fg-muted');
		column.appendChild(label);
		activityBars.appendChild(column);
		column.layoutGrow = 1;
	}
	aside.appendChild(activity);

	const where = await titledCard(
		asideWidth,
		340,
		'Where it went',
		'Every category, largest first.',
		'lime'
	);
	const list = col(16, { name: 'Categories' });
	pad(list, 12, 0, 0, 0);
	where.appendChild(list);
	list.layoutSizingHorizontal = 'FILL';
	for (const [label, amount, colour, share01] of [
		['Transferencia', '$20,270.14', 'lavender', 1],
		['Tarjeta Credito', '$16,148.99', 'teal', 0.8],
		['Compra pendeja', '$1,752.16', 'peach', 0.09],
		['Comida', '$1,398.77', 'coral', 0.07]
	]) {
		const line = col(8, { name: label });
		const head = row(8, { name: 'Head' });
		head.primaryAxisAlignItems = 'SPACE_BETWEEN';
		head.appendChild(await TXT(label, 'Body/md 15', 'color/fg'));
		head.appendChild(await TXT(amount, 'Body/sm 14', 'color/fg-muted'));
		line.appendChild(head);
		head.layoutSizingHorizontal = 'FILL';

		const track = figma.createFrame();
		track.name = 'Bar';
		track.resize(asideWidth - 56, 8);
		track.clipsContent = true;
		fill(track, 'color/sunken');
		pill(track);
		const bar = figma.createFrame();
		bar.name = 'Fill';
		bar.resize(Math.max(6, Math.round((asideWidth - 56) * share01)), 8);
		// Each bar wears its category's own colour, so a category keeps its colour
		// whatever rank it takes from one month to the next.
		fill(bar, `color/pastel-${colour}`);
		pill(bar);
		track.appendChild(bar);
		line.appendChild(track);
		track.layoutSizingHorizontal = 'FILL';

		list.appendChild(line);
		line.layoutSizingHorizontal = 'FILL';
	}
	aside.appendChild(where);

	const sits = await titledCard(
		asideWidth,
		250,
		'Where it sits',
		'What each account holds now.',
		'blue'
	);
	const accounts = col(14, { name: 'Accounts' });
	pad(accounts, 12, 0, 0, 0);
	sits.appendChild(accounts);
	accounts.layoutSizingHorizontal = 'FILL';
	for (const [name, amount, colour] of [
		['tarjeta de debito bbva', '$84.93', 'pastel-sky'],
		['tarjeta de debito NU', '$1.39', 'violet'],
		['Unknown', '—', null]
	]) {
		const line = row(12, { name: name });
		line.counterAxisAlignItems = 'CENTER';
		if (colour) {
			line.appendChild(buildOrb(16, 2, 84, `color/${colour}`));
		} else {
			// No palette colour: a ring, as the Unknown slice is hatched.
			const ring = figma.createEllipse();
			ring.name = 'Unknown';
			ring.resize(16, 16);
			ring.fills = [];
			stroke(ring, 'color/hairline');
			line.appendChild(ring);
		}
		const label = await TXT(name, 'Body/sm 14', 'color/fg');
		line.appendChild(label);
		label.layoutGrow = 1;
		line.appendChild(await TXT(amount, 'Figure/xs 18', 'color/fg'));
		accounts.appendChild(line);
		line.layoutSizingHorizontal = 'FILL';
	}
	aside.appendChild(sits);

	screen.resize(PAGE_WIDTH, HEADER_HEIGHT + body.height);
	node.resizeWithoutConstraints(PAGE_WIDTH + 200, screen.height + 200);
	return 'Screen: /transactions.';
}
