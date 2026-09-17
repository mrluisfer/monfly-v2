<script lang="ts">
	import { countUp } from '$lib/actions';
	import { categoryColor } from '$lib/categories';
	import { Card, PALETTE, ShareBar, Sparkle, type PaletteColor } from '$lib/components/ui';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import { formatMoney, monthName, type Currency, type MonthKey } from '$lib/finance';
	import { changeFrom, flowOver, weekday, type Entry, type Stretch } from '$lib/insights';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';
	import { longDay, percent, signedPercent } from './format';

	/**
	 * Every day of the stretch as a dot, a column a week and a row a weekday:
	 * the more went out that day, the bigger and deeper the dot. The biggest
	 * day rings softly. Beside it the categories that took the most — press
	 * one and the dots redraw as that category's days alone, in its colour;
	 * press it again for everything. Pointing at a dot, or moving through the
	 * days with the arrow keys, reads that day.
	 */
	type Props = {
		stretch: Stretch;
		/** The stretch before, for the total's change. */
		before: Stretch;
		/** What counts, for one category's days. */
		entries: Entry[];
		currency: Currency;
		vs: string;
		categoryChoices?: Record<string, PaletteColor>;
		class?: string;
	};

	let {
		stretch,
		before,
		entries,
		currency,
		vs,
		categoryChoices,
		class: className
	}: Props = $props();

	const money = (cents: number) => formatMoney(cents, currency);

	const top = $derived(stretch.categories.slice(0, 5));

	/** The category the dots show, for the visit; one that leaves the top five lets go. */
	let picked = $state<string | null>(null);
	const pick = $derived(top.some((c) => c.name === picked) ? picked : null);
	const tint = $derived<PaletteColor>(pick ? categoryColor(pick, categoryChoices) : 'rose');

	/** Spent each day: everything, or the picked category's alone. */
	const values = $derived.by(() => {
		if (!pick) return stretch.days.map((d) => d.spent);
		const at = new Map(stretch.days.map((d, i) => [d.key, i]));
		const out = stretch.days.map(() => 0);
		for (const entry of entries) {
			if (entry.type !== 'expense' || entry.category !== pick) continue;
			const i = at.get(entry.day);
			if (i !== undefined) out[i] += entry.amount;
		}
		return out;
	});

	/** Four sizes of dot, by quarter of the days anything went out; none for a quiet day. */
	const levels = $derived.by(() => {
		const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
		const cut = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
		const cuts = sorted.length > 0 ? [cut(0.25), cut(0.5), cut(0.75)] : [];
		return values.map((v) => (v <= 0 ? 0 : 1 + cuts.filter((c) => v > c).length));
	});

	const peak = $derived(values.reduce((best, v, i) => (v > (values[best] ?? 0) ? i : best), -1));

	/** Monday-first weeks: the first day sits on its own weekday's row. */
	const offset = $derived(stretch.days.length > 0 ? weekday(stretch.days[0].key) : 0);
	const weeks = $derived(Math.ceil((offset + stretch.days.length) / 7));
	const columnOf = (i: number) => Math.floor((offset + i) / 7);

	const marks = $derived(
		stretch.days.flatMap((day, i) =>
			day.key.endsWith('-01')
				? [{ column: columnOf(i), label: monthName(day.key.slice(0, 7) as MonthKey, 'short') }]
				: []
		)
	);

	// ── Reading a day ────────────────────────────────────────────────────

	let index = $state<number | null>(null);
	let grid = $state<HTMLElement>();
	/** Where the reading's card sits, measured off the day's cell. */
	let spot = $state({ x: 0, y: 0, below: false });
	const latest = $derived(Math.max(0, stretch.elapsed - 1));

	function read(i: number) {
		index = i;
		const cell = grid?.querySelector<HTMLElement>(`[data-day="${i}"]`);
		if (!cell || !grid) return;
		spot = {
			x: cell.offsetLeft + cell.offsetWidth / 2,
			y: cell.offsetTop,
			below: cell.offsetTop < 90
		};
	}

	function over(event: PointerEvent) {
		const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-day]');
		if (cell) read(Number(cell.dataset.day));
	}

	function keys(event: KeyboardEvent) {
		const n = stretch.days.length;
		if (n === 0) return;
		const at = index ?? latest;
		const next =
			event.key === 'ArrowLeft'
				? at - 7
				: event.key === 'ArrowRight'
					? at + 7
					: event.key === 'ArrowUp'
						? at - 1
						: event.key === 'ArrowDown'
							? at + 1
							: event.key === 'Home'
								? 0
								: event.key === 'End'
									? latest
									: null;
		if (next !== null) {
			event.preventDefault();
			read(Math.min(n - 1, Math.max(0, next)));
		} else if (event.key === 'Escape' && index !== null) {
			event.preventDefault();
			index = null;
		}
	}

	const reading = $derived.by(() => {
		if (index === null || index >= stretch.days.length) return null;
		const day = stretch.days[index];
		return {
			title: longDay(day.key),
			text: day.future ? 'Still to come' : money(values[index]),
			count: pick ? null : day.expenses,
			future: day.future
		};
	});

	const spentNow = $derived(stretch.total.spent);
	const change = $derived(
		changeFrom(spentNow, flowOver(before, Math.min(stretch.elapsed, before.days.length)).spent)
	);

	const SIZES = [0.3, 0.5, 0.68, 0.86, 1];
</script>

<Card class={cn('grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_22rem]', className)}>
	<!-- Header on top, the calendar anchored to the foot, when the list beside it is taller. -->
	<div class="flex min-w-0 flex-col p-7">
		<div class="flex items-center gap-2.5">
			<Sparkle color={tint} animated burst={pick ?? stretch.span.label} class="size-5 shrink-0" />
			<h2 class="font-display text-2xl font-medium">Every day, dotted</h2>
		</div>
		<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
			{pick ? `What went to ${pick}` : 'What went out'} each day of {stretch.span.label} — the bigger
			the dot, the more.
		</p>

		<div class="mt-auto pt-7">
			<!-- Narrower than a year of legible dots, the calendar scrolls sideways
			     inside the card rather than shrinking them to specks. It pulls out
			     into the card's padding, so the scrollbar rides there. -->
			<div class="-mx-7 overflow-x-auto px-7 pb-1">
				<div class="relative min-w-[40rem]">
					<!-- The months, over the week each one starts in. -->
					<div
						class="grid pl-9 text-xs text-fg-muted"
						style="grid-template-columns: repeat({weeks}, minmax(0, 1fr))"
						aria-hidden="true"
					>
						{#each marks as mark (mark.column)}
							<span class="whitespace-nowrap" style="grid-column: {mark.column + 1}; grid-row: 1"
								>{mark.label}</span
							>
						{/each}
					</div>

					<!-- A slider over the days: left and right walk a week, up and down a day. -->
					<div
						bind:this={grid}
						class="relative mt-2 grid touch-pan-y rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
						style="grid-template-columns: 2.25rem repeat({weeks}, minmax(0, 1fr)); --tint: {PALETTE[
							tint
						].css}"
						role="slider"
						tabindex="0"
						aria-label="Day in {stretch.span.label}"
						aria-valuemin={0}
						aria-valuemax={Math.max(0, stretch.days.length - 1)}
						aria-valuenow={index ?? latest}
						aria-valuetext={reading ? `${reading.title}: ${reading.text}` : undefined}
						onpointerover={over}
						onpointerleave={() => (index = null)}
						onkeydown={keys}
						onfocus={() => index === null && read(latest)}
						onblur={() => (index = null)}
					>
						{#each ['Mon', '', 'Wed', '', 'Fri', '', ''] as name, row (row)}
							<span
								class="self-center text-[0.6875rem] leading-none text-fg-subtle"
								style="grid-column: 1; grid-row: {row + 1}"
								aria-hidden="true">{name}</span
							>
						{/each}
						{#each stretch.days as day, i (i)}
							<span
								data-day={i}
								class={cn(
									'cell relative grid aspect-square place-items-center',
									day.future && 'future'
								)}
								style="grid-column: {columnOf(i) + 2}; grid-row: {((offset + i) % 7) + 1}"
								aria-hidden="true"
							>
								<span
									class={cn(
										'dot ink-tint size-[82%] rounded-full',
										levels[i] > 0 && 'on',
										index === i && 'lit'
									)}
									style="--size: {SIZES[levels[i]]}; --level: {levels[i]}; --w: {columnOf(i)}"
								></span>
								{#if i === peak}
									<span class="ink-tint pointer-events-none absolute inset-0 rounded-full ring"
									></span>
								{/if}
							</span>
						{/each}

						{#if reading}
							<div
								class={cn(
									'pointer-events-none absolute z-10 w-max -translate-x-1/2 rounded-lg border border-line bg-card px-3 py-2 shadow-lg transition-[left,top] duration-150',
									spot.below ? 'translate-y-7' : '-translate-y-[calc(100%+0.5rem)]'
								)}
								style="left: clamp(5rem, {spot.x}px, calc(100% - 5rem)); top: {spot.y}px"
								in:pop={{ scale: 0.94 }}
								out:pop={{ scale: 0.94 }}
								aria-hidden="true"
							>
								<p class="text-xs text-fg-muted">{reading.title}</p>
								<p class="tabular mt-0.5 font-display text-lg leading-tight font-medium">
									{reading.text}
								</p>
								{#if reading.count !== null && !reading.future}
									<p class="text-xs text-fg-muted">
										{reading.count}
										{reading.count === 1 ? 'expense' : 'expenses'}
									</p>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<div
				class="mt-4 flex items-center justify-end gap-1.5 text-xs text-fg-muted"
				aria-hidden="true"
			>
				Less
				{#each SIZES as size, level (level)}
					<span class="grid size-3.5 place-items-center" style="--tint: {PALETTE[tint].css}">
						<span
							class={cn('dot ink-tint size-full rounded-full', level > 0 && 'on')}
							style="--size: {size}; --level: {level}; --w: 0"
						></span>
					</span>
				{/each}
				More
			</div>
		</div>
	</div>

	<!-- ── What took the most, and a way to see its days alone ────────── -->
	<div class="flex flex-col border-line p-7 max-lg:border-t lg:border-l">
		<p class="text-[0.9375rem] text-fg-muted">Spent</p>
		<p
			class="tabular mt-1 truncate font-display text-[2.5rem] leading-none font-light tracking-tight"
			use:countUp={{ value: spentNow, format: money, whenVisible: true }}
		>
			{money(spentNow)}
		</p>
		<p class="mt-2 text-sm text-fg-muted">
			{#if change === null}
				Nothing earlier to compare
			{:else}
				<span class="tabular font-medium text-fg">{signedPercent(change)}</span> {vs}
			{/if}
		</p>

		{#if top.length > 0}
			<ul class="mt-6 grid gap-1" aria-label="Categories">
				{#each top as category, i (category.name)}
					{@const share = spentNow > 0 ? category.spent / spentNow : 0}
					{@const color = categoryColor(category.name, categoryChoices)}
					<li>
						<button
							type="button"
							aria-pressed={pick === category.name}
							onclick={() => (picked = pick === category.name ? null : category.name)}
							class={cn(
								'press -mx-2 grid w-[calc(100%+1rem)] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl px-2 py-2 text-left hover:bg-sunken',
								'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
								pick === category.name && 'bg-sunken',
								pick && pick !== category.name && 'opacity-55'
							)}
						>
							<CategoryIcon category={category.name} {color} animated />
							<span class="truncate text-[0.9375rem]">{category.name}</span>
							<span class="tabular text-sm text-fg-muted">{percent(share, 0)}</span>
							<ShareBar
								segments={[{ id: category.name, share, color }]}
								delay={i * 60}
								class="col-span-3 h-1.5"
							/>
						</button>
					</li>
				{/each}
			</ul>
			<p class="mt-auto pt-4 text-xs text-fg-subtle">
				{pick ? 'Press it again to see every category.' : 'Press one to see its days alone.'}
			</p>
		{/if}
	</div>
</Card>

<style>
	/*
	 * A quiet day is a small ghost; a day money went out grows and deepens with
	 * it. Dots pop in week by week as the calendar arrives, and ease when the
	 * stretch or the category changes.
	 */
	.dot {
		scale: var(--size);
		background: var(--color-line);
		transition:
			scale 0.5s var(--ease-spring) calc(var(--w) * 6ms),
			background-color 0.4s var(--ease-out-quint) calc(var(--w) * 6ms),
			opacity 0.4s var(--ease-out-quint);

		@starting-style {
			scale: 0;
		}
	}

	.dot.on {
		background: var(--ink-tint);
		opacity: calc(0.4 + var(--level) * 0.15);
	}

	.future .dot {
		opacity: 0.4;
	}

	.dot.lit {
		outline: 2px solid var(--color-fg);
		outline-offset: 1px;
	}

	/* The biggest day rings, softly and on its own beat. */
	.ring {
		border: 1.5px solid var(--ink-tint);
		animation: ring 2.4s var(--ease-out-quint) infinite;
	}

	@keyframes ring {
		from {
			opacity: 0.7;
			scale: 0.9;
		}
		to {
			opacity: 0;
			scale: 1.9;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ring {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
