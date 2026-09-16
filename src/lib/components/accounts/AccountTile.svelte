<script lang="ts">
	import type { Snippet } from 'svelte';
	import { kindLabel, type Account, type AccountPlace } from '$lib/accounts';
	import { countUp } from '$lib/actions';
	import { PALETTE, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Cents, type Currency } from '$lib/finance';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { areaPath, monotonePath } from './chart';

	/**
	 * One account drawn as the card it stands for: who issues it and its kind
	 * along the top, the chip, its number, and its name and balance along the
	 * bottom, over a glow in its colour and the line its balance drew across
	 * the chart's range. Pressing it opens it in the panel; its actions sit in
	 * the corner. Under a pointer it tilts toward it, and a sheen follows.
	 */
	type Props = {
		account: Account;
		color: PaletteColor;
		currency: Currency;
		/** Its place (`accountPlace`): a role it holds, or a dashboard slot it fills by default. */
		place?: AccountPlace | null;
		/** It's the one open in the panel. */
		selected?: boolean;
		/** Its balances across the chart's range, oldest first; null before it was added. */
		balances?: (Cents | null)[];
		onSelect: () => void;
		/** Its brand's mark, at the head of the label along the top. */
		mark?: Snippet;
		/** Its actions menu, in the top corner. */
		actions?: Snippet;
		class?: string;
	};

	let {
		account,
		color,
		currency,
		place = null,
		selected = false,
		balances = [],
		onSelect,
		mark,
		actions,
		class: className
	}: Props = $props();

	const ROLE = { main: 'Main', secondary: 'Secondary', savings: 'Savings' } as const;

	const money = (cents: number) => formatMoney(cents, currency);
	const figure = $derived(money(account.balance));

	// The sparkline in its own small drawing, stretched to the foot of the card
	// across the days the account has been there: its own shape, not the chart's axis.
	const spark = $derived.by(() => {
		const known = balances.filter((b): b is number => b !== null);
		if (known.length < 2) return null;
		const low = Math.min(...known);
		const high = Math.max(...known);
		const last = known.length - 1;
		const points = known.map(
			(b, i) =>
				[(i / last) * 100, high === low ? 20 : 36 - ((b - low) / (high - low)) * 30] as const
		);
		return { line: monotonePath(points), area: areaPath(points, 40) };
	});

	let tile = $state<HTMLElement>();
	/** A mouse is over it: the tilt follows quickly, and the sheen shows. */
	let tilting = $state(false);

	/**
	 * The tilt: a few degrees toward the pointer, with the sheen where it is.
	 * Only for a mouse — a finger pressing a card shouldn't tip it — and never
	 * under reduced motion. Letting go, it settles back on a softer ease.
	 */
	function tilt(event: PointerEvent) {
		if (!tile || event.pointerType !== 'mouse' || prefersReducedMotion()) return;
		const rect = tile.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width;
		const y = (event.clientY - rect.top) / rect.height;
		tile.style.setProperty('--rx', `${(0.5 - y) * 7}deg`);
		tile.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
		tile.style.setProperty('--gx', `${x * 100}%`);
		tile.style.setProperty('--gy', `${y * 100}%`);
		tilting = true;
	}

	function settle() {
		if (!tile) return;
		tile.style.setProperty('--rx', '0deg');
		tile.style.setProperty('--ry', '0deg');
		tilting = false;
	}
</script>

<article
	bind:this={tile}
	class={cn('tile group relative isolate', selected && 'selected', className)}
	class:tilting
	style="--tint: {PALETTE[color].css}"
	onpointermove={tilt}
	onpointerleave={settle}
>
	<div
		class="face relative flex h-full min-h-52 flex-col overflow-hidden rounded-[var(--radius-card)] bg-card p-6"
	>
		<!-- The glow in its colour, and the sheen that follows the pointer. -->
		<span
			class="glow pointer-events-none absolute -top-16 -right-12 size-56 rounded-full"
			aria-hidden="true"
		></span>
		<span class="sheen pointer-events-none absolute inset-0" aria-hidden="true"></span>

		{#if spark}
			<svg
				viewBox="0 0 100 40"
				preserveAspectRatio="none"
				class="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full"
				aria-hidden="true"
			>
				<path d={spark.area} class="spark-area" />
				<path
					d={spark.line}
					fill="none"
					stroke-width="1.5"
					vector-effect="non-scaling-stroke"
					class="spark-line"
				/>
			</svg>
		{/if}

		<!-- The whole card opens the account; what's drawn on it lets the press through. -->
		<button
			type="button"
			class="absolute inset-0 z-0 rounded-[var(--radius-card)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue"
			aria-pressed={selected}
			aria-label="Show {account.name}"
			onclick={onSelect}
		></button>

		<div class="pointer-events-none relative flex items-start justify-between gap-3">
			<div class="flex min-w-0 flex-wrap items-center gap-1.5">
				{@render mark?.()}
				<span class="truncate text-xs font-medium tracking-[0.14em] text-fg-muted uppercase">
					{account.provider ?? kindLabel(account.type) ?? 'Account'}
				</span>
				{#if place}
					<span
						class="role rounded-md px-1.5 py-0.5 text-[0.6875rem] leading-none font-medium"
						class:by-default={!place.chosen}
					>
						{ROLE[place.role]}
						{#if !place.chosen}<span class="font-normal">by default</span>{/if}
					</span>
				{/if}
			</div>
			{#if actions}
				<div class="pointer-events-auto -mt-1.5 -mr-1.5 shrink-0">{@render actions()}</div>
			{/if}
		</div>

		<!-- The chip and the contactless mark, drawn as a card has them. -->
		<div class="pointer-events-none relative mt-4 flex items-center gap-3" aria-hidden="true">
			<svg viewBox="0 0 38 28" class="chip h-7 w-9.5">
				<rect x="0.5" y="0.5" width="37" height="27" rx="5" class="chip-body" />
				<path
					d="M0.5 10h11M0.5 18h11M26.5 10h11M26.5 18h11M11.5 0.5v27M26.5 0.5v27M11.5 14h15"
					fill="none"
					class="chip-lines"
				/>
			</svg>
			{#if account.type === 'credit' || account.type === 'debit'}
				<svg
					viewBox="0 0 24 24"
					class="size-4 -rotate-90 text-fg-subtle"
					fill="none"
					stroke="currentColor"
				>
					<path d="M8.5 16.5a5 5 0 0 0 0-9" stroke-width="1.75" stroke-linecap="round" />
					<path d="M12.2 19a9 9 0 0 0 0-14" stroke-width="1.75" stroke-linecap="round" />
				</svg>
			{/if}
		</div>

		<p
			class="tabular pointer-events-none relative mt-3 font-display text-lg tracking-[0.18em] text-fg-muted"
		>
			{#if account.last4}
				<span aria-label="Ending in {account.last4}">•••• {account.last4}</span>
			{:else}
				<span class="text-fg-subtle">•••• ••••</span>
			{/if}
		</p>

		<!-- The name keeps its lines and the balance fits its box: neither is ever cut short. -->
		<div
			class="pointer-events-none relative mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-1 pt-4"
		>
			<p
				class="min-w-0 flex-1 basis-32 text-lg leading-tight font-medium text-balance wrap-anywhere"
			>
				{account.name}
			</p>
			<div class="@container min-w-0 flex-1 basis-32 text-right">
				<p
					class="fit-figure tabular font-display leading-none font-light tracking-tight"
					style="--fit: 1.75rem; --chars: {figure.length}"
					use:countUp={{ value: account.balance, format: money, whenVisible: true }}
				>
					{figure}
				</p>
			</div>
		</div>
	</div>
</article>

<style>
	/*
	 * The tilt lives on the article, the card's face inside it: perspective and
	 * rotation from the pointer (`--rx`, `--ry`), eased quickly while it moves
	 * and settling back slowly once it leaves. Picked, the card lifts and wears
	 * a rim in its colour.
	 */
	.tile {
		--rx: 0deg;
		--ry: 0deg;
		--gx: 50%;
		--gy: 0%;
		--glyph: oklch(from var(--tint) 0.55 calc(c * 1.7) h);
		perspective: 900px;
	}

	:global(.dark) .tile {
		--glyph: var(--tint);
	}

	.face {
		transform: rotateX(var(--rx)) rotateY(var(--ry)) translateY(0);
		transition:
			transform 0.7s var(--ease-out-quint),
			box-shadow 0.4s var(--ease-out-quint),
			outline-color 0.3s var(--ease-out-quint);
		outline: 2px solid transparent;
		outline-offset: 3px;
	}

	.tile.tilting .face {
		transition-duration: 0.12s, 0.4s, 0.3s;
	}

	.tile.selected .face {
		transform: rotateX(var(--rx)) rotateY(var(--ry)) translateY(-4px);
		outline-color: var(--glyph);
		box-shadow: 0 18px 40px -24px color-mix(in oklab, var(--tint) 70%, transparent);
	}

	.glow {
		background: radial-gradient(
			circle at 50% 50%,
			color-mix(in oklab, var(--tint) 60%, transparent) 0%,
			color-mix(in oklab, var(--tint) 22%, transparent) 45%,
			transparent 70%
		);
		filter: blur(10px);
		transition:
			scale 0.7s var(--ease-out-quint),
			opacity 0.7s var(--ease-out-quint);
		opacity: 0.75;
	}

	.tile:hover .glow,
	.tile.selected .glow {
		scale: 1.15;
		opacity: 1;
	}

	/* A soft light where the pointer is, only while it's there. */
	.sheen {
		background: radial-gradient(
			circle at var(--gx) var(--gy),
			rgb(255 255 255 / 0.5),
			transparent 45%
		);
		mix-blend-mode: soft-light;
		opacity: 0;
		transition: opacity 0.4s var(--ease-out-quint);
	}

	.tile.tilting .sheen {
		opacity: 1;
	}

	.role {
		background: color-mix(in oklab, var(--tint) 20%, transparent);
		color: var(--glyph);
	}

	/* A slot nobody chose: a dashed rim in its colour instead of the fill, as a place still open. */
	.role.by-default {
		background: transparent;
		outline: 1px dashed color-mix(in oklab, var(--glyph) 55%, transparent);
		outline-offset: -1px;
	}

	.chip-body {
		fill: color-mix(in oklab, var(--tint) 18%, var(--sunken));
		stroke: var(--line-strong);
	}

	.chip-lines {
		stroke: var(--line-strong);
	}

	.spark-line {
		stroke: var(--glyph);
		opacity: 0.55;
	}

	.spark-area {
		fill: var(--tint);
		opacity: 0.12;
	}

	@media (prefers-reduced-motion: reduce) {
		.face,
		.glow {
			transition: none;
		}
	}
</style>
