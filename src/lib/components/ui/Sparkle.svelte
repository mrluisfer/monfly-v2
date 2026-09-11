<script lang="ts">
	import { animate } from 'motion';
	import { untrack } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';
	import { PALETTE, type PaletteColor } from './palette';

	type Props = {
		/** A palette colour. Recolouring eases the star, its halo and glints together (450 ms). */
		color?: PaletteColor;
		/**
		 * Alive: it breathes and glows on a beat of its own, small glints twinkle
		 * off it and a shine crosses it now and then. Off, a still glyph — right
		 * for lists and bullets.
		 */
		animated?: boolean;
		/** Seconds per breath; the glints and the shine keep time with it. */
		period?: number;
		/** Change it to flash the sparkle — a new month, say. Pointing at it flashes it too. */
		burst?: unknown;
		/** Names it for assistive tech. Without one it's decorative, hidden from them. */
		label?: string;
		class?: string;
		style?: string;
	} & Omit<HTMLAttributes<HTMLSpanElement>, 'class' | 'style' | 'color'>;

	let {
		color = 'lime',
		animated = false,
		period = 2.8,
		burst,
		label,
		class: className,
		style = '',
		...rest
	}: Props = $props();

	/** Four points, drawn once: the star, its glints and its sparks are all this. */
	const STAR =
		'M12 0C12 6.6 17.4 12 24 12C17.4 12 12 17.4 12 24C12 17.4 6.6 12 0 12C6.6 12 12 6.6 12 0Z';
	/** Glints off its sides, between the points: where (% of its box) and how big (× its size). */
	const TWINKLES = [
		{ x: 90, y: 10, s: 0.34 },
		{ x: 10, y: 88, s: 0.26 },
		{ x: 94, y: 86, s: 0.2 }
	];
	/** A burst sends a spark off each point. */
	const POINTS = [
		[0, -1],
		[1, 0],
		[0, 1],
		[-1, 0]
	] as const;

	const uid = $props.id();
	// A beat of its own, so sparkles side by side never breathe in step. Drawn
	// from its id, so the server and the browser agree on it.
	const phase = $derived(-((hash(uid) % 997) / 997) * period);

	/** FNV-1a, then an avalanche, so ids one character apart land far apart. */
	function hash(text: string) {
		let h = 0x811c9dc5;
		for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
		h ^= h >>> 16;
		h = Math.imul(h, 0x85ebca6b);
		h ^= h >>> 13;
		h = Math.imul(h, 0xc2b2ae35);
		h ^= h >>> 16;
		return h >>> 0;
	}

	let root = $state<HTMLSpanElement>();
	let lift = $state<HTMLSpanElement>();
	let sparks = $state<SVGSVGElement[]>([]);
	/** Off screen, every loop holds still. */
	let hidden = $state(false);

	$effect(() => {
		if (!root || !animated) return;
		const seen = new IntersectionObserver(([entry]) => (hidden = !entry.isIntersecting));
		seen.observe(root);
		return () => seen.disconnect();
	});

	let last = 0;

	/** A flash: the star springs a quarter turn from a little larger, and a spark flies off each point. */
	function flash() {
		if (!animated || !lift || prefersReducedMotion()) return;
		const now = performance.now();
		if (now - last < 700) return;
		last = now;
		// A quarter turn of a four-pointed star lands where it started.
		animate(
			lift,
			{ scale: [1.35, 1], rotate: [0, 90] },
			{ type: 'spring', bounce: 0.5, duration: 0.7 }
		);
		const reach = (root?.clientWidth ?? 16) * 0.9;
		sparks.forEach((spark, i) => {
			const [dx, dy] = POINTS[i];
			animate(
				spark,
				{ x: [0, dx * reach], y: [0, dy * reach], scale: [0.5, 1, 0], opacity: [1, 1, 0] },
				{ duration: 0.65, ease: EASE_OUT_QUINT }
			);
		});
	}

	// A listener, not an attribute: a pointerenter passed in `rest` still reaches the element.
	$effect(() => {
		if (!root || !animated) return;
		const host = root;
		host.addEventListener('pointerenter', flash);
		return () => host.removeEventListener('pointerenter', flash);
	});

	// A new `burst` flashes it; the first value, on mount, doesn't.
	let armed = false;
	$effect(() => {
		void burst;
		if (!armed) {
			armed = true;
			return;
		}
		untrack(flash);
	});
</script>

<!--
	A four-pointed star in a palette colour. Animated, it's alive the way the
	orbs are: it breathes and glows on a beat of its own, glints twinkle off
	its sides one after another, a shine crosses it every other breath, and a
	burst — or a pointer — flashes it. CSS runs the loops (compositor-only),
	Motion the flash; nothing moves off screen or under reduced motion.
-->
<span
	bind:this={root}
	class={cn('sparkle size-4', className)}
	style="--sparkle: {PALETTE[color].css}; --period: {period}s; --phase: {phase}s; {style}"
	data-animated={animated || undefined}
	data-paused={hidden || undefined}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : true}
	{...rest}
>
	{#if animated}
		<span class="halo"></span>
	{/if}
	<!-- Motion flashes the outer layer, CSS breathes the inner: they never fight over a property. -->
	<span bind:this={lift} class="layer">
		<span class="layer body">
			<svg viewBox="0 0 24 24" class="star">
				<path d={STAR} />
				{#if animated}
					<defs>
						<clipPath id="{uid}-clip"><path d={STAR} /></clipPath>
						<linearGradient id="{uid}-shine" x1="0" x2="1">
							<stop offset="0" stop-color="white" stop-opacity="0" />
							<stop offset="0.5" stop-color="white" stop-opacity="0.85" />
							<stop offset="1" stop-color="white" stop-opacity="0" />
						</linearGradient>
					</defs>
					<!-- The shine, clipped to the star, crossing it on a slant. -->
					<g clip-path="url(#{uid}-clip)">
						<g transform="rotate(20 12 12)">
							<rect class="shine" x="-14" y="-8" width="7" height="40" fill="url(#{uid}-shine)" />
						</g>
					</g>
				{/if}
			</svg>
		</span>
	</span>
	{#if animated}
		{#each TWINKLES as t, i (i)}
			<svg viewBox="0 0 24 24" class="twinkle" style="--x: {t.x}; --y: {t.y}; --s: {t.s}; --i: {i}">
				<path d={STAR} />
			</svg>
		{/each}
		{#each POINTS as point, i (point)}
			<svg bind:this={sparks[i]} viewBox="0 0 24 24" class="spark"><path d={STAR} /></svg>
		{/each}
	{/if}
</span>

<style>
	/* Registered, so a recolour eases every layer at once instead of snapping. */
	@property --sparkle {
		syntax: '<color>';
		inherits: true;
		initial-value: transparent;
	}

	.sparkle {
		position: relative;
		display: inline-grid;
		flex-shrink: 0;
		vertical-align: middle;
		transition: --sparkle 450ms var(--ease-out-quint);
	}

	.layer,
	.star {
		display: block;
		width: 100%;
		height: 100%;
	}

	.star,
	.twinkle,
	.spark {
		overflow: visible;
		fill: var(--sparkle);
	}

	.halo,
	.twinkle,
	.spark {
		position: absolute;
		pointer-events: none;
	}

	/* A soft light in its own colour. */
	.halo {
		inset: -50%;
		border-radius: 9999px;
		background: radial-gradient(
			closest-side,
			color-mix(in oklab, var(--sparkle) 65%, transparent),
			transparent
		);
		opacity: 0;
	}

	/* Centred with margins, not translate, so nothing a loop or Motion sets moves them off. */
	.twinkle {
		left: calc(var(--x) * 1%);
		top: calc(var(--y) * 1%);
		width: calc(var(--s) * 100%);
		height: calc(var(--s) * 100%);
		margin: calc(var(--s) * -50%) 0 0 calc(var(--s) * -50%);
		scale: 0;
	}

	.spark {
		left: 50%;
		top: 50%;
		width: 28%;
		height: 28%;
		margin: -14% 0 0 -14%;
		opacity: 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		[data-animated] .body {
			animation: breathe var(--period) ease-in-out var(--phase) infinite;
		}

		[data-animated] .halo {
			animation: glow var(--period) ease-in-out var(--phase) infinite;
		}

		/* One after another: each glint waits half a breath more than the last. */
		[data-animated] .twinkle {
			animation: twinkle calc(var(--period) * 1.5) ease-in-out
				calc(var(--phase) + var(--i) * var(--period) * 0.5) infinite;
		}

		[data-animated] .shine {
			animation: shine calc(var(--period) * 2) var(--ease-out-quint) var(--phase) infinite;
		}

		[data-paused] * {
			animation-play-state: paused;
		}
	}

	@keyframes breathe {
		0%,
		100% {
			scale: 0.92;
			rotate: -4deg;
		}
		50% {
			scale: 1.06;
			rotate: 4deg;
		}
	}

	@keyframes glow {
		0%,
		100% {
			opacity: 0.1;
			scale: 0.7;
		}
		50% {
			opacity: 0.55;
			scale: 1.05;
		}
	}

	@keyframes twinkle {
		0% {
			scale: 0;
			rotate: 0deg;
		}
		10% {
			scale: 1;
			rotate: 45deg;
		}
		22%,
		100% {
			scale: 0;
			rotate: 90deg;
		}
	}

	/* The band starts clear of the star and ends clear of it, so it only shows crossing. */
	@keyframes shine {
		0% {
			translate: 0 0;
		}
		35%,
		100% {
			translate: 40px 0;
		}
	}
</style>
