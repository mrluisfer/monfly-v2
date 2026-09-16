import { and, desc, eq, sql } from 'drizzle-orm';
import type { Cents, Currency } from '../../finance/money';
import { addMonths, type MonthKey } from '../../finance/period';
import { savingsArrival, savingsProgress, type Savings } from '../../finance/savings';
import type { db as appDb } from '../db';
import { card, pot, transaction } from '../db/schema';
import { INCOME, amountCents, notTransfer, signedCents, utcMidnight } from './fragments';

/** Prisma's `@updatedAt` writes UTC wall-clock time into a zone-less column; so does this. */
const nowUtc = sql`(now() at time zone 'utc')`;

/** The account the goal reads from, when one is marked. */
const savingsAccount = (userEmail: string) =>
	and(eq(card.userEmail, userEmail), eq(card.role, 'savings'), eq(card.status, 'active'));

/** What a goal is called until someone renames it. */
const DEFAULT_TITLE = 'Savings goal';

/**
 * v2 keeps one goal per person, the newest, though `Pot` holds as many as you
 * like — v1 never grew a screen for them, so there is only ever the one until
 * the dashboard gains a place to show several.
 */
async function currentPot(db: Pick<typeof appDb, 'select'>, userEmail: string) {
	const [row] = await db
		.select({ id: pot.id })
		.from(pot)
		.where(eq(pot.userEmail, userEmail))
		.orderBy(desc(pot.createdAt))
		.limit(1);
	return row?.id ?? null;
}

/** Months of history a pace is read from: enough to smooth a lumpy month. */
const PACE_MONTHS = 6;

type Read = {
	userEmail: string;
	currency: Currency;
	/** The month "this month" covers, drawn in the viewer's zone. */
	month: MonthKey;
	timeZone: string;
};

/** `YYYY-MM` as a count of months, so two keys can be subtracted. */
const monthIndex = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7));

/**
 * What goes in per month, averaged over the months the account has been
 * running, capped at `PACE_MONTHS`. Null when nothing has gone in — a pace of
 * zero or less says nothing about when a goal arrives.
 */
function paceOf(recent: number, first: string | null, month: MonthKey): Cents | null {
	if (first === null || recent <= 0) return null;
	const months = Math.min(PACE_MONTHS, monthIndex(month) - monthIndex(first) + 1);
	return Math.round(recent / Math.max(months, 1));
}

/** The goal, its running total, and — with an account linked — its pace. */
export async function getSavings(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, currency, month, timeZone }: Read
): Promise<Savings> {
	const monthEnd = utcMidnight(`${addMonths(month, 1)}-01`, timeZone);
	const inMonth = sql`${transaction.date} >= ${utcMidnight(`${month}-01`, timeZone)} and ${transaction.date} < ${monthEnd}`;
	const inWindow = sql`${transaction.date} >= ${utcMidnight(`${addMonths(month, -(PACE_MONTHS - 1))}-01`, timeZone)} and ${transaction.date} < ${monthEnd}`;

	const [[row], [linked]] = await Promise.all([
		db
			.select({
				title: pot.title,
				// Stored as double precision, as all v1 money is: to cents here, integers after.
				goal: sql<string>`round(${pot.goalAmount}::numeric * 100)`,
				saved: sql<string>`round(${pot.currentAmount}::numeric * 100)`,
				updatedAt: pot.updatedAt
			})
			.from(pot)
			.where(eq(pot.userEmail, userEmail))
			.orderBy(desc(pot.createdAt))
			.limit(1),
		// Net movement, not income alone: a withdrawal has to count against the
		// month as much as a deposit counts for it.
		db
			.select({
				id: card.id,
				name: card.name,
				balance: sql<string>`round(coalesce(${card.balance}, 0)::numeric * 100)`,
				updatedAt: card.updatedAt,
				thisMonth: sql<string>`coalesce(sum(${signedCents}) filter (where ${inMonth}), 0)`,
				recent: sql<string>`coalesce(sum(${signedCents}) filter (where ${inWindow}), 0)`,
				// What left it this month, counted apart: the net above hides a
				// charge behind a deposit, and a forgotten one is worth naming. A
				// transfer out was moved on purpose, so it isn't a charge.
				outAmount: sql<string>`coalesce(sum(${amountCents}) filter (where ${inMonth} and ${transaction.type} <> ${INCOME} and ${notTransfer}), 0)`,
				outCount: sql<number>`count(${transaction.id}) filter (where ${inMonth} and ${transaction.type} <> ${INCOME} and ${notTransfer})::int`,
				first: sql<string | null>`to_char(min(${transaction.date}), 'YYYY-MM')`
			})
			.from(card)
			.leftJoin(transaction, eq(transaction.cardId, card.id))
			.where(savingsAccount(userEmail))
			.groupBy(card.id)
			.limit(1)
	]);

	const goal = row ? Number(row.goal) : 0;
	// With an account linked, its balance is what's saved: one figure, so the
	// two can never disagree. Without one, the pot keeps its own tally.
	const moved = linked?.updatedAt ?? row?.updatedAt ?? null;
	const saved = linked ? Number(linked.balance) : Number(row?.saved ?? 0);
	const pace = linked ? paceOf(Number(linked.recent), linked.first, month) : null;

	// The month it arrives is worked out here, where the viewer's zone already
	// frames the months; the page only has to name it.
	const progress = savingsProgress(saved, goal > 0 ? goal : null);
	const away = progress ? savingsArrival(progress.remaining, pace) : null;

	return {
		currency,
		title: row?.title ?? DEFAULT_TITLE,
		// Zero is how "no goal" is stored, so what's saved is never lost to clearing one.
		goal: goal > 0 ? goal : null,
		saved,
		account: linked ? { id: linked.id, name: linked.name } : null,
		thisMonth: linked ? Number(linked.thisMonth) : null,
		outflow: linked ? { count: linked.outCount, amount: Number(linked.outAmount) } : null,
		pace,
		arrival: away === null ? null : addMonths(month, away),
		updatedAt: moved ? moved.toISOString() : null
	};
}

/**
 * Sets what someone plans to save. Null clears the goal by storing zero rather
 * than deleting the row: clearing a goal must never throw away the record of
 * what's already been put aside. Validate with `isSavingsAmount` first.
 */
export async function setSavingsGoal(
	db: Pick<typeof appDb, 'select' | 'insert' | 'update'>,
	{ userEmail, goal }: { userEmail: string; goal: Cents | null }
): Promise<void> {
	const amount = (goal ?? 0) / 100;
	const id = await currentPot(db, userEmail);

	if (id === null) {
		if (goal === null) return; // nothing to clear
		await db.insert(pot).values({ userEmail, title: DEFAULT_TITLE, goalAmount: amount });
		return;
	}

	await db.update(pot).set({ goalAmount: amount }).where(eq(pot.id, id));
}

/**
 * Adds to the running total, in one statement so two additions at once can't
 * lose each other — the HTTP driver holds no transaction open. False when
 * there is no goal to add to.
 */
export async function addToSavings(
	db: Pick<typeof appDb, 'select' | 'update'>,
	{ userEmail, amount }: { userEmail: string; amount: Cents }
): Promise<boolean> {
	const id = await currentPot(db, userEmail);
	if (id === null) return false;

	await db
		.update(pot)
		.set({ currentAmount: sql`${pot.currentAmount} + ${amount / 100}` })
		.where(eq(pot.id, id));
	return true;
}

/**
 * Moves money into the savings account: a transfer, not income. One expense on
 * the account it comes from, one income on the savings account, sharing a
 * `transferId` as every transfer's sides do, both in a single statement so
 * neither can land without the other and the balances move by exactly what was
 * written. `User.totalBalance` is deliberately left alone —
 * v1 moves it per transaction, and the two rows cancel out: the money changed
 * places, it wasn't earned. False when either account is missing or they are
 * the same one.
 */
export async function addSavingsTransfer(
	db: Pick<typeof appDb, 'execute'>,
	{ userEmail, amount, from }: { userEmail: string; amount: Cents; from: string }
): Promise<boolean> {
	// v1 stores money in major units, and ids in the client rather than the column.
	const major = sql`${amount / 100}::numeric`;
	const out = crypto.randomUUID();
	const into = crypto.randomUUID();
	const transferId = crypto.randomUUID();
	const note = 'Moved to savings';

	const { rows } = await db.execute<{ moved: boolean }>(sql`
		with savings as (
			select ${card.id} as id from ${card} where ${savingsAccount(userEmail)}
		),
		source as (
			select ${card.id} as id from ${card}
			where ${card.id} = ${from} and ${card.userEmail} = ${userEmail}
				and ${card.status} = 'active' and ${card.id} <> (select id from savings)
		),
		spent as (
			insert into ${transaction} ("id", "userEmail", "amount", "type", "category",
				"description", "date", "cardId", "createdAt", "updatedAt", "transferId")
			select ${out}, ${userEmail}, ${major}, 'expense', 'Savings', ${note},
				${nowUtc}, (select id from source), ${nowUtc}, ${nowUtc}, ${transferId}
			where exists (select 1 from source)
			returning "id"
		),
		put as (
			insert into ${transaction} ("id", "userEmail", "amount", "type", "category",
				"description", "date", "cardId", "createdAt", "updatedAt", "transferId")
			select ${into}, ${userEmail}, ${major}, 'income', 'Savings', ${note},
				${nowUtc}, (select id from savings), ${nowUtc}, ${nowUtc}, ${transferId}
			where exists (select 1 from spent)
			returning "id"
		),
		debited as (
			update ${card}
			set "balance" = round(coalesce(${card.balance}, 0)::numeric - ${major}, 2),
				"updatedAt" = ${nowUtc}
			where ${card.id} = (select id from source) and exists (select 1 from put)
			returning ${card.id}
		),
		credited as (
			update ${card}
			set "balance" = round(coalesce(${card.balance}, 0)::numeric + ${major}, 2),
				"updatedAt" = ${nowUtc}
			where ${card.id} = (select id from savings) and exists (select 1 from debited)
			returning ${card.id}
		)
		select exists (select 1 from credited) as moved
	`);

	return rows[0]?.moved === true;
}
