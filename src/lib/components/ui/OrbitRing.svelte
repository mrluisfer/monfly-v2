<script lang="ts">
	import type { Snippet } from 'svelte';
	import gsap from 'gsap';
	import { cn, prefersReducedMotion } from '$lib/utils';

	type Props = {
		/** Tick marks around the dial, like the gauges in the mockup. */
		ticks?: number;
		/** Positions (0–1 around the circle) that get a solid pointer mark. */
		markers?: number[];
		/** Seconds per revolution; 0 holds the ring still. */
		period?: number;
		/** 1 turns clockwise, -1 the other way — rings side by side read best turning opposite ways. */
		direction?: 1 | -1;
		/** Change it to spin the ring up for a moment — a new month, say. */
		burst?: unknown;
		class?: string;
		/** What it circles — an orb, say. Clipped to a circle inside the ring. */
		children?: Snippet;
	};

	let {
		ticks = 64,
		markers = [0, 0.5],
		period = 32,
		direction = 1,
		burst,
		class: className,
		children
	}: Props = $props();

	const R = 48;
	const CIRC = 2 * Math.PI * R;
	const dash = $derived(`${CIRC / ticks / 2.6} ${CIRC / ticks - CIRC / ticks / 2.6}`);

	let root = $state<HTMLElement>();
	let orbit = $state<SVGGElement>();

	// Plain variables: the burst effect reads them without depending on them.
	let spin: gsap.core.Tween | undefined;
	let pointed = false;

	// The dashes and pointers turn together, endlessly, like something in
	// orbit. Pointing at the ring — or focusing what it holds — spins it up,
	// and it eases back down after; off screen it doesn't turn at all.
	$effect(() => {
		if (!root || !orbit || period <= 0 || prefersReducedMotion()) return;
		const host = root;

		const tween = gsap.to(orbit, {
			rotation: 360 * direction,
			svgOrigin: '50 50',
			duration: period,
			ease: 'none',
			repeat: -1
		});
		spin = tween;

		const speed = (timeScale: number, isPointed: boolean) => () => {
			pointed = isPointed;
			gsap.to(tween, { timeScale, duration: 0.8, ease: 'power2.out' });
		};
		const faster = speed(6, true);
		const calmer = speed(1, false);
		host.addEventListener('pointerenter', faster);
		host.addEventListener('pointerleave', calmer);
		host.addEventListener('focusin', faster);
		host.addEventListener('focusout', calmer);

		const seen = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) tween.play();
			else tween.pause();
		});
		seen.observe(host);

		return () => {
			tween.kill();
			spin = undefined;
			seen.disconnect();
			host.removeEventListener('pointerenter', faster);
			host.removeEventListener('pointerleave', calmer);
			host.removeEventListener('focusin', faster);
			host.removeEventListener('focusout', calmer);
		};
	});

	// A burst: a quick surge, then a long glide back to its own pace.
	let armed = false;
	$effect(() => {
		void burst;
		if (!armed) {
			armed = true;
			return;
		}
		if (!spin) return;
		gsap
			.timeline()
			.to(spin, { timeScale: 10, duration: 0.25, ease: 'power2.out' })
			.to(spin, { timeScale: pointed ? 6 : 1, duration: 1.4, ease: 'power3.out' });
	});
</script>

<div bind:this={root} class={cn('relative aspect-square', className)}>
	<svg viewBox="0 0 100 100" class="absolute inset-0 size-full overflow-visible" aria-hidden="true">
		<g bind:this={orbit}>
			<circle
				cx="50"
				cy="50"
				r={R}
				fill="none"
				stroke="var(--hairline)"
				stroke-width="1.4"
				stroke-linecap="round"
				stroke-dasharray={dash}
			/>
			{#each markers as at (at)}
				{@const angle = at * 2 * Math.PI - Math.PI / 2}
				<polygon
					points="-3.4,-2.6 3.4,-2.6 0,3.4"
					fill="var(--fg)"
					transform="translate({50 + R * Math.cos(angle)} {50 + R * Math.sin(angle)}) rotate({at *
						360})"
				/>
			{/each}
		</g>
	</svg>

	{#if children}
		<div class="absolute inset-[14%] overflow-hidden rounded-full">
			{@render children()}
		</div>
	{/if}
</div>
