<script lang="ts">
	import { morph } from '$lib/actions';
	import { niceTicks } from '$lib/components/accounts/chart';
	import { PALETTE, type PaletteColor } from '$lib/components/ui';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';

	/**
	 * A bar per month, flush against the next, so their tops read as one
	 * stepped line over a wash of colour that fades to the baseline — and
	 * dashed across them, the same months of the stretch before. A month below
	 * zero hangs from the baseline in the rose money out wears. Bars rise from
	 * the baseline as the chart arrives and ease to a new figure; the dashed
	 * line morphs (GSAP). Pointing at a month, or arrowing along the chart,
	 * reads it beside both figures.
	 */
	type Bar = {
		key: string;
		/** Under the axis: "May". */
		label: string;
		/** In the reading: "May 2026". */
		long: string;
		/** Null where there's nothing to draw. */
		value: number | null;
		/** The same month of the stretch before, for the dashed line. */
		before: number | null;
		/** Still to come: an empty slot, and no figure. */
		future: boolean;
	};

	type Props = {
		bars: Bar[];
		color: PaletteColor;
		format: (value: number) => string;
		compact: (value: number) => string;
		/** What the dashed line stands for: "2025". */
		beforeLabel: string;
		label: string;
		class?: string;
	};

	let { bars, color, format, compact, beforeLabel, label, class: className }: Props = $props();

	const VW = 1000;
	const VH = 300;

	const n = $derived(bars.length);

	const ticks = $derived.by(() => {
		const values = bars.flatMap((b) => [b.value, b.before]).filter((v): v is number => v !== null);
		const low = Math.min(0, ...values);
		const high = Math.max(0, ...values);
		return low === high ? [0, 1] : niceTicks(low, high, 4);
	});
	const floor = $derived(ticks[0] ?? 0);
	const ceiling = $derived(ticks.at(-1) ?? 1);

	/** 0 at the top, 1 at the bottom. */
	const yOf = (value: number) => (ceiling === floor ? 1 : 1 - (value - floor) / (ceiling - floor));
	const zero = $derived(yOf(0));

	const drawn = $derived(
		bars.map((bar, i) => {
			const y = bar.value === null ? zero : yOf(bar.value);
			return {
				...bar,
				i,
				down: (bar.value ?? 0) < 0,
				top: Math.min(y, zero) * 100,
				height: Math.abs(y - zero) * 100
			};
		})
	);

	/** The stretch before, dashed through each month's middle. */
	const line = $derived.by(() => {
		const points = bars.flatMap((bar, i) =>
			bar.before === null
				? []
				: [`${Math.round(((i + 0.5) / n) * VW)},${Math.round(yOf(bar.before) * VH)}`]
		);
		return points.length > 1 ? `M${points.join('L')}` : '';
	});

	// ── Reading a month ──────────────────────────────────────────────────

	let index = $state<number | null>(null);
	let plot = $state<HTMLElement>();
	const latest = $derived(
		Math.max(
			0,
			bars.findLastIndex((b) => !b.future)
		)
	);

	const reading = $derived.by(() => {
		if (index === null || index >= n) return null;
		const bar = bars[index];
		return {
			bar,
			x: ((index + 0.5) / n) * 100,
			y: bar.value === null ? null : yOf(bar.value) * 100,
			beforeY: bar.before === null ? null : yOf(bar.before) * 100,
			text: bar.future ? 'Still to come' : bar.value === null ? '—' : format(bar.value)
		};
	});

	function point(event: PointerEvent) {
		if (!plot || n === 0) return;
		const rect = plot.getBoundingClientRect();
		const f = Math.min(0.9999, Math.max(0, (event.clientX - rect.left) / rect.width));
		index = Math.floor(f * n);
	}

	function keys(event: KeyboardEvent) {
		if (n === 0) return;
		const at = index ?? latest;
		const next =
			event.key === 'ArrowLeft'
				? Math.max(0, at - 1)
				: event.key === 'ArrowRight'
					? Math.min(n - 1, at + 1)
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

<!-- The plot takes the height its card gives it, from 13rem up; the axis keeps its own. -->
<div
	class={cn('grid grid-cols-[3.25rem_minmax(0,1fr)] grid-rows-[minmax(13rem,1fr)_auto]', className)}
>
	<div class="relative" aria-hidden="true">
		{#each ticks as tick (tick)}
			<span
				class="glide tabular absolute right-3 -translate-y-1/2 text-xs whitespace-nowrap text-fg-subtle"
				style="top: {yOf(tick) * 100}%">{compact(tick)}</span
			>
		{/each}
	</div>

	<div
		bind:this={plot}
		class="relative min-w-0 touch-pan-y rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
		style="--tint: {PALETTE[color].css}"
		role="slider"
		tabindex="0"
		aria-label={label}
		aria-valuemin={0}
		aria-valuemax={Math.max(0, n - 1)}
		aria-valuenow={index ?? latest}
		aria-valuetext={reading
			? `${reading.bar.long}: ${reading.text}${reading.bar.before === null ? '' : `, ${beforeLabel} ${format(reading.bar.before)}`}`
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
				class={cn(
					'glide absolute inset-x-0 border-t',
					tick === 0 && floor < 0 ? 'border-line-strong' : 'border-line'
				)}
				style="top: {yOf(tick) * 100}%"
				aria-hidden="true"
			></span>
		{/each}

		{#each drawn as bar (bar.key)}
			{#if bar.future}
				<span
					class="absolute inset-y-0 border-x border-dashed border-line"
					style="left: {(bar.i / n) * 100}%; width: {100 / n}%"
					aria-hidden="true"
				></span>
			{:else}
				<span
					class={cn('bar ink-tint absolute', bar.down && 'down', index === bar.i && 'lit')}
					style="left: {(bar.i / n) * 100}%; width: {100 /
						n}%; --top: {bar.top}%; --height: {bar.height}%; --zero: {zero * 100}%; --i: {bar.i}"
					aria-hidden="true"
				></span>
			{/if}
		{/each}

		<svg
			viewBox="0 0 {VW} {VH}"
			preserveAspectRatio="none"
			class="pointer-events-none absolute inset-0 size-full overflow-visible"
			aria-hidden="true"
		>
			{#if line}
				<path
					d={line}
					use:morph={line}
					fill="none"
					stroke-width="1.5"
					stroke-dasharray="5 5"
					stroke-linejoin="round"
					vector-effect="non-scaling-stroke"
					class="stroke-fg-subtle"
				/>
			{/if}
		</svg>

		{#if reading}
			{#if reading.beforeY !== null}
				<span
					class="glide pointer-events-none absolute size-2.5 -translate-1/2 rounded-full border-2 border-fg-subtle bg-card"
					style="left: {reading.x}%; top: {reading.beforeY}%"
					aria-hidden="true"
				></span>
			{/if}
			{#if reading.y !== null && !reading.bar.future}
				<span
					class={cn(
						'glide marker ink-tint pointer-events-none absolute grid size-3.5 -translate-1/2 place-items-center rounded-full border-2 bg-card',
						(reading.bar.value ?? 0) < 0 && 'down'
					)}
					style="left: {reading.x}%; top: {reading.y}%"
					aria-hidden="true"
				>
					<span class="size-1 rounded-full bg-current"></span>
				</span>
			{/if}
			<div
				class={cn(
					'glide pointer-events-none absolute top-1 z-10 w-max min-w-36 rounded-lg border border-line bg-card px-3 py-2 shadow-lg',
					reading.x > 60 ? '-translate-x-[calc(100%+1rem)]' : 'translate-x-4'
				)}
				style="left: {reading.x}%"
				in:pop={{ scale: 0.94 }}
				out:pop={{ scale: 0.94 }}
				aria-hidden="true"
			>
				<p class="text-xs text-fg-muted">{reading.bar.long}</p>
				<p class="tabular mt-0.5 font-display text-xl leading-tight font-medium">
					{reading.text}
				</p>
				{#if reading.bar.before !== null}
					<p class="mt-1.5 flex items-center gap-2 text-xs text-fg-muted">
						<span class="w-3 border-t-[1.5px] border-dashed border-fg-subtle"></span>
						{beforeLabel}
						<span class="tabular ml-auto pl-3 font-medium text-fg"
							>{format(reading.bar.before)}</span
						>
					</p>
				{/if}
			</div>
		{/if}
	</div>

	<div
		class="col-start-2 mt-2 grid"
		style="grid-template-columns: repeat({n}, minmax(0, 1fr))"
		aria-hidden="true"
	>
		{#each bars as bar, i (bar.key)}
			<span
				class={cn(
					'truncate text-center text-xs transition-colors duration-150',
					bar.future ? 'text-fg-subtle' : 'text-fg-muted',
					index === i && 'font-medium text-fg'
				)}>{bar.label}</span
			>
		{/each}
	</div>
</div>

<style>
	/*
	 * Its edge is the step; the wash under it fades to the baseline. Bars rise
	 * from the baseline one after another as the chart arrives
	 * (`@starting-style`), and ease to a new figure.
	 */
	.bar {
		top: var(--top);
		height: var(--height);
		border-top: 2px solid var(--ink-tint);
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--ink-tint) 16%, transparent),
			transparent
		);
		transition:
			top 0.7s var(--ease-out-quint) calc(var(--i) * 40ms),
			height 0.7s var(--ease-out-quint) calc(var(--i) * 40ms),
			background-color 0.2s;

		@starting-style {
			top: var(--zero);
			height: 0;
		}
	}

	.bar.down,
	.marker.down {
		--tint: var(--pastel-rose);
	}

	.bar.down {
		border-top: 0;
		border-bottom: 2px solid var(--ink-tint);
		background: linear-gradient(
			to top,
			color-mix(in oklab, var(--ink-tint) 16%, transparent),
			transparent
		);
	}

	.bar.lit {
		background-color: color-mix(in oklab, var(--ink-tint) 8%, transparent);
	}

	.marker {
		border-color: var(--ink-tint);
		color: var(--ink-tint);
	}

	.glide {
		transition:
			left 0.14s var(--ease-out-quint),
			top 0.35s var(--ease-out-quint),
			translate 0.25s var(--ease-out-quint);
	}
</style>
