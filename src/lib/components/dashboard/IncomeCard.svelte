<script lang="ts">
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { countUp } from '$lib/actions';
	import { Card, Select, type PaletteColor } from '$lib/components/ui';
	import {
		DEFAULT_CURRENCY,
		INCOME_PERIODS,
		INCOME_PERIOD_LABEL,
		formatMoney,
		formatMoneyCompact,
		moneyParts
	} from '$lib/finance';
	import {
		DEFAULT_INCOME_VIEW,
		incomeUnit,
		saveIncomeView,
		type IncomeView
	} from '$lib/income-view';
	import { incomeQuery } from '$lib/queries';
	import { cn } from '$lib/utils';
	import IncomeBars from './IncomeBars.svelte';
	import IncomeSettings from './IncomeSettings.svelte';

	/**
	 * Income for a period — this quarter by default — as a total with its
	 * lime symbol and a bar per bucket: this month by week, this quarter by
	 * month, this year by quarter or month, all time by year. The gear sets
	 * how the chart is drawn; that and the period are kept for this browser,
	 * so the card opens as it was left. A new period counts the total over
	 * (GSAP) and grows the new bars up (CSS). The page prefetches the kept
	 * period during SSR.
	 */
	type Props = {
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
		/** The period and chart settings this browser saved, as the server read them from its cookie. */
		view?: IncomeView;
	};

	let { enabled = true, view: saved = DEFAULT_INCOME_VIEW }: Props = $props();

	const options = INCOME_PERIODS.map((value) => ({ value, label: INCOME_PERIOD_LABEL[value] }));
	// The saved period and settings, until the select or the gear changes them.
	let view = $derived(saved);
	const period = $derived(view.period);

	function changeView(next: IncomeView) {
		view = next;
		saveIncomeView(next);
	}

	const query = createQuery(() => ({
		...incomeQuery(period, incomeUnit(period, view)),
		enabled: browser && enabled,
		// The last period stays up while the next loads, so the total counts from it.
		placeholderData: keepPreviousData
	}));

	const COLORS: PaletteColor[] = ['lime', 'violet', 'blue'];
	const plural = (n: number) => `${n} ${n === 1 ? 'income' : 'incomes'}`;

	const data = $derived(query.data);
	const currency = $derived(data?.currency ?? DEFAULT_CURRENCY);
	const total = $derived(data?.total ?? 0);
	const parts = $derived(moneyParts(total, currency));
	const buckets = $derived(data?.buckets ?? []);
	// A year by month leaves narrow bars: smaller, whole figures ("$25k", not "$25.3k").
	const dense = $derived(buckets.filter((b) => view.upcoming || !b.future).length > 8);
	const bars = $derived(
		buckets.map((b, i) => ({
			key: b.key,
			label: b.label,
			value: b.total,
			valueLabel: formatMoneyCompact(b.total, currency, { whole: dense }),
			color: COLORS[i % COLORS.length],
			future: b.future,
			description: b.future
				? `${b.label}: still to come`
				: `${b.label}: ${formatMoney(b.total, currency)} from ${plural(b.count)}`,
			count: b.count
		}))
	);
	const number = (cents: number) => moneyParts(cents, currency).number;
	const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 })
		.format;
</script>

<Card class="flex flex-col p-7">
	<div class="flex items-center justify-between gap-4">
		<h2 class="font-display text-2xl font-medium">Income</h2>
		<div class="flex items-center gap-2">
			<IncomeSettings {view} onChange={changeView} />
			<Select
				label="Period"
				{options}
				value={period}
				onValueChange={(next) => changeView({ ...view, period: next })}
			/>
		</div>
	</div>

	<div class="mt-6">
		<!-- The symbol keeps its lime; only the number counts. -->
		<p class="tabular font-display text-[2.75rem] leading-none font-light tracking-tight">
			{#if parts.symbolFirst}<span class="text-lime">{parts.symbol}</span>{/if}<span
				use:countUp={{ value: total, format: number, whenVisible: true }}>{parts.number}</span
			>{#if !parts.symbolFirst}<span class="text-lime">&nbsp;{parts.symbol}</span>{/if}
		</p>
		<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
			{INCOME_PERIOD_LABEL[period]}{data && data.count === 0 ? ' · nothing recorded yet' : ''}
		</p>
	</div>

	<!-- Dimmed while the chosen period loads over the last one. -->
	<div class={cn('mt-8 transition-opacity duration-300', query.isPlaceholderData && 'opacity-60')}>
		<IncomeBars {bars} figures={view.figures} upcoming={view.upcoming} {dense} class="h-56">
			{#snippet tip(bar)}
				{@const entry = bars.find((b) => b.key === bar.key)}
				<div class="grid w-44 gap-2 font-normal">
					<p class="font-medium">{bar.label}</p>
					<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
						<dt class="text-fg-muted">Income</dt>
						<dd class="tabular text-right">{formatMoney(bar.value, currency)}</dd>
						<dt class="text-fg-muted">Entries</dt>
						<dd class="tabular text-right">{entry?.count ?? 0}</dd>
						<dt class="text-fg-muted">Share</dt>
						<dd class="tabular text-right">{total > 0 ? percent(bar.value / total) : '—'}</dd>
					</dl>
				</div>
			{/snippet}
		</IncomeBars>
	</div>
</Card>
