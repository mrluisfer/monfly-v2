<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Meter from './Meter.svelte';

	const { Story } = defineMeta({
		title: 'UI/Meter',
		component: Meter,
		tags: ['autodocs'],
		args: {
			value: 0.27,
			color: 'lime',
			label: 'Spent this month',
			valueText: '27% of the monthly budget',
			class: 'w-80'
		},
		argTypes: {
			value: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
			color: { control: 'inline-radio', options: ['lime', 'blue', 'violet'] }
		}
	});
</script>

<Story name="Default" />

<Story name="Nearly full" args={{ value: 0.86, color: 'violet' }} />

<!-- Details make it focusable, and point at the fill's end. -->
<Story name="With details">
	{#snippet template(args)}
		<Meter {...args}>
			{#snippet details()}
				<p class="tabular">$1,340.00 of $5,000.00</p>
			{/snippet}
		</Meter>
	{/snippet}
</Story>
