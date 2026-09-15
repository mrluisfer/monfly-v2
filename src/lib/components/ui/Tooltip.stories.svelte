<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PillButton from './PillButton.svelte';
	import Tooltip from './Tooltip.svelte';

	const { Story } = defineMeta({
		title: 'UI/Tooltip',
		component: Tooltip,
		tags: ['autodocs'],
		args: { label: 'Go to Transactions', side: 'top', delay: 0 },
		argTypes: { side: { control: 'inline-radio', options: ['top', 'right', 'bottom', 'left'] } }
	});
</script>

<!-- bits-ui renders no wrapper: the trigger's props go onto your own control, first. -->
<Story name="Label">
	{#snippet template(args)}
		<Tooltip {...args}>
			{#snippet children({ props })}
				<PillButton {...props}>Point at me</PillButton>
			{/snippet}
		</Tooltip>
	{/snippet}
</Story>

<Story name="Rich content" args={{ label: undefined }}>
	{#snippet template(args)}
		<Tooltip {...args} class="px-3 py-2.5">
			{#snippet content()}
				<div class="grid w-44 gap-2 font-normal">
					<p class="font-medium">August</p>
					<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
						<dt class="text-fg-muted">Income</dt>
						<dd class="tabular text-right">$29,512.00</dd>
						<dt class="text-fg-muted">Entries</dt>
						<dd class="tabular text-right">14</dd>
					</dl>
				</div>
			{/snippet}
			{#snippet children({ props })}
				<PillButton {...props}>August</PillButton>
			{/snippet}
		</Tooltip>
	{/snippet}
</Story>
