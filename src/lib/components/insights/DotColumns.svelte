<script lang="ts">
	import { PALETTE, type PaletteColor } from '$lib/components/ui';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';

	/**
	 * A column of dots per stretch of days — a week — filled up from the
	 * baseline as far as its figure reaches against the fullest column, the
	 * rest of the column a ghost of what it could hold. A figure below zero
	 * hangs down from the baseline instead, in the rose money out wears. What
	 * the dots show changing runs a wave out from the baseline and across, each
	 * dot easing to its new state a beat after its neighbours (CSS). Pointing
	 * at a column, or arrowing along the chart, reads it: a dashed guide down to
	 * its top dot, the figure beside it, its first day under the axis.
	 */
	type Column = {
		key: string;
		/** Its days, as the reading names them: "Mar 4 – Mar 10". */
		label: string;
		/** Under the axis while it's read: "Mar 4". */
		short: string;
		/** Null where there's nothing to draw — no income to keep a share of. */
		value: number | null;
		/** Still to come: its ghosts step back. */
		future: boolean;
	};

	type Props = {
		columns: Column[];
		color: PaletteColor;
		/** The exact figure, for the reading. */
		format: (value: number) => string;
		/** A short figure, for the axis. */
		compact: (value: number) => string;
		/** Where each month starts along the axis: the column and its name. */
		marks: { at: number; label: string }[];
		/** Names the slider for assistive tech: "Week on the chart". */
		label: string;
		class?: string;
	};

	let { columns, color, format, compact, marks, label, class: className }: Props = $props();

	/** How many dots tall each column is. */
	const ROWS = 12;

	const n = $derived(columns.length);
	const highest = $derived(Math.max(0, ...columns.map((c) => c.value ?? 0)));
	const lowest = $derived(Math.max(0, ...columns.map((c) => -(c.value ?? 0))));

	/** Rows above the baseline; the rest hang below it, only as many as there is to draw. */
	const up = $derived.by(() => {
		if (lowest === 0) return ROWS;
		if (highest === 0) return 0;
		return Math.min(ROWS - 1, Math.max(1, Math.round((ROWS * highest) / (highest + lowest))));
	});

	/** How many dots a figure fills, negative downwards. Anything at all fills one. */
	const filled = (value: number | null) => {
		if (value === null || value === 0) return 0;
		return value > 0
			? Math.ceil((value / highest) * up)
			: -Math.ceil((-value / lowest) * (ROWS - up));
	};

	const dots = $derived(
		columns.map((column) => {
			const f = filled(column.value);
			return Array.from({ length: ROWS }, (_, r) => ({
				on: f > 0 ? r < up && r >= up - f : f < 0 && r >= up && r < up - f,
				below: r >= up,
				// How far from the baseline: the wave runs out from it.
				away: r < up ? up - 1 - r : r - up
			}));
		})
	);

	/** The axis: the fullest column's figure, the baseline, and the lowest below it. */
	const ticks = $derived([
		...(highest > 0 ? [{ key: 'high', y: (0.5 / ROWS) * 100, text: compact(highest) }] : []),
		// The baseline between rows — or, with nothing below it, beside the bottom row.
		{
			key: 'zero',
			y: lowest > 0 ? (up / ROWS) * 100 : ((ROWS - 0.5) / ROWS) * 100,
			text: compact(0)
		},
		...(lowest > 0 ? [{ key: 'low', y: ((ROWS - 0.5) / ROWS) * 100, text: compact(-lowest) }] : [])
	]);

	// ── Reading a column ─────────────────────────────────────────────────

	let index = $state<number | null>(null);
	let plot = $state<HTMLElement>();

	const reading = $derived.by(() => {
		if (index === null || index >= n) return null;
		const column = columns[index];
		const f = filled(column.value);
		const row = f > 0 ? up - f : f < 0 ? up - f - 1 : Math.min(ROWS - 1, Math.max(0, up - 1));
		return {
			column,
			below: f < 0,
			x: ((index + 0.5) / n) * 100,
			y: ((row + 0.5) / ROWS) * 100,
			text: column.future ? 'Still to come' : column.value === null ? '—' : format(column.value)
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

	/** Where the reading starts from the keyboard: the last column that has happened. */
	const latest = $derived(
		Math.max(
			0,
			columns.findLastIndex((c) => !c.future)
		)
	);
</script>

<!-- The plot takes the height its card gives it, from 13rem up; the axis keeps its own. -->
<div
	class={cn('grid grid-cols-[2.75rem_minmax(0,1fr)] grid-rows-[minmax(13rem,1fr)_auto]', className)}
>
	<div class="relative" aria-hidden="true">
		{#each ticks as tick (tick.key)}
			<span
				class="glide tabular absolute right-3 -translate-y-1/2 text-xs whitespace-nowrap text-fg-subtle"
				style="top: {tick.y}%">{tick.text}</span
			>
		{/each}
	</div>

	<!-- A slider over the columns: arrowing along them reads each one out. -->
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
		aria-valuetext={reading ? `${reading.column.label}: ${reading.text}` : undefined}
		onpointermove={point}
		onpointerdown={point}
		onpointerleave={() => (index = null)}
		onkeydown={keys}
		onfocus={() => (index ??= latest)}
		onblur={() => (index = null)}
	>
		<div
			class="grid h-full gap-[2px] sm:gap-[3px]"
			style="grid-template-columns: repeat({n}, minmax(0, 1fr))"
			aria-hidden="true"
		>
			{#each columns as column, c (c)}
				<div
					class={cn(
						'column grid gap-[2px] rounded-[3px] sm:gap-[3px]',
						column.future && 'future',
						index === c && 'lit'
					)}
					style="grid-template-rows: repeat({ROWS}, minmax(0, 1fr))"
				>
					{#each dots[c] as dot, r (r)}
						<span
							class={cn('dot ink-tint', dot.on && 'on', dot.below && 'below')}
							style="--c: {c}; --away: {dot.away}"
						></span>
					{/each}
				</div>
			{/each}
		</div>

		{#if reading}
			<span
				class="glide pointer-events-none absolute top-0 border-l border-dashed border-fg-subtle"
				style="left: {reading.x}%; height: {reading.y}%"
				aria-hidden="true"
			></span>
			<span
				class={cn(
					'glide marker ink-tint pointer-events-none absolute grid size-3.5 -translate-1/2 place-items-center rounded-full border-2 bg-card',
					reading.below && 'below'
				)}
				style="left: {reading.x}%; top: {reading.y}%"
				aria-hidden="true"
			>
				<span class="size-1 rounded-full bg-current"></span>
			</span>
			<div
				class={cn(
					'glide pointer-events-none absolute z-10 w-max rounded-lg border border-line bg-card px-3 py-2 shadow-lg',
					reading.x > 60 ? '-translate-x-[calc(100%+0.75rem)]' : 'translate-x-3'
				)}
				style="left: {reading.x}%; top: max(0px, calc({reading.y}% - 3.75rem))"
				in:pop={{ scale: 0.94 }}
				out:pop={{ scale: 0.94 }}
				aria-hidden="true"
			>
				<p class="text-xs text-fg-muted">{reading.column.label}</p>
				<p class="tabular mt-0.5 font-display text-xl leading-tight font-medium">
					{reading.text}
				</p>
			</div>
		{/if}
	</div>

	<!-- Each month under the column it starts in; the one being read, in a tag over them. -->
	<div class="relative col-start-2 mt-2 h-6 text-xs text-fg-muted" aria-hidden="true">
		<!-- Narrow, every third month is named, so the names never run together. -->
		{#each marks as mark, i (mark.at)}
			<span
				class={cn('absolute top-0.5 whitespace-nowrap', i % 3 !== 0 && 'max-sm:hidden')}
				style="left: {(mark.at / n) * 100}%">{mark.label}</span
			>
		{/each}
		{#if reading}
			<span
				class="glide absolute z-10 -translate-x-1/2 rounded-md bg-fg px-2 py-0.5 font-medium whitespace-nowrap text-card"
				style="left: {reading.x}%"
				in:pop={{ scale: 0.9 }}
				out:pop={{ scale: 0.9 }}>{reading.column.short}</span
			>
		{/if}
	</div>
</div>

<style>
	/*
	 * A ghost until its figure reaches it. Filling and emptying run a wave out
	 * from the baseline and along the columns; the first draw starts from the
	 * ghost (`@starting-style`), so the chart fills in as it arrives.
	 */
	.dot {
		border-radius: 3px;
		background: var(--color-line);
		transition: background-color 0.45s var(--ease-out-quint)
			calc(var(--c) * 7ms + var(--away) * 16ms);
	}

	.dot.below,
	.marker.below {
		--tint: var(--pastel-rose);
	}

	.dot.on {
		background: var(--ink-tint);

		@starting-style {
			background: var(--color-line);
		}
	}

	/* Weeks still to come hold nothing yet: their ghosts step back. */
	.future .dot {
		opacity: 0.45;
	}

	/* The column being read wears a soft ground in its colour. */
	.column {
		transition: background-color 0.15s var(--ease-out-quint);
	}

	.column.lit {
		background: color-mix(in oklab, var(--tint) 14%, transparent);
	}

	.marker {
		border-color: var(--ink-tint);
		color: var(--ink-tint);
	}

	/* The reading follows the pointer from column to column. */
	.glide {
		transition:
			left 0.14s var(--ease-out-quint),
			top 0.35s var(--ease-out-quint),
			height 0.35s var(--ease-out-quint),
			translate 0.25s var(--ease-out-quint);
	}
</style>
