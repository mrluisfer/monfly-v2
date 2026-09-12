<script lang="ts">
	import { onMount } from 'svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { formatMoney, monthName, savingsProgress, type Savings } from '$lib/finance';
	import { savingsQuery } from '$lib/queries';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { formatAge } from '$lib/utils/time';
	import MeterStat from './MeterStat.svelte';
	import SavingsEditor from './SavingsEditor.svelte';

	/**
	 * The savings goal and how far along it is. Savings are a running total,
	 * not a monthly allowance — every month already counts towards the figure —
	 * so this measures distance to the goal, where "Spent this month" measures
	 * a month's budget being used up. The page prefetches the query during SSR.
	 */
	type Props = {
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
	};

	let { enabled = true }: Props = $props();

	const query = createQuery(() => ({ ...savingsQuery(), enabled: browser && enabled }));

	// Figures are server-rendered as they are; only the fill grows in once mounted.
	let grown = $state(false);
	onMount(() => {
		if (prefersReducedMotion()) grown = true;
		else requestAnimationFrame(() => (grown = true));
	});

	const LABEL = 'Savings goal';
	const EMPTY = '—';
	const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 })
		.format;

	const view = $derived.by(() => {
		const savings = query.data;
		if (!savings) return null;
		const money = (amount: number) => formatMoney(amount, savings.currency);
		const progress = savingsProgress(savings.saved, savings.goal);
		return {
			savings,
			total: progress ? money(progress.goal) : EMPTY,
			ratio: progress?.ratio ?? 0,
			valueText: progress
				? `${percent(progress.ratio)} of the savings goal`
				: `${money(savings.saved)} saved, no goal set`,
			start: { value: money(savings.saved), label: 'Saved' },
			end: !progress
				? { value: EMPTY, label: 'No goal yet' }
				: progress.reached
					? { value: money(0), label: 'Goal reached', class: 'text-positive' }
					: { value: money(progress.remaining), label: 'To go' }
		};
	});

	type Tone = 'positive' | 'neutral';
	const TONE: Record<Tone, string> = { positive: 'text-positive', neutral: 'text-fg' };

	/** The tooltip's reading of the goal. */
	function describe(savings: Savings) {
		const money = (amount: number) => formatMoney(amount, savings.currency);
		const progress = savingsProgress(savings.saved, savings.goal);
		// The row's timestamp moves whenever the goal or the amount does.
		const updated = savings.updatedAt
			? [{ label: 'Last updated', value: formatAge(savings.updatedAt) }]
			: [];
		// Where the figure comes from, when it isn't a tally of its own.
		const where = savings.account ? [{ label: 'Saved in', value: savings.account.name }] : [];
		// The month's own movement, and how fast the goal is coming. Only a
		// linked account has the dated history these are read from.
		const month =
			savings.thisMonth === null
				? []
				: [
						{
							label: 'This month',
							value:
								savings.thisMonth > 0 ? `+${money(savings.thisMonth)}` : money(savings.thisMonth)
						}
					];
		const rate =
			savings.pace === null ? [] : [{ label: 'Pace', value: `${money(savings.pace)}/mo` }];
		const eta =
			savings.arrival === null
				? []
				: [
						{
							label: 'On track for',
							value: `${monthName(savings.arrival, 'short')} ${savings.arrival.slice(0, 4)}`
						}
					];
		// What left the account, named rather than left to be inferred from a
		// smaller net: a subscription nobody remembered is invisible otherwise.
		const out =
			savings.outflow && savings.outflow.count > 0
				? [{ label: 'Charges out', value: money(savings.outflow.amount) }]
				: [];

		if (!progress) {
			return {
				title: 'No goal set',
				tone: 'neutral' as Tone,
				rows: [
					{ label: 'Saved', value: money(savings.saved) },
					...month,
					...out,
					...where,
					...updated
				],
				note: 'Set one with the target to see how close you are.'
			};
		}

		const rows = [
			{ label: 'Progress', value: percent(progress.ratio) },
			{ label: 'Goal', value: money(progress.goal) }
		];
		if (!progress.reached) rows.push({ label: 'Still to go', value: money(progress.remaining) });
		rows.push(...month, ...out, ...rate, ...eta, ...where, ...updated);

		// Pace and arrival simply stop being drawn when nothing net goes in. Say
		// why, rather than letting two rows quietly disappear.
		const stalled =
			savings.pace === null && savings.outflow !== null && savings.outflow.count > 0
				? "Spending from this account is outpacing what goes in, so there's no pace to read."
				: null;

		return progress.reached
			? { title: 'Goal reached', tone: 'positive' as Tone, rows, note: null }
			: {
					title: `${percent(progress.ratio)} of the way there`,
					tone: 'neutral' as Tone,
					rows,
					note: stalled
				};
	}
</script>

{#if view}
	{@const savings = view.savings}
	<MeterStat
		label={LABEL}
		total={view.total}
		value={grown ? view.ratio : 0}
		valueText={view.valueText}
		color="blue"
		start={view.start}
		end={view.end}
		revealAction={savings.goal !== null}
	>
		{#snippet action()}
			<SavingsEditor {savings} />
		{/snippet}
		{#snippet details()}
			{@const reading = describe(savings)}
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
		color="blue"
		start={{ value: EMPTY, label: 'Saved' }}
		end={{ value: EMPTY, label: 'To go' }}
	>
		{#snippet footer()}
			<p class="text-sm text-fg-muted">
				Couldn't load your savings goal.
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
		color="blue"
		start={{ value: EMPTY, label: 'Saved' }}
		end={{ value: EMPTY, label: 'To go' }}
		pending
	/>
{/if}
