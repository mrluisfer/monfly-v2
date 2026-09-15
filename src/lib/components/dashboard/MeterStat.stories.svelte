<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import MeterStat from './MeterStat.svelte';

	const { Story } = defineMeta({
		title: 'Dashboard/MeterStat',
		component: MeterStat,
		tags: ['autodocs'],
		parameters: { layout: 'padded' },
		args: {
			label: 'Spent this month',
			total: '$1,340.00',
			value: 0.27,
			start: { value: '$1,340.00', label: 'Spent' },
			end: { value: '$5,000.00', label: 'Monthly budget' },
			color: 'lime',
			valueText: '27% of the monthly budget',
			pending: false
		},
		argTypes: {
			value: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
			color: { control: 'inline-radio', options: ['lime', 'blue', 'violet'] }
		}
	});
</script>

<Story name="Budget">
	{#snippet template(args)}
		<div class="w-96">
			<MeterStat {...args} />
		</div>
	{/snippet}
</Story>

<!-- The figures pulse while they load. -->
<Story name="Loading" args={{ pending: true }}>
	{#snippet template(args)}
		<div class="w-96">
			<MeterStat {...args} />
		</div>
	{/snippet}
</Story>
