import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/svelte-query';
import type { LoanDraft, LoanList, LoanPaymentEntry } from '$lib/loans';
import { accountKeys } from './accounts';
import { expenseKeys } from './expenses';
import { getJson, sendJson, type Fetch } from './http';
import { incomeKeys } from './income';
import { savingsKeys } from './savings';
import { spendingKeys } from './spending';
import { transactionKeys } from './transactions';

/** After any loan write, invalidate `loanKeys.all`; a payment moves far more (`refreshAfterPayment`). */
export const loanKeys = {
	all: ['loans'] as const
};

/** Every loan, newest first, with its recorded payments. Pass SvelteKit's `fetch` from a load. */
export const loansQuery = (fetcher: Fetch = fetch) =>
	queryOptions({
		queryKey: loanKeys.all,
		queryFn: () => getJson<LoanList>('/api/loans', fetcher)
	});

const refreshLoans = (queryClient: QueryClient) =>
	queryClient.invalidateQueries({ queryKey: loanKeys.all });

/**
 * A payment recorded on an account is a transaction on it: the loan, the
 * account and the total, the ledger, this month's spending, the dashboard's
 * income and spent charts and the savings goal can all move with it.
 */
const refreshAfterPayment = (queryClient: QueryClient) =>
	Promise.all(
		[
			loanKeys,
			accountKeys,
			transactionKeys,
			spendingKeys,
			incomeKeys,
			expenseKeys,
			savingsKeys
		].map((keys) => queryClient.invalidateQueries({ queryKey: keys.all }))
	);

/** Adds a loan. Read again rather than patched in: the list is ordered by the server. */
export const addLoanMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (draft: LoanDraft) => sendJson<{ id: string }>('/api/loans', 'POST', draft),
		onSuccess: () => refreshLoans(queryClient)
	});

/** Rewrites a loan whole; its status follows what's paid, so it's read again. */
export const editLoanMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ id, draft }: { id: string; draft: LoanDraft }) =>
			sendJson<{ id: string }>(`/api/loans/${encodeURIComponent(id)}`, 'PATCH', draft),
		onSuccess: () => refreshLoans(queryClient)
	});

/** Marks a loan settled, or opens it again. Nothing moves on an account either way. */
export const settleLoanMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ id, settled }: { id: string; settled: boolean }) =>
			sendJson<{ id: string; settled: boolean }>(`/api/loans/${encodeURIComponent(id)}`, 'PATCH', {
				settled
			}),
		onSettled: () => refreshLoans(queryClient)
	});

/** Removes a loan. Not optimistic: the answer to "delete this?" is read in the dialog asking it. */
export const deleteLoanMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: (id: string) =>
			sendJson<{ id: string }>(`/api/loans/${encodeURIComponent(id)}`, 'DELETE', undefined),
		onSettled: () => refreshLoans(queryClient)
	});

/** Settles part of a loan, on an account or off one. */
export const payLoanMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ id, entry }: { id: string; entry: LoanPaymentEntry }) =>
			sendJson<{ id: string | null }>(
				`/api/loans/${encodeURIComponent(id)}/payments`,
				'POST',
				entry
			),
		onSuccess: () => refreshAfterPayment(queryClient)
	});

/** Takes back a payment recorded on an account. */
export const undoPaymentMutation = (queryClient: QueryClient) =>
	mutationOptions({
		mutationFn: ({ loanId, paymentId }: { loanId: string; paymentId: string }) =>
			sendJson<{ id: string }>(
				`/api/loans/${encodeURIComponent(loanId)}/payments/${encodeURIComponent(paymentId)}`,
				'DELETE',
				undefined
			),
		onSettled: () => refreshAfterPayment(queryClient)
	});
