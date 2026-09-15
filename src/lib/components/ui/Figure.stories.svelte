<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Figure, { FIGURE_SIZES, type FigureSize } from './Figure.svelte';

	const SIZES = Object.keys(FIGURE_SIZES) as FigureSize[];

	const { Story } = defineMeta({
		title: 'UI/Figure',
		component: Figure,
		tags: ['autodocs'],
		args: { value: '$12,480.50', size: 'lg' },
		argTypes: {
			size: { control: 'inline-radio', options: SIZES },
			accentSymbol: { control: 'inline-radio', options: ['lime', 'blue', 'violet'] }
		}
	});
</script>

<Story name="Default" />

<Story name="Accent symbol" args={{ accentSymbol: 'lime', size: 'xl' }} />

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-col gap-4">
			{#each SIZES as size (size)}
				<Figure {...args} {size} />
			{/each}
		</div>
	{/snippet}
</Story>
