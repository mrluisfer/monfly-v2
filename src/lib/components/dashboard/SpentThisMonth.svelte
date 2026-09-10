<script lang="ts">
	import { onMount } from 'svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import {
		budgetPace,
		budgetProgress,
		formatMoney,
		monthProgress,
		type MonthKey,
		type MonthSpending
	} from '$lib/finance';
	import { monthSpendingQuery } from '$lib/queries';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import BudgetEditor from './BudgetEditor.svelte';
	import MeterStat from './MeterStat.svelte';

	/**
	 * "Spent this month" against the monthly budget: the headline is the budget
	 * (the pencil edits it), the fill is every expense dated in `month`, and
	 * Remaining is what's left. Hovering or focusing the meter explains the pace.
	 * The page prefetches the query during SSR.
	 */
	type Props = {
		month: MonthKey;
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
	};

	let { month, enabled = true }: Props = $props();

	const query = createQuery(() => ({ ...monthSpendingQuery(month), enabled: browser && enabled }));

	// Figures are server-rendered as they are; only the fill grows in once mounted.
	let grown = $state(false);
	onMount(() => {
		if (prefersReducedMotion()) grown = true;
		else requestAnimationFrame(() => (grown = true));
	});

	const LABEL = 'Spent this month';
	const EMPTY = '—';
	const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 })
		.format;

	const view = $derived.by(() => {
		const spending = query.data;
		if (!spending) return null;
		const money = (amount: number) => formatMoney(amount, spending.currency);
		const progress = budgetProgress(spending.spent, spending.budget);
		return {
			spending,
			total: progress ? money(progress.budget) : EMPTY,
			ratio: progress?.ratio ?? 0,
			valueText: progress
				? `${percent(spending.spent / progress.budget)} of the monthly budget`
				: `${money(spending.spent)} spent, no budget set`,
			start: { value: money(spending.spent), label: 'Committed' },
			end: !progress
				? { value: EMPTY, label: 'No budget yet' }
				: progress.over
					? { value: money(-progress.remaining), label: 'Over budget', class: 'text-negative' }
					: { value: money(progress.remaining), label: 'Remaining' }
		};
	});

	type Tone = 'positive' | 'negative' | 'neutral';
	const TONE: Record<Tone, string> = {
		positive: 'text-positive',
		negative: 'text-negative',
		neutral: 'text-fg'
	};

	/** The tooltip's reading of the month. Dates are read when it opens, never during SSR. */
	function describe(spending: MonthSpending) {
		const money = (amount: number) => formatMoney(amount, spending.currency);
		const days = monthProgress(spending.month, spending.timeZone);
		const progress = budgetProgress(spending.spent, spending.budget);
		const daysLeft = { label: 'Days left', value: String(days.left) };
		const expenses = { label: 'Expenses', value: String(spending.count) };

		if (!progress) {
			const average = Math.round(spending.spent / Math.max(days.elapsed, 1));
			return {
				title: 'No budget set',
				tone: 'neutral' as Tone,
				rows: [{ label: 'Daily average', value: money(average) }, daysLeft, expenses],
				note: "Set one with the pencil to see what's left."
			};
		}

		const monthShare = days.elapsed / days.days;
		const pace = budgetPace(progress, monthShare);
		const rows = [
			{ label: 'Budget used', value: percent(spending.spent / progress.budget) },
			{ label: 'Month gone', value: percent(monthShare) }
		];
		if (!progress.over && days.left > 0) {
			rows.push({ label: 'Left per day', value: money(Math.floor(progress.remaining / days.left)) });
		}
		rows.push(daysLeft, expenses);

		const heading = {
			'on-track': { title: 'On track', tone: 'positive' },
			ahead: { title: 'Spending ahead of the month', tone: 'neutral' },
			over: { title: `Over budget by ${money(-progress.remaining)}`, tone: 'negative' }
		} as const satisfies Record<string, { title: string; tone: Tone }>;
		return { ...heading[pace], rows, note: null };
	}
</script>

{#if view}
	{@const spending = view.spending}
	<MeterStat
		label={LABEL}
		total={view.total}
		value={grown ? view.ratio : 0}
		valueText={view.valueText}
		start={view.start}
		end={view.end}
		revealAction={spending.budget !== null}
	>
		{#snippet action()}
			<BudgetEditor budget={spending.budget} currency={spending.currency} />
		{/snippet}
		{#snippet details()}
			{@const reading = describe(spending)}
			<div class="grid w-56 gap-2 font-normal">
				<p class={cn('font-medium', TONE[reading.tone])}>{reading.title}</p>
				<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
					{#each reading.rows as row (row.label)}
						<dt class="text-fg-muted">{row.label}</dt>
						<dd class="tabular text-right">{row.value}</dd>
					{/each}
				</dl>
				{#if reading.note}
					<p class="text-fg-muted">{reading.note}</p>
				{/if}
			</div>
		{/snippet}
	</MeterStat>
{:else if query.isError}
	<MeterStat
		label={LABEL}
		total={EMPTY}
		value={0}
		start={{ value: EMPTY, label: 'Committed' }}
		end={{ value: EMPTY, label: 'Remaining' }}
	>
		{#snippet footer()}
			<p class="text-sm text-fg-muted">
				Couldn't load this month's spending.
				<button
					type="button"
					class="font-medium text-fg underline underline-offset-2"
					onclick={() => query.refetch()}>Retry</button
				>
			</p>
		{/snippet}
	</MeterStat>
{:else}
	<MeterStat
		label={LABEL}
		total={EMPTY}
		value={0}
		start={{ value: EMPTY, label: 'Committed' }}
		end={{ value: EMPTY, label: 'Remaining' }}
		pending
	/>
{/if}
