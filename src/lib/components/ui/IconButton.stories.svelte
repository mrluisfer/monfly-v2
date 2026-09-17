<script module lang="ts">
	import MovingChevronsUp from '@jis3r/icons/icons/chevrons-up';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Plus from '@lucide/svelte/icons/plus';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AnimatedIcon from './AnimatedIcon.svelte';
	import IconButton from './IconButton.svelte';

	const { Story } = defineMeta({
		title: 'UI/IconButton',
		component: IconButton,
		tags: ['autodocs'],
		args: { size: 'md', dashed: false, disabled: false },
		argTypes: { size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] } }
	});
</script>

<!-- Its glyph is its children, so the args go on one by one rather than spread. -->

<!-- Solid rims act. -->
<Story name="Action">
	{#snippet template(args)}
		<IconButton size={args.size} dashed={args.dashed} disabled={args.disabled} aria-label="Add">
			<Plus />
		</IconButton>
	{/snippet}
</Story>

<!-- Dashed rims go somewhere. -->
<Story name="Navigation" args={{ dashed: true }}>
	{#snippet template(args)}
		<IconButton size={args.size} dashed={args.dashed} disabled={args.disabled} aria-label="Back">
			<ArrowLeft />
		</IconButton>
	{/snippet}
</Story>

<!-- Nowhere to go: the rim turns to dashes and the glyph steps back. -->
<Story name="Disabled" args={{ dashed: true, disabled: true }}>
	{#snippet template(args)}
		<IconButton size={args.size} dashed={args.dashed} disabled={args.disabled} aria-label="Back">
			<ArrowLeft />
		</IconButton>
	{/snippet}
</Story>

<!-- Dashed until you reach for it, then the solid rim comes back: the exchange
     the disabled state makes, run the other way. Hover it or tab to it. -->
<Story name="Firms up on hover" args={{ dashed: 'until-hover' }}>
	{#snippet template(args)}
		<IconButton
			size={args.size}
			dashed={args.dashed}
			disabled={args.disabled}
			aria-label="Back to top"
		>
			<AnimatedIcon icon={MovingChevronsUp} set="moving" />
		</IconButton>
	{/snippet}
</Story>
