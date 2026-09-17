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

<!-- A surface that reads rather than acts still plays its glyph: `data-icon-host`. -->
<Story name="On a host that isn't a control">
	{#snippet template()}
		<ul class="flex gap-2">
			<li
				data-icon-host
				class="flex h-11 items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pr-4 pl-1.5"
			>
				<span class="grid size-8 place-items-center rounded-full bg-sunken text-fg-muted">
					<AnimatedIcon icon={MovingHandCoins} set="moving" />
				</span>
				<span class="text-sm text-fg-muted">Kept</span>
				<span class="text-sm font-medium">7% of income</span>
			</li>
		</ul>
	{/snippet}
</Story>

<!-- Once, as it arrives: a card's emblem down a page you scroll. -->
<Story name="Once, on arriving">
	{#snippet template()}
		<div class="grid gap-4">
			<p class="text-sm text-fg-muted">Scroll down — it plays as it comes into view.</p>
			<div class="h-[120vh]"></div>
			<div
				class="grid size-11 place-items-center rounded-full border border-dashed border-hairline text-fg-subtle"
			>
				<AnimatedIcon
					icon={MovingHandCoins}
					set="moving"
					size={18}
					strokeWidth={1.5}
					trigger="visible"
				/>
			</div>
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
