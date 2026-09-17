import { isDateKey, isTimeKey, timeKey, todayKey, toMoneyInput } from './finance';
import type { TransactionRow } from './transactions';

/**
 * What the Transactions page's panel is doing, kept in this browser so a
 * reload — or a trip to another page to work a figure out — brings it back as
 * it was left: the row it was reading, or the fields half written for a row, a
 * new transaction or a new transfer. Why localStorage, and what the format rules out:
 * docs/decisions/0011-transactions-panel-in-local-storage.md.
 *
 * One JSON document per signed-in user, under `panelKey(User.id)`:
 *
 *     { "v": 3, "mode": "view", "id": "<transaction id>" }
 *     { "v": 3, "mode": "edit", "id": "<transaction id>", "draft": TransactionDraft }
 *     { "v": 3, "mode": "new", "draft": TransactionDraft }
 *
 * Changing the shape means bumping `PANEL_VERSION`. A document of another
 * version is dropped on the next read rather than migrated: it is a draft,
 * cheap to lose across a release.
 */
export const PANEL_VERSION = 3;

/** Per user, so another Monfly account in the same browser never opens on it. */
export const panelKey = (userId: string) => `monfly:transactions-panel:${userId}`;

/** The panel's fields as they were typed: what the form holds, not what it would save. */
export type TransactionDraft = {
	/**
	 * The amount's text — "1,234.5" — not cents: half written, it may not be a
	 * number yet. The editor parses it on saving, as it does what is typed.
	 */
	amount: string;
	/** Which way the money went — or, moved between two accounts, a transfer. */
	type: 'income' | 'expense' | 'transfer';
	/**
	 * The category by its name — what `Transaction.category` stores and what
	 * v1's category select writes as its value — never a `Category` row's id.
	 * Rows carry names no `Category` row has, since categories were free text
	 * first, and the save sends a name, so the name is the one thing that
	 * always exists. Whether it was typed or picked from a list doesn't change
	 * what is kept.
	 */
	category: string;
	/** The note, `''` for none. */
	description: string;
	/** The day, `YYYY-MM-DD`, or `''` while the date field is cleared. */
	date: string;
	/** The time that day, `HH:MM`, or `''` while the time field is cleared. */
	time: string;
	/**
	 * A new transaction's account id, or null for none; an edit never changes
	 * it. For a transfer, the account the money leaves.
	 */
	account: string | null;
	/** A transfer's account the money lands in, or null while none is picked. Unused otherwise. */
	to: string | null;
};

export type PanelState =
	| { mode: 'view'; id: string }
	| { mode: 'edit'; id: string; draft: TransactionDraft }
	| { mode: 'new'; draft: TransactionDraft };

/** A new transaction's fields: now, money out, and nothing else — the two most of them are. */
export const blankDraft = (timeZone: string): TransactionDraft => ({
	amount: '',
	type: 'expense',
	category: '',
	description: '',
	date: todayKey(timeZone),
	time: timeKey(timeZone),
	account: null,
	to: null
});

/**
 * A new transfer's fields: `from` when it starts at an account, and the next
 * account along as where it lands, so there's something to read the moment it
 * opens rather than two empty pickers.
 */
export function transferDraft(
	timeZone: string,
	accounts: { id: string }[],
	from: string | null = accounts[0]?.id ?? null
): TransactionDraft {
	return {
		...blankDraft(timeZone),
		type: 'transfer',
		account: from,
		to: accounts.find((a) => a.id !== from)?.id ?? null
	};
}

/** A row's fields, as the panel opens on them to edit it — the whole transfer, for either of its sides. */
export const rowDraft = (row: TransactionRow, timeZone: string): TransactionDraft => ({
	amount: toMoneyInput(row.amount),
	type: row.transfer ? 'transfer' : row.type,
	category: row.category,
	description: row.description ?? '',
	date: todayKey(timeZone, new Date(row.date)),
	time: timeKey(timeZone, new Date(row.date)),
	account: row.transfer?.from?.id ?? null,
	to: row.transfer?.to?.id ?? null
});

/**
 * The panel this browser kept for a user, or null: none kept, another
 * version, or anything that doesn't read as one. Only the types are checked —
 * the editor judges the values on saving, as it judges what is typed. Browser
 * only.
 */
export function readPanel(userId: string): PanelState | null {
	let stored: unknown;
	try {
		stored = JSON.parse(localStorage.getItem(panelKey(userId)) ?? 'null');
	} catch {
		// Storage off, or not JSON: nothing kept.
		return null;
	}
	if (typeof stored !== 'object' || stored === null) return null;

	const { v, mode, id, draft } = stored as Record<string, unknown>;
	if (v !== PANEL_VERSION) return null;
	if (mode === 'view' && typeof id === 'string') return { mode, id };

	if (typeof draft !== 'object' || draft === null) return null;
	const { amount, type, category, description, date, time, account, to } = draft as Record<
		string,
		unknown
	>;
	const kind = type === 'income' || type === 'expense' || type === 'transfer' ? type : null;
	if (
		typeof amount !== 'string' ||
		kind === null ||
		typeof category !== 'string' ||
		typeof description !== 'string' ||
		(date !== '' && !isDateKey(date)) ||
		(time !== '' && !isTimeKey(time)) ||
		(account !== null && typeof account !== 'string') ||
		(to !== null && typeof to !== 'string')
	) {
		return null;
	}
	const fields: TransactionDraft = {
		amount,
		type: kind,
		category,
		description,
		date,
		time,
		account,
		to
	};

	if (mode === 'edit' && typeof id === 'string') return { mode, id, draft: fields };
	if (mode === 'new') return { mode, draft: fields };
	return null;
}

/** Keeps what the panel is doing, or forgets it with null. Browser only. */
export function writePanel(userId: string, state: PanelState | null) {
	try {
		if (state) {
			localStorage.setItem(panelKey(userId), JSON.stringify({ v: PANEL_VERSION, ...state }));
		} else {
			localStorage.removeItem(panelKey(userId));
		}
	} catch {
		// Storage off or full: the panel still works, it just won't outlive a reload.
	}
}
