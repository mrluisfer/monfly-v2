<script lang="ts">
	import { fade } from 'svelte/transition';
	import { morph } from '$lib/actions';
	import { categoryColor } from '$lib/categories';
	import { niceTicks } from '$lib/components/accounts/chart';
	import {
		Card,
		Checkbox,
		PALETTE,
		Segmented,
		Sparkle,
		type PaletteColor
	} from '$lib/components/ui';
	import { formatMoney, formatMoneyCompact, monthName, type Currency } from '$lib/finance';
	import { changeFrom, type Stretch } from '$lib/insights';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';
	import { signedPercent } from './format';

	/**
	 * The biggest categories side by side, month by month: a stepped line each
	 * in its own colour over a soft wash of it, or — as a running total — how
	 * each one piles up across the stretch. A box beside each name takes its
	 * line off the chart and back (the last one stays); pointing at a name sets
	 * the other lines back. Pointing at a month, or arrowing along the chart,
	 * reads every line that month, with how far each moved from the month
	 * before. Lines draw themselves as the chart scrolls in and morph when the
	 * stretch or what counts changes.
	 */
	type Props = {
		stretch: Stretch;
		currency: Currency;
		/** Colours people picked for their categories (`User.colors.category`). */
		categoryChoices?: Record<string, PaletteColor>;
		class?: string;
	};

	let { stretch, currency, categoryChoices, class: className }: Props = $props();

	const uid = $props.id();
	const VW = 1000;
	const VH = 300;
	/** How many categories get a line. */
	const TOP = 5;

	/** Lines taken off the chart, by name — for the visit. */
	let hidden = $state<string[]>([]);
	/** The name under the pointer: its line comes forward. */
	let spotlit = $state<string | null>(null);
	let mode = $state<'month' | 'running'>('month');

	const n = $derived(stretch.months.length);
	/** Months that have come: lines stop at today. */
	const come = $derived(stretch.months.filter((m) => !m.future).length);

	const series = $derived(
		stretch.categories.slice(0, TOP).map((category) => {
			let sum = 0;
			return {
				name: category.name,
				color: categoryColor(category.name, categoryChoices),
				values: category.months.slice(0, come).map((v) => (mode === 'running' ? (sum += v) : v))
			};
		})
	);
	const shown = $derived(series.filter((s) => !hidden.includes(s.name)));

	function toggle(name: string, on: boolean) {
		if (on) hidden = hidden.filter((h) => h !== name);
		else if (shown.length > 1) hidden = [...hidden, name];
	}

	const ticks = $derived.by(() => {
		const most = Math.max(0, ...shown.flatMap((s) => s.values));
		return most > 0 ? niceTicks(0, most, 4) : [];
	});
	const ceiling = $derived(ticks.at(-1) ?? 1);
	const yOf = (cents: number) => 1 - cents / ceiling;

	const round = (v: number) => Math.round(v * 100) / 100;
	const xAt = (i: number) => round((i / n) * VW);

	/** A flat run across each month, stepping at the month's edge to the next. */
	function steps(values: number[]) {
		if (values.length === 0) return '';
		return values
			.map((v, i) => `${i === 0 ? `M${xAt(0)},` : 'V'}${round(yOf(v) * VH)}H${xAt(i + 1)}`)
			.join('');
	}

	const lines = $derived(
		shown.map((s) => ({
			...s,
			d: steps(s.values),
			area: s.values.length > 0 ? `${steps(s.values)}V${VH}H${xAt(0)}Z` : ''
		}))
	);

	const money = (cents: number) => formatMoney(cents, currency);
	const compact = (cents: number) => formatMoneyCompact(cents, currency, { whole: true });

	// ── Reading a month ──────────────────────────────────────────────────

	let index = $state<number | null>(null);
	let plot = $state<HTMLElement>();

	const reading = $derived.by(() => {
		if (index === null || index >= come) return null;
		const i = index;
		const month = stretch.months[i];
		return {
			i,
			x: ((i + 0.5) / n) * 100,
			title: `${monthName(month.key)} ${month.key.slice(0, 4)}`,
			rows: shown
				.map((s) => ({
					name: s.name,
					color: s.color,
					value: s.values[i],
					y: yOf(s.values[i]) * 100,
					change: mode === 'month' && i > 0 ? changeFrom(s.values[i], s.values[i - 1]) : null
				}))
				.sort((a, b) => b.value - a.value)
		};
	});

	function point(event: PointerEvent) {
		if (!plot || come === 0) return;
		const rect = plot.getBoundingClientRect();
		const f = Math.min(0.9999, Math.max(0, (event.clientX - rect.left) / rect.width));
		index = Math.min(come - 1, Math.floor(f * n));
	}

	function keys(event: KeyboardEvent) {
		if (come === 0) return;
		const at = index ?? come - 1;
		const next =
			event.key === 'ArrowLeft'
				? Math.max(0, at - 1)
				: event.key === 'ArrowRight'
					? Math.min(come - 1, at + 1)
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? come - 1
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

<Card class={cn('flex flex-col p-7', className)}>
	<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
		<div class="min-w-0">
			<div class="flex items-center gap-2.5">
				<Sparkle color="coral" animated burst={stretch.span.label} class="size-5 shrink-0" />
				<h2 class="font-display text-2xl font-medium">Categories over time</h2>
			</div>
			<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
				Your {Math.min(TOP, series.length) || ''} biggest, {mode === 'month'
					? 'month by month'
					: 'piling up'}, {stretch.span.label}.
			</p>
		</div>
		<Segmented
			label="Draw"
			options={[
				{ value: 'month', label: 'Each month' },
				{ value: 'running', label: 'Running total' }
			]}
			bind:value={mode}
		/>
	</div>

	{#if series.length === 0}
		<p
			class="hatch mt-6 grid min-h-64 flex-1 place-items-center rounded-lg border border-line text-[0.9375rem] text-fg-muted"
		>
			Nothing spent in {stretch.span.label}.
		</p>
	{:else}
		<!-- The legend is the switch: a box takes a line off the chart, and the last one stays. -->
		<ul class="mt-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Categories on the chart">
			{#each series as s, i (s.name)}
				{@const on = !hidden.includes(s.name)}
				<li
					class="flex items-center gap-2"
					onpointerenter={() => (spotlit = s.name)}
					onpointerleave={() => (spotlit = null)}
				>
					<Checkbox
						id="{uid}-series-{i}"
						checked={on}
						disabled={on && shown.length === 1}
						onCheckedChange={(next) => toggle(s.name, next)}
					/>
					<label
						for="{uid}-series-{i}"
						class={cn(
							'flex cursor-pointer items-center gap-2 text-sm transition-colors',
							!on && 'text-fg-subtle'
						)}
					>
						<span
							class="swatch ink-tint relative h-0.5 w-5 rounded-full"
							style="--tint: {PALETTE[s.color].css}"
							aria-hidden="true"
						>
							<span
								class="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full border-[1.5px] bg-card"
							></span>
						</span>
						{s.name}
					</label>
				</li>
			{/each}
		</ul>

		<div class="mt-6 grid flex-1 grid-cols-[3.25rem_minmax(0,1fr)]">
			<div class="relative" aria-hidden="true">
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
					class="relative h-64 flex-1 touch-pan-y rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
					role="slider"
					tabindex="0"
					aria-label="Month on the categories chart"
					aria-valuemin={0}
					aria-valuemax={Math.max(0, come - 1)}
					aria-valuenow={index ?? Math.max(0, come - 1)}
					aria-valuetext={reading
						? `${reading.title}: ${reading.rows.map((r) => `${r.name} ${money(r.value)}`).join(', ')}`
						: undefined}
					onpointermove={point}
					onpointerdown={point}
					onpointerleave={() => (index = null)}
					onkeydown={keys}
					onfocus={() => (index ??= Math.max(0, come - 1))}
					onblur={() => (index = null)}
				>
					{#each ticks as tick (tick)}
						<span
							class="glide absolute inset-x-0 border-t border-dashed border-line"
							style="top: {yOf(tick) * 100}%"
							transition:fade={{ duration: 250 }}
							aria-hidden="true"
						></span>
					{/each}

					{#if reading}
						<span
							class="glide pointer-events-none absolute inset-y-0 bg-sunken"
							style="left: {(reading.i / n) * 100}%; width: {100 / n}%"
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
							<defs>
								<linearGradient id="{uid}-fade" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="white" stop-opacity="0.85" />
									<stop offset="100%" stop-color="white" stop-opacity="0" />
								</linearGradient>
								<mask id="{uid}-mask" maskContentUnits="userSpaceOnUse">
									<rect width={VW} height={VH} fill="url(#{uid}-fade)" />
								</mask>
							</defs>
							{#each lines as line (line.name)}
								<g
									class={cn(
										'ink-tint transition-opacity duration-300',
										spotlit && spotlit !== line.name && 'opacity-20'
									)}
									style="--tint: {PALETTE[line.color].css}"
									transition:fade={{ duration: 300 }}
								>
									<path d={line.area} use:morph={line.area} class="wash" mask="url(#{uid}-mask)" />
									<path
										d={line.d}
										use:morph={line.d}
										fill="none"
										stroke-width="2"
										stroke-linejoin="round"
										vector-effect="non-scaling-stroke"
										class="stroke"
									/>
								</g>
							{/each}
						</svg>
					</div>

					{#if reading}
						<span
							class="glide pointer-events-none absolute inset-y-0 border-l border-dashed border-fg-subtle"
							style="left: {reading.x}%"
							aria-hidden="true"
						></span>
						{#each reading.rows as row (row.name)}
							<span
								class="glide dot ink-tint pointer-events-none absolute size-3 -translate-1/2 rounded-full border-2 bg-card"
								style="left: {reading.x}%; top: {row.y}%; --tint: {PALETTE[row.color].css}"
								aria-hidden="true"
							></span>
						{/each}
						<div
							class={cn(
								'glide pointer-events-none absolute top-2 z-10 w-max min-w-52 rounded-lg border border-line bg-card shadow-lg',
								reading.x > 55 ? '-translate-x-[calc(100%+1rem)]' : 'translate-x-4'
							)}
							style="left: {reading.x}%"
							in:pop={{ scale: 0.94 }}
							out:pop={{ scale: 0.94 }}
							aria-hidden="true"
						>
							<div class="border-b border-line px-3 py-2">
								<p class="text-sm font-medium">Categories</p>
								<p class="text-xs text-fg-muted">in {reading.title}</p>
							</div>
							<ul class="grid gap-1.5 px-3 py-2.5">
								{#each reading.rows as row (row.name)}
									<li class="flex items-center gap-2 text-xs">
										<span
											class="swatch ink-tint relative h-0.5 w-4 shrink-0 rounded-full"
											style="--tint: {PALETTE[row.color].css}"
										>
											<span
												class="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full border bg-card"
											></span>
										</span>
										<span class="min-w-0 flex-1 truncate">{row.name}</span>
										<span class="tabular pl-3 font-medium">{money(row.value)}</span>
										{#if row.change !== null}
											<span
												class={cn(
													'tabular rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium',
													row.change > 0
														? 'bg-spent/15 text-[oklch(from_var(--pastel-rose)_0.5_calc(c*1.6)_h)] dark:text-spent'
														: 'bg-positive/12 text-positive'
												)}>{signedPercent(row.change, 0)}</span
											>
										{/if}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>

				<div
					class="mt-2 grid"
					style="grid-template-columns: repeat({n}, minmax(0, 1fr))"
					aria-hidden="true"
				>
					{#each stretch.months as month, i (i)}
						<span
							class={cn(
								'truncate text-center text-xs transition-colors duration-150',
								month.future ? 'text-fg-subtle' : 'text-fg-muted',
								reading?.i === i && 'font-medium text-fg'
							)}>{monthName(month.key, 'short')}</span
						>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</Card>

<style>
	.stroke {
		stroke: var(--ink-tint);
	}

	.wash {
		fill: var(--tint);
		opacity: 0.4;
	}

	/* A line with a dot on it, as the legend and the reading draw each series. */
	.swatch,
	.swatch > span {
		border-color: var(--ink-tint);
	}

	.swatch {
		background: var(--ink-tint);
	}

	.dot {
		border-color: var(--ink-tint);
	}

	.glide {
		transition:
			left 0.14s var(--ease-out-quint),
			top 0.35s var(--ease-out-quint),
			translate 0.25s var(--ease-out-quint);
	}
</style>
