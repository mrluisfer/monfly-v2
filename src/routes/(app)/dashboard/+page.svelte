<script lang="ts">
	import { reveal } from '$lib/actions';
	import {
		AccountsCard,
		ExpensesCard,
		IncomeCard,
		LoansCard,
		RecentTransactionsCard,
		SavingsGoal,
		SpentThisMonth
	} from '$lib/components/dashboard';
	import { DeskFreedomTip } from '$lib/components/tips';
	import { CardTabs } from '$lib/components/ui';

	let { data } = $props();

	// Tips, Loans and the latest transactions share the one slot under Income,
	// so the column keeps the height the grid gives it and the row stays level
	// across all three. Stacked, under xl, no row gives it a height, so it keeps
	// a floor of its own: room for the tip's globe and most of the five rows.
	const asides = [
		{ value: 'tips', label: 'Tips' },
		{ value: 'loans', label: 'Loans' },
		{ value: 'transactions', label: 'Transactions' }
	] as const;
	let aside = $state<(typeof asides)[number]['value']>('tips');
</script>

<div class="flex flex-col gap-4 px-4 pb-6 sm:px-6 lg:px-8">
	<!-- ── Hero band ──────────────────────────────────────────────────── -->
	<section
		class="grid items-center gap-8 py-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-12"
		use:reveal
	>
		<h1 class="font-display text-6xl leading-none font-light tracking-tight xl:text-7xl">
			Overview
		</h1>

		<div class="grid gap-x-12 gap-y-8 sm:grid-cols-2">
			<SpentThisMonth month={data.month} enabled={data.profile !== null} />
			<SavingsGoal enabled={data.profile !== null} />
		</div>
	</section>

	<!-- ── Card grid ──────────────────────────────────────────────────── -->
	<div class="grid gap-4 xl:grid-cols-3">
		<!-- Expenses -->
		<div use:reveal={{ delay: 0.05 }}>
			<ExpensesCard timeZone={data.timeZone} enabled={data.profile !== null} />
		</div>

		<!-- Accounts: main and secondary, a card each -->
		<div class="flex flex-col gap-4" use:reveal={{ delay: 0.1 }}>
			<AccountsCard
				timeZone={data.timeZone}
				enabled={data.profile !== null}
				leftOut={data.leftOut}
			/>
		</div>

		<!-- Income + the Tips / Loans / Transactions aside -->
		<div class="flex flex-col gap-4" use:reveal={{ delay: 0.15 }}>
			<IncomeCard enabled={data.profile !== null} view={data.incomeView} />

			<CardTabs
				options={[...asides]}
				bind:value={aside}
				label="Tips, loans and transactions"
				class="min-h-96 flex-1 xl:min-h-0"
			>
				{#snippet panel(value)}
					{#if value === 'tips'}
						<DeskFreedomTip />
					{:else if value === 'loans'}
						<LoansCard />
					{:else}
						<RecentTransactionsCard
							timeZone={data.timeZone}
							open={aside === 'transactions'}
							enabled={data.profile !== null}
						/>
					{/if}
				{/snippet}
			</CardTabs>
		</div>
	</div>
</div>
