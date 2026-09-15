<script module lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Badge from './Badge.svelte';
	import PillButton from './PillButton.svelte';

	const { Story } = defineMeta({
		title: 'UI/Badge',
		component: Badge,
		tags: ['autodocs'],
		args: { tone: 'positive' },
		argTypes: { tone: { control: 'inline-radio', options: ['positive', 'negative', 'neutral'] } }
	});
</script>

<script lang="ts">
	let updates = $state(1);
</script>

<!-- The words are sibling elements, so each comes in on its own. -->
<Story name="Something done">
	{#snippet template(args)}
		<Badge tone={args.tone}>
			{#snippet icon()}<Check />{/snippet}
			<span class="tabular">3 transactions</span>
			<span class="font-normal opacity-80">given to</span>
			<span>NU</span>
		</Badge>
	{/snippet}
</Story>

<Story name="Something refused" args={{ tone: 'negative' }}>
	{#snippet template(args)}
		<Badge tone={args.tone}>
			{#snippet icon()}<X />{/snippet}
			<span>Couldn't give them an account</span>
		</Badge>
	{/snippet}
</Story>

<!-- A new burst updates the badge in place rather than adding a second one. -->
<Story name="Updated in place">
	{#snippet template(args)}
		<div class="flex flex-col items-start gap-4">
			<Badge tone={args.tone} burst={updates}>
				{#snippet icon()}<Check />{/snippet}
				<span class="tabular">{updates}</span>
				<span class="font-normal opacity-80">{updates === 1 ? 'update' : 'updates'}</span>
			</Badge>
			<PillButton size="sm" onclick={() => updates++}>Another one</PillButton>
		</div>
	{/snippet}
</Story>
