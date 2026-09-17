<script lang="ts">
	import MovingCalendarDays from '@jis3r/icons/icons/calendar-days';
	import MovingCircleArrowDown from '@jis3r/icons/icons/circle-arrow-down';
	import MovingCircleArrowUp from '@jis3r/icons/icons/circle-arrow-up';
	import { fade } from 'svelte/transition';
	import { countUp, morph } from '$lib/actions';
	import { monotonePath, niceTicks } from '$lib/components/accounts/chart';
	import { AnimatedIcon, Card, Sparkle } from '$lib/components/ui';
	import {
		daysInMonth,
		formatMoney,
		formatMoneyCompact,
		monthName,
		type Currency
	} from '$lib/finance';
	import { changeFrom, dayFacts, WEEKDAYS, type Stretch } from '$lib/insights';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';
	import { longDay, shortDay, signedPercent } from './format';

	/**
	 * How fast the money goes: on the left the day-by-day figures — spent per
	 * day, days with nothing spent, the biggest day, the weekday most goes out
	 * on — each against the stretch before as far as this one has come; on the
	 * right, spending piling up through the stretch, over the same climb the
	 * stretch before made in grey. Pointing at the chart, or arrowing along it,
	 * reads both on that day.
	 */
	type Props = {
		stretch: Stretch;
		before: Stretch;
		currency: Currency;
		vs: string;
		class?: string;
	};

	let { stretch, before, currency, vs, class: className }: Props = $props();

	const VW = 1000;
	const VH = 300;

	const money = (cents: number) => formatMoney(cents, currency);
	const whole = (n: number) => String(Math.round(n));

	const facts = $derived(dayFacts(stretch));
	/** The stretch before, only as far as this one has come. */
	const earlier = $derived(
		dayFacts({ days: before.days, elapsed: Math.min(stretch.elapsed, before.days.length) })
	);

	const figures = $derived([
		{
			label: 'Per day',
			value: facts.perDay,
			format: money,
			note: 'Spent on an average day',
			change: changeFrom(facts.perDay, earlier.perDay),
			better: 'down' as const
		},
		{
			label: 'No-spend days',
			value: facts.quiet,
			format: whole,
			note: facts.longestRun > 1 ? `${facts.longestRun} in a row at most` : 'Days nothing went out',
			// A stretch before with nothing spent at all has every day quiet: nothing to measure from.
			change: earlier.busiest ? changeFrom(facts.quiet, earlier.quiet) : null,
			better: 'up' as const
		},
		{
			label: 'Biggest day',
			value: facts.busiest?.spent ?? 0,
			format: money,
			note: facts.busiest ? longDay(facts.busiest.key) : 'Nothing spent yet',
			change: changeFrom(facts.busiest?.spent ?? 0, earlier.busiest?.spent ?? 0),
			better: 'down' as const
		}
	]);

	// ── The climb ────────────────────────────────────────────────────────

	const running = (s: Stretch, count: number) => {
		let sum = 0;
		return s.days.slice(0, count).map((d) => (sum += d.spent));
	};
	const now = $derived(running(stretch, stretch.elapsed));
	const then = $derived(running(before, before.days.length));
	const n = $derived(Math.max(stretch.days.length, before.days.length));

	const ticks = $derived.by(() => {
		const most = Math.max(0, now.at(-1) ?? 0, then.at(-1) ?? 0);
		return most > 0 ? niceTicks(0, most, 4) : [];
	});
	const ceiling = $derived(ticks.at(-1) ?? 1);
	const yOf = (cents: number) => 1 - cents / ceiling;
	const xOf = (i: number) => (n <= 1 ? 0 : i / (n - 1));

	const path = (values: number[]) =>
		monotonePath(values.map((v, i) => [xOf(i) * VW, yOf(v) * VH] as const));
	const nowLine = $derived(path(now));
	const thenLine = $derived(path(then));

	/** Each month under the day it starts on. */
	const marks = $derived.by(() => {
		let day = 0;
		return stretch.span.months.map((month) => {
			const mark = { x: xOf(day) * 100, label: monthName(month, 'short') };
			day += daysInMonth(month);
			return mark;
		});
	});

	// ── Reading a day ────────────────────────────────────────────────────

	let index = $state<number | null>(null);
	let plot = $state<HTMLElement>();
	const latest = $derived(Math.max(0, stretch.elapsed - 1));

	const reading = $derived.by(() => {
		if (index === null || index >= n) return null;
		const i = index;
		const day = stretch.days[i];
		return {
			i,
			x: xOf(i) * 100,
			title: day ? longDay(day.key) : '',
			now: i < now.length ? now[i] : null,
			then: i < then.length ? then[i] : null,
			thenDay: before.days[i]?.key ?? null
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

	const weekdayName = $derived(facts.topWeekday === null ? '—' : WEEKDAYS[facts.topWeekday]);
</script>

<Card class={cn('grid overflow-hidden lg:grid-cols-[19rem_minmax(0,1fr)]', className)}>
	<!-- ── The figures, one under another ─────────────────────────────── -->
	<dl
		class="grid content-start divide-y divide-line border-line px-7 py-3 max-lg:border-b lg:border-r"
	>
		{#each figures as figure (figure.label)}
			<div class="py-4">
				<dt class="flex items-center justify-between gap-3 text-[0.9375rem] text-fg-muted">
					{figure.label}
					{#if figure.change !== null}
						{@const good = figure.change === 0 || figure.change > 0 === (figure.better === 'up')}
						<span
							class={cn(
								'tabular flex items-center gap-1 text-sm font-medium',
								good
									? 'text-positive'
									: 'text-[oklch(from_var(--pastel-rose)_0.55_calc(c*1.7)_h)] dark:text-spent'
							)}
						>
							{#if figure.change >= 0}
								<AnimatedIcon icon={MovingCircleArrowUp} set="moving" />
							{:else}
								<AnimatedIcon icon={MovingCircleArrowDown} set="moving" />
							{/if}
							{signedPercent(figure.change)}
							<span class="sr-only">{vs}</span>
						</span>
					{/if}
				</dt>
				<dd class="mt-2">
					<p
						class="tabular truncate font-display text-[2rem] leading-none font-light tracking-tight"
						use:countUp={{ value: figure.value, format: figure.format, whenVisible: true }}
					>
						{figure.format(figure.value)}
					</p>
					<p class="mt-1.5 truncate text-sm text-fg-muted">{figure.note}</p>
				</dd>
			</div>
		{/each}
		<div class="py-4">
			<dt class="text-[0.9375rem] text-fg-muted">Busiest weekday</dt>
			<dd class="mt-2">
				<p class="truncate font-display text-[2rem] leading-none font-light tracking-tight">
					{weekdayName}
				</p>
				<p class="mt-1.5 truncate text-sm text-fg-muted">
					{facts.topWeekday === null
						? 'Nothing spent yet'
						: `${money(facts.byWeekday[facts.topWeekday])} over the stretch`}
				</p>
			</dd>
		</div>
	</dl>

	<!-- ── The climb ───────────────────────────────────────────────────── -->
	<div class="flex min-w-0 flex-col p-7">
		<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
			<div class="min-w-0">
				<div class="flex items-center gap-2.5">
					<Sparkle color="violet" animated burst={stretch.span.label} class="size-5 shrink-0" />
					<h2 class="font-display text-2xl font-medium">Spending pace</h2>
				</div>
				<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
					Everything spent so far, day by day, against the stretch before.
				</p>
			</div>
			<ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-muted" aria-label="Lines">
				<li class="flex items-center gap-2">
					<span class="size-2.5 rounded-[3px] bg-violet" aria-hidden="true"></span>{stretch.span
						.label}
				</li>
				<li class="flex items-center gap-2">
					<span class="size-2.5 rounded-[3px] bg-line-strong" aria-hidden="true"></span>{before.span
						.label}
				</li>
			</ul>
		</div>

		<div class="mt-6 grid flex-1 grid-cols-[3.25rem_minmax(0,1fr)]">
			<div class="relative" aria-hidden="true">
				{#each ticks as tick (tick)}
					<span
						class="glide tabular absolute right-3 -translate-y-1/2 text-xs whitespace-nowrap text-fg-subtle"
						style="top: {yOf(tick) * 100}%"
						transition:fade={{ duration: 250 }}
						>{formatMoneyCompact(tick, currency, { whole: true })}</span
					>
				{/each}
			</div>

			<div class="flex min-w-0 flex-col">
				<div
					bind:this={plot}
					class="relative min-h-60 flex-1 touch-pan-y rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
					role="slider"
					tabindex="0"
					aria-label="Day on the spending pace chart"
					aria-valuemin={0}
					aria-valuemax={Math.max(0, n - 1)}
					aria-valuenow={index ?? latest}
					aria-valuetext={reading
						? `${reading.title}: ${reading.now === null ? 'still to come' : money(reading.now)} spent so far; ${before.span.label} ${reading.then === null ? '—' : money(reading.then)}`
						: undefined}
					onpointermove={point}
					onpointerdown={point}
					onpointerleave={() => (index = null)}
					onkeydown={keys}
					onfocus={() => (index ??= latest)}
					onblur={() => (index = null)}
				>
					{#each ticks as tick (tick)}
						<span
							class="glide absolute inset-x-0 border-t border-line"
							style="top: {yOf(tick) * 100}%"
							transition:fade={{ duration: 250 }}
							aria-hidden="true"
						></span>
					{/each}

					{#if reading}
						<!-- A soft column behind the day being read. -->
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
							class="size-full overflow-visible"
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
						</svg>
					</div>

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
								<span class="size-2 rounded-[2px] bg-line-strong"></span>
								<dt class="text-fg-muted">
									{reading.thenDay
										? `${shortDay(reading.thenDay)}, ${reading.thenDay.slice(0, 4)}`
										: before.span.label}
								</dt>
								<dd class="tabular text-right font-medium">
									{reading.then === null ? '—' : money(reading.then)}
								</dd>
							</dl>
						</div>
					{/if}
				</div>

				<div class="relative mt-2 h-4 text-xs text-fg-muted" aria-hidden="true">
					{#each marks as mark, i (mark.x)}
						<span
							class={cn('absolute whitespace-nowrap', i % 3 !== 0 && 'max-sm:hidden')}
							style="left: {mark.x}%">{mark.label}</span
						>
					{/each}
				</div>
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

	.glide {
		transition:
			left 0.14s var(--ease-out-quint),
			top 0.35s var(--ease-out-quint),
			translate 0.25s var(--ease-out-quint);
	}
</style>
