<script lang="ts">
	import { cn } from '$lib/utils';

	/**
	 * One line of text, cut short with an ellipsis where its column is too
	 * narrow, that reads to its end under the pointer — or while the control it
	 * sits in has keyboard focus: after a beat it slides left at a reading pace
	 * until its last word shows, and slides back when let go. It never grows,
	 * wraps or covers what's beside it, so the table it sits in holds still;
	 * text that fits doesn't move at all.
	 *
	 * The slide is CSS, on the line's `text-indent`, so at rest the ellipsis is
	 * plain `text-overflow`. The only script measures how far there is to go.
	 * Read out whole, as any text is.
	 *
	 * <OverflowText text={row.description} class="text-sm text-fg-muted" />
	 */
	type Props = {
		text: string;
		class?: string;
	};

	let { text, class: className }: Props = $props();

	/** Reading pace, in px a second, and the longest a slide may take. */
	const PACE = 55;
	const LONGEST = 6;

	let line = $state<HTMLElement>();
	/** How far past its box the text runs, in px: 0 when it fits. */
	let overflow = $state(0);

	$effect(() => {
		if (!line) return;
		void text;
		const node = line;
		const range = document.createRange();

		// The text's own width, which the indent doesn't change — so measuring
		// mid-slide never moves the goal. Rounded up a pixel, or the last letter
		// can give way to an ellipsis.
		const measure = () => {
			range.selectNodeContents(node);
			const over = range.getBoundingClientRect().width - node.getBoundingClientRect().width;
			overflow = over > 0.5 ? Math.ceil(over) + 1 : 0;
		};

		measure();
		let live = true;
		// Web fonts change the width once they land.
		document.fonts.ready.then(() => live && measure());
		const resize = new ResizeObserver(measure);
		resize.observe(node);

		return () => {
			live = false;
			resize.disconnect();
		};
	});

	const read = $derived(Math.min(LONGEST, Math.max(0.5, overflow / PACE)));
</script>

<span
	bind:this={line}
	class={cn('overflow-text', className)}
	data-cut={overflow > 0 || undefined}
	style="--overflow: {overflow}px; --read: {read}s">{text}</span
>

<style>
	/* Registered, so the fade on the left can ease in and out with the slide. */
	@property --overflow-fade {
		syntax: '<length>';
		inherits: false;
		initial-value: 0px;
	}

	.overflow-text {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		/* Let go, it comes straight back. */
		transition:
			text-indent 0.35s var(--ease-out-quint),
			--overflow-fade 0.35s var(--ease-out-quint);
	}

	/* Only text that's cut short wears the mask: slid along, its start fades
	   out at the left edge rather than being sliced through a letter. */
	.overflow-text[data-cut] {
		mask-image: linear-gradient(to right, transparent, #000 var(--overflow-fade));
	}

	/* A beat first, so a pointer passing over doesn't set every row moving;
	   then to its last word, easing in and out as eyes follow it. */
	.overflow-text:hover,
	:global(:focus-visible) > .overflow-text {
		--overflow-fade: 0.75rem;
		text-indent: calc(var(--overflow) * -1);
		transition:
			text-indent var(--read) cubic-bezier(0.45, 0, 0.55, 1) 0.3s,
			--overflow-fade 0.3s var(--ease-out-quint) 0.3s;
	}

	@media (prefers-reduced-motion: reduce) {
		.overflow-text,
		.overflow-text:hover,
		:global(:focus-visible) > .overflow-text {
			transition: none;
		}
	}
</style>
