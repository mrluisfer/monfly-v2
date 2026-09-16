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
export { colorChoicesQuery, colorKeys, setColorMutation } from './colors';
export { expenseBreakdownQuery, expenseKeys } from './expenses';
export { ApiError, getJson, sendJson, type Fetch } from './http';
export { incomeKeys, incomeQuery } from './income';
export { addSavingsMutation, savingsKeys, savingsQuery, setSavingsGoalMutation } from './savings';
export {
	setShortcutMutation,
	shortcutActivityQuery,
	shortcutKeys,
	shortcutsQuery
} from './shortcuts';
export { monthSpendingQuery, spendingKeys } from './spending';
export {
	addTransactionMutation,
	assignAccountMutation,
	deleteTransactionMutation,
	editTransactionMutation,
	transactionKeys,
	transactionsQuery,
	unassignedQuery
} from './transactions';
