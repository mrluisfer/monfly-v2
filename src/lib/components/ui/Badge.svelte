<script lang="ts">
	import gsap from 'gsap';
	import { animate } from 'motion';
	import { untrack, type Snippet } from 'svelte';
	import { cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * A tinted chip that says something happened: the change chip's look — its
	 * tint mixed onto the card, `rounded-lg` — with an icon at its head, figures
	 * in full weight and the words between them a step quieter. Its words come
	 * in one after another (GSAP) as the icon springs in (Motion); a new `burst`
	 * springs the whole badge and plays both again, so it can say something new
	 * in place rather than a second one turning up beside it.
	 */
	type Props = {
		/** `positive` for something done, `negative` for something refused, `neutral` for news. */
		tone?: 'positive' | 'negative' | 'neutral';
		/** The glyph at its head: a Lucide icon, sized here. */
		icon?: Snippet;
		/** Change it when the words change: the badge springs and they come in again. */
		burst?: unknown;
		/** The words, as sibling elements, so each comes in on its own. */
		children: Snippet;
		class?: string;
	};

	let { tone = 'neutral', icon, burst, children, class: className }: Props = $props();

	let badge = $state<HTMLElement>();
	let glyph = $state<HTMLElement>();
	let words = $state<HTMLElement>();
	/** Past the first run: from here on a burst springs the badge too. */
	let armed = false;

	// Only a new `burst` replays it: the elements are read untracked, so their
	// binding doesn't count as one.
	$effect(() => {
		void burst;
		return untrack(() => {
			const bursting = armed;
			armed = true;
			if (!badge || !words || prefersReducedMotion()) return;

			const parts = [...words.children];
			gsap.fromTo(
				parts,
				{ opacity: 0, x: 8 },
				{ opacity: 1, x: 0, duration: 0.4, ease: 'power3.out', stagger: 0.07, overwrite: true }
			);
			if (glyph) {
				animate(
					glyph,
					{ scale: [0.4, 1], rotate: [-20, 0] },
					{ type: 'spring', bounce: 0.5, duration: 0.5 }
				);
			}
			if (bursting) {
				animate(badge, { scale: [0.94, 1] }, { type: 'spring', bounce: 0.45, duration: 0.6 });
			}
			return () => gsap.killTweensOf(parts);
		});
	});
</script>

<span
	bind:this={badge}
	class={cn(
		'badge inline-flex max-w-full items-center gap-2 rounded-lg px-2.5 py-1 text-sm font-medium',
		tone === 'positive' && 'text-positive',
		tone === 'negative' && 'text-negative',
		tone === 'neutral' && 'flat text-fg-muted',
		className
	)}
>
	{#if icon}
		<span bind:this={glyph} class="flex shrink-0 [&_svg]:size-3.5 [&_svg]:stroke-[1.75]">
			{@render icon()}
		</span>
	{/if}
	<span bind:this={words} class="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
		{@render children()}
	</span>
</span>

<style>
	/* Mixed onto the card rather than laid over it — the colour `bg-positive/12`
	   gives there, but solid — as the change chip's is. */
	.badge {
		background: color-mix(in srgb, currentColor 12%, var(--color-card));
	}

	.badge.flat {
		background: var(--color-sunken);
	}
</style>
