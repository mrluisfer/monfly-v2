<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import gsap from 'gsap';
	import { PALETTE, type PaletteColor } from '$lib/components/ui';
	import { cn, prefersReducedMotion } from '$lib/utils';

	type Slice = {
		/** Fraction of the whole period's spending, 0–1. */
		share: number;
		color: PaletteColor;
	};

	type Props = {
		/**
		 * The top categories, largest first, each a wedge in its own colour
		 * clockwise from 268°. The hatch is everything they don't cover. Empty
		 * draws a full hatch.
		 */
		slices: Slice[];
		class?: string;
	};

	let { slices, class: className }: Props = $props();

	// One set of <defs> ids per instance: duplicated ids silently paint every
	// copy from the first copy's gradients (see Logo).
	const uid = $props.id();

	/** Wedges drawn: the chips beside the dial list the same four. */
	const SLOTS = 4;
	/** Angles are clockwise from 12 o'clock. The first wedge starts where the mockup's did. */
	const START = 268;
	/** Thin axis lines that end in a solid pin. */
	const PINS = [0, 90, 250];

	const C = 50;
	const R = 44;

	const toSweeps = (next: Slice[]) =>
		Array.from({ length: SLOTS }, (_, i) => Math.max(next[i]?.share ?? 0, 0) * 360);

	// The server draws the real wedges; only later changes animate.
	let sweeps = $state(untrack(() => toSweeps(slices)));
	let body = $state<SVGGElement>();

	// Gradients belong to slots, not colours, so a recoloured wedge eases
	// between the two (see .dial-stop) instead of swapping.
	const colors = $derived(Array.from({ length: SLOTS }, (_, i) => PALETTE[slices[i]?.color ?? 'blue'].css));

	const point = (deg: number, r = R) => {
		const a = ((deg - 90) * Math.PI) / 180;
		return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
	};

	function wedgePath(from: number, sweep: number) {
		if (sweep <= 0.01) return '';
		// A single arc can't close on itself: a whole circle takes two halves.
		if (sweep >= 359.99) return `M${C},${C - R} A${R},${R} 0 1 1 ${C},${C + R} A${R},${R} 0 1 1 ${C},${C - R} Z`;
		const [x1, y1] = point(from);
		const [x2, y2] = point(from + sweep);
		return `M${C},${C} L${x1},${y1} A${R},${R} 0 ${sweep > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
	}

	const wedges = $derived.by(() => {
		let from = START;
		return sweeps.map((sweep) => {
			const d = wedgePath(from, sweep);
			from += sweep;
			return d;
		});
	});
	const hatch = $derived.by(() => {
		const used = sweeps.reduce((sum, s) => sum + s, 0);
		return wedgePath(START + used, 360 - used);
	});

	let settled = false;
	let timeline: gsap.core.Timeline | undefined;

	// A new period: the wedges morph to their new sweeps while the whole dial
	// makes a small turn and settles with an overshoot.
	$effect(() => {
		const target = toSweeps(slices);
		const from = untrack(() => [...sweeps]);
		if (!settled) {
			settled = true;
			return;
		}
		// A recolour alone moves nothing — leave the dial where it is.
		if (target.every((t, i) => Math.abs(t - from[i]) < 0.01)) return;

		timeline?.kill();
		if (prefersReducedMotion()) {
			sweeps = target;
			return;
		}

		const progress = { t: 0 };
		timeline = gsap.timeline().to(
			progress,
			{
				t: 1,
				duration: 0.9,
				ease: 'power3.inOut',
				onUpdate: () => {
					sweeps = from.map((f, i) => f + (target[i] - f) * progress.t);
				}
			},
			0
		);
		const group = untrack(() => body);
		if (group) {
			timeline.fromTo(group, { rotation: -14 }, { rotation: 0, svgOrigin: '50 50', duration: 1.1, ease: 'back.out(1.7)' }, 0);
		}
	});

	onDestroy(() => timeline?.kill());
</script>

<div class={cn('relative aspect-square', className)}>
	<svg viewBox="0 0 100 100" class="size-full overflow-visible" aria-hidden="true">
		<defs>
			<filter id="{uid}-soften" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2.4" />
			</filter>

			<pattern id="{uid}-hatch" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0" x2="0" y2="4" stroke="var(--hatch)" stroke-width="1" />
			</pattern>

			{#each colors as color, i (i)}
				<radialGradient id="{uid}-slot-{i}" cx="42%" cy="38%" r="72%">
					<stop offset="0%" class="dial-stop" style="stop-color: {color}; stop-opacity: 0.95" />
					<stop offset="55%" class="dial-stop" style="stop-color: {color}; stop-opacity: 0.7" />
					<stop offset="100%" class="dial-stop" style="stop-color: {color}; stop-opacity: 0" />
				</radialGradient>
			{/each}
		</defs>

		<g bind:this={body}>
			<path d={hatch} fill="url(#{uid}-hatch)" />
			<g filter="url(#{uid}-soften)">
				{#each wedges as d, i (i)}
					<path {d} fill="url(#{uid}-slot-{i})" />
				{/each}
			</g>
		</g>

		<!-- Axis lines with pin terminals — fixed while the wedges move -->
		{#each PINS as deg (deg)}
			{@const [x, y] = point(deg, R + 10)}
			<line x1={C} y1={C} x2={x} y2={y} stroke="var(--fg)" stroke-width="0.5" />
			<ellipse cx={x} cy={y} rx="2.9" ry="1.7" fill="var(--fg)" transform="rotate({deg} {x} {y})" />
		{/each}
		<circle cx={C} cy={C} r="1.4" fill="var(--fg)" />
	</svg>
</div>

<style>
	/* A recoloured wedge eases to its new colour, as its chip's orb does. */
	.dial-stop {
		transition: stop-color 0.45s var(--ease-out-quint);
	}
</style>
