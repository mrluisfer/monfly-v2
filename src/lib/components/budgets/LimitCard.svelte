<script lang="ts">
	import MovingPencil from '@jis3r/icons/icons/pencil';
	import { countUp } from '$lib/actions';
	import { categoryColor } from '$lib/categories';
	import { percent } from '$lib/components/insights/format';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import { AnimatedIcon, Card, IconButton, PALETTE, type PaletteColor } from '$lib/components/ui';
	import {
		budgetPace,
		budgetProgress,
		formatMoney,
		perDayLeft,
		type CategoryLine,
		type Currency,
		type MonthProgress
	} from '$lib/finance';
	import { cn } from '$lib/utils';
	import BlockMeter from './BlockMeter.svelte';
	import LimitEditor from './LimitEditor.svelte';

	/**
	 * One category's month against its limit: its chip and name, how it's
	 * going in words, what went out over the limit, and a row of blocks that
	 * fill as the limit goes, with a tick where an even pace would be today.
	 * Its foot says what's left and what that leaves a day. A soft glow in the
	 * category's colour lights its corner and swells under the pointer; the
	 * pencil changes or takes away the limit.
	 */
	type Props = {
		/** A category that has a limit. */
		line: CategoryLine & { limit: number };
		progress: MonthProgress;
		lines: CategoryLine[];
		currency: Currency;
		categoryChoices?: Record<string, PaletteColor>;
		/** Its place in the grid, so the blocks fill card after card. */
		index?: number;
	};

	let { line, progress, lines, currency, categoryChoices, index = 0 }: Props = $props();

	const money = (cents: number) => formatMoney(cents, currency);
	const color = $derived(categoryColor(line.name, categoryChoices));

	const running = $derived(progress.left > 0);
	const share = $derived(progress.days > 0 ? progress.elapsed / progress.days : 0);
	const standing = $derived(budgetProgress(line.spent, line.limit));
	const pace = $derived(standing ? budgetPace(standing, share) : 'on-track');
	const ratio = $derived(line.spent / line.limit);

	const status = $derived(
		pace === 'over'
			? { text: running ? 'Over its limit' : 'Went over', class: 'text-negative' }
			: !running
				? { text: 'Stayed under', class: 'text-positive' }
				: pace === 'ahead'
					? { text: 'Ahead of the month', class: 'ahead' }
					: { text: 'On track', class: 'text-positive' }
	);

	const foot = $derived.by(() => {
		const left = line.limit - line.spent;
		if (left < 0) return { text: `${money(-left)} over the limit`, class: 'text-negative' };
		if (!running) return { text: `${money(left)} to spare`, class: '' };
		const daily = perDayLeft(line.spent, line.limit, progress) ?? 0;
		return { text: `${money(left)} left · ${money(daily)} a day`, class: '' };
	});
</script>

<Card
	class="group relative flex h-full flex-col overflow-hidden p-6"
	style="--c: {PALETTE[color].css}"
>
	<span
		class="glow pointer-events-none absolute -top-20 -right-20 size-48 rounded-full blur-3xl"
		aria-hidden="true"
	></span>

	<div class="relative flex items-start gap-3">
		<CategoryIcon category={line.name} {color} class="size-10 rounded-xl [&_svg]:size-5" />
		<div class="min-w-0 flex-1">
			<h3 class="text-[0.9375rem] font-medium text-balance wrap-anywhere">{line.name}</h3>
			<p class={cn('mt-0.5 text-sm', status.class)}>{status.text}</p>
		</div>
		<LimitEditor category={line.name} {lines} {currency} {categoryChoices}>
			{#snippet trigger(props)}
				<IconButton size="sm" {...props} aria-label="Change the limit for {line.name}">
					<AnimatedIcon icon={MovingPencil} set="moving" />
				</IconButton>
			{/snippet}
		</LimitEditor>
	</div>

	<div class="relative mt-auto pt-7">
		<div class="flex items-baseline justify-between gap-3">
			<p class="min-w-0 truncate">
				<span
					class="tabular font-display text-2xl leading-none font-light tracking-tight"
					use:countUp={{ value: line.spent, format: money, whenVisible: true }}
					>{money(line.spent)}</span
				>
				<span class="tabular text-sm text-fg-muted">/ {money(line.limit)}</span>
			</p>
			<span class={cn('tabular shrink-0 text-sm font-medium', ratio > 1 && 'text-negative')}
				>{percent(ratio, 0)}</span
			>
		</div>
		<BlockMeter
			{ratio}
			{color}
			pace={running ? share : null}
			valueText="{percent(ratio, 0)} of the {money(line.limit)} limit"
			delay={0.2 + index * 0.08}
			class="mt-3"
		/>
		<p class={cn('mt-3 truncate text-sm text-fg-muted', foot.class)}>{foot.text}</p>
	</div>
</Card>

<style>
	/* The category's colour, lighting the corner; it swells under the pointer. */
	.glow {
		background: var(--c);
		opacity: 0.28;
		transition:
			scale 0.7s var(--ease-out-quint),
			opacity 0.7s var(--ease-out-quint);
	}

	:global(.group:hover) > .glow {
		scale: 1.15;
		opacity: 0.4;
	}

	/* Running ahead of the month: peach, at a glyph's weight. */
	.ahead {
		color: oklch(from var(--pastel-peach) 0.58 calc(c * 1.8) h);
	}

	:global(.dark) .ahead {
		color: var(--pastel-peach);
	}
</style>
