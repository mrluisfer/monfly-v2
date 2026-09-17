<script lang="ts">
	import MovingArrowDownRight from '@jis3r/icons/icons/arrow-down-right';
	import MovingArrowUpRight from '@jis3r/icons/icons/arrow-up-right';
	import type { Component } from 'svelte';
	import { countUp, morph } from '$lib/actions';
	import { areaPath, monotonePath } from '$lib/components/accounts/chart';
	import { AnimatedIcon, Card, PALETTE, type PaletteColor } from '$lib/components/ui';
	import { cn } from '$lib/utils';
	import { signedPercent } from './format';

	/**
	 * One figure with its line beside it: what it came to over the stretch,
	 * how far it moved from the stretch before, and month by month, a curve
	 * over a comb of hairlines that fades to nothing. The month it peaked in
	 * wears a pin and its name. The line draws itself as the card scrolls in
	 * and morphs to a new stretch.
	 */
	type Props = {
		label: string;
		/** Its glyph, from Animated Color Icons. */
		icon: Component<{ size?: number; strokeWidth?: number; animate?: boolean }>;
		color: PaletteColor;
		value: number;
		format: (value: number) => string;
		/** What the figure counts, after it: "entries". */
		unit?: string;
		/** Against the stretch before, as a fraction; null with nothing there. */
		change: number | null;
		/** "vs 2025". */
		vs: string;
		/** Which way is good news, if either: its change wears green that way, rose the other. */
		better?: 'up' | 'down';
		/** Month by month, oldest first; null for months still to come. */
		series: (number | null)[];
		/** Each month's short name, for the pin. */
		labels: string[];
		class?: string;
	};

	let {
		label,
		icon,
		color,
		value,
		format,
		unit,
		change,
		vs,
		better,
		series,
		labels,
		class: className
	}: Props = $props();

	const uid = $props.id();
	const W = 200;
	const H = 80;

	const most = $derived(Math.max(0, ...series.map((v) => v ?? 0)));
	/** A month's place on the drawing: the floor is 8 units up, the peak 8 down. */
	const pointAt = (i: number, v: number) =>
		[
			series.length > 1 ? (i / (series.length - 1)) * W : W / 2,
			most > 0 ? 8 + (1 - v / most) * (H - 16) : H - 8
		] as const;
	const points = $derived(series.flatMap((v, i) => (v === null ? [] : [pointAt(i, v)])));
	const line = $derived(monotonePath(points));
	const area = $derived(areaPath(points, H));

	/** The month it peaked in, if it ever rose off the floor. */
	const peak = $derived.by(() => {
		if (most <= 0) return null;
		const i = series.indexOf(most);
		const [x, y] = pointAt(i, most);
		return { x: (x / W) * 100, y: (y / H) * 100, label: labels[i] };
	});

	const tone = $derived(
		change === null || change === 0 || !better
			? 'text-fg'
			: change > 0 === (better === 'up')
				? 'text-positive'
				: 'text-spent'
	);
</script>

<!-- The card reads rather than acts; pointing anywhere on it plays its glyphs. -->
<Card data-icon-host class={cn('flex flex-col justify-between gap-5 p-6', className)}>
	<div class="flex items-center gap-2.5">
		<span
			class="chip grid size-8 shrink-0 place-items-center rounded-lg"
			style="--tint: {PALETTE[color].css}"
			aria-hidden="true"
		>
			<AnimatedIcon {icon} set="color" />
		</span>
		<h3 class="text-[0.9375rem] text-fg-muted">{label}</h3>
	</div>

	<div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
		<div class="@container min-w-0">
			<p class="flex items-baseline gap-2">
				<!-- It fits its box, the unit beside it counted in (.fit-figure). -->
				<span
					class="fit-figure tabular font-display leading-none font-light tracking-tight"
					style="--fit: 2.5rem; --chars: {format(value).length +
						(unit ? unit.length * 0.35 + 1 : 0)}"
					use:countUp={{ value, format, whenVisible: true }}>{format(value)}</span
				>
				{#if unit}<span class="shrink-0 text-sm text-fg-muted">{unit}</span>{/if}
			</p>
			<p class="mt-2 flex items-center gap-1 truncate text-sm text-fg-muted">
				{#if change === null}
					Nothing earlier to compare
				{:else}
					<span class={cn('tabular flex shrink-0 items-center font-medium', tone)}>
						{#if change >= 0}
							<AnimatedIcon icon={MovingArrowUpRight} set="moving" />
						{:else}
							<AnimatedIcon icon={MovingArrowDownRight} set="moving" />
						{/if}
						{signedPercent(change, 0)}
					</span>
					<span class="truncate">{vs}</span>
				{/if}
			</p>
		</div>

		<div class="relative h-20 w-32 shrink-0 sm:w-40" aria-hidden="true">
			<div class="draw-on-view ink-tint absolute inset-0" style="--tint: {PALETTE[color].css}">
				<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" class="size-full overflow-visible">
					<defs>
						<pattern id="{uid}-comb" width="6" height={H} patternUnits="userSpaceOnUse">
							<rect width="1" height={H} class="comb" />
						</pattern>
						<linearGradient id="{uid}-fade" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="white" stop-opacity="0.9" />
							<stop offset="100%" stop-color="white" stop-opacity="0" />
						</linearGradient>
						<mask id="{uid}-mask" maskContentUnits="userSpaceOnUse">
							<rect width={W} height={H} fill="url(#{uid}-fade)" />
						</mask>
					</defs>
					{#if area}
						<path d={area} use:morph={area} class="wash" mask="url(#{uid}-mask)" />
						<path d={area} use:morph={area} fill="url(#{uid}-comb)" mask="url(#{uid}-mask)" />
					{/if}
					<path
						d={line}
						use:morph={line}
						fill="none"
						stroke-width="2"
						stroke-linecap="round"
						vector-effect="non-scaling-stroke"
						class="stroke"
					/>
				</svg>
			</div>
			{#if peak}
				<span
					class="pin ink-tint absolute size-2.5 -translate-1/2 rounded-full border-2 bg-card"
					style="left: {peak.x}%; top: {peak.y}%; --tint: {PALETTE[color].css}"
				></span>
				<span
					class="tag absolute -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] rounded-md border border-line bg-card px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap shadow-sm"
					style="left: {peak.x}%; top: {peak.y}%">{peak.label}</span
				>
			{/if}
		</div>
	</div>
</Card>

<style>
	.chip {
		background: color-mix(in oklab, var(--tint) 18%, transparent);
		color: oklch(from var(--tint) 0.55 calc(c * 1.7) h);
	}

	:global(.dark) .chip {
		color: var(--tint);
	}

	.stroke {
		stroke: var(--ink-tint);
	}

	.wash {
		fill: var(--tint);
		opacity: 0.35;
	}

	.comb {
		fill: var(--ink-tint);
		opacity: 0.35;
	}

	.pin {
		border-color: var(--ink-tint);
	}

	/* The peak's pin and name spring up once the line has drawn to them. */
	.pin,
	.tag {
		transition:
			opacity 0.4s var(--ease-out-quint) 0.5s,
			scale 0.5s var(--ease-spring) 0.5s;

		@starting-style {
			opacity: 0;
			scale: 0.6;
		}
	}
</style>
