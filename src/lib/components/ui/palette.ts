/**
 * Every colour a person can give something — an account, later a category:
 * the brand three, then pastels tuned per theme in app.css. User-chosen
 * colours come from here and nowhere else. The order is the picker's.
 */
export const PALETTE = {
	blue: { label: 'Blue', css: 'var(--blue)' },
	violet: { label: 'Violet', css: 'var(--violet)' },
	lime: { label: 'Lime', css: 'var(--lime)' },
	sky: { label: 'Sky', css: 'var(--pastel-sky)' },
	teal: { label: 'Teal', css: 'var(--pastel-teal)' },
	mint: { label: 'Mint', css: 'var(--pastel-mint)' },
	lemon: { label: 'Lemon', css: 'var(--pastel-lemon)' },
	peach: { label: 'Peach', css: 'var(--pastel-peach)' },
	coral: { label: 'Coral', css: 'var(--pastel-coral)' },
	rose: { label: 'Rose', css: 'var(--pastel-rose)' },
	pink: { label: 'Pink', css: 'var(--pastel-pink)' },
	lavender: { label: 'Lavender', css: 'var(--pastel-lavender)' }
} as const;

export type PaletteColor = keyof typeof PALETTE;

export const PALETTE_COLORS = Object.keys(PALETTE) as PaletteColor[];
