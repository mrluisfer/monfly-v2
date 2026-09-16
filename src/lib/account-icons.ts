/**
 * The brands an account can wear as its icon: the bank that issues it, or the
 * network it runs on. Most never pick one — the icon is read from what the
 * account is already called (`detectAccountIcon`) — and a pick of their own
 * (`Card.icon`) is only kept when the one read isn't right. A brand not listed
 * here gets no icon at all.
 *
 * There's no public list that reads a bank from free text — the libraries that
 * name a card's brand read its number — so this matches whole words against
 * each brand's names, as people write them.
 */
export const ACCOUNT_ICONS = [
	'bbva',
	'nu',
	'santander',
	'banorte',
	'banamex',
	'hsbc',
	'chase',
	'amex',
	'visa'
] as const;
export type AccountIcon = (typeof ACCOUNT_ICONS)[number];

export const isAccountIcon = (value: unknown): value is AccountIcon =>
	ACCOUNT_ICONS.includes(value as AccountIcon);

/**
 * Each brand's name, and the words that name it — lower-case, unaccented, a
 * space between words. In priority order: banks before networks, so "BBVA
 * Visa" reads as the bank that issued it.
 */
export const ACCOUNT_BRANDS: Record<AccountIcon, { label: string; names: string[] }> = {
	bbva: { label: 'BBVA', names: ['bbva', 'bancomer'] },
	nu: { label: 'Nu', names: ['nu', 'nubank', 'nu bank'] },
	santander: { label: 'Santander', names: ['santander'] },
	banorte: { label: 'Banorte', names: ['banorte'] },
	banamex: { label: 'Banamex', names: ['banamex', 'citibanamex', 'citi banamex'] },
	hsbc: { label: 'HSBC', names: ['hsbc'] },
	chase: { label: 'Chase', names: ['chase', 'jp morgan', 'jpmorgan', 'j p morgan'] },
	amex: { label: 'American Express', names: ['amex', 'american express', 'americanexpress'] },
	visa: { label: 'Visa', names: ['visa'] }
};

/** Lower-case, accents off, anything but letters and digits a single space, padded to match whole words. */
const words = (text: string) =>
	` ${text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()} `;

/**
 * The brand an account's own words name — its issuer and its name, read
 * together — or null when they name none: "tarjeta de débito BBVA" is BBVA,
 * "Debito NU" is Nu, "menu" is nothing.
 */
export function detectAccountIcon(...texts: (string | null | undefined)[]): AccountIcon | null {
	const said = words(texts.filter(Boolean).join(' '));
	return (
		ACCOUNT_ICONS.find((id) =>
			ACCOUNT_BRANDS[id].names.some((name) => said.includes(` ${name} `))
		) ?? null
	);
}

/** The icon an account wears: the one picked for it, else the one its words name, else none. */
export const accountIcon = (account: {
	icon: AccountIcon | null;
	name: string;
	provider: string | null;
}) => account.icon ?? detectAccountIcon(account.provider, account.name);
