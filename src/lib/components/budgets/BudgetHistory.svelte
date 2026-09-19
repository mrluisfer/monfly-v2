<script lang="ts">
	import { niceTicks } from '$lib/components/accounts/chart';
	import { Card, Sparkle, Tooltip } from '$lib/components/ui';
	import {
		formatMoney,
		formatMoneyCompact,
		monthName,
		projectedSpend,
		type BudgetMonth,
		type MonthKey,
		type MonthProgress
	} from '$lib/finance';
	import { cn } from '$lib/utils';

	/**
	 * The months leading up to this one against the budget: a column each,
	 * violet as far as the month went, the part past the budget hatched in the
	 * alarm's colour, and the budget dashed across them all. A month still
	 * running carries a dashed slot up to where it ends at this pace. The
	 * month on show sits on a soft column; pressing another opens it. The
	 * columns rise from the baseline one after another and ease to new
	 * heights (CSS).
	 */
	type Props = {
		month: BudgetMonth;
		/** How far through the month on show today is; the running month draws its slot from it. */
		progress: MonthProgress;
		/** The latest month there is — this one — whose column may still be running. */
		latest: MonthKey;
		onPick: (month: MonthKey) => void;
		class?: string;
	};

	let { month, progress, latest, onPick, class: className }: Props = $props();

	const money = (cents: number) => formatMoney(cents, month.currency);
	const compact = (cents: number) => formatMoneyCompact(cents, month.currency, { whole: true });

	const budget = $derived(month.budget);
	/** Where this month ends at this pace — only while it runs, and only drawn on its own column. */
	const heading = $derived(
		month.month === latest && progress.left > 0 ? projectedSpend(month.spent, progress) : null
	);

	const ceiling = $derived.by(() => {
		const most = Math.max(0, ...month.history.map((h) => h.spent), budget ?? 0, heading ?? 0);
		return most > 0 ? (niceTicks(0, most, 4).at(-1) ?? most) : 1;
	});
	const share = (cents: number) => (cents / ceiling) * 100;

	const columns = $derived(
		month.history.map((h) => {
			const over = budget !== null && h.spent > budget ? h.spent - budget : 0;
			return {
				...h,
				over,
				/** The part past the budget, as a share of the column's own height. */
				overShare: h.spent > 0 ? (over / h.spent) * 100 : 0,
				ahead: h.month === latest ? heading : null
			};
		})
	);

	const counted = $derived(month.history.filter((h) => h.month !== latest || progress.left === 0));
	const under = $derived(budget === null ? 0 : counted.filter((h) => h.spent <= budget).length);
	const usual = $derived(
		counted.length > 0
			? Math.round(counted.reduce((sum, h) => sum + h.spent, 0) / counted.length)
			: 0
	);
</script>

<Card class={cn('flex min-w-0 flex-col p-7', className)}>
	<div class="flex items-center gap-2.5">
		<Sparkle color="sky" animated burst={month.month} class="size-5 shrink-0" />
		<h2 class="font-display text-2xl font-medium">Month by month</h2>
	</div>
	<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
		{#if budget !== null && counted.length > 0}
			Under budget in {under} of the last {counted.length}
			{counted.length === 1 ? 'month' : 'months'}; a usual one comes to {money(usual)}.
		{:else if counted.length > 0}
			A usual month comes to {money(usual)}. Set a budget to measure them.
		{:else}
			The months before this one, against the budget.
		{/if}
	</p>

	<div class="relative mt-8 h-56 flex-1">
		{#if budget !== null}
			<!-- The budget across every month, named over its right end. -->
			<span
				class="ink-tint budget glide pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed"
				style="bottom: {share(budget)}%; --tint: var(--lime)"
				aria-hidden="true"
			></span>
			<span
				class="glide pointer-events-none absolute right-0 z-10 mb-1.5 rounded-md bg-lime/30 px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap text-[color-mix(in_oklab,var(--lime)_35%,var(--ink))] dark:bg-lime/15 dark:text-lime"
				style="bottom: {share(budget)}%"
				aria-hidden="true">Budget {compact(budget)}</span
			>
		{/if}

		<div class="grid h-full grid-cols-6 gap-2 sm:gap-3">
			{#each columns as column, i (column.month)}
				{@const picked = column.month === month.month}
				{#snippet detail()}
					<p class="font-medium">{monthName(column.month)} {column.month.slice(0, 4)}</p>
					<p class="tabular mt-1 text-fg-muted">
						{money(column.spent)} spent{#if budget !== null}
							· {column.over > 0
								? `${money(column.over)} over`
								: `${money(budget - column.spent)} under`}{/if}
					</p>
					{#if column.ahead !== null}
						<p class="tabular mt-0.5 text-fg-muted">{money(column.ahead)} at this pace</p>
					{/if}
				{/snippet}
				<Tooltip content={detail} side="top" delay={80} class="px-3 py-2.5">
					{#snippet children({ props })}
						<button
							{...props}
							type="button"
							aria-pressed={picked}
							aria-label="{monthName(column.month)} {column.month.slice(0, 4)}: {money(
								column.spent
							)} spent"
							class={cn(
								'group relative flex h-full min-w-0 flex-col items-center justify-end rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
								picked && 'picked'
							)}
							onclick={() => onPick(column.month)}
						>
							{#if column.ahead !== null && column.ahead > column.spent}
								<!-- Still to come: a dashed slot up to where the month ends at this pace. -->
								<span
									class="slot bar absolute inset-x-[14%] bottom-0 rounded-t-xl border border-b-0 border-dashed border-hairline"
									style="height: {share(column.ahead)}%; --i: {i}"
									aria-hidden="true"
								></span>
							{/if}
							<span
								class="tabular figure relative z-10 mb-1.5 text-[0.6875rem] whitespace-nowrap text-fg-muted group-hover:text-fg"
								style="--i: {i}"
								aria-hidden="true">{compact(column.spent)}</span
							>
							<span
								class="bar fill relative w-[72%] overflow-hidden rounded-t-xl"
								style="height: {share(column.spent)}%; --i: {i}"
								aria-hidden="true"
							>
								{#if column.over > 0}
									<span class="over absolute inset-x-0 top-0" style="height: {column.overShare}%"
									></span>
								{/if}
							</span>
						</button>
					{/snippet}
				</Tooltip>
			{/each}
		</div>
	</div>

	<div class="mt-2 grid grid-cols-6 gap-2 text-center text-xs sm:gap-3" aria-hidden="true">
		{#each columns as column (column.month)}
			<span class={column.month === month.month ? 'font-medium text-fg' : 'text-fg-muted'}
				>{monthName(column.month, 'short')}</span
			>
		{/each}
	</div>
</Card>

<style>
	/* The columns rise from the baseline one after another and ease to each
	   new height; their figures fade up after them. */
	.bar {
		transition: height 0.7s var(--ease-out-quint) calc(var(--i) * 60ms);

		@starting-style {
			height: 0;
		}
	}

	.figure {
		transition:
			opacity 0.4s var(--ease-out-quint) calc(0.3s + var(--i) * 60ms),
			color 0.2s var(--ease-out-quint);

		@starting-style {
			opacity: 0;
		}
	}

	.fill {
		background: linear-gradient(
			to top,
			color-mix(in oklab, var(--color-violet) 55%, var(--color-card)),
			var(--color-violet)
		);
		opacity: 0.55;
		transition:
			height 0.7s var(--ease-out-quint) calc(var(--i) * 60ms),
			opacity 0.3s var(--ease-out-quint);
	}

	/* The month on show at full strength; the others a step back until pointed at. */
	.picked .fill,
	button:hover .fill,
	button:focus-visible .fill {
		opacity: 1;
	}

	.picked::before {
		content: '';
		position: absolute;
		inset: -0.5rem -0.25rem 0;
		border-radius: 0.75rem;
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--color-violet) 4%, transparent),
			color-mix(in oklab, var(--color-violet) 12%, transparent)
		);
	}

	/* Past the budget: the alarm's colour, hatched. */
	.over {
		background-color: color-mix(in oklab, var(--color-negative) 70%, var(--color-card));
		background-image: repeating-linear-gradient(
			-45deg,
			rgb(255 255 255 / 0.35) 0 1px,
			transparent 1px 5px
		);
	}

	.budget {
		border-color: var(--ink-tint);
	}

	.glide {
		transition: bottom 0.7s var(--ease-out-quint);
	}
</style>
