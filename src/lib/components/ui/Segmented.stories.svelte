<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Segmented from './Segmented.svelte';

	const { Story } = defineMeta({
		title: 'UI/Segmented',
		component: Segmented,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let by = $state('quarter');
	let show = $state('all');
</script>

<!-- A radio group: arrow keys move the choice, and one raised surface slides to it. -->
<Story name="Two choices">
	{#snippet template()}
		<Segmented
			label="This year by"
			options={[
				{ value: 'quarter', label: 'Quarters' },
				{ value: 'month', label: 'Months' }
			]}
			bind:value={by}
		/>
	{/snippet}
</Story>

<Story name="Three choices">
	{#snippet template()}
		<Segmented
			label="Show"
			options={[
				{ value: 'all', label: 'All' },
				{ value: 'income', label: 'Income' },
				{ value: 'expense', label: 'Expenses' }
			]}
			bind:value={show}
		/>
	{/snippet}
</Story>
