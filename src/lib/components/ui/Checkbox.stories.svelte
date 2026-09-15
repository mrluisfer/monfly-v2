<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Checkbox from './Checkbox.svelte';

	const { Story } = defineMeta({
		title: 'UI/Checkbox',
		component: Checkbox,
		tags: ['autodocs'],
		args: { checked: true, indeterminate: false, disabled: false, label: 'Pick this row' }
	});
</script>

<Story name="Checked" />

<Story name="Unchecked" args={{ checked: false }} />

<!-- Some, not all, of what it stands for: a dash. -->
<Story name="Some of them" args={{ checked: false, indeterminate: true }} />

<Story name="With a label">
	{#snippet template(args)}
		<div class="flex items-center gap-3">
			<Checkbox {...args} id="counted" label={undefined} />
			<label for="counted" class="text-[0.9375rem]">Counted in your total</label>
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }} />
