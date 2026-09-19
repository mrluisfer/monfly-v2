/** TanStack Query options for our endpoints: one key factory and fetcher per resource. */
export {
	accountKeys,
	accountsQuery,
	addAccountMutation,
	archivedAccountsQuery,
	balanceHistoryQuery,
	deleteAccountMutation,
	editAccountMutation,
	setAccountIconMutation,
	setAccountRoleMutation,
	setAccountStatusMutation
} from './accounts';
export { setBudgetMutation } from './budget';
export { budgetKeys, budgetMonthQuery, setCategoryBudgetMutation } from './budgets';
export { colorChoicesQuery, colorKeys, setColorMutation } from './colors';
export { expenseBreakdownQuery, expenseKeys, expensesQuery } from './expenses';
export { ApiError, getJson, sendJson, type Fetch } from './http';
export { incomeKeys, incomeQuery } from './income';
export {
	addLoanMutation,
	deleteLoanMutation,
	editLoanMutation,
	loanKeys,
	loansQuery,
	payLoanMutation,
	settleLoanMutation,
	undoPaymentMutation
} from './loans';
export { addSavingsMutation, savingsKeys, savingsQuery, setSavingsGoalMutation } from './savings';
export {
	setShortcutMutation,
	setShortcutOrderMutation,
	shortcutActivityQuery,
	shortcutKeys,
	shortcutsQuery
} from './shortcuts';
export { monthSpendingQuery, spendingKeys } from './spending';
export {
	addTransactionMutation,
	addTransferMutation,
	assignAccountMutation,
	deleteTransactionMutation,
	deleteTransferMutation,
	editTransactionMutation,
	editTransferMutation,
	transactionKeys,
	transactionsQuery,
	unassignedQuery
} from './transactions';
