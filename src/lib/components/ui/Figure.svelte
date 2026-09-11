<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		value: string;
		/** Renders the currency symbol in an accent, as the mockup's Sales figure does. */
		accentSymbol?: 'lime' | 'blue' | 'violet' | null;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		class?: string;
	};

	let { value, accentSymbol = null, size = 'md', class: className }: Props = $props();

	const sizes = {
		sm: 'text-2xl',
		md: 'text-[2rem]',
		lg: 'text-[2.75rem]',
		xl: 'text-[3.5rem]'
	};

	const symbol = $derived(accentSymbol && /^[^\d-]/.test(value) ? value[0] : null);
	const rest = $derived(symbol ? value.slice(1) : value);
	const accent = { lime: 'text-lime', blue: 'text-blue', violet: 'text-violet' };
</script>

<p
	class={cn('tabular font-display leading-none font-light tracking-tight', sizes[size], className)}
>
	{#if symbol && accentSymbol}<span class={accent[accentSymbol]}>{symbol}</span>{/if}{rest}
</p>
