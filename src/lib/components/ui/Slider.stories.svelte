<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Slider from './Slider.svelte';

	const { Story } = defineMeta({
		title: 'UI/Slider',
		component: Slider,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let share = $state(40);
	let change = $state(-20);

	const signed = (n: number) => (n === 0 ? 'No change' : `${n > 0 ? '+' : '−'}${Math.abs(n)}%`);
</script>

<!-- A plain fill from the left, in the brand blue. -->
<Story name="From the left">
	{#snippet template()}
		<div class="grid w-72 gap-2">
			<Slider label="Share" bind:value={share} valueText="{share}%" />
			<p class="tabular text-sm text-fg-muted">{share}%</p>
		</div>
	{/snippet}
</Story>

<!-- A change either way: the fill runs from "no change" to the thumb. -->
<Story name="Either way">
	{#snippet template()}
		<div class="grid w-72 gap-2">
			<Slider
				label="Change"
				min={-100}
				max={50}
				step={5}
				origin={0}
				color="violet"
				bind:value={change}
				valueText={signed(change)}
			/>
			<p class="tabular text-sm text-fg-muted">{signed(change)}</p>
		</div>
	{/snippet}
</Story>
