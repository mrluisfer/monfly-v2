import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Relations for Drizzle's relational queries (`db.query.*`), named after the
 * Prisma models in monfly-v1 so ported queries read the same.
 *
 * Transaction and Loan are linked twice, hence the aliases: `loanOrigin` is the
 * transaction a loan came from, `loanPayments` the transactions that repay it.
 */
export const relations = defineRelations(schema, (r) => ({
	user: {
		budgets: r.many.budget(),
		cards: r.many.card(),
		categories: r.many.category(),
		loans: r.many.loan(),
		monthlySummaries: r.many.monthlySummary(),
		pots: r.many.pot(),
		recurringBills: r.many.recurringBill(),
		transactions: r.many.transaction()
	},
	transaction: {
		user: r.one.user({ from: r.transaction.userEmail, to: r.user.email, optional: false }),
		card: r.one.card({ from: r.transaction.cardId, to: r.card.id }),
		appliedToLoan: r.one.loan({
			from: r.transaction.appliedToLoanId,
			to: r.loan.id,
			alias: 'loanPayments'
		}),
		loans: r.many.loan({ alias: 'loanOrigin' })
	},
	loan: {
		user: r.one.user({ from: r.loan.userEmail, to: r.user.email, optional: false }),
		transaction: r.one.transaction({
			from: r.loan.transactionId,
			to: r.transaction.id,
			alias: 'loanOrigin'
		}),
		payments: r.many.transaction({ alias: 'loanPayments' })
	},
	card: {
		user: r.one.user({ from: r.card.userEmail, to: r.user.email, optional: false }),
		transactions: r.many.transaction()
	},
	category: { user: r.one.user({ from: r.category.userEmail, to: r.user.email, optional: false }) },
	budget: { user: r.one.user({ from: r.budget.userEmail, to: r.user.email, optional: false }) },
	pot: { user: r.one.user({ from: r.pot.userEmail, to: r.user.email, optional: false }) },
	recurringBill: {
		user: r.one.user({ from: r.recurringBill.userEmail, to: r.user.email, optional: false })
	},
	monthlySummary: {
		user: r.one.user({ from: r.monthlySummary.userEmail, to: r.user.email, optional: false })
	}
}));
