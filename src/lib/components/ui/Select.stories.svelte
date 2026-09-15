<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Select from './Select.svelte';

	const { Story } = defineMeta({
		title: 'UI/Select',
		component: Select,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let period = $state('quarter');
	let account = $state('bbva');
	let month = $state('now');
</script>

<!-- The chosen item's blue check springs in. -->
<Story name="Pill">
	{#snippet template()}
		<Select
			label="Period"
			options={[
				{ value: 'month', label: 'This month' },
				{ value: 'quarter', label: 'This quarter' },
				{ value: 'year', label: 'This year' },
				{ value: 'all', label: 'All time' }
			]}
			bind:value={period}
		/>
	{/snippet}
</Story>

<!-- An option may carry a palette colour, drawn as a dot: an account's. -->
<Story name="With colours">
	{#snippet template()}
		<Select
			label="Account"
			options={[
				{ value: 'bbva', label: 'BBVA debit', color: 'sky' },
				{ value: 'nu', label: 'NU debit', color: 'violet' },
				{ value: 'cash', label: 'Cash', color: 'lime' }
			]}
			bind:value={account}
		/>
	{/snippet}
</Story>

<!-- Muted text with a caret, for a filter tucked into a header. -->
<Story name="Ghost">
	{#snippet template()}
		<Select
			label="Show the account as"
			variant="ghost"
			options={[
				{ value: 'now', label: 'Updated today' },
				{ value: 'august', label: 'As August ended' },
				{ value: 'july', label: 'As July ended' }
			]}
			bind:value={month}
		/>
	{/snippet}
</Story>
