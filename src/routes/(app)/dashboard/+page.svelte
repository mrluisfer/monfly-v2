<script lang="ts">
	import { reveal } from '$lib/actions';
	import {
		AccountsCard,
		ExpensesCard,
		IncomeCard,
		MeterStat,
		SpentThisMonth,
		TipCard
	} from '$lib/components/dashboard';
	import { Card } from '$lib/components/ui';
	import { formatCurrency } from '$lib/utils';

	let { data } = $props();

	// Placeholder until savings goals (pots) have data; every other widget reads its own query.
	const savings = { cap: 13000, spent: 6000, rest: 13000, value: 0.46 };
</script>

<div class="flex flex-col gap-4 pb-6 px-4 sm:px-6 lg:px-8">
	<!-- ── Hero band ──────────────────────────────────────────────────── -->
	<section class="grid items-center gap-8 py-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-12" use:reveal>
		<h1 class="font-display text-6xl leading-none font-light tracking-tight xl:text-7xl">
			Overview
		</h1>

		<div class="grid gap-x-12 gap-y-8 sm:grid-cols-2">
			<SpentThisMonth month={data.month} enabled={data.profile !== null} />
			<MeterStat
				label="Savings goal"
				total={formatCurrency(savings.cap)}
				value={savings.value}
				color="blue"
				start={{ value: formatCurrency(savings.spent), label: 'Committed' }}
				end={{ value: formatCurrency(savings.rest), label: 'Remaining' }}
			/>
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
			<AccountsCard timeZone={data.timeZone} enabled={data.profile !== null} />
		</div>

		<!-- Income + Tips -->
		<div class="flex flex-col gap-4" use:reveal={{ delay: 0.15 }}>
			<IncomeCard enabled={data.profile !== null} />

			<Card class="flex-1">
				<TipCard />
			</Card>
		</div>
	</div>
</div>
