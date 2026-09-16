<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { categoryColor } from '$lib/categories';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import Combobox from './Combobox.svelte';

	const { Story } = defineMeta({
		title: 'UI/Combobox',
		component: Combobox,
		tags: ['autodocs']
	});

	const CATEGORIES = [
		'Despensa',
		'Comida',
		'Transporte',
		'Suscripciones',
		'Servicios',
		'Salud',
		'Ahorro',
		'Regalos'
	];
</script>

<script lang="ts">
	let category = $state('Despensa');
	let plain = $state('');
</script>

<!-- The categories already on record, each in the chip the ledger draws it in:
     its glyph moves as the row it sits in is pointed at, in the category's own
     colour. Type a name none of them has and it heads the list, marked new. -->
<Story name="Category">
	{#snippet template()}
		<div class="w-80">
			<Combobox
				label="Category"
				options={CATEGORIES}
				bind:value={category}
				placeholder="Groceries"
				maxlength={120}
			>
				{#snippet leading(name)}
					<CategoryIcon category={name} color={categoryColor(name)} animated />
				{/snippet}
			</Combobox>
		</div>
	{/snippet}
</Story>

<!-- Without `leading` it is the plain field: suggestions and nothing else. -->
<Story name="Bare">
	{#snippet template()}
		<div class="w-80">
			<Combobox label="Category" options={CATEGORIES} bind:value={plain} placeholder="Groceries" />
		</div>
	{/snippet}
</Story>

<!-- Nothing on record yet — a first transaction — so no list opens over it. -->
<Story name="Nothing suggested">
	{#snippet template()}
		<div class="w-80">
			<Combobox label="Category" options={[]} bind:value={plain} placeholder="Groceries" />
		</div>
	{/snippet}
</Story>
