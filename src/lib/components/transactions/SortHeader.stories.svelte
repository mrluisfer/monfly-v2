<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SortHeader from './SortHeader.svelte';

	const { Story } = defineMeta({
		title: 'Transactions/SortHeader',
		component: SortHeader,
		tags: ['autodocs']
	});

	type Column = 'category' | 'amount' | 'date';
</script>

<script lang="ts">
	let sort = $state<{ id: Column; desc: boolean }>({ id: 'date', desc: true });

	// The column in force turns over; a new one starts the way it reads best.
	function order(id: Column) {
		sort = sort.id === id ? { id, desc: !sort.desc } : { id, desc: id !== 'category' };
	}
</script>

<!-- Press a label: one arrow turns over, quiet until its column is the one. -->
<Story name="A table's header">
	{#snippet template()}
		<div
			class="grid w-[28rem] grid-cols-[1fr_auto_auto] gap-x-6 border-b border-line pb-2 text-sm font-medium text-fg-muted"
		>
			<span>
				<SortHeader
					label="Category"
					sort={sort.id === 'category' ? sort : undefined}
					onclick={() => order('category')}
				/>
			</span>
			<span class="text-right">
				<SortHeader
					label="Amount"
					align="right"
					sort={sort.id === 'amount' ? sort : undefined}
					onclick={() => order('amount')}
				/>
			</span>
			<span>
				<SortHeader
					label="Date"
					sort={sort.id === 'date' ? sort : undefined}
					onclick={() => order('date')}
				/>
			</span>
		</div>
	{/snippet}
</Story>
