<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Orb from './Orb.svelte';
	import { PALETTE, PALETTE_COLORS } from './palette';

	const { Story } = defineMeta({
		title: 'UI/Orb',
		component: Orb,
		tags: ['autodocs'],
		args: { color: 'violet', blur: 7, spread: 80, editable: false, class: 'size-24' },
		argTypes: { color: { control: 'select', options: [...PALETTE_COLORS, 'none'] } }
	});
</script>

<Story name="Default" />

<!-- A button that opens the palette. -->
<Story
	name="Editable"
	args={{ editable: true, label: 'Main account', class: 'size-7 border border-line bg-card' }}
/>

<Story name="Palette" parameters={{ layout: 'padded' }}>
	{#snippet template()}
		<div class="grid grid-cols-6 gap-6">
			{#each PALETTE_COLORS as color (color)}
				<div class="flex flex-col items-center gap-2">
					<Orb {color} blur={7} spread={80} class="size-14" />
					<span class="text-sm text-fg-muted">{PALETTE[color].label}</span>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
