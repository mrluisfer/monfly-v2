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
		 * clockwise from 270°. The hatch is everything they don't cover, and a
		 * hairline divides each part from the next. Empty draws a full hatch.
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
	/** Angles are clockwise from 12 o'clock. The first wedge starts where the mockup's did: 9 o'clock. */
	const START = 270;

	const C = 50;
	const R = 44;
	/** Where a divider's pin sits: its tip, pointing back at the hub. */
	const TIP = 50;
	/** The pin, drawn along +x from its tip: a tag, as in the mockup, its corners rounded by its stroke. */
	const PIN = 'M0,0 L1.2,-1.45 L4.8,-1.45 Q5.6,-1.45 5.6,-0.65 L5.6,0.65 Q5.6,1.45 4.8,1.45 L1.2,1.45 Z';
	/** The closest two dividers get, so a small wedge's don't stack their pins. */
	const MIN_GAP = 14;

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

	/**
	 * The hub: a small four-point star, its sides drawn in. Fixed rather than
	 * following the dividers, so it stays balanced however they bunch up.
	 */
	const HUB = (() => {
		const [x0, y0] = point(0, 3.2);
		let path = `M${x0},${y0}`;
		for (const deg of [90, 180, 270, 360]) {
			const [qx, qy] = point(deg - 45, 1.45);
			const [tx, ty] = point(deg, 3.2);
			path += ` Q${qx},${qy} ${tx},${ty}`;
		}
		return `${path} Z`;
	})();

	function wedgePath(from: number, sweep: number) {
		if (sweep <= 0.01) return '';
		// A single arc can't close on itself: a whole circle takes two halves.
		if (sweep >= 359.99) return `M${C},${C - R} A${R},${R} 0 1 1 ${C},${C + R} A${R},${R} 0 1 1 ${C},${C - R} Z`;
		const [x1, y1] = point(from);
		const [x2, y2] = point(from + sweep);
		return `M${C},${C} L${x1},${y1} A${R},${R} 0 ${sweep > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
	}

	/**
	 * One angle scale for every mark, as a grammar-of-graphics polar chart has
	 * it: each wedge runs clockwise from where the last one ended, from START,
	 * the hatch takes what's left, and a divider marks where each part begins.
	 */
	const parts = $derived.by(() => {
		let from = START;
		const wedges = sweeps.map((sweep, i) => {
			const part = { key: `slot-${i}`, from, sweep };
			from += sweep;
			return part;
		});
		return [...wedges, { key: 'hatch', from, sweep: Math.max(START + 360 - from, 0) }];
	});
	const wedges = $derived(parts.slice(0, SLOTS));
	const hatch = $derived(parts[SLOTS]);

	/**
	 * Eases clockwise-ordered angles apart until neighbours sit MIN_GAP apart,
	 * the last one's neighbour being the first, a turn on. Continuous in its
	 * input, so the dividers glide rather than jump while the wedges morph.
	 */
	function spread(angles: number[]) {
		const out = [...angles];
		const n = out.length;
		if (n < 2) return out;
		for (let pass = 0; pass < 32; pass++) {
			for (let i = 0; i < n; i++) {
				const j = (i + 1) % n;
				const gap = out[j] + (j === 0 ? 360 : 0) - out[i];
				if (gap >= MIN_GAP) continue;
				out[i] -= (MIN_GAP - gap) / 2;
				out[j] += (MIN_GAP - gap) / 2;
			}
		}
		return out;
	}

	// A divider where each part begins — none while there's only one part —
	// straight from the hub to its pin. Small parts' dividers ease apart and
	// stand a few degrees off their edges instead of bending to reach them:
	// the soft colour hides the degrees; it wouldn't hide a kink.
	const dividers = $derived.by(() => {
		// Half a degree, not zero: shares that sum to 0.9999 leave a hatch no
		// one can see, and it shouldn't get a pin.
		const shown = parts.filter((part) => part.sweep >= 0.5);
		if (shown.length < 2) return [];
		const angles = spread(shown.map((part) => part.from));
		return shown.map((part, k) => ({ key: part.key, angle: angles[k] }));
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
			// The centre goes in both halves: given only in `to`, GSAP's
			// smoothOrigin kept the −14° start's offset as a lasting shift, and
			// the wedges settled ~15 units off the hub.
			timeline.fromTo(
				group,
				{ rotation: -14, svgOrigin: '50 50' },
				{ rotation: 0, svgOrigin: '50 50', duration: 1.1, ease: 'back.out(1.7)' },
				0
			);
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

			<!-- Broader than the shared .hatch on purpose: the dial keeps its own wide stripes -->
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
			<path d={wedgePath(hatch.from, hatch.sweep)} fill="url(#{uid}-hatch)" />
			<g filter="url(#{uid}-soften)">
				{#each wedges as wedge, i (i)}
					<path d={wedgePath(wedge.from, wedge.sweep)} fill="url(#{uid}-slot-{i})" />
				{/each}
			</g>

			<!-- A hairline where each part begins, straight out past the rim to its pin -->
			{#each dividers as divider (divider.key)}
				{@const [tx, ty] = point(divider.angle, TIP)}
				<line
					x1={C}
					y1={C}
					x2={tx}
					y2={ty}
					stroke="var(--hairline)"
					stroke-width="1"
					vector-effect="non-scaling-stroke"
				/>
				<path
					d={PIN}
					fill="var(--fg)"
					stroke="var(--fg)"
					stroke-width="0.8"
					stroke-linejoin="round"
					transform="translate({tx} {ty}) rotate({divider.angle - 90})"
				/>
			{/each}

			{#if dividers.length > 0}
				<path d={HUB} fill="var(--fg)" />
			{:else}
				<circle cx={C} cy={C} r="1.4" fill="var(--fg)" />
			{/if}
		</g>
	</svg>
</div>

<style>
	/* A recoloured wedge eases to its new colour, as its chip's orb does. */
	.dial-stop {
		transition: stop-color 0.45s var(--ease-out-quint);
	}
</style>
