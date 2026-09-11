<script lang="ts">
	import { cn } from '$lib/utils';
	import { PALETTE, type PaletteColor } from './palette';

	type Props = { color?: PaletteColor; class?: string };
	let { color = 'lime', class: className }: Props = $props();
</script>

<!-- The fill is a style, so a recoloured sparkle eases along with its orb. -->
<svg
	viewBox="0 0 24 24"
	class={cn('size-4 transition-[fill] duration-[450ms] ease-[var(--ease-out-quint)]', className)}
	style="fill: {PALETTE[color].css}"
	aria-hidden="true"
>
	<path d="M12 0C12 6.6 17.4 12 24 12C17.4 12 12 17.4 12 24C12 17.4 6.6 12 0 12C6.6 12 12 6.6 12 0Z" />
</svg>
