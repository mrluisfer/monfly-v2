<script lang="ts">
	import gsap from 'gsap';
	import { Blob } from '$lib/components/ui';
	import { cn, prefersReducedMotion } from '$lib/utils';

	type Props = {
		/** Seconds for one turn, left alone. */
		turn?: number;
		class?: string;
	};

	let { turn = 24, class: className }: Props = $props();

	const R = 34;
	/*
	 * Meridians evenly spaced in longitude. Seen head-on the front and back
	 * halves of the sphere land on the same ellipse, so six meridians draw as
	 * four lines — the density the globe was drawn with.
	 */
	const COUNT = 6;
	const PHASES = Array.from({ length: COUNT }, (_, i) => (i * Math.PI) / COUNT);

	let el = $state<HTMLElement>();
	let angle = $state(0);
	let dragging = $state(false);

	// A meridian turned edge-on is a line; it never quite reaches zero, or SVG
	// would stop drawing it.
	const meridians = $derived(
		PHASES.map((phase) => Math.max(0.35, R * Math.abs(Math.cos(angle + phase))))
	);

	const steady = $derived((Math.PI * 2) / turn); // radians a second

	// Held in an object so GSAP can ease the rate itself after a throw.
	const spin = { rate: 0 };

	/*
	 * The turn: GSAP's ticker advances the angle, so the steady turn and a
	 * throw share one clock. Only the meridians move — the parallels sit still,
	 * because the turn is about the polar axis.
	 */
	$effect(() => {
		spin.rate = prefersReducedMotion() ? 0 : steady;

		const tick = (_time: number, delta: number) => {
			if (!dragging) angle += spin.rate * (delta / 1000);
		};

		gsap.ticker.add(tick);
		return () => {
			gsap.ticker.remove(tick);
			gsap.killTweensOf(spin);
		};
	});

	/*
	 * Spinning it by hand. Listeners go on in JS rather than in the markup:
	 * the globe is decorative, and a div carrying pointer handlers would read
	 * to the compiler as something meant to be operated.
	 */
	$effect(() => {
		const node = el;
		if (!node) return;

		let lastX = 0;
		let lastAt = 0;
		let perPixel = 0;

		const down = (event: PointerEvent) => {
			dragging = true;
			lastX = event.clientX;
			lastAt = event.timeStamp;
			// Dragging its full width turns it half way round, whatever its size.
			perPixel = Math.PI / (node.clientWidth || 1);
			gsap.killTweensOf(spin);
			node.setPointerCapture(event.pointerId);
		};

		const move = (event: PointerEvent) => {
			if (!dragging) return;
			const dx = event.clientX - lastX;
			const dt = Math.max(8, event.timeStamp - lastAt);
			angle += dx * perPixel;
			spin.rate = (dx * perPixel) / (dt / 1000);
			lastX = event.clientX;
			lastAt = event.timeStamp;
		};

		const up = (event: PointerEvent) => {
			if (!dragging) return;
			dragging = false;
			if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);

			if (prefersReducedMotion()) {
				spin.rate = 0;
				return;
			}

			// Let go mid-move and the throw carries; held still first, it just stops.
			const idle = event.timeStamp - lastAt;
			spin.rate = idle > 90 ? steady : gsap.utils.clamp(-12, 12, spin.rate);
			gsap.to(spin, { rate: steady, duration: 1.8, ease: 'power2.out', overwrite: true });
		};

		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', up);

		return () => {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
		};
	});
</script>

<!--
	The wireframe globe: it turns on its own and can be spun by hand. `pan-y`
	leaves a touch drag down the page alone while a drag across it spins.
-->
<div
	bind:this={el}
	style="touch-action: pan-y"
	class={cn(
		'relative aspect-square select-none',
		dragging ? 'cursor-grabbing' : 'cursor-grab',
		className
	)}
>
	<div class="pointer-events-none absolute inset-[22%] overflow-hidden rounded-full">
		<Blob color="lime" blur={10} spread={78} />
	</div>

	<svg viewBox="0 0 100 100" class="absolute inset-0 size-full" aria-hidden="true">
		<g fill="none" stroke="var(--fg)" stroke-width="0.6">
			<circle cx="50" cy="50" r={R} />

			<!-- Parallels, and the equator seen edge-on: the turn doesn't move them. -->
			<ellipse cx="50" cy="50" rx={R} ry="13" />
			<ellipse cx="50" cy="50" rx={R} ry="25" />
			<line x1={50 - R} y1="50" x2={50 + R} y2="50" />

			<!-- Meridians: their half-width is the turn. -->
			{#each meridians as rx, i (i)}
				<ellipse cx="50" cy="50" {rx} ry={R} />
			{/each}
		</g>
	</svg>
</div>
