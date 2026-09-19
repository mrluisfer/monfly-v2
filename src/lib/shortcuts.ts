import type { PaletteColor } from './components/ui/palette';

/**
 * The places a person can pin to the header as shortcuts, in the order the
 * header draws them — whatever order they were pinned in. They're stored as ids
 * on the User row (`User.shortcuts`, a text array whose default is Overview and
 * Transactions), so they follow the person to any device. A locked one —
 * Overview, which is home — is stored like the rest but guarded: its card takes
 * it out only after four presses on its lock and a confirmation. A new
 * destination is an entry here, not a migration.
 */
export const SHORTCUTS = [
	{
		id: 'overview',
		href: '/dashboard',
		label: 'Overview',
		description:
			"Home: this month's spending against your budget, where it went, your accounts and your income, at a glance.",
		color: 'lime',
		locked: true
	},
	{
		id: 'transactions',
		href: '/transactions',
		label: 'Transactions',
		description:
			'The ledger: every transaction on record to search, filter and sort, and where you write, edit or delete one.',
		color: 'violet',
		locked: false
	},
	{
		id: 'insights',
		href: '/insights',
		label: 'Insights',
		description:
			'How your money moves over time: spending and income month to month, and what changed.',
		color: 'sky',
		locked: false
	},
	{
		id: 'accounts',
		href: '/cards',
		label: 'Accounts',
		description:
			'Your cards and accounts: what each one holds, what moved through it this month, and which ones the overview features.',
		color: 'teal',
		locked: false
	},
	{
		id: 'loans',
		href: '/loans',
		label: 'Loans',
		description:
			'Money you lent and borrowed: who owes what, what falls due when, and every payment that settles it.',
		color: 'lemon',
		locked: false
	},
	{
		id: 'budgets',
		href: '/budgets',
		label: 'Budgets',
		description: "Limits by category, and how close this month's spending runs to each of them.",
		color: 'peach',
		locked: false
	},
	{
		id: 'profile',
		href: '/profile',
		label: 'Profile',
		description: 'Who you are in Monfly: your name, email, avatar and the currency you count in.',
		color: 'blue',
		locked: false
	},
	{
		id: 'settings',
		href: '/settings',
		label: 'Settings',
		description: 'How Monfly works for you: its look, what it tells you about, and the rest.',
		color: 'lavender',
		locked: false
	}
] as const satisfies readonly {
	id: string;
	href: string;
	label: string;
	description: string;
	color: PaletteColor;
	locked: boolean;
}[];

export type Shortcut = (typeof SHORTCUTS)[number];
export type ShortcutId = Shortcut['id'];

/** What a new account starts with, and what the column defaults to. */
export const DEFAULT_SHORTCUTS: ShortcutId[] = ['overview', 'transactions'];

export const isShortcutId = (value: unknown): value is ShortcutId =>
	SHORTCUTS.some((shortcut) => shortcut.id === value);

/** Whether a shortcut is in the header. Stored ids the catalog no longer knows are never matched. */
export const inHeader = (shortcut: Shortcut, pinned: readonly string[]) =>
	pinned.includes(shortcut.id);

/**
 * The tabs the header draws, in the order they were pinned or dragged into.
 * `User.shortcuts` holds that order — pinning appends, so one taken away and
 * put back comes back at the end — and reading it here rather than filtering
 * the catalog is what keeps it. Overview is home, so it leads wherever the
 * array happens to hold it; an id the catalog no longer knows is dropped.
 */
export const headerTabs = (pinned: readonly string[]): Shortcut[] => {
	const byId = new Map<string, Shortcut>(SHORTCUTS.map((shortcut) => [shortcut.id, shortcut]));
	const tabs = pinned.flatMap((id) => byId.get(id) ?? []);
	return [...tabs.filter((tab) => tab.locked), ...tabs.filter((tab) => !tab.locked)];
};

/** Where a shortcut was pinned or taken away: this page's switch, a header tab's ✕, or Overview's lock. */
export const SHORTCUT_SOURCES = ['page', 'header', 'lock'] as const;
export type ShortcutSource = (typeof SHORTCUT_SOURCES)[number];

export const isShortcutSource = (value: unknown): value is ShortcutSource =>
	SHORTCUT_SOURCES.includes(value as ShortcutSource);

/** How many weeks the activity charts cover, this one included. */
export const ACTIVITY_WEEKS = 8;

/** `GET /api/me/shortcuts/activity`: the changes of the last `ACTIVITY_WEEKS` weeks, counted three ways. */
export type ShortcutActivity = {
	/** Every change in the window. */
	total: number;
	/** Oldest first, one a week, empty weeks included; `start` is its Monday, `YYYY-MM-DD`, in the viewer's zone. */
	weeks: { start: string; pinned: number; unpinned: number }[];
	/** Shortcuts that changed, most first. */
	shortcuts: { id: string; pinned: number; unpinned: number }[];
	/** Every source, most used first. */
	sources: { source: ShortcutSource; count: number }[];
};
