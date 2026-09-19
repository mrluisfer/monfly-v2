<script lang="ts">
	import MovingPlus from '@jis3r/icons/icons/plus';
	import Plus from '@lucide/svelte/icons/plus';
	import { quintOut } from 'svelte/easing';
	import { flip } from 'svelte/animate';
	import { categoryColor } from '$lib/categories';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import {
		AnimatedIcon,
		PillButton,
		ShareBar,
		type PaletteColor,
		type ShareSegment
	} from '$lib/components/ui';
	import {
		formatMoney,
		type BudgetMonth,
		type CategoryLine,
		type MonthProgress
	} from '$lib/finance';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';
	import LimitCard from './LimitCard.svelte';
	import LimitEditor from './LimitEditor.svelte';

	/**
	 * Each category with a limit, a card each, the ones furthest through their
	 * limit first; after them the next limit's slot, dashed and hatched. Over
	 * them, how the monthly budget splits into limits — a share bar, the room
	 * no limit holds hatched — and under them the categories that took money
	 * with no limit, each a press away from one. Cards glide to a new order
	 * (Svelte `flip`), and a new one pops in.
	 */
	type Props = {
		month: BudgetMonth;
		progress: MonthProgress;
		categoryChoices?: Record<string, PaletteColor>;
	};

	let { month, progress, categoryChoices }: Props = $props();

	const uid = $props.id();
	const money = (cents: number) => formatMoney(cents, month.currency);

	type Limited = CategoryLine & { limit: number };

	const limited = $derived(
		month.categories
			.filter((line): line is Limited => line.limit !== null)
			.sort((a, b) => b.spent / b.limit - a.spent / a.limit || a.name.localeCompare(b.name))
	);
	const planned = $derived(limited.reduce((sum, line) => sum + line.limit, 0));

	/** Spent on this month with no limit, most first: the next limits worth setting. */
	const unlimited = $derived(
		month.categories.filter((line) => line.limit === null && line.spent > 0).slice(0, 8)
	);

	/** How the monthly budget splits into limits; past it, the limits are the whole. */
	const plan = $derived.by((): ShareSegment[] => {
		if (month.budget === null || limited.length === 0) return [];
		const whole = Math.max(month.budget, planned);
		return limited.map((line) => ({
			id: line.name,
			share: line.limit / whole,
			color: categoryColor(line.name, categoryChoices)
		}));
	});

	const summary = $derived.by(() => {
		const n = limited.length;
		if (n === 0) return 'Give a category a limit to watch it on its own.';
		const count = `${n} ${n === 1 ? 'limit' : 'limits'}`;
		if (month.budget === null) return `${count}, ${money(planned)} a month.`;
		if (planned > month.budget)
			return `${count} coming to ${money(planned - month.budget)} more than your ${money(month.budget)} budget.`;
		return `${count} holding ${money(planned)} of your ${money(month.budget)} budget.`;
	});
</script>

<section class="flex flex-col gap-4 pt-6" aria-labelledby="{uid}-title">
	<div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
		<div class="min-w-0">
			<h2 id="{uid}-title" class="font-display text-3xl font-light tracking-tight">By category</h2>
			<p class="mt-1 text-[0.9375rem] text-fg-muted">{summary}</p>
		</div>
		<LimitEditor
			category={null}
			lines={month.categories}
			currency={month.currency}
			{categoryChoices}
		>
			{#snippet trigger(props)}
				<PillButton size="sm" {...props}>
					<AnimatedIcon icon={MovingPlus} set="moving" trigger="mount" />
					New limit
				</PillButton>
			{/snippet}
		</LimitEditor>
	</div>

	{#if plan.length > 0}
		<ShareBar segments={plan} track="hatch" class="h-2.5" />
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each limited as line, i (line.name)}
			<div
				animate:flip={{ duration: 450, easing: quintOut }}
				in:pop={{ scale: 0.9, bounce: 0.35, duration: 0.45 }}
				out:pop={{ scale: 0.9, duration: 0.3 }}
			>
				<LimitCard
					{line}
					{progress}
					lines={month.categories}
					currency={month.currency}
					{categoryChoices}
					index={i}
				/>
			</div>
		{/each}

		<!-- The next limit's slot: dashed and hatched, like what's still to come. -->
		<LimitEditor
			category={null}
			lines={month.categories}
			currency={month.currency}
			{categoryChoices}
			align="start"
		>
			{#snippet trigger(props)}
				<button
					{...props}
					type="button"
					class={cn(
						'slot group press relative flex min-h-52 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-hairline p-6 text-center',
						'transition-[background-color,border-color] duration-300 hover:bg-card/60',
						'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
						'data-[state=open]:border-solid data-[state=open]:border-lime/60 data-[state=open]:bg-lime/15 dark:data-[state=open]:bg-lime/10'
					)}
				>
					<span
						class="hatch pointer-events-none absolute inset-0 rounded-[inherit] opacity-60"
						aria-hidden="true"
					></span>
					<span
						class="relative grid size-11 place-items-center rounded-full bg-lime/30 text-[color-mix(in_oklab,var(--lime)_40%,var(--ink))] transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-110 group-data-[state=open]:rotate-45 dark:bg-lime/15 dark:text-lime"
						aria-hidden="true"
					>
						<AnimatedIcon icon={MovingPlus} set="moving" size={20} trigger="mount" />
					</span>
					<span class="relative">
						<span class="block text-[0.9375rem] font-medium">
							{limited.length === 0 ? 'Set your first limit' : 'Add a limit'}
						</span>
						<span class="mt-0.5 block text-sm text-fg-muted">A monthly cap for one category</span>
					</span>
				</button>
			{/snippet}
		</LimitEditor>
	</div>

	{#if unlimited.length > 0}
		<div class="flex flex-col gap-2.5 pt-1">
			<p class="text-sm text-fg-muted">No limit yet</p>
			<ul class="flex flex-wrap gap-2">
				{#each unlimited as line (line.name)}
					<li
						in:pop={{ scale: 0.8, bounce: 0.4, duration: 0.35 }}
						out:pop={{ scale: 0.8, duration: 0.25 }}
					>
						<LimitEditor
							category={line.name}
							lines={month.categories}
							currency={month.currency}
							{categoryChoices}
							align="start"
						>
							{#snippet trigger(props)}
								<button
									{...props}
									type="button"
									class="press flex h-11 max-w-full min-w-0 items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pr-3 pl-1.5 hover:border-hairline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
									aria-label="Set a limit for {line.name}"
								>
									<CategoryIcon
										category={line.name}
										color={categoryColor(line.name, categoryChoices)}
										animated
										class="size-8 rounded-full"
									/>
									<span class="truncate text-sm">{line.name}</span>
									<span class="tabular shrink-0 text-sm text-fg-muted">{money(line.spent)}</span>
									<Plus class="size-4 shrink-0 stroke-[1.75] text-fg-subtle" aria-hidden="true" />
								</button>
							{/snippet}
						</LimitEditor>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
