<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Pencil from '@lucide/svelte/icons/pencil';

	import { countUp, reveal } from '$lib/actions';
	import {
		AccountBlock,
		CategoryChip,
		ExpensesDial,
		IncomeBars,
		TipCard
	} from '$lib/components/dashboard';
	import { Card, Figure, IconButton, Meter, PillButton } from '$lib/components/ui';
	import { formatCurrency } from '$lib/utils';

	// Placeholder figures — there is no data layer yet.
	const meters = [
		{ label: 'Spent this month', cap: 7540, spent: 2000, rest: 5540, value: 0.27, color: 'lime' as const },
		{ label: 'Savings goal', cap: 13000, spent: 6000, rest: 13000, value: 0.46, color: 'blue' as const }
	];

	const categories = [
		{ label: 'Meals & Food', value: 1456, color: 'violet' as const },
		{ label: 'Automotive', value: 9342, color: 'lime' as const },
		{ label: 'Rent & Mortgage', value: 14598, color: 'blue' as const },
		{ label: 'Travel', value: 12654, color: 'none' as const }
	];

	const accounts = [
		{ name: 'Main', updated: 'Updated 4 days ago', balance: 12435, tracked: 4987, toReview: 94, color: 'lime' as const },
		{ name: 'Savings', updated: 'Updated 4 days ago', balance: 88435, tracked: 83987, toReview: 107, color: 'blue' as const }
	];

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
			{#each meters as m (m.label)}
				<div>
					<div class="mb-3 flex items-baseline justify-between gap-4">
						<span class="text-[0.9375rem] text-fg-muted">{m.label}</span>
						<Figure value={formatCurrency(m.cap)} size="sm" />
					</div>
					<Meter value={m.value} color={m.color} />
					<div class="mt-3 flex items-baseline justify-between gap-4">
						<div>
							<Figure value={formatCurrency(m.spent)} size="sm" />
							<p class="mt-0.5 text-sm text-fg-muted">Committed</p>
						</div>
						<div class="text-right">
							<Figure value={formatCurrency(m.rest)} size="sm" class="text-fg-subtle" />
							<p class="mt-0.5 text-sm text-fg-muted">Remaining</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- ── Card grid ──────────────────────────────────────────────────── -->
	<div class="grid gap-4 xl:grid-cols-3">
		<!-- Expenses -->
		<div use:reveal={{ delay: 0.05 }}>
			<Card class="flex h-full flex-col p-7">
				<div class="flex items-center justify-between gap-4">
					<h2 class="font-display text-2xl font-medium">Expenses</h2>
					<PillButton size="sm" caret>Year to date</PillButton>
				</div>

				<div class="relative mt-4 flex-1">
					<ExpensesDial class="w-full max-w-[26rem]" />
					<div class="mt-2 grid grid-cols-2 gap-2 sm:absolute sm:right-0 sm:bottom-0 sm:mt-0 sm:w-[62%]">
						{#each categories as c (c.label)}
							<CategoryChip {...c} />
						{/each}
					</div>
				</div>

				<div class="mt-8">
					<p
						class="font-display tabular text-[3.25rem] leading-none font-light tracking-tight"
						use:countUp={{ value: 87121, format: formatCurrency, whenVisible: true }}
					></p>
					<p class="mt-2 text-[0.9375rem] text-fg-muted">Total spending</p>
				</div>
			</Card>
		</div>

		<!-- Accounts -->
		<div class="flex flex-col gap-4" use:reveal={{ delay: 0.1 }}>
			<Card>
				<div class="flex items-center justify-between gap-4 px-7 pt-7">
					<h2 class="font-display text-2xl font-medium">Accounts</h2>
					<div class="flex gap-2">
						<IconButton size="sm" aria-label="Edit accounts"><Pencil /></IconButton>
						<IconButton size="sm" aria-label="Open accounts"><ExternalLink /></IconButton>
					</div>
				</div>
				<AccountBlock {...accounts[0]} />
			</Card>

			<Card class="flex-1">
				<AccountBlock {...accounts[1]} />
			</Card>
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
