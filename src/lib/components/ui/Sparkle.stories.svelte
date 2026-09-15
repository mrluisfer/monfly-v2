<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PALETTE_COLORS } from './palette';
	import Sparkle from './Sparkle.svelte';

	const { Story } = defineMeta({
		title: 'UI/Sparkle',
		component: Sparkle,
		tags: ['autodocs'],
		args: { color: 'lime', animated: true, period: 2.8, class: 'size-10' },
		argTypes: { color: { control: 'select', options: PALETTE_COLORS } }
	});
</script>

<!-- Alive: it breathes, glints and shines; a pointer flashes it. -->
<Story name="Animated" />

<!-- Still, for lists and bullets. -->
<Story name="Still" args={{ animated: false }} />

<Story name="Palette" parameters={{ layout: 'padded' }}>
	{#snippet template()}
		<div class="flex flex-wrap gap-6">
			{#each PALETTE_COLORS as color (color)}
				<Sparkle {color} animated class="size-8" />
			{/each}
		</div>
	{/snippet}
</Story>
