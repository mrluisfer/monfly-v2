<script lang="ts">
	import { categoryGlyph, categoryIcon } from '$lib/categories';
	import { AnimatedIcon, PALETTE, type PaletteColor } from '$lib/components/ui';
	import { cn } from '$lib/utils';

	/**
	 * A category's glyph in a chip tinted with its colour — the menu's chip, at
	 * the head of a row. Decorative: the category's name is the column beside
	 * it, so nothing here is read out twice.
	 */
	type Props = {
		/** The category as transactions store it; it picks the glyph. */
		category: string;
		/** Its colour — `categoryColor` works it out once for the whole table. */
		color: PaletteColor;
		/** The glyph makes its gesture with the control around it: a row of the picker. */
		animated?: boolean;
		class?: string;
	};

	let { category, color, animated = false, class: className }: Props = $props();

	const Glyph = $derived(categoryIcon(category));
</script>

<span
	class={cn('chip grid size-7 shrink-0 place-items-center rounded-lg', className)}
	style="--tint: {PALETTE[color].css}"
	aria-hidden="true"
>
	{#if animated}
		<AnimatedIcon icon={categoryGlyph(category)} set="color" />
	{:else}
		<Glyph class="size-4 stroke-[1.75]" />
	{/if}
</span>

<style>
	.chip {
		background: color-mix(in oklab, var(--tint) 15%, transparent);
		/* Without relative colour: deep, a touch muted — the trick the menu plays
		   on lime by hand. */
		color: color-mix(in oklab, var(--tint) 45%, var(--ink));
		/* The palette taken down to a glyph weight, one rule for all twelve: the
		   hue kept, the lightness dropped and the chroma pushed, so a pastel
		   reads on the white card as strongly as the menu's brand glyphs do —
		   and lime stops being a special case. */
		color: oklch(from var(--tint) 0.55 calc(c * 1.7) h);
	}

	/* On the dark card the palette is already the bright thing in the room. */
	:global(.dark) .chip {
		background: color-mix(in oklab, var(--tint) 20%, transparent);
		color: var(--tint);
	}
</style>
