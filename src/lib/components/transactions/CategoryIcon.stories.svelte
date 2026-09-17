<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { categoryColor } from '$lib/categories';
	import { PALETTE_COLORS } from '$lib/components/ui';
	import CategoryIcon from './CategoryIcon.svelte';

	const { Story } = defineMeta({
		title: 'Transactions/CategoryIcon',
		component: CategoryIcon,
		tags: ['autodocs'],
		args: { category: 'Comida', color: 'coral' },
		argTypes: { color: { control: 'select', options: PALETTE_COLORS } }
	});

	const CATEGORIES = [
		'Comida',
		'Transferencia',
		'Retiro',
		'Gasolina',
		'Renta',
		'Salario',
		'juegos'
	];
</script>

<Story name="Default" />

<!-- Glyph and colour come from the words in the name, so any category arrives with both. -->
<Story name="Categories">
	{#snippet template()}
		<ul class="grid gap-3">
			{#each CATEGORIES as category (category)}
				<li class="flex items-center gap-3 text-[0.9375rem]">
					<CategoryIcon {category} color={categoryColor(category)} />
					{category}
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>

<!-- Moving where that set draws the glyph — the transfer shuttles, an unknown kind's
     tag leans — and Animated Color Icons for the rest. Each row is its own host. -->
<Story name="Animated">
	{#snippet template()}
		<ul class="grid gap-3">
			{#each CATEGORIES as category (category)}
				<li data-icon-host class="flex items-center gap-3 text-[0.9375rem]">
					<CategoryIcon {category} color={categoryColor(category)} animated />
					{category}
				</li>
			{/each}
		</ul>
	{/snippet}
</Story>
