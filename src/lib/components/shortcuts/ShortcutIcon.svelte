<script lang="ts">
	import ColorCircleUserRound from '@animated-color-icons/lucide-svelte/CircleUserRound.svelte';
	import ColorCreditCard from '@animated-color-icons/lucide-svelte/CreditCard.svelte';
	import ColorHandCoins from '@animated-color-icons/lucide-svelte/HandCoins.svelte';
	import ColorTarget from '@animated-color-icons/lucide-svelte/Target.svelte';
	import MovingArrowLeftRight from '@jis3r/icons/icons/arrow-left-right';
	import MovingChartColumn from '@jis3r/icons/icons/chart-column';
	import MovingLayoutDashboard from '@jis3r/icons/icons/layout-dashboard';
	import MovingSettings from '@jis3r/icons/icons/settings';
	import type { ComponentProps } from 'svelte';
	import { AnimatedIcon, PALETTE } from '$lib/components/ui';
	import type { Shortcut, ShortcutId } from '$lib/shortcuts';
	import { cn } from '$lib/utils';

	/**
	 * A shortcut's glyph in its colour: the one its card on /shortcuts wears and
	 * the one its tab in the header wears. Both draw it from here, so a new glyph
	 * — or a new colour in `$lib/shortcuts` — changes the two together. It plays
	 * the way `AnimatedIcon` does: with its control (the tab's link), or from
	 * outside through `play`.
	 */
	type Props = Pick<ComponentProps<typeof AnimatedIcon>, 'size' | 'trigger' | 'play' | 'class'> & {
		shortcut: Shortcut;
	};

	let { shortcut, class: className, ...icon }: Props = $props();

	const GLYPHS: Record<ShortcutId, Pick<ComponentProps<typeof AnimatedIcon>, 'icon' | 'set'>> = {
		overview: { icon: MovingLayoutDashboard, set: 'moving' },
		transactions: { icon: MovingArrowLeftRight, set: 'moving' },
		insights: { icon: MovingChartColumn, set: 'moving' },
		accounts: { icon: ColorCreditCard, set: 'color' },
		loans: { icon: ColorHandCoins, set: 'color' },
		budgets: { icon: ColorTarget, set: 'color' },
		profile: { icon: ColorCircleUserRound, set: 'color' },
		settings: { icon: MovingSettings, set: 'moving' }
	};
</script>

<span
	class={cn('glyph inline-flex shrink-0', className)}
	style="--tint: {PALETTE[shortcut.color].css}"
>
	<AnimatedIcon {...GLYPHS[shortcut.id]} {...icon} />
</span>

<style>
	/* The palette at a glyph's weight on white, as a category's glyph wears it:
	   hue kept, lightness dropped, chroma pushed. On the dark card the colour is
	   bright enough to be the glyph itself. */
	.glyph {
		color: color-mix(in oklab, var(--tint) 45%, var(--ink));
		color: oklch(from var(--tint) 0.55 calc(c * 1.7) h);
	}

	:global(.dark) .glyph {
		color: var(--tint);
	}
</style>
