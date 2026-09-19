<script lang="ts">
	import MovingCalendarDays from '@jis3r/icons/icons/calendar-days';
	import { fade } from 'svelte/transition';
	import { morph } from '$lib/actions';
	import { areaPath, monotonePath, niceTicks } from '$lib/components/accounts/chart';
	import { longDay, shortDay } from '$lib/components/insights/format';
	import { AnimatedIcon, Card, Sparkle } from '$lib/components/ui';
	import {
		addMonths,
		formatMoney,
		formatMoneyCompact,
		monthName,
		projectedSpend,
		running,
		type BudgetMonth,
		type MonthProgress
	} from '$lib/finance';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';

	/**
	 * The month's spending piling up day by day, in violet over a wash of it,
	 * against the budget: the dashed lime line an even pace would climb, the
	 * budget itself across the top — the room past it tinted with the alarm —
	 * and, while the month runs, a dashed line from today to where the month
	 * ends up at this pace. The month before climbs in grey underneath.
	 * Pointing at the chart, or arrowing along it, reads every line that day.
	 */
	type Props = {
		month: BudgetMonth;
		progress: MonthProgress;
		class?: string;
	};

	let { month, progress, class: className }: Props = $props();

	const VW = 1000;
	const VH = 300;

	const money = (cents: number) => formatMoney(cents, month.currency);
	const compact = (cents: number) => formatMoneyCompact(cents, month.currency, { whole: true });

	const n = $derived(month.days.length);
	const before = $derived(addMonths(month.month, -1));
	/** Spent by the end of each day gone, today included. */
	const now = $derived(running(month.days).slice(0, progress.elapsed));
	const then = $derived(running(month.daysBefore).slice(0, n));
	const budget = $derived(month.budget);
	const ahead = $derived(progress.left > 0 && progress.elapsed > 0);
	const projected = $derived(projectedSpend(month.spent, progress));

	/** What an even pace would have spent by the end of day `i`. */
	const even = (i: number) => (budget === null ? null : Math.round((budget * (i + 1)) / n));

	const ticks = $derived.by(() => {
		const most = Math.max(0, now.at(-1) ?? 0, then.at(-1) ?? 0, budget ?? 0, ahead ? projected : 0);
		return most > 0 ? niceTicks(0, most, 4) : [];
	});
	const ceiling = $derived(ticks.at(-1) ?? 1);
	const yOf = (cents: number) => 1 - cents / ceiling;
	const xOf = (i: number) => (n <= 1 ? 0 : i / (n - 1));

	const points = (values: number[]) => values.map((v, i) => [xOf(i) * VW, yOf(v) * VH] as const);
	const nowLine = $derived(monotonePath(points(now)));
	const nowWash = $derived(areaPath(points(now), VH));
	const thenLine = $derived(monotonePath(points(then)));
	const evenLine = $derived(
		budget === null ? '' : `M0,${yOf(even(0) ?? 0) * VH}L${VW},${yOf(budget) * VH}`
	);
	const projection = $derived(
		ahead
			? `M${xOf(progress.elapsed - 1) * VW},${yOf(month.spent) * VH}L${VW},${yOf(projected) * VH}`
			: ''
	);

	/** A mark a week along the foot: the 1st, the 8th, the 15th… */
	const marks = $derived(
		Array.from({ length: Math.ceil(n / 7) }, (_, w) => w * 7).map((i) => ({
			i,
			x: xOf(i) * 100,
			label: shortDay(`${month.month}-${String(i + 1).padStart(2, '0')}`)
		}))
	);

	// ── Reading a day ────────────────────────────────────────────────────

	let index = $state<number | null>(null);
	let plot = $state<HTMLElement>();
	const latest = $derived(Math.max(0, progress.elapsed - 1));

	const reading = $derived.by(() => {
		if (index === null || index >= n) return null;
		const i = index;
		return {
			i,
			x: xOf(i) * 100,
			title: longDay(`${month.month}-${String(i + 1).padStart(2, '0')}`),
			now: i < now.length ? now[i] : null,
			even: even(i),
			then: i < then.length ? then[i] : null
		};
	});

	function point(event: PointerEvent) {
		if (!plot || n === 0) return;
		const rect = plot.getBoundingClientRect();
		const f = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
		index = Math.round(f * (n - 1));
	}

	function keys(event: KeyboardEvent) {
		if (n === 0) return;
		const step = event.shiftKey ? 7 : 1;
		const at = index ?? latest;
		const next =
			event.key === 'ArrowLeft'
				? Math.max(0, at - step)
				: event.key === 'ArrowRight'
					? Math.min(n - 1, at + step)
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? n - 1
							: null;
		if (next !== null) {
			event.preventDefault();
			index = next;
		} else if (event.key === 'Escape' && index !== null) {
			event.preventDefault();
			index = null;
		}
	}
</script>

<Card class={cn('flex min-w-0 flex-col p-7', className)}>
	<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
		<div class="min-w-0">
			<div class="flex items-center gap-2.5">
				<Sparkle color="violet" animated burst={month.month} class="size-5 shrink-0" />
				<h2 class="font-display text-2xl font-medium">Spending pace</h2>
			</div>
			<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
				Everything spent so far, day by day, against the pace the budget allows.
			</p>
		</div>
		<ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-muted" aria-label="Lines">
			<li class="flex items-center gap-2">
				<span class="size-2.5 rounded-[3px] bg-violet" aria-hidden="true"></span>{monthName(
					month.month
				)}
			</li>
			{#if budget !== null}
				<li class="flex items-center gap-2">
					<span class="even-key h-0.5 w-3.5" aria-hidden="true"></span>Even pace
				</li>
			{/if}
			<li class="flex items-center gap-2">
				<span class="size-2.5 rounded-[3px] bg-line-strong" aria-hidden="true"></span>{monthName(
					before
				)}
			</li>
		</ul>
	</div>

	<div class="mt-6 grid flex-1 grid-cols-[3.25rem_minmax(0,1fr)]">
		<!-- As tall as the plot, not the plot and the days under it, so each
		     figure sits on its line. -->
		<div class="relative mb-6" aria-hidden="true">
			{#each ticks as tick (tick)}
				<span
					class="glide tabular absolute right-3 -translate-y-1/2 text-xs whitespace-nowrap text-fg-subtle"
					style="top: {yOf(tick) * 100}%"
					transition:fade={{ duration: 250 }}>{compact(tick)}</span
				>
			{/each}
		</div>

		<div class="flex min-w-0 flex-col">
			<div
				bind:this={plot}
				class="relative min-h-64 flex-1 touch-pan-y rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
				role="slider"
				tabindex="0"
				aria-label="Day on the spending pace chart"
				aria-valuemin={1}
				aria-valuemax={Math.max(1, n)}
				aria-valuenow={(index ?? latest) + 1}
				aria-valuetext={reading
					? `${reading.title}: ${reading.now === null ? 'still to come' : `${money(reading.now)} spent so far`}${reading.even === null ? '' : `; an even pace ${money(reading.even)}`}; ${monthName(before)} ${reading.then === null ? '—' : money(reading.then)}`
					: undefined}
				onpointermove={point}
				onpointerdown={point}
				onpointerleave={() => (index = null)}
				onkeydown={keys}
				onfocus={() => (index ??= latest)}
				onblur={() => (index = null)}
			>
				{#if budget !== null && budget < ceiling}
					<!-- Past the budget: the room there is the alarm's, faintly. -->
					<span
						class="over glide pointer-events-none absolute inset-x-0 top-0"
						style="height: {yOf(budget) * 100}%"
						aria-hidden="true"
					></span>
				{/if}

				{#each ticks as tick (tick)}
					<span
						class="glide absolute inset-x-0 border-t border-line"
						style="top: {yOf(tick) * 100}%"
						transition:fade={{ duration: 250 }}
						aria-hidden="true"
					></span>
				{/each}

				{#if reading}
					<span
						class="glide band pointer-events-none absolute inset-y-0 w-6 -translate-x-1/2 rounded-md"
						style="left: {reading.x}%"
						aria-hidden="true"
					></span>
				{/if}

				<div class="draw-on-view pointer-events-none absolute inset-0">
					<svg
						viewBox="0 0 {VW} {VH}"
						preserveAspectRatio="none"
						class="ink-tint size-full overflow-visible"
						style="--tint: var(--lime)"
						aria-hidden="true"
					>
						{#if thenLine}
							<path
								d={thenLine}
								use:morph={thenLine}
								fill="none"
								stroke-width="2"
								vector-effect="non-scaling-stroke"
								class="stroke-line-strong"
							/>
						{/if}
						{#if evenLine}
							<path
								d={evenLine}
								use:morph={evenLine}
								fill="none"
								stroke-width="2"
								stroke-dasharray="6 6"
								vector-effect="non-scaling-stroke"
								class="even"
							/>
						{/if}
						{#if nowWash}
							<path d={nowWash} use:morph={nowWash} class="wash" />
						{/if}
						{#if nowLine}
							<path
								d={nowLine}
								use:morph={nowLine}
								fill="none"
								stroke-width="2.5"
								stroke-linecap="round"
								vector-effect="non-scaling-stroke"
								class="stroke-violet"
							/>
						{/if}
						{#if projection}
							<path
								d={projection}
								fill="none"
								stroke-width="2"
								stroke-dasharray="3 7"
								stroke-linecap="round"
								vector-effect="non-scaling-stroke"
								class="stroke-violet opacity-70"
							/>
						{/if}
					</svg>
				</div>

				{#if budget !== null}
					<!-- The budget across the top, named at its right end. -->
					<span
						class="glide ink-tint budget-line pointer-events-none absolute inset-x-0 border-t-2"
						style="top: {yOf(budget) * 100}%; --tint: var(--lime)"
						aria-hidden="true"
					></span>
					<span
						class="glide pointer-events-none absolute right-0 -translate-y-[calc(100%+0.25rem)] rounded-md bg-lime/30 px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap text-[color-mix(in_oklab,var(--lime)_35%,var(--ink))] dark:bg-lime/15 dark:text-lime"
						style="top: {yOf(budget) * 100}%"
						aria-hidden="true">Budget {compact(budget)}</span
					>
				{/if}

				{#if ahead}
					<!-- Where the month ends at this pace, at the end of the dashed line. -->
					<span
						class={cn(
							'glide pointer-events-none absolute right-0 rounded-md bg-violet/12 px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap text-violet',
							budget !== null && Math.abs(yOf(projected) - yOf(budget)) < 0.1
								? 'translate-y-1'
								: '-translate-y-[calc(100%+0.25rem)]'
						)}
						style="top: {yOf(projected) * 100}%"
						aria-hidden="true">At this pace {compact(projected)}</span
					>
					<!-- Today, where the line has got to: a ringed dot that breathes. -->
					<span
						class="glide today pointer-events-none absolute grid size-3.5 -translate-1/2 place-items-center rounded-full border-2 border-violet bg-card"
						style="left: {xOf(progress.elapsed - 1) * 100}%; top: {yOf(month.spent) * 100}%"
						aria-hidden="true"
					>
						<span class="size-1 rounded-full bg-violet"></span>
					</span>
				{/if}

				{#if reading}
					{#if reading.now !== null}
						<span
							class="glide pointer-events-none absolute grid size-3.5 -translate-1/2 place-items-center rounded-full border-2 border-violet bg-card text-violet"
							style="left: {reading.x}%; top: {yOf(reading.now) * 100}%"
							aria-hidden="true"
						>
							<span class="size-1 rounded-full bg-current"></span>
						</span>
					{/if}
					<div
						class={cn(
							'glide pointer-events-none absolute top-2 z-10 w-max min-w-56 rounded-lg border border-line bg-card shadow-lg',
							reading.x > 55 ? '-translate-x-[calc(100%+1.25rem)]' : 'translate-x-5'
						)}
						style="left: {reading.x}%"
						in:pop={{ scale: 0.94 }}
						out:pop={{ scale: 0.94 }}
						aria-hidden="true"
					>
						<p class="flex items-center gap-2 border-b border-line px-3 py-2 text-sm font-medium">
							<AnimatedIcon icon={MovingCalendarDays} set="moving" trigger="mount" />
							{reading.title}
						</p>
						<dl
							class="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1.5 px-3 py-2.5 text-xs"
						>
							<span class="size-2 rounded-[2px] bg-violet"></span>
							<dt class="text-fg-muted">So far</dt>
							<dd class="tabular text-right font-medium">
								{reading.now === null ? 'Still to come' : money(reading.now)}
							</dd>
							{#if reading.even !== null}
								<span class="even-key h-0.5 w-2"></span>
								<dt class="text-fg-muted">Even pace</dt>
								<dd class="tabular text-right font-medium">{money(reading.even)}</dd>
							{/if}
							<span class="size-2 rounded-[2px] bg-line-strong"></span>
							<dt class="text-fg-muted">{monthName(before)}</dt>
							<dd class="tabular text-right font-medium">
								{reading.then === null ? '—' : money(reading.then)}
							</dd>
						</dl>
					</div>
				{/if}
			</div>

			<div class="relative mt-2 h-4 text-xs text-fg-muted" aria-hidden="true">
				{#each marks as mark (mark.i)}
					<span
						class={cn(
							'absolute whitespace-nowrap',
							mark.i > 0 && '-translate-x-1/2',
							mark.i % 14 !== 0 && 'max-sm:hidden'
						)}
						style="left: {mark.x}%">{mark.label}</span
					>
				{/each}
			</div>
		</div>
	</div>
</Card>

<style>
	.band {
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--color-violet) 12%, transparent),
			color-mix(in oklab, var(--color-violet) 4%, transparent)
		);
	}

	.wash {
		fill: color-mix(in oklab, var(--color-violet) 10%, transparent);
	}

	/* The budget's lime at a glyph's weight: an even pace dashed, the budget solid. */
	.even {
		stroke: var(--ink-tint);
	}

	.budget-line {
		border-color: var(--ink-tint);
	}

	.even-key {
		background: repeating-linear-gradient(
			90deg,
			oklch(from var(--lime) 0.6 calc(c * 1.6) h) 0 3px,
			transparent 3px 5px
		);
	}

	:global(.dark) .even-key {
		background: repeating-linear-gradient(90deg, var(--lime) 0 3px, transparent 3px 5px);
	}

	.over {
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--color-negative) 7%, transparent),
			color-mix(in oklab, var(--color-negative) 2%, transparent)
		);
	}

	.glide {
		transition:
			left 0.14s var(--ease-out-quint),
			top 0.6s var(--ease-out-quint),
			height 0.6s var(--ease-out-quint),
			translate 0.25s var(--ease-out-quint);
	}

	/* Today breathes: a violet ring swells out of its dot and fades. */
	@media (prefers-reduced-motion: no-preference) {
		.today::after {
			content: '';
			position: absolute;
			inset: -2px;
			border-radius: 9999px;
			border: 2px solid var(--color-violet);
			animation: breathe 2.4s var(--ease-out-quint) infinite;
		}
	}

	@keyframes breathe {
		from {
			scale: 1;
			opacity: 0.6;
		}
		to {
			scale: 2.4;
			opacity: 0;
		}
	}
</style>
