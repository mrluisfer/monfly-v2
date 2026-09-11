<script lang="ts">
	import { reveal } from '$lib/actions';
	import {
		AccountsCard,
		ExpensesCard,
		IncomeBars,
		MeterStat,
		SpentThisMonth,
		TipCard
	} from '$lib/components/dashboard';
	import { Card, Figure, PillButton } from '$lib/components/ui';
	import { formatCurrency } from '$lib/utils';

	let { data } = $props();

	// Placeholder figures below until each widget gets its own query, as
	// "Spent this month", Expenses and Accounts have. Savings goals will come from pots.
	const savings = { cap: 13000, spent: 6000, rest: 13000, value: 0.46 };

	const bars = [
		{ label: '$60k', height: 68, color: 'lime' as const },
		{ label: '$40k', height: 46, color: 'violet' as const },
		{ label: '$90k', height: 100, color: 'blue' as const }
	];
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
			<Card class="flex flex-col p-7">
				<div class="flex items-center justify-between gap-4">
					<h2 class="font-display text-2xl font-medium">Income</h2>
					<PillButton size="sm" caret>This quarter</PillButton>
				</div>

				<div class="mt-6">
					<Figure value={formatCurrency(467121)} accentSymbol="lime" size="lg" />
					<p class="mt-1.5 text-[0.9375rem] text-fg-muted">This quarter</p>
				</div>

				<IncomeBars {bars} class="mt-8 h-56" />
			</Card>

			<Card class="flex-1">
				<TipCard />
			</Card>
		</div>
	</div>
</div>
