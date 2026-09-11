import { PALETTE, type PaletteColor } from './components/ui/palette';

/**
 * Colours a person has picked, stored as one JSON document on their User row
 * (`User.colors`): `{ "category": { "comida": "mint" }, "account": { "<card
 * id>": "coral" } }`. Category keys are names as transactions store them;
 * account keys are card ids (v1's own `Card.color` holds hex values v1 draws
 * with, so v2 leaves it alone). Values are palette ids. A new kind is a new
 * entry here, not a migration.
 */
export const COLOR_KINDS = ['category', 'account'] as const;
export type ColorKind = (typeof COLOR_KINDS)[number];
export type ColorChoices = Partial<Record<ColorKind, Record<string, PaletteColor>>>;

/** The longest key stored — a category name. */
export const MAX_COLOR_KEY = 120;

export const isColorKind = (value: unknown): value is ColorKind =>
	COLOR_KINDS.includes(value as ColorKind);

export const isPaletteColor = (value: unknown): value is PaletteColor =>
	typeof value === 'string' && Object.hasOwn(PALETTE, value);

/** Colours by rank, for anything without a choice of its own. */
export const DEFAULT_CATEGORY_COLORS: PaletteColor[] = ['blue', 'violet', 'lime', 'sky'];

/**
 * Colours for a ranked list: each name's own choice first, then the defaults
 * in order, skipping any a choice already took — so two of them only share a
 * colour when the person chose that.
 */
export function assignColors(
	names: string[],
	chosen: Record<string, PaletteColor> = {},
	defaults: PaletteColor[] = DEFAULT_CATEGORY_COLORS
): PaletteColor[] {
	const taken = new Set(names.map((name) => chosen[name]).filter(Boolean));
	const spare = defaults.filter((color) => !taken.has(color));
	const pool = spare.length > 0 ? spare : defaults;
	let next = 0;
	return names.map((name) => chosen[name] ?? pool[next++ % pool.length]);
}
