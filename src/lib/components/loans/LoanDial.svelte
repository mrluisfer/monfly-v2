<script lang="ts">
	import MovingBadgeCheck from '@jis3r/icons/icons/badge-check';
	import gsap from 'gsap';
	import { animate } from 'motion';
	import { untrack } from 'svelte';
	import { countUp } from '$lib/actions';
	import { AnimatedIcon, PALETTE, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, formatMoneyCompact, type Cents, type Currency } from '$lib/finance';
	import { pop } from '$lib/transitions';
	import { cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * How much of a loan is settled, as the accounts' balance dial reads a
	 * balance: 240° open at the foot, from nothing at its left to the whole loan
	 * at its right. The side's colour fills it as far as it's settled, where a
	 * knob rides; segments mark what's still to come. What's left sits inside,
	 * with the share settled under it — and once it's all settled, a check.
	 */
	type Props = {
		amount: Cents;
		paid: Cents;
		color: PaletteColor;
		currency: Currency;
		class?: string;
	};

	let { amount, paid, color, currency, class: className }: Props = $props();

	const uid = $props.id();

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

	const target = $derived(amount > 0 ? Math.min(1, Math.max(0, paid / amount)) : 0);
	const left = $derived(Math.max(0, amount - paid));
	const settled = $derived(amount > 0 && paid >= amount);

	/** What the dial draws right now: where it lands on the server, then wherever the sweep has got to. */
	let shown = $state(untrack(() => target));
	let knob = $state<SVGGElement>();
	let mounted = false;

	// Arriving, the dial sweeps up from nothing; a payment carries the fill and
	// the knob along from where they were, and the knob springs as it lands.
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

	const money = (cents: number) => formatMoney(Math.round(cents), currency);
	const compact = (cents: number) =>
		formatMoneyCompact(cents, currency, { whole: Math.abs(cents) < 100_000 });
	const figure = $derived(money(left));
	const percent = $derived(Math.floor(target * 100));

	/** Nothing, half and the whole loan, around the outside. */
	const marks = $derived(
		[0, 0.5, 1].map((f) => {
			const [x, y] = point(START + SWEEP * f, R + 17);
			return { f, x: (x / 200) * 100, y: (y / 140) * 100, label: compact(amount * f) };
		})
	);
</script>

<!-- A meter: it reads out how much is settled; the drawing is decoration. -->
<div
	class={cn('relative mx-auto aspect-[200/140] w-full max-w-[20rem]', className)}
	role="meter"
	aria-valuemin={0}
	aria-valuemax={amount / 100}
	aria-valuenow={Math.min(paid, amount) / 100}
	aria-valuetext="{money(Math.min(paid, amount))} of {money(amount)} settled, {figure} left"
	style="--tint: {PALETTE[color].css}"
>
	<svg viewBox="0 0 200 140" class="absolute inset-0 size-full overflow-visible" aria-hidden="true">
		<defs>
			<linearGradient id="{uid}-fill" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0%" class="stop-soft" />
				<stop offset="100%" class="stop-strong" />
			</linearGradient>
		</defs>

		<path d={ARC} fill="none" stroke-width="1.5" class="stroke-line" />
		<path
			d={ARC}
			fill="none"
			stroke-width="6"
			stroke-linecap="round"
			stroke-dasharray="{STEP * 0.28} {STEP * 0.72}"
			class="stroke-line-strong"
		/>
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

	<div class="absolute inset-x-[19%] top-[31%] flex flex-col items-center text-center">
		<div class="@container w-full">
			<p
				class="fit-figure tabular font-display leading-none font-light tracking-tight"
				style="--fit: 2.25rem; --chars: {figure.length}"
				use:countUp={{ value: left, format: money, whenVisible: true }}
				aria-hidden="true"
			>
				{figure}
			</p>
		</div>
		<p class="mt-1 text-xs text-fg-muted">left of {money(amount)}</p>
		<!-- Settled, the share turns into a check that springs in and plays once. -->
		{#key settled}
			<p
				class={cn(
					'tabular mt-2 inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
					settled ? 'bg-positive/12 text-positive' : 'chip'
				)}
				in:pop={{ scale: 0.7, bounce: 0.5, duration: 0.45 }}
			>
				{#if settled}
					<AnimatedIcon icon={MovingBadgeCheck} set="moving" size={13} trigger="mount" />
					All settled
				{:else}
					{percent}% settled
				{/if}
			</p>
		{/key}
	</div>
</div>

<style>
	/* The side's colour at a glyph's weight, its softer end mixed toward the card. */
	.stop-strong {
		stop-color: oklch(from var(--tint) 0.62 calc(c * 1.5) h);
	}

	.stop-soft {
		stop-color: color-mix(in oklab, var(--tint) 55%, var(--card));
	}

	.dot {
		fill: oklch(from var(--tint) 0.55 calc(c * 1.7) h);
	}

	.chip {
		background: color-mix(in oklab, var(--tint) 20%, transparent);
		color: oklch(from var(--tint) 0.5 calc(c * 1.7) h);
	}

	:global(.dark) .stop-strong {
		stop-color: var(--tint);
	}

	:global(.dark) .dot {
		fill: var(--tint);
	}

	:global(.dark) .chip {
		color: var(--tint);
	}
</style>
