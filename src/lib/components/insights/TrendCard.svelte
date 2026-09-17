<script lang="ts">
	import ColorGauge from '@animated-color-icons/lucide-svelte/Gauge.svelte';
	import ColorHandCoins from '@animated-color-icons/lucide-svelte/HandCoins.svelte';
	import ColorPiggyBank from '@animated-color-icons/lucide-svelte/PiggyBank.svelte';
	import ColorReceipt from '@animated-color-icons/lucide-svelte/Receipt.svelte';
	import { RadioGroup } from 'bits-ui';
	import { countUp } from '$lib/actions';
	import { AnimatedIcon, Card, Segmented, Sparkle, type PaletteColor } from '$lib/components/ui';
	import {
		daysInMonth,
		formatMoney,
		formatMoneyCompact,
		monthName,
		type Currency
	} from '$lib/finance';
	import {
		changeFrom,
		entryCount,
		flowOver,
		kept,
		keptRate,
		type Flow,
		type Stretch
	} from '$lib/insights';
	import { cn } from '$lib/utils';
	import DotColumns from './DotColumns.svelte';
	import { percent, shortDay, signedPercent } from './format';
	import StepBars from './StepBars.svelte';

	/**
	 * The page's headline chart: one figure — spent, received, kept, or the
	 * share of income kept — over the stretch, as a column of dots a week or a
	 * stepped bar a month, the months dashed over the stretch before. Under it
	 * the four figures, each against the stretch before, are also what picks
	 * the chart: pressing one slides the raised ground to it and the chart
	 * redraws in its colour.
	 */
	type Props = {
		stretch: Stretch;
		/** The twelve months before: what every figure is measured against. */
		before: Stretch;
		currency: Currency;
		/** What "before" is, after a change: "vs 2025", "vs this time in 2025". */
		vs: string;
		class?: string;
	};

	let { stretch, before, currency, vs, class: className }: Props = $props();

	type Metric = 'spent' | 'received' | 'kept' | 'rate';

	const METRICS: {
		value: Metric;
		label: string;
		color: PaletteColor;
		icon: typeof ColorGauge;
		/** Said under the title: "What went out". */
		what: string;
	}[] = [
		{ value: 'spent', label: 'Spent', color: 'rose', icon: ColorReceipt, what: 'What went out' },
		{
			value: 'received',
			label: 'Received',
			color: 'mint',
			icon: ColorHandCoins,
			what: 'What came in'
		},
		{ value: 'kept', label: 'Kept', color: 'blue', icon: ColorPiggyBank, what: 'What stayed' },
		{
			value: 'rate',
			label: 'Savings rate',
			color: 'violet',
			icon: ColorGauge,
			what: 'The share of income kept'
		}
	];

	let metric = $state<Metric>('spent');
	let view = $state<'weeks' | 'months'>('weeks');

	const chosen = $derived(METRICS.find((m) => m.value === metric) ?? METRICS[0]);
	const at = $derived(METRICS.indexOf(chosen));

	/**
	 * What the chart draws for a flow, in whole units: cents, or basis points
	 * for the rate — held to −100% there, since spending ten times what came in
	 * would flatten every other week against it.
	 */
	function measure(m: Metric, flow: Flow): number | null {
		if (m === 'spent') return flow.spent;
		if (m === 'received') return flow.received;
		if (m === 'kept') return kept(flow);
		const rate = keptRate(flow);
		return rate === null ? null : Math.round(Math.max(-1, rate) * 10_000);
	}

	const exact = $derived((value: number) =>
		metric === 'rate' ? percent(value / 10_000) : formatMoney(value, currency)
	);
	const compact = $derived((value: number) =>
		metric === 'rate'
			? `${Math.round(value / 100)}%`
			: formatMoneyCompact(value, currency, { whole: true })
	);

	// ── The four figures ─────────────────────────────────────────────────

	/** The stretch before, only as far as this one has come — a year still running meets last year to date. */
	const then = $derived(flowOver(before, Math.min(stretch.elapsed, before.days.length)));

	const money = (cents: number) => formatMoney(cents, currency);
	const share = (fraction: number) => percent(fraction);

	const tiles = $derived(
		METRICS.map((m) => {
			if (m.value === 'rate') {
				const rate = keptRate(stretch.total);
				const earlier = keptRate(then);
				return {
					...m,
					figure: rate,
					format: share,
					// A share moves in points, not in a share of itself.
					change:
						rate === null || earlier === null
							? null
							: `${rate >= earlier ? '+' : '−'}${Math.abs((rate - earlier) * 100).toFixed(1)} pts`
				};
			}
			const value = measure(m.value, stretch.total) ?? 0;
			const moved = changeFrom(value, measure(m.value, then) ?? 0);
			return {
				...m,
				figure: value,
				format: money,
				change: moved === null ? null : signedPercent(moved)
			};
		})
	);

	/** The four figures wear one size: the one the longest fits at (.fit-figure). */
	const chars = $derived(
		Math.max(...tiles.map((t) => (t.figure === null ? 1 : t.format(t.figure).length)))
	);

	// ── The chart ────────────────────────────────────────────────────────

	const columns = $derived.by(() => {
		const out = [];
		for (let i = 0; i < stretch.days.length; i += 7) {
			const days = stretch.days.slice(i, i + 7);
			const flow = days.reduce(
				(sum, d) => ({
					received: sum.received + d.received,
					spent: sum.spent + d.spent,
					incomes: sum.incomes + d.incomes,
					expenses: sum.expenses + d.expenses
				}),
				{ received: 0, spent: 0, incomes: 0, expenses: 0 }
			);
			const first = days[0];
			const last = days[days.length - 1];
			out.push({
				key: first.key,
				label:
					first.key === last.key
						? shortDay(first.key)
						: `${shortDay(first.key)} – ${shortDay(last.key)}`,
				short: shortDay(first.key),
				value: first.future ? null : measure(metric, flow),
				future: first.future
			});
		}
		return out;
	});

	/** Each month under the week its first day falls in. */
	const marks = $derived.by(() => {
		let day = 0;
		return stretch.span.months.map((month) => {
			const mark = { at: Math.floor(day / 7), label: monthName(month, 'short') };
			day += daysInMonth(month);
			return mark;
		});
	});

	/** The stretch before has anything in it to dash across the months. */
	const compared = $derived(entryCount(before.total) > 0);

	const bars = $derived(
		stretch.months.map((m, i) => ({
			key: `m${i}`,
			label: monthName(m.key, 'short'),
			long: `${monthName(m.key)} ${m.key.slice(0, 4)}`,
			value: m.future ? null : measure(metric, m),
			before: compared ? measure(metric, before.months[i]) : null,
			future: m.future
		}))
	);
</script>

<Card class={cn('flex flex-col overflow-hidden', className)}>
	<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-7 pt-7">
		<div class="min-w-0">
			<div class="flex items-center gap-2.5">
				<Sparkle color={chosen.color} animated burst={metric} class="size-5 shrink-0" />
				<h2 class="font-display text-2xl font-medium">Money over time</h2>
			</div>
			<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
				{chosen.what}, {view === 'weeks' ? 'week by week' : 'month by month'}, {stretch.span
					.label}{view === 'months' && compared ? ` — ${before.span.label} dashed` : ''}.
			</p>
		</div>
		<Segmented
			label="Chart by"
			options={[
				{ value: 'weeks', label: 'Weeks' },
				{ value: 'months', label: 'Months' }
			]}
			bind:value={view}
		/>
	</div>

	<div class="mt-7 flex flex-1 flex-col px-7">
		{#if view === 'weeks'}
			<DotColumns
				{columns}
				{marks}
				color={chosen.color}
				format={exact}
				{compact}
				label="{chosen.label} by week"
				class="flex-1"
			/>
		{:else}
			<StepBars
				{bars}
				color={chosen.color}
				format={exact}
				{compact}
				beforeLabel={before.span.label}
				label="{chosen.label} by month"
				class="flex-1"
			/>
		{/if}
	</div>

	<!-- The figures are also the chart's picker: one raised ground slides to the
	     one on the chart, as a segmented control's does. Side by side it slides;
	     two by two, each wears its own. -->
	<RadioGroup.Root
		value={metric}
		onValueChange={(next) => (metric = next as Metric)}
		orientation="horizontal"
		aria-label="Figure on the chart"
		class="relative mt-6 grid grid-cols-2 border-t border-line lg:grid-cols-4"
		style="--at: {at}"
	>
		<span
			class="surface pointer-events-none absolute inset-y-0 left-0 hidden w-1/4 lg:block"
			aria-hidden="true"
		></span>
		{#each tiles as tile (tile.value)}
			<RadioGroup.Item
				value={tile.value}
				class={cn(
					'group @container relative flex min-w-0 flex-col items-start px-6 pt-5 pb-6 text-left',
					'border-line max-lg:[&:nth-of-type(-n+2)]:border-b max-lg:[&:nth-of-type(odd)]:border-r',
					'data-[state=checked]:max-lg:bg-sunken',
					'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-blue'
				)}
			>
				<span class="flex items-center gap-2.5">
					<!-- The chosen figure's chip turns over into ink, as the reference's does. -->
					<span
						class="grid size-7 shrink-0 place-items-center rounded-lg bg-sunken text-fg-muted transition-colors duration-300 group-data-[state=checked]:bg-fg group-data-[state=checked]:text-card"
						aria-hidden="true"
					>
						<AnimatedIcon icon={tile.icon} set="color" />
					</span>
					<span class="text-[0.9375rem] text-fg-muted">{tile.label}</span>
				</span>
				<span
					class="fit-figure tabular mt-4 block font-display leading-none font-light tracking-tight"
					style="--fit: 2rem; --chars: {chars}"
				>
					{#if tile.figure === null}
						—
					{:else}
						<span use:countUp={{ value: tile.figure, format: tile.format, whenVisible: true }}
							>{tile.format(tile.figure)}</span
						>
					{/if}
				</span>
				<span class="mt-2 block w-full text-sm text-balance text-fg-muted">
					{#if tile.change}
						<span class="tabular font-medium text-fg">{tile.change}</span> {vs}
					{:else}
						Nothing earlier to compare
					{/if}
				</span>
			</RadioGroup.Item>
		{/each}
	</RadioGroup.Root>
</Card>

<style>
	/* The chosen figure's ground: a quarter wide, slid over by its index, an ink
	   edge on top and a wash of the sunken grey fading down from it. */
	.surface {
		translate: calc(var(--at) * 100%) 0;
		border-top: 2px solid var(--color-fg);
		background: linear-gradient(to bottom, var(--color-sunken), transparent 85%);
		transition: translate 0.45s var(--ease-out-quint);
	}
</style>
