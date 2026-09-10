/**
 * Every keyboard shortcut in Monfly, in one table. Check here before adding
 * one, so no two actions share keys; menus and help read their labels from it
 * and `bindHotkeys` wires them up.
 *
 * Shortcuts are sequences of plain keys — G then S — as GitHub and Linear do.
 * They can't collide with the browser's own ⌘/Ctrl shortcuts (⌘P prints, ⌘S
 * saves, ⌘B shows bookmarks), and they're ignored while typing in a field.
 */

export type Hotkey = {
	/** Pressed one after another, lower-case: `['g', 's']` is G, then S. */
	keys: readonly string[];
	/** What it does, for menus and a future shortcuts help. */
	label: string;
	/** For "go to" shortcuts: where it navigates. */
	href?: string;
};

export const HOTKEYS = {
	goOverview: { keys: ['g', 'o'], label: 'Go to Overview', href: '/dashboard' },
	goTransactions: { keys: ['g', 't'], label: 'Go to Transactions', href: '/transactions' },
	goInsights: { keys: ['g', 'i'], label: 'Go to Insights', href: '/insights' },
	goProfile: { keys: ['g', 'p'], label: 'Go to Profile', href: '/profile' },
	goSettings: { keys: ['g', 's'], label: 'Go to Settings', href: '/settings' }
} as const satisfies Record<string, Hotkey>;

export type HotkeyId = keyof typeof HOTKEYS;
