<script lang="ts" module>
	/**
	 * The type a figure is drawn at. Shared, because a figure is sometimes a
	 * field — the transaction panel's is — and the two have to be the same size
	 * to be the same thing.
	 */
	export const FIGURE_SIZES = {
		sm: 'text-2xl',
		md: 'text-[2rem]',
		lg: 'text-[2.75rem]',
		xl: 'text-[3.5rem]'
	} as const;

	export type FigureSize = keyof typeof FIGURE_SIZES;
</script>

<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		value: string;
		/** Renders the currency symbol in an accent, as the mockup's Sales figure does. */
		accentSymbol?: 'lime' | 'blue' | 'violet' | null;
		size?: FigureSize;
		class?: string;
	};

	let { value, accentSymbol = null, size = 'md', class: className }: Props = $props();

	const symbol = $derived(accentSymbol && /^[^\d-]/.test(value) ? value[0] : null);
	const rest = $derived(symbol ? value.slice(1) : value);
	const accent = { lime: 'text-lime', blue: 'text-blue', violet: 'text-violet' };
</script>

<p
	class={cn(
		'tabular font-display leading-none font-light tracking-tight',
		FIGURE_SIZES[size],
		className
	)}
>
	{#if symbol && accentSymbol}<span class={accent[accentSymbol]}>{symbol}</span>{/if}{rest}
</p>
