<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Notice from './Notice.svelte';
	import { PALETTE_COLORS } from './palette';

	const { Story } = defineMeta({
		title: 'UI/Notice',
		component: Notice,
		tags: ['autodocs'],
		parameters: { layout: 'padded' },
		args: { id: 'storybook-notice', title: 'Adding a transaction', color: 'sky' },
		argTypes: { color: { control: 'select', options: PALETTE_COLORS } }
	});
</script>

<!-- Put away, it stays away in this browser: change the id to bring it back. -->
<Story name="Default">
	{#snippet template(args)}
		<div class="w-[26rem] max-w-full">
			<Notice id={args.id} title={args.title} color={args.color}>
				What it was worth, what it was for, and the day it happened. It joins the ledger below, and
				the account you name takes it into its balance.
			</Notice>
		</div>
	{/snippet}
</Story>
