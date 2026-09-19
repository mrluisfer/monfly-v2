import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { DateKey } from '../../finance/period';
import type { Currency } from '../../finance/money';
import { isLoanDirection, loanStatus, type LoanList, type LoanPayment } from '../../loans';
import type { db as appDb } from '../db';
import { card, loan, transaction } from '../db/schema';
import { amountCents } from '../finance/fragments';

type Input = {
	/** The stored `User.email` — `profile.email`, never the Auth0 spelling. */
	userEmail: string;
	currency: Currency;
	/** The viewer's zone: a day with an hour on it is read in it. */
	timeZone: string;
};

/**
 * The calendar day a loan's timestamp stands for. v1 writes the days picked in
 * its form as UTC midnight (`new Date('2026-05-02')`), so a stamp at exactly
 * midnight is that day as written; any other — the moment a loan was made or
 * settled, or a local midnight — is the day it fell on in the viewer's zone.
 */
export const calendarDay = (column: AnyPgColumn, timeZone: string) => sql<string>`
	case when ${column}::time = '00:00'
		then to_char(${column}, 'YYYY-MM-DD')
		else to_char((${column} at time zone 'UTC') at time zone ${timeZone}, 'YYYY-MM-DD')
	end`;

const cents = (column: AnyPgColumn) => sql<string>`round(${column}::numeric * 100)`;

/**
 * Every loan the user made or took, newest first, each with the payments
 * recorded on their accounts. Read-only.
 */
export async function getLoans(
	db: Pick<typeof appDb, 'select'>,
	{ userEmail, currency, timeZone }: Input
): Promise<LoanList> {
	const [loans, payments] = await Promise.all([
		db
			.select({
				id: loan.id,
				direction: loan.direction,
				person: loan.debtor,
				amount: cents(loan.amount),
				paid: cents(loan.amountPaid),
				issuedOn: calendarDay(loan.issuedAt, timeZone),
				dueOn: sql<
					string | null
				>`case when ${loan.dueAt} is null then null else ${calendarDay(loan.dueAt, timeZone)} end`,
				paidOn: sql<
					string | null
				>`case when ${loan.paidAt} is null then null else ${calendarDay(loan.paidAt, timeZone)} end`,
				notes: loan.notes
			})
			.from(loan)
			.where(eq(loan.userEmail, userEmail))
			.orderBy(desc(loan.issuedAt), desc(loan.id)),
		db
			.select({
				id: transaction.id,
				loanId: transaction.appliedToLoanId,
				date: sql<string>`to_char(${transaction.date}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`,
				amount: sql<string>`${amountCents}`,
				accountId: card.id,
				accountName: card.name,
				description: transaction.description
			})
			.from(transaction)
			.leftJoin(card, and(eq(card.id, transaction.cardId), eq(card.status, 'active')))
			.where(and(eq(transaction.userEmail, userEmail), isNotNull(transaction.appliedToLoanId)))
			.orderBy(desc(transaction.date), desc(transaction.id))
	]);

	const byLoan = new Map<string, LoanPayment[]>();
	for (const row of payments) {
		if (!row.loanId) continue;
		const list = byLoan.get(row.loanId) ?? [];
		list.push({
			id: row.id,
			date: row.date,
			amount: Number(row.amount),
			account:
				row.accountId && row.accountName ? { id: row.accountId, name: row.accountName } : null,
			description: row.description?.trim() || null
		});
		byLoan.set(row.loanId, list);
	}

	return {
		currency,
		loans: loans.map((row) => {
			const amount = Number(row.amount);
			const paid = Number(row.paid);
			return {
				id: row.id,
				// v1 defaults the column to lent; anything else it may hold reads the same way.
				direction: isLoanDirection(row.direction) ? row.direction : 'lent',
				person: row.person.trim(),
				amount,
				paid,
				status: loanStatus(amount, paid),
				issuedOn: row.issuedOn as DateKey,
				dueOn: row.dueOn as DateKey | null,
				paidOn: row.paidOn as DateKey | null,
				notes: row.notes?.trim() || null,
				payments: byLoan.get(row.id) ?? []
			};
		})
	};
}
