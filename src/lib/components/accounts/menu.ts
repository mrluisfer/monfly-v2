import { animate, stagger } from 'motion';
import { EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

/**
 * What the accounts page's menus are made of — a card's `⋯` and its brand
 * mark's — so a list that sits in both, like the brands, looks the same in
 * either. The ledger row menu's own look.
 */

/** The floating surface a menu or submenu opens on. */
export const MENU_SURFACE =
	'z-50 w-max min-w-60 max-w-[calc(100vw-2rem)] origin-(--bits-floating-transform-origin) rounded-[var(--radius-chip)] border border-line bg-card p-1.5 shadow-lg outline-none';

/** A row: one line high, its chip first. */
export const MENU_ITEM = [
	'group flex h-10 cursor-default items-center gap-3 rounded-[0.625rem] px-1.5 text-[0.9375rem] whitespace-nowrap outline-none select-none',
	'transition-colors duration-150 data-highlighted:bg-sunken',
	'data-disabled:pointer-events-none data-disabled:text-fg-subtle'
].join(' ');

/** The chip heading a row. It passes the pointer through, so its glyph plays with its row. */
export const MENU_CHIP =
	'pointer-events-none grid size-7 shrink-0 place-items-center rounded-lg group-data-disabled:opacity-50 group-data-disabled:grayscale';

/** A pastel taken to a chip: set `--tint` to the palette colour. */
export const MENU_PASTEL =
	'bg-[color-mix(in_oklab,var(--tint)_15%,transparent)] text-[oklch(from_var(--tint)_0.55_calc(c*1.7)_h)] dark:bg-[color-mix(in_oklab,var(--tint)_20%,transparent)] dark:text-(--tint)';

/** The check closing a row, which springs in as its option is chosen. */
export const MENU_CHECK =
	'ml-auto size-4 transition-[opacity,scale,color] duration-300 ease-[var(--ease-spring)]';

/** As a menu opens, its rows (`data-deal`) deal in one after another behind the surface's pop (Motion). */
export function dealRows(node: HTMLElement) {
	if (prefersReducedMotion()) return;
	animate(
		node.querySelectorAll('[data-deal]'),
		{ opacity: [0, 1], y: [4, 0] },
		{ delay: stagger(0.03, { startDelay: 0.05 }), duration: 0.3, ease: EASE_OUT_QUINT }
	);
}
