<script lang="ts">
	import ColorBanknote from '@animated-color-icons/lucide-svelte/Banknote.svelte';
	import ColorHash from '@animated-color-icons/lucide-svelte/Hash.svelte';
	import ColorReceipt from '@animated-color-icons/lucide-svelte/Receipt.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { reveal } from '$lib/actions';
	import { accountColors } from '$lib/accounts';
	import { categoryColor } from '$lib/categories';
	import {
		AccountFlows,
		CategoryTrends,
		Highlights,
		IncomeArc,
		PaceCard,
		SparkStat,
		SpendingCalendar,
		Statement,
		TrendCard,
		WhatCounts,
		WhatIf
	} from '$lib/components/insights';
	import { Select } from '$lib/components/ui';
	import {
		DEFAULT_CURRENCY,
		currentMonth,
		currentYear,
		formatMoney,
		monthName,
		todayKey
	} from '$lib/finance';
	import {
		EMPTY_LENS,
		LAST_12,
		NO_ACCOUNT,
		changeFrom,
		entryCount,
		flowOver,
		lensCount,
		spanBefore,
		spanOf,
		summarize,
		toEntries,
		withLens,
		type Flow,
		type InsightsPeriod,
		type Lens
	} from '$lib/insights';
	import { accountsQuery, colorChoicesQuery, transactionsQuery } from '$lib/queries';

	let { data } = $props();

	const enabled = $derived(browser && data.profile !== null);
	// The ledger's own record: the page works every figure out from it, so
	// leaving something out or trying a what-if never waits on the server.
	const record = createQuery(() => ({ ...transactionsQuery(), enabled }));
	const accounts = createQuery(() => ({ ...accountsQuery(), enabled }));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled }));

	const now = $derived(currentMonth(data.timeZone));
	const today = $derived(todayKey(data.timeZone));

	/** The stretch on show — this year to begin with — and what it leaves out: for the visit. */
	let period = $state<InsightsPeriod>(
		untrack(() => String(currentYear(data.timeZone)) as InsightsPeriod)
	);
	let lens = $state<Lens>(EMPTY_LENS);

	const currency = $derived(record.data?.currency ?? DEFAULT_CURRENCY);
	const all = $derived(toEntries(record.data?.transactions ?? [], data.timeZone));
	const counted = $derived(withLens(all, lens));

	const span = $derived(spanOf(period, now));
	const stretch = $derived(summarize(counted, span, today));
	const before = $derived(summarize(counted, spanBefore(span), today));

	/** What every change is measured against, in words. */
	const vs = $derived(
		!span.year
			? 'vs the 12 months before'
			: stretch.elapsed < span.days.length
				? `vs this time in ${before.span.label}`
				: `vs ${before.span.label}`
	);

	/** The last twelve months, then every year from this one back to the first on record. */
	const periods = $derived.by(() => {
		const latest = currentYear(data.timeZone);
		const oldest = record.data?.oldest
			? Number(currentMonth(data.timeZone, new Date(record.data.oldest)).slice(0, 4))
			: latest;
		const years = Array.from({ length: Math.max(1, latest - oldest + 1) }, (_, i) => latest - i);
		return [
			{ value: LAST_12, label: 'Last 12 months' },
			...years.map((year) => ({ value: String(year) as InsightsPeriod, label: String(year) }))
		];
	});

	// ── What counts ──────────────────────────────────────────────────────

	const accountList = $derived(accounts.data?.accounts ?? []);
	const colors = $derived(accountColors(accountList, choices.data?.account));

	/** Every category on record, most used first. */
	const categories = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const entry of all) counts[entry.category] = (counts[entry.category] ?? 0) + 1;
		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([name, count]) => ({ name, count }));
	});
	const tint = $derived(
		Object.fromEntries(
			categories.map((c) => [c.name, categoryColor(c.name, choices.data?.category)])
		)
	);

	const leftOut = $derived.by(() => {
		const parts = [];
		const c = lens.categories.length;
		const a = lens.accounts.length;
		if (c > 0) parts.push(`${c} ${c === 1 ? 'category' : 'categories'}`);
		if (a > 0) parts.push(`${a} ${a === 1 ? 'account' : 'accounts'}`);
		return parts.join(' and ');
	});

	// ── The three figures beside the headline chart ──────────────────────

	/** The stretch before, as far as this one has come. */
	const then = $derived(flowOver(before, Math.min(stretch.elapsed, before.days.length)));
	const monthLabels = $derived(stretch.months.map((m) => monthName(m.key, 'short')));
	const perMonth = (read: (flow: Flow) => number) =>
		stretch.months.map((m) => (m.future ? null : read(m)));

	const averageOut = (flow: Flow) =>
		flow.expenses > 0 ? Math.round(flow.spent / flow.expenses) : 0;
	const averageIn = (flow: Flow) =>
		flow.incomes > 0 ? Math.round(flow.received / flow.incomes) : 0;

	const money = (cents: number) => formatMoney(cents, currency);
	const whole = (n: number) => String(Math.round(n));
</script>

<svelte:head><title>Insights · Monfly</title></svelte:head>

<div class="flex flex-col gap-4 px-4 pb-6 sm:px-6 lg:px-8">
	<!-- ── Hero band: the title, and what the page reads ─────────────────── -->
	<section
		class="grid items-end gap-x-12 gap-y-6 pt-8 pb-2 lg:grid-cols-[minmax(0,1fr)_auto]"
		use:reveal
	>
		<div class="min-w-0">
			<h1 class="font-display text-5xl leading-none font-light tracking-tight xl:text-6xl">
				Insights
			</h1>
			<p class="mt-4 max-w-xl text-[0.9375rem] text-balance text-fg-muted">
				Your numbers to turn over. Leave things out, try a what-if, take the statement to your
				accountant — nothing here changes your records.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2 lg:justify-end">
			{#if record.data?.capped}
				<p class="mr-2 text-sm text-fg-muted">Reading your most recent entries only.</p>
			{/if}
			<WhatCounts
				{lens}
				onChange={(next) => (lens = next)}
				accounts={accountList}
				noAccount={all.some((e) => e.account === NO_ACCOUNT)}
				{categories}
				{colors}
				{tint}
				counted={counted.length}
				total={all.length}
			/>
			<Select label="Period" options={periods} bind:value={period} />
		</div>
	</section>

	<div class="grid gap-3 pb-4" use:reveal={{ delay: 0.05 }}>
		<Highlights {stretch} {currency} categoryChoices={choices.data?.category} />
		{#if lensCount(lens) > 0}
			<p class="text-sm text-fg-muted">
				Leaving out {leftOut}.
				<button
					type="button"
					class="rounded-sm font-medium text-violet underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
					onclick={() => (lens = EMPTY_LENS)}>Count everything</button
				>
			</p>
		{/if}
	</div>

	<!-- ── Card grid: each row lands a beat after the one before ─────────── -->
	<div class="grid gap-4 xl:grid-cols-3">
		<div class="xl:col-span-2" use:reveal={{ delay: 0.1 }}>
			<TrendCard {stretch} {before} {currency} {vs} class="h-full" />
		</div>
		<div class="grid gap-4 sm:grid-cols-3 xl:grid-cols-1" use:reveal={{ delay: 0.15 }}>
			<SparkStat
				label="Entries"
				icon={ColorHash}
				color="violet"
				value={entryCount(stretch.total)}
				format={whole}
				unit="entries"
				change={changeFrom(entryCount(stretch.total), entryCount(then))}
				{vs}
				series={perMonth(entryCount)}
				labels={monthLabels}
			/>
			<SparkStat
				label="Average expense"
				icon={ColorReceipt}
				color="coral"
				value={averageOut(stretch.total)}
				format={money}
				change={changeFrom(averageOut(stretch.total), averageOut(then))}
				{vs}
				better="down"
				series={perMonth(averageOut)}
				labels={monthLabels}
			/>
			<SparkStat
				label="Average income"
				icon={ColorBanknote}
				color="mint"
				value={averageIn(stretch.total)}
				format={money}
				change={changeFrom(averageIn(stretch.total), averageIn(then))}
				{vs}
				better="up"
				series={perMonth(averageIn)}
				labels={monthLabels}
			/>
		</div>

		<div class="xl:col-span-2" use:reveal={{ delay: 0.05 }}>
			<CategoryTrends
				{stretch}
				{currency}
				categoryChoices={choices.data?.category}
				class="h-full"
			/>
		</div>
		<div use:reveal={{ delay: 0.1 }}>
			<IncomeArc {stretch} {currency} categoryChoices={choices.data?.category} class="h-full" />
		</div>

		<div class="xl:col-span-3" use:reveal={{ delay: 0.05 }}>
			<PaceCard {stretch} {before} {currency} {vs} />
		</div>

		<div class="xl:col-span-3" use:reveal={{ delay: 0.05 }}>
			<SpendingCalendar
				{stretch}
				{before}
				entries={counted}
				{currency}
				{vs}
				categoryChoices={choices.data?.category}
			/>
		</div>

		<div class="xl:col-span-2" use:reveal={{ delay: 0.05 }}>
			<WhatIf
				entries={counted}
				{stretch}
				{today}
				{currency}
				categoryChoices={choices.data?.category}
				class="h-full"
			/>
		</div>
		<div use:reveal={{ delay: 0.1 }}>
			<AccountFlows {stretch} accounts={accountList} {colors} {currency} class="h-full" />
		</div>

		<div class="xl:col-span-3" use:reveal={{ delay: 0.05 }}>
			<Statement {stretch} {currency} categoryChoices={choices.data?.category} />
		</div>
	</div>
</div>
