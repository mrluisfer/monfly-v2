<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import OverflowText from './OverflowText.svelte';

	const { Story } = defineMeta({
		title: 'UI/OverflowText',
		component: OverflowText,
		tags: ['autodocs'],
		args: {
			text: 'Groceries for the week, and the birthday cake we ordered for Saturday',
			class: 'text-[0.9375rem] text-fg-muted'
		}
	});
</script>

<!-- Point at it: after a beat it slides to its last word, and back when let go. -->
<Story name="Too long for its column">
	{#snippet template(args)}
		<div class="w-56">
			<OverflowText {...args} />
		</div>
	{/snippet}
</Story>

<!-- Text that fits holds still. -->
<Story name="Fits" args={{ text: 'Groceries' }}>
	{#snippet template(args)}
		<div class="w-56">
			<OverflowText {...args} />
		</div>
	{/snippet}
</Story>

<!-- In a control, its keyboard focus reads it too. -->
<Story name="In a button">
	{#snippet template(args)}
		<button
			type="button"
			class="block max-w-56 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
		>
			<OverflowText {...args} />
		</button>
	{/snippet}
</Story>
