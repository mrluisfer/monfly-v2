import { sql } from 'drizzle-orm';
import {
	type AnyPgColumn,
	bigint,
	boolean,
	check,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import type { ColorChoices } from '../../colors';

/*
 * Mirrors the database monfly-v1 created with Prisma: introspected with
 * `pnpm db:pull`, then curated. Table and column names are the database's —
 * Prisma's PascalCase tables, camelCase columns — so never rename them here.
 *
 * Prisma generated some values in its client, never in the database. They are
 * recreated so inserts and updates from v2 behave the same:
 *   - `@default(uuid())` → `$defaultFn`: the id columns have no default.
 *   - `@updatedAt`       → `$onUpdate`: there is no trigger.
 *
 * Money is `double precision`, as in v1 — known debt, the plan is integer
 * cents. Don't write new arithmetic that accumulates floats.
 */

const uuid = () => crypto.randomUUID();
const now = () => new Date();

/** Prisma's `DateTime`: timestamp(3) without time zone, holding UTC. */
const datetime = () => timestamp({ precision: 3 });
const id = () => text().primaryKey().$defaultFn(uuid);
const createdAt = () =>
	datetime()
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull();
const updatedAt = () =>
	datetime()
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull()
		.$onUpdate(now);

/**
 * Ownership goes through the user's email, not the id — v1's design. Each key
 * keeps the name Prisma gave it, `<Table>_userEmail_fkey`, so Drizzle Kit sees
 * the database it describes rather than eleven keys to create.
 */
const userEmail = (table: string) =>
	text()
		.notNull()
		.references(() => user.email, {
			name: `${table}_userEmail_fkey`,
			onDelete: 'restrict',
			onUpdate: 'cascade'
		});

export const user = pgTable(
	'User',
	{
		id: id(),
		email: text().notNull(),
		// Legacy bcrypt hash for v1's own login. Auth0 owns credentials now, so
		// accounts created from v2 leave it null. Never select or return it.
		password: text(),
		name: text(),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		totalBalance: doublePrecision().default(0).notNull(),
		preferredCurrency: text(),
		marketingOptIn: boolean().default(false).notNull(),
		productUpdatesOptIn: boolean().default(true).notNull(),
		acceptedTermsAt: datetime(),
		acceptedPrivacyAt: datetime(),
		avatarSeed: text(),
		// Set from v2's dashboard (PUT /api/me/budget). Integer cents, null when
		// unset — the first money column stored the planned way. v1 ignores it.
		monthlyBudgetCents: integer(),
		// Colours picked in v2 (PATCH /api/me/colors), one JSON document — see
		// $lib/colors. v1 ignores it.
		colors: jsonb().$type<ColorChoices>(),
		// Header shortcuts pinned in v2 (PATCH /api/me/shortcuts), by id — see
		// $lib/shortcuts. Overview is always shown, so it's never stored. v1
		// ignores it.
		shortcuts: text()
			.array()
			.default(sql`ARRAY['overview', 'transactions']::text[]`)
	},
	(table) => [uniqueIndex('User_email_key').using('btree', table.email.asc().nullsLast())]
);

export const transaction = pgTable(
	'Transaction',
	{
		id: id(),
		userEmail: userEmail('Transaction'),
		amount: doublePrecision().notNull(),
		type: text().notNull(),
		category: text().notNull(),
		description: text(),
		date: datetime().notNull(),
		cardId: text().references(() => card.id, {
			name: 'Transaction_cardId_fkey',
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		appliedToLoanId: text().references((): AnyPgColumn => loan.id, {
			name: 'Transaction_appliedToLoanId_fkey',
			onDelete: 'set null',
			onUpdate: 'cascade'
		})
	},
	(table) => [
		index('Transaction_appliedToLoanId_idx').using(
			'btree',
			table.appliedToLoanId.asc().nullsLast()
		),
		index('Transaction_cardId_date_idx').using(
			'btree',
			table.cardId.asc().nullsLast(),
			table.date.asc().nullsLast()
		),
		index('Transaction_userEmail_cardId_idx').using(
			'btree',
			table.userEmail.asc().nullsLast(),
			table.cardId.asc().nullsLast()
		),
		index('Transaction_userEmail_createdAt_idx').using(
			'btree',
			table.userEmail.asc().nullsLast(),
			table.createdAt.asc().nullsLast()
		),
		index('Transaction_userEmail_date_idx').using(
			'btree',
			table.userEmail.asc().nullsLast(),
			table.date.asc().nullsLast()
		),
		index('Transaction_userEmail_idx').using('btree', table.userEmail.asc().nullsLast()),
		index('Transaction_userEmail_type_idx').using(
			'btree',
			table.userEmail.asc().nullsLast(),
			table.type.asc().nullsLast()
		)
	]
);

export const card = pgTable(
	'Card',
	{
		id: id(),
		userEmail: userEmail('Card'),
		name: text().notNull(),
		type: text(),
		last4: text(),
		provider: text(),
		balance: doublePrecision(),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		color: text(),
		status: text().default('active').notNull(),
		// "main" or "secondary": the accounts the dashboard features, set from
		// v2. At most one of each per user — the unique index; NULLs never collide.
		role: text()
	},
	(table) => [
		index('Card_userEmail_idx').using('btree', table.userEmail.asc().nullsLast()),
		uniqueIndex('Card_userEmail_role_key').using(
			'btree',
			table.userEmail.asc().nullsLast(),
			table.role.asc().nullsLast()
		)
	]
);

/**
 * A balance set by hand from v2: which account, what it moved by and when.
 * Written in the same statement that rewrites the balance, so the history
 * chart winds a balance back through it rather than rewriting the past — a
 * correction today shows as a step today, not as a line that was always
 * higher. v2's alone; v1 never reads it, and its own hand edits leave no row.
 * Deleting the card deletes its rows, so v1's delete still works.
 */
export const balanceAdjustment = pgTable(
	'BalanceAdjustment',
	{
		id: id(),
		userEmail: userEmail('BalanceAdjustment'),
		cardId: text()
			.notNull()
			.references(() => card.id, {
				name: 'BalanceAdjustment_cardId_fkey',
				onDelete: 'cascade',
				onUpdate: 'cascade'
			}),
		// Signed whole cents: what the balance moved by. bigint, since a balance
		// runs to MAX_BALANCE either way and a correction can span both.
		amountCents: bigint({ mode: 'number' }).notNull(),
		createdAt: createdAt()
	},
	(table) => [
		index('BalanceAdjustment_cardId_createdAt_idx').using(
			'btree',
			table.cardId.asc().nullsLast(),
			table.createdAt.asc().nullsLast()
		),
		index('BalanceAdjustment_userEmail_idx').using('btree', table.userEmail.asc().nullsLast())
	]
);

export const category = pgTable(
	'Category',
	{
		id: id(),
		name: text().notNull(),
		icon: text().notNull(),
		userEmail: userEmail('Category'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('Category_userEmail_idx').using('btree', table.userEmail.asc().nullsLast())]
);

export const loan = pgTable(
	'Loan',
	{
		id: id(),
		userEmail: userEmail('Loan'),
		debtor: text().notNull(),
		amount: doublePrecision().notNull(),
		amountPaid: doublePrecision().default(0).notNull(),
		status: text().default('pending').notNull(),
		issuedAt: datetime()
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		dueAt: datetime(),
		paidAt: datetime(),
		notes: text(),
		transactionId: text().references((): AnyPgColumn => transaction.id, {
			name: 'Loan_transactionId_fkey',
			onDelete: 'set null',
			onUpdate: 'cascade'
		}),
		createdAt: createdAt(),
		updatedAt: updatedAt(),
		direction: text().default('lent').notNull()
	},
	(table) => [
		index('Loan_transactionId_idx').using('btree', table.transactionId.asc().nullsLast()),
		index('Loan_userEmail_direction_idx').using(
			'btree',
			table.userEmail.asc().nullsLast(),
			table.direction.asc().nullsLast()
		),
		index('Loan_userEmail_dueAt_idx').using(
			'btree',
			table.userEmail.asc().nullsLast(),
			table.dueAt.asc().nullsLast()
		),
		index('Loan_userEmail_idx').using('btree', table.userEmail.asc().nullsLast()),
		index('Loan_userEmail_status_idx').using(
			'btree',
			table.userEmail.asc().nullsLast(),
			table.status.asc().nullsLast()
		)
	]
);

export const budget = pgTable('Budget', {
	id: id(),
	userEmail: userEmail('Budget'),
	category: text().notNull(),
	amountLimit: doublePrecision().notNull(),
	amountSpent: doublePrecision().default(0).notNull(),
	startDate: datetime().notNull(),
	endDate: datetime().notNull(),
	createdAt: createdAt()
});

export const pot = pgTable('Pot', {
	id: id(),
	userEmail: userEmail('Pot'),
	title: text().notNull(),
	goalAmount: doublePrecision().notNull(),
	currentAmount: doublePrecision().default(0).notNull(),
	category: text(),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const recurringBill = pgTable('RecurringBill', {
	id: id(),
	userEmail: userEmail('RecurringBill'),
	title: text().notNull(),
	amount: doublePrecision().notNull(),
	frequency: text().notNull(),
	nextDueDate: datetime().notNull(),
	category: text().notNull(),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

export const monthlySummary = pgTable('MonthlySummary', {
	id: id(),
	userEmail: userEmail('MonthlySummary'),
	month: integer().notNull(),
	year: integer().notNull(),
	incomeTotal: doublePrecision().default(0).notNull(),
	expenseTotal: doublePrecision().default(0).notNull(),
	createdAt: createdAt(),
	// The one updatedAt with no database default: Prisma always supplied it.
	updatedAt: datetime().notNull().$defaultFn(now).$onUpdate(now)
});

/**
 * A shortcut going into the header or out of it: who, which, which way, from
 * where and when. Written in the same statement that changes `User.shortcuts`,
 * and only when the array really changed, so it's the history the shortcuts
 * page draws its charts from. v2's alone; v1 never reads it.
 */
export const shortcutEvent = pgTable(
	'ShortcutEvent',
	{
		id: id(),
		userEmail: userEmail('ShortcutEvent'),
		// An id from $lib/shortcuts.
		shortcutId: text().notNull(),
		// True when it went into the header, false when it came out.
		pinned: boolean().notNull(),
		// Where it was changed: the page's switch, the header's ✕, or the lock.
		source: text().notNull(),
		createdAt: createdAt()
	},
	(table) => [
		index('ShortcutEvent_userEmail_createdAt_idx').using(
			'btree',
			table.userEmail.asc().nullsLast(),
			table.createdAt.asc().nullsLast()
		),
		check('ShortcutEvent_source_check', sql`${table.source} in ('page', 'header', 'lock')`)
	]
);
