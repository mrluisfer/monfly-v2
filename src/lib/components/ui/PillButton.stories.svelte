<script module lang="ts">
	import MovingFileText from '@jis3r/icons/icons/file-text';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AnimatedIcon from './AnimatedIcon.svelte';
	import PillButton from './PillButton.svelte';

	const { Story } = defineMeta({
		title: 'UI/PillButton',
		component: PillButton,
		tags: ['autodocs'],
		args: { size: 'md', caret: false, dashed: false, disabled: false },
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

<!-- Dashed marks navigation, as it does on `IconButton`: this one goes down the
     page to the statement rather than doing anything. Its glyph plays with it. -->
<Story name="Navigation" args={{ dashed: true }}>
	{#snippet template(args)}
		<PillButton size={args.size} dashed={args.dashed} disabled={args.disabled}>
			<AnimatedIcon icon={MovingFileText} set="moving" />
			See my CSV
		</PillButton>
	{/snippet}
</Story>
