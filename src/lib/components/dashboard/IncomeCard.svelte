<script lang="ts">
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { animate } from 'motion';
	import { browser } from '$app/environment';
	import { countUp } from '$lib/actions';
	import { CardTabs, Select, type PaletteColor } from '$lib/components/ui';
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
		type IncomeTab,
		type IncomeView
	} from '$lib/income-view';
	import { expensesQuery, incomeQuery } from '$lib/queries';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';
	import IncomeBars from './IncomeBars.svelte';
	import IncomeSettings from './IncomeSettings.svelte';

	/**
	 * Income for a period — this quarter by default — as a total with its
	 * lime symbol and a bar per bucket: this month by week, this quarter by
	 * month, this year by quarter or month, all time by year. Its Spent tab
	 * draws what went out in the same buckets, its symbol in `spent`. Both tabs
	 * share one card, one period and one set of settings, so switching moves
	 * the same bars to the other figures rather than drawing another chart.
	 * The gear sets how the chart is drawn; that, the period and the tab are
	 * kept for this browser, so the card opens as it was left. A new period or
	 * tab counts the total over (GSAP) and eases the bars to their heights
	 * (CSS); the page prefetches both tabs of the kept period during SSR.
	 */
	type Props = {
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
		/** The tab, period and chart settings this browser saved, as the server read them from its cookie. */
		view?: IncomeView;
	};

	let { enabled = true, view: saved = DEFAULT_INCOME_VIEW }: Props = $props();

	const TABS: { value: IncomeTab; label: string }[] = [
		{ value: 'income', label: 'Income' },
		{ value: 'spent', label: 'Spent' }
	];
	/** How each tab is worded and painted: income in the brand's three, spending in its warm pastels. */
	const KIND: Record<
		IncomeTab,
		{ title: string; one: string; many: string; symbol: string; colors: PaletteColor[] }
	> = {
		income: {
			title: 'Income',
			one: 'income',
			many: 'incomes',
			symbol: 'text-lime',
			colors: ['lime', 'violet', 'blue']
		},
		spent: {
			title: 'Spent',
			one: 'expense',
			many: 'expenses',
			symbol: 'text-spent',
			colors: ['rose', 'coral', 'peach']
		}
	};

	const options = INCOME_PERIODS.map((value) => ({ value, label: INCOME_PERIOD_LABEL[value] }));
	// The saved tab, period and settings, until the tabs, the select or the gear change them.
	let view = $derived(saved);
	const period = $derived(view.period);
	const tab = $derived(view.tab);
	const kind = $derived(KIND[tab]);

	function changeView(next: IncomeView) {
		view = next;
		saveIncomeView(next);
	}

	// Both tabs are read for the period, so switching draws at once.
	const income = createQuery(() => ({
		...incomeQuery(period, incomeUnit(period, view)),
		enabled: browser && enabled,
		// The last period stays up while the next loads, so the total counts from it.
		placeholderData: keepPreviousData
	}));
	const spent = createQuery(() => ({
		...expensesQuery(period, incomeUnit(period, view)),
		enabled: browser && enabled,
		placeholderData: keepPreviousData
	}));
	const query = $derived(tab === 'income' ? income : spent);

	const plural = (n: number) => `${n} ${n === 1 ? kind.one : kind.many}`;

	const data = $derived(query.data);
	const currency = $derived(data?.currency ?? DEFAULT_CURRENCY);
	const total = $derived(data?.total ?? 0);
	const parts = $derived(moneyParts(total, currency));
	const buckets = $derived(data?.buckets ?? []);
	// A year by month leaves narrow bars: smaller, whole figures ("$25k", not "$25.3k").
	const dense = $derived(buckets.filter((b) => view.upcoming || !b.future).length > 8);
	const compact = (cents: number) => formatMoneyCompact(cents, currency, { whole: dense });
	const bars = $derived(
		buckets.map((b, i) => ({
			key: b.key,
			label: b.label,
			value: b.total,
			valueLabel: compact(b.total),
			color: kind.colors[i % kind.colors.length],
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

	let heading = $state<HTMLElement>();
	let figure = $state<HTMLElement>();
	let turned = false;

	// The other tab's title and total blur into focus while the total counts
	// to its figure, as an account's do for another month. Not on the first draw.
	$effect(() => {
		void tab;
		if (!turned) {
			turned = true;
			return;
		}
		if (prefersReducedMotion() || !heading || !figure) return;
		animate(
			[heading, figure],
			{ filter: ['blur(6px)', 'blur(0px)'], opacity: [0.35, 1] },
			{ duration: 0.6, ease: [...EASE_OUT_QUINT] }
		);
	});
</script>

<CardTabs
	options={TABS}
	value={tab}
	onValueChange={(next) => changeView({ ...view, tab: next })}
	label="Income and spending"
	shared
>
	{#snippet panel()}
		<div class="flex flex-col p-7">
			<div class="flex items-center justify-between gap-4">
				<h2 bind:this={heading} class="font-display text-2xl font-medium">{kind.title}</h2>
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
				<!-- The symbol wears its tab's colour, easing to the other's; only the number counts. -->
				<p
					bind:this={figure}
					class="tabular font-display text-[2.75rem] leading-none font-light tracking-tight"
				>
					{#if parts.symbolFirst}<span class={cn('transition-colors duration-300', kind.symbol)}
							>{parts.symbol}</span
						>{/if}<span use:countUp={{ value: total, format: number, whenVisible: true }}
						>{parts.number}</span
					>{#if !parts.symbolFirst}<span class={cn('transition-colors duration-300', kind.symbol)}
							>&nbsp;{parts.symbol}</span
						>{/if}
				</p>
				<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
					{INCOME_PERIOD_LABEL[period]}{data && data.count === 0 ? ' · nothing recorded yet' : ''}
				</p>
			</div>

			<!-- Dimmed while the chosen period loads over the last one. -->
			<div
				class={cn('mt-8 transition-opacity duration-300', query.isPlaceholderData && 'opacity-60')}
			>
				<IncomeBars
					{bars}
					figures={view.figures}
					upcoming={view.upcoming}
					{dense}
					format={compact}
					class="h-56"
				>
					{#snippet tip(bar)}
						{@const entry = bars.find((b) => b.key === bar.key)}
						<div class="grid w-44 gap-2 font-normal">
							<p class="font-medium">{bar.label}</p>
							<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
								<dt class="text-fg-muted">{kind.title}</dt>
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
		</div>
	{/snippet}
</CardTabs>
