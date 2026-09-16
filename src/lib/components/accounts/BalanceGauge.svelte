<script lang="ts">
	import gsap from 'gsap';
	import { animate } from 'motion';
	import { untrack } from 'svelte';
	import { countUp } from '$lib/actions';
	import { Caret, PALETTE, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, formatMoneyCompact, type Cents, type Currency } from '$lib/finance';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { formatAge } from '$lib/utils/time';

	/**
	 * Where a balance sits between the lowest and highest it has been over the
	 * chart's range — a credit score's dial, read as money. The arc runs from
	 * the low at its left foot to the high at its right; the account's colour
	 * fills it up to today's balance, where a knob rides, and segments mark the
	 * room still above it. The balance itself sits in the middle, with what
	 * this month did to it under it.
	 */
	type Props = {
		balance: Cents;
		/** The lowest and highest balances over `span`, today's included. */
		low: Cents;
		high: Cents;
		/** Its net movement this month, signed. */
		change: Cents;
		color: PaletteColor;
		currency: Currency;
		/** What the low and high cover, as a phrase: "the last 3 months". */
		span: string;
		/** The last time it changed. ISO 8601. */
		updatedAt: string;
		class?: string;
	};

	let {
		balance,
		low,
		high,
		change,
		color,
		currency,
		span,
		updatedAt,
		class: className
	}: Props = $props();

	const uid = $props.id();

	// The dial: 240° of a circle, open at the bottom, as the mockup's is.
	const CX = 100;
	const CY = 96;
	const R = 76;
	const START = 150;
	const SWEEP = 240;
	const LENGTH = (R * SWEEP * Math.PI) / 180;
	/** Eighteen segments, each under a third of its step, so their round caps keep a gap. */
	const STEP = LENGTH / 18;

	const point = (degrees: number, radius = R) => {
		const a = (degrees * Math.PI) / 180;
		return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)] as const;
	};
	const [x0, y0] = point(START);
	const [x1, y1] = point(START + SWEEP);
	const ARC = `M${x0},${y0}A${R},${R} 0 1 1 ${x1},${y1}`;

	/** Today's balance as a share of the way from low to high; the middle when nothing moved. */
	const target = $derived(
		high === low ? 0.5 : Math.min(1, Math.max(0, (balance - low) / (high - low)))
	);

	/**
	 * What the dial draws right now: where it lands, on the server, then
	 * wherever the sweep towards it has got to.
	 */
	let shown = $state(untrack(() => target));
	let knob = $state<SVGGElement>();
	let mounted = false;

	// Arriving, the dial sweeps up from the low; a new balance or account
	// carries the fill and the knob along the arc from wherever they were, and
	// the knob springs as it lands.
	$effect(() => {
		const to = target;
		if (prefersReducedMotion()) {
			shown = to;
			return;
		}
		const from = mounted ? untrack(() => shown) : 0;
		mounted = true;
		const state = { v: from };
		shown = from;
		const tween = gsap.to(state, {
			v: to,
			duration: from === 0 ? 1.2 : 0.9,
			ease: from === 0 ? 'power4.out' : 'power3.inOut',
			onUpdate: () => {
				shown = state.v;
			},
			onComplete: () => {
				if (knob)
					animate(knob, { scale: [0.6, 1] }, { type: 'spring', bounce: 0.5, duration: 0.5 });
			}
		});
		return () => tween.kill();
	});

	const at = $derived(point(START + SWEEP * shown));

	const money = (cents: number) => formatMoney(cents, currency);
	// Under a thousand the decimal only adds noise ("$498"); past it, it tells two marks apart ("$1.3k").
	const compact = (cents: number) =>
		formatMoneyCompact(cents, currency, { whole: Math.abs(cents) < 100_000 });
	const figure = $derived(money(balance));

	/**
	 * Marks around the outside: the low, the high, and the three quarters
	 * between. A balance that hasn't moved has one value to mark, at the top.
	 */
	const marks = $derived(
		(high === low ? [0.5] : [0, 0.25, 0.5, 0.75, 1]).map((f) => {
			const [x, y] = point(START + SWEEP * f, R + 17);
			return { f, x: (x / 200) * 100, y: (y / 140) * 100, label: compact(low + (high - low) * f) };
		})
	);
</script>

<!-- A meter: it reads out the balance and where it sits, and the drawing is decoration. -->
<div
	class={cn('relative mx-auto aspect-[200/140] w-full max-w-[20rem]', className)}
	role="meter"
	aria-valuemin={low / 100}
	aria-valuemax={high / 100}
	aria-valuenow={balance / 100}
	aria-valuetext="{figure}, between its low of {money(low)} and high of {money(high)}, {span}"
	style="--tint: {PALETTE[color].css}"
>
	<svg viewBox="0 0 200 140" class="absolute inset-0 size-full overflow-visible" aria-hidden="true">
		<defs>
			<linearGradient id="{uid}-fill" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" class="stop-soft" />
				<stop offset="100%" class="stop-strong" />
			</linearGradient>
		</defs>

		<!-- A hairline under the whole dial, then the segments of the room above. -->
		<path d={ARC} fill="none" stroke-width="1.5" class="stroke-line" />
		<path
			d={ARC}
			fill="none"
			stroke-width="6"
			stroke-linecap="round"
			stroke-dasharray="{STEP * 0.28} {STEP * 0.72}"
			class="stroke-line-strong"
		/>

		<!-- The fill, drawn as far along the arc as the balance reaches. -->
		<path
			d={ARC}
			fill="none"
			stroke="url(#{uid}-fill)"
			stroke-width="9"
			stroke-linecap="round"
			stroke-dasharray="{LENGTH * shown} {LENGTH}"
		/>

		<g bind:this={knob} style="transform-origin: {at[0]}px {at[1]}px; transform-box: view-box">
			<circle cx={at[0]} cy={at[1]} r="7.5" class="fill-card stroke-hairline" stroke-width="1" />
			<circle cx={at[0]} cy={at[1]} r="3" class="dot" />
		</g>
	</svg>

	{#each marks as mark (mark.f)}
		<span
			class="tabular pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[0.6875rem] whitespace-nowrap text-fg-subtle"
			style="left: {mark.x}%; top: {mark.y}%"
			aria-hidden="true">{mark.label}</span
		>
	{/each}

	<!-- The balance, fitted to the room inside the arc rather than spilling past it. -->
	<div class="absolute inset-x-[19%] top-[31%] flex flex-col items-center text-center">
		<div class="@container w-full">
			<p
				class="fit-figure tabular font-display leading-none font-light tracking-tight"
				style="--fit: 2.25rem; --chars: {figure.length}"
				use:countUp={{ value: balance, format: money, whenVisible: true }}
				aria-hidden="true"
			>
				{figure}
			</p>
		</div>
		{#if change !== 0}
			<p
				class={cn(
					'tabular mt-2 inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
					change > 0 ? 'bg-positive/12 text-positive' : 'bg-spent/15 text-spent'
				)}
			>
				<Caret class={cn('size-2', change > 0 && 'rotate-180')} />
				{change > 0 ? '+' : '−'}{money(Math.abs(change))}
			</p>
		{:else}
			<p class="mt-2 text-xs text-fg-subtle">No change this month</p>
		{/if}
		<p class="mt-1.5 text-xs text-fg-muted">Updated {formatAge(updatedAt)}</p>
	</div>
</div>

<style>
	/* The account's colour at a glyph's weight, so a pastel reads on the white
	   card as strongly as the brand three; its softer end mixed toward the card.
	   On dark the colour is bright enough as it is. */
	.stop-strong {
		stop-color: oklch(from var(--tint) 0.62 calc(c * 1.5) h);
	}

	.stop-soft {
		stop-color: color-mix(in oklab, var(--tint) 55%, var(--card));
	}

	.dot {
		fill: oklch(from var(--tint) 0.55 calc(c * 1.7) h);
	}

	:global(.dark) .stop-strong {
		stop-color: var(--tint);
	}

	:global(.dark) .dot {
		fill: var(--tint);
	}
</style>
