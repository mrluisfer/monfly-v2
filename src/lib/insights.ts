import type { Cents, Currency } from './finance/money';
import { addMonths, daysInMonth, monthName, type DateKey, type MonthKey } from './finance/period';
import type { TransactionRow } from './transactions';

/**
 * The Insights page's reading of the record. It works on the ledger's own
 * rows, already in the browser, so leaving a category out or trying a
 * what-if answers at once and never asks the server for anything
 * ([0023](../../docs/decisions/0023-insights-read-the-ledger-in-the-browser.md)).
 * Nothing here writes: every function takes rows and hands back figures.
 *
 * Transfers are left out at the door, as every other figure of income and
 * spending leaves them out — money moved between two accounts was neither
 * earned nor spent.
 */

/** What the page reads: the twelve months up to this one, or a calendar year ("2025"). */
export type InsightsPeriod = 'last-12' | `${number}`;

export const LAST_12: InsightsPeriod = 'last-12';

export type Span = {
	/** Its twelve months, oldest first. */
	months: MonthKey[];
	/** Every day in it, oldest first, as the viewer's zone reads them. */
	days: DateKey[];
	/** What a sentence calls it: "2025", "Oct 2025 – Sep 2026". */
	label: string;
	/** A calendar year, rather than twelve months that cross one. */
	year: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** "Sep 2026". */
export const shortMonth = (key: MonthKey) => `${monthName(key, 'short')} ${key.slice(0, 4)}`;

function span(months: MonthKey[], year: boolean): Span {
	const days: DateKey[] = [];
	for (const month of months) {
		for (let d = 1; d <= daysInMonth(month); d++) days.push(`${month}-${pad(d)}` as DateKey);
	}
	return {
		months,
		days,
		year,
		label: year ? months[0].slice(0, 4) : `${shortMonth(months[0])} – ${shortMonth(months[11])}`
	};
}

/** The stretch a period covers, with `now` the viewer's current month. */
export function spanOf(period: InsightsPeriod, now: MonthKey): Span {
	return period === LAST_12
		? span(
				Array.from({ length: 12 }, (_, i) => addMonths(now, i - 11)),
				false
			)
		: span(
				Array.from({ length: 12 }, (_, i) => `${period}-${pad(i + 1)}` as MonthKey),
				true
			);
}

/** The twelve months just before it: last year, or the year before the last twelve months. */
export const spanBefore = (current: Span): Span =>
	span(
		current.months.map((m) => addMonths(m, -12)),
		current.year
	);

/** One transaction as the page reads it: its local day, and nothing about transfers. */
export type Entry = {
	id: string;
	day: DateKey;
	month: MonthKey;
	type: 'income' | 'expense';
	amount: Cents;
	category: string;
	/** The account's id, or `NO_ACCOUNT`. */
	account: string;
};

/** Where a card-less transaction sits, among account ids. */
export const NO_ACCOUNT = 'none';

/** The record's rows as entries, each on the day the viewer's zone puts it. Transfers stay out. */
export function toEntries(rows: TransactionRow[], timeZone: string): Entry[] {
	const format = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	const entries: Entry[] = [];
	for (const row of rows) {
		if (row.transfer) continue;
		const day = format.format(new Date(row.date)) as DateKey;
		entries.push({
			id: row.id,
			day,
			month: day.slice(0, 7) as MonthKey,
			type: row.type,
			amount: row.amount,
			category: row.category,
			account: row.account?.id ?? NO_ACCOUNT
		});
	}
	return entries;
}

/** What every figure leaves out, for the visit: categories by name, accounts by id. */
export type Lens = { categories: string[]; accounts: string[] };

export const EMPTY_LENS: Lens = { categories: [], accounts: [] };

export const lensCount = (lens: Lens) => lens.categories.length + lens.accounts.length;

export const withLens = (entries: Entry[], lens: Lens) =>
	lensCount(lens) === 0
		? entries
		: entries.filter(
				(e) => !lens.categories.includes(e.category) && !lens.accounts.includes(e.account)
			);

/**
 * A what-if, as percentages: everything received moves by `income`, and each
 * category's spending by its own change. Nothing missing moves.
 */
export type Scenario = { income: number; categories: Record<string, number> };

export const scenarioChanges = (scenario: Scenario) =>
	(scenario.income !== 0 ? 1 : 0) +
	Object.values(scenario.categories).filter((c) => c !== 0).length;

/** The entries as they'd be under a what-if, rounded to the cent. */
export function withScenario(entries: Entry[], scenario: Scenario): Entry[] {
	if (scenarioChanges(scenario) === 0) return entries;
	return entries.map((entry) => {
		const change =
			entry.type === 'income' ? scenario.income : (scenario.categories[entry.category] ?? 0);
		return change === 0
			? entry
			: { ...entry, amount: Math.round((entry.amount * (100 + change)) / 100) };
	});
}

/** Money in and out of a stretch, and how many entries moved it each way. */
export type Flow = { received: Cents; spent: Cents; incomes: number; expenses: number };

const noFlow = (): Flow => ({ received: 0, spent: 0, incomes: 0, expenses: 0 });

function addTo(flow: Flow, entry: Entry) {
	if (entry.type === 'income') {
		flow.received += entry.amount;
		flow.incomes += 1;
	} else {
		flow.spent += entry.amount;
		flow.expenses += 1;
	}
}

export const kept = (flow: Flow): Cents => flow.received - flow.spent;

/** What share of what came in was kept — negative past spending it all — or null with nothing in. */
export const keptRate = (flow: Flow) =>
	flow.received > 0 ? (flow.received - flow.spent) / flow.received : null;

export const entryCount = (flow: Flow) => flow.incomes + flow.expenses;

/** How far `now` moved from `before`, as a fraction — null when there's nothing to measure from. */
export const changeFrom = (now: number, before: number) =>
	before === 0 ? null : (now - before) / Math.abs(before);

export type DayFlow = Flow & { key: DateKey; future: boolean };
export type MonthFlow = Flow & { key: MonthKey; future: boolean };
export type CategorySpend = { name: string; spent: Cents; count: number; months: Cents[] };

/** A span's figures: whole, by month, by day, by category and by account. */
export type Stretch = {
	span: Span;
	/** Its days that have come, today included: all of them once it has ended. */
	elapsed: number;
	total: Flow;
	months: MonthFlow[];
	days: DayFlow[];
	/** Spending by category, largest first, with each month's part. */
	categories: CategorySpend[];
	/** Each account's flow, busiest first; `NO_ACCOUNT` for the card-less. */
	accounts: (Flow & { id: string })[];
	/** The largest single expense. */
	largest: Entry | null;
};

export function summarize(list: Entry[], current: Span, today: DateKey): Stretch {
	const dayAt = new Map(current.days.map((key, i) => [key, i]));
	const monthAt = new Map(current.months.map((key, i) => [key, i]));
	const days: DayFlow[] = current.days.map((key) => ({ key, future: key > today, ...noFlow() }));
	const months: MonthFlow[] = current.months.map((key) => ({
		key,
		future: `${key}-01` > today,
		...noFlow()
	}));
	const total = noFlow();
	const categories = new Map<string, CategorySpend>();
	const accounts = new Map<string, Flow & { id: string }>();
	let largest: Entry | null = null;

	for (const entry of list) {
		const d = dayAt.get(entry.day);
		const m = monthAt.get(entry.month);
		if (d === undefined || m === undefined) continue;
		addTo(days[d], entry);
		addTo(months[m], entry);
		addTo(total, entry);

		let account = accounts.get(entry.account);
		if (!account) accounts.set(entry.account, (account = { id: entry.account, ...noFlow() }));
		addTo(account, entry);

		if (entry.type === 'expense') {
			let category = categories.get(entry.category);
			if (!category) {
				category = {
					name: entry.category,
					spent: 0,
					count: 0,
					months: current.months.map(() => 0)
				};
				categories.set(entry.category, category);
			}
			category.spent += entry.amount;
			category.count += 1;
			category.months[m] += entry.amount;
			if (!largest || entry.amount > largest.amount) largest = entry;
		}
	}

	return {
		span: current,
		elapsed: days.filter((d) => !d.future).length,
		total,
		months,
		days,
		categories: [...categories.values()].sort(
			(a, b) => b.spent - a.spent || a.name.localeCompare(b.name)
		),
		accounts: [...accounts.values()].sort((a, b) => b.received + b.spent - (a.received + a.spent)),
		largest
	};
}

/** The flow over a stretch's first `count` days: last year only as far as this one has come. */
export function flowOver(stretch: Stretch, count: number): Flow {
	const flow = noFlow();
	for (const day of stretch.days.slice(0, count)) {
		flow.received += day.received;
		flow.spent += day.spent;
		flow.incomes += day.incomes;
		flow.expenses += day.expenses;
	}
	return flow;
}

/** Monday first: 0 is Monday, 6 is Sunday. */
export const weekday = (day: DateKey) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

export const WEEKDAYS = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday'
] as const;

/**
 * The days that have come, walked for the figures a person would ask about
 * first. Pass a stretch with a smaller `elapsed` to read only its first days —
 * last year as far as this one has come.
 */
export function dayFacts(stretch: Pick<Stretch, 'days' | 'elapsed'>) {
	const come = stretch.days.slice(0, stretch.elapsed);
	const byWeekday = [0, 0, 0, 0, 0, 0, 0];
	let spent = 0;
	let quiet = 0;
	let run = 0;
	let longestRun = 0;
	let busiest: DayFlow | null = null;
	for (const day of come) {
		spent += day.spent;
		byWeekday[weekday(day.key)] += day.spent;
		if (day.spent === 0) {
			quiet += 1;
			run += 1;
			longestRun = Math.max(longestRun, run);
		} else run = 0;
		if (day.spent > 0 && (!busiest || day.spent > busiest.spent)) busiest = day;
	}
	const top = Math.max(...byWeekday);
	return {
		/** Days with nothing spent. */
		quiet,
		/** The most of those in a row. */
		longestRun,
		/** The day the most went out. */
		busiest,
		/** Spent on each weekday, Monday first. */
		byWeekday,
		/** The weekday the most went out on, or null with nothing spent. */
		topWeekday: top > 0 ? byWeekday.indexOf(top) : null,
		/** Spent per day that has come. */
		perDay: come.length > 0 ? Math.round(spent / come.length) : 0
	};
}

/**
 * The stretch as a spreadsheet — month by month, then by category — for
 * someone's own records or their accountant. Amounts are plain decimals in
 * the currency named at the top, so a sheet can add them up.
 */
export function statementCsv(stretch: Stretch, currency: Currency): string {
	const cell = (value: string) =>
		/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
	const money = (cents: Cents) => (cents / 100).toFixed(2);
	const rate = (flow: Flow) => {
		const r = keptRate(flow);
		return r === null ? '' : (r * 100).toFixed(1);
	};
	const row = (label: string, flow: Flow) => [
		label,
		money(flow.received),
		money(flow.spent),
		money(kept(flow)),
		rate(flow),
		String(entryCount(flow))
	];
	const spent = stretch.total.spent;
	const lines: string[][] = [
		['Monfly insights', stretch.span.label],
		['Currency', currency],
		[],
		['Month', 'Received', 'Spent', 'Kept', 'Kept (% of received)', 'Entries'],
		...stretch.months.map((m) => row(shortMonth(m.key), m)),
		row('Total', stretch.total),
		[],
		['Category', 'Spent', 'Share of spending (%)', 'Entries'],
		...stretch.categories.map((c) => [
			c.name,
			money(c.spent),
			spent > 0 ? ((c.spent / spent) * 100).toFixed(1) : '',
			String(c.count)
		])
	];
	return lines.map((line) => line.map(cell).join(',')).join('\r\n');
}
