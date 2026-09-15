<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Switch from './Switch.svelte';

	const { Story } = defineMeta({
		title: 'UI/Switch',
		component: Switch,
		tags: ['autodocs'],
		args: { checked: true, disabled: false, label: 'Amounts over bars' }
	});
</script>

<Story name="Default" />

<!-- Named by a visible label, as the Income card's settings are. -->
<Story name="With a label">
	{#snippet template(args)}
		<div class="flex w-72 items-center justify-between gap-4">
			<label for="upcoming" class="text-[0.9375rem]">Still to come</label>
			<Switch {...args} id="upcoming" label={undefined} />
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }} />
