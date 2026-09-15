<script module lang="ts">
	import MovingArrowRight from '@jis3r/icons/icons/arrow-right';
	import MovingHandCoins from '@jis3r/icons/icons/hand-coins';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AnimatedIcon from './AnimatedIcon.svelte';
	import IconButton from './IconButton.svelte';
	import PillButton from './PillButton.svelte';

	const { Story } = defineMeta({
		title: 'UI/AnimatedIcon',
		component: AnimatedIcon,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let held = $state(false);
</script>

<!-- It plays while its nearest control is hovered or focused, never on the glyph alone. -->
<Story name="With its control">
	{#snippet template()}
		<IconButton dashed aria-label="Go to transactions">
			<AnimatedIcon icon={MovingArrowRight} set="moving" />
		</IconButton>
	{/snippet}
</Story>

<!-- Once, as it appears: a card's emblem. -->
<Story name="Once, on mount">
	{#snippet template()}
		<div
			class="grid size-11 place-items-center rounded-full border border-dashed border-hairline text-fg-subtle"
		>
			<AnimatedIcon
				icon={MovingHandCoins}
				set="moving"
				size={18}
				strokeWidth={1.5}
				trigger="mount"
			/>
		</div>
	{/snippet}
</Story>

<!-- Held from outside: a gear while its popover is open. -->
<Story name="Held">
	{#snippet template()}
		<PillButton aria-pressed={held} onclick={() => (held = !held)}>
			<AnimatedIcon icon={MovingHandCoins} set="moving" trigger="none" play={held} />
			{held ? 'Playing' : 'Still'}
		</PillButton>
	{/snippet}
</Story>
