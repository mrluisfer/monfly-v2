<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PillButton from './PillButton.svelte';

	const { Story } = defineMeta({
		title: 'UI/PillButton',
		component: PillButton,
		tags: ['autodocs'],
		args: { size: 'md', caret: false, disabled: false },
		argTypes: { size: { control: 'inline-radio', options: ['sm', 'md'] } }
	});
</script>

<!-- Its words are its children, so the args go on one by one rather than spread. -->

<Story name="Text action">
	{#snippet template(args)}
		<PillButton size={args.size} caret={args.caret} disabled={args.disabled}>
			Clear filters
		</PillButton>
	{/snippet}
</Story>

<!-- A dropdown-style picker: the caret flips while its list is open. -->
<Story name="Picker" args={{ caret: true }}>
	{#snippet template(args)}
		<PillButton size={args.size} caret={args.caret} disabled={args.disabled}>
			This quarter
		</PillButton>
	{/snippet}
</Story>

<Story name="Small" args={{ size: 'sm' }}>
	{#snippet template(args)}
		<PillButton size={args.size} caret={args.caret} disabled={args.disabled}>Pick all</PillButton>
	{/snippet}
</Story>
