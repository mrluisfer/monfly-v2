<script lang="ts" module>
	import type { PaletteColor } from './palette';

	/** One stretch of a share bar. */
	export type ShareSegment = {
		id: string;
		/** Its part of the bar, 0–1. Parts that come to less than 1 leave the track showing past them. */
		share: number;
		/** Its palette colour. None draws it hatched inside a hairline: a gap, not a holding. */
		color?: PaletteColor;
		/** Left out: greyed in place, keeping its room. */
		off?: boolean;
	};
</script>

<script lang="ts">
	import { animate } from 'motion';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { PALETTE } from './palette';

	/**
	 * A rounded bar of coloured segments, each as long as its share: the
	 * accounts' slices of the total, or one category against the largest. Each
	 * segment wears its colour as a gradient that lightens to the right. They
	 * grow in from nothing one after another and ease to new shares, a segment
	 * left out drains to grey in place (CSS), a pressed one gives and springs
	 * back (Motion, through `squash`), and a soft light crosses the bar now and
	 * then. Decorative: whoever uses it says what it shows — `ShareBarPicker`
	 * adds a tooltip and a press to each segment.
	 */
	type Props = {
		segments: ShareSegment[];
		/**
		 * `sunken` fills the track grey, for segments that fill the bar;
		 * `hatch` hatches it inside a hairline, so the part no segment takes
		 * reads as room.
		 */
		track?: 'sunken' | 'hatch';
		/** The segment pointed at: it brightens and the rest step back. */
		lit?: string | null;
		/** Milliseconds before it grows and its light first crosses — to stagger bars in a list. */
		delay?: number;
		class?: string;
	};

	let { segments, track = 'sunken', lit = null, delay = 0, class: className }: Props = $props();

	let elements = $state<Record<string, HTMLElement>>({});

	/** A pressed segment gives under the press and springs back. */
	export function squash(id: string) {
		const element = elements[id];
		if (element && !prefersReducedMotion()) {
			animate(element, { scaleY: [0.4, 1] }, { type: 'spring', bounce: 0.55, duration: 0.5 });
		}
	}
</script>

<div
	class={cn(
		'share relative flex gap-0.5 overflow-hidden rounded-full',
		track === 'hatch' ? 'hatch border border-hairline' : 'bg-sunken',
		className
	)}
	style="--delay: {delay}ms"
	aria-hidden="true"
>
	{#each segments as segment, i (segment.id)}
		<span
			bind:this={elements[segment.id]}
			class={cn(
				'slice h-full min-w-1 rounded-full',
				!segment.color && 'unknown hatch',
				lit === segment.id && 'lit',
				segment.off && 'off'
			)}
			style="{segment.color
				? `--c: ${PALETTE[segment.color].css}; `
				: ''}--share: {segment.share}; --i: {i}"
		></span>
	{/each}
</div>

<style>
	/* Every few seconds a soft light crosses the bar, left to right. */
	.share::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(
			100deg,
			transparent 30%,
			rgb(255 255 255 / 0.6) 50%,
			transparent 70%
		);
		mix-blend-mode: soft-light;
		translate: -100% 0;
		animation: sheen 7s var(--ease-out-quint) calc(1.5s + var(--delay)) infinite;
	}

	@keyframes sheen {
		0% {
			translate: -100% 0;
		}
		30%,
		100% {
			translate: 100% 0;
		}
	}

	/* A segment's length is its share: grown in from nothing, one after
	   another, and eased on every change. Short of a whole, the rest of the
	   track shows past it. */
	.slice {
		flex: var(--share) 1 0;
		transition:
			flex-grow 0.9s var(--ease-out-quint) calc(var(--delay) + var(--i) * 80ms),
			opacity 0.25s var(--ease-out-quint),
			filter 0.25s var(--ease-out-quint),
			--vivid 0.6s var(--ease-out-quint);

		@starting-style {
			flex-grow: 0;
		}
	}

	/* Left out, the colour mixes toward the track's grey through the registered
	   --vivid, so it eases rather than snaps. */
	@property --vivid {
		syntax: '<percentage>';
		inherits: false;
		initial-value: 100%;
	}

	.slice {
		--grey: color-mix(in oklab, var(--color-fg-muted) 35%, var(--color-card));
		--ink: color-mix(in oklab, var(--c) var(--vivid), var(--grey));
	}

	.slice.off {
		--vivid: 0%;
	}

	/* Scoped off .unknown on purpose: `.hatch` sits in @layer utilities, so an
	   unlayered `background` here would paint over its stripes. */
	.slice:not(.unknown) {
		background: linear-gradient(90deg, var(--ink), color-mix(in oklab, var(--ink) 55%, white));
	}

	/* A segment with no colour is a gap, not a holding: the hatch inside a
	   hairline. Left out, it fades — it has no colour to lose. */
	.slice.unknown {
		border: 1px solid var(--color-hairline);
	}

	.slice.unknown.off {
		opacity: 0.45;
	}

	/* The segment pointed at stays bright; while one is, the others step back. */
	.share:has(.lit) .slice:not(.lit) {
		opacity: 0.4;
	}

	.slice.lit {
		filter: saturate(1.2) brightness(1.04);
	}

	@media (prefers-reduced-motion: reduce) {
		.share::after {
			animation: none;
		}

		.slice {
			transition: none;
		}
	}
</style>
