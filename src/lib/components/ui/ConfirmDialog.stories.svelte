<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import PillButton from './PillButton.svelte';

	const { Story } = defineMeta({
		title: 'UI/ConfirmDialog',
		component: ConfirmDialog,
		tags: ['autodocs'],
		args: {
			title: 'Delete this transaction?',
			description: 'It leaves the ledger, and every balance it moved moves back.',
			action: 'Delete',
			tone: 'danger',
			pending: false,
			error: null
		},
		argTypes: { tone: { control: 'inline-radio', options: ['danger', 'plain'] } }
	});
</script>

<script lang="ts">
	let open = $state(false);
</script>

<!-- What the question is about sits in a sunken block under it. -->
<Story name="Delete">
	{#snippet template(args)}
		<PillButton onclick={() => (open = true)}>Delete…</PillButton>
		<ConfirmDialog
			title={args.title}
			description={args.description}
			action={args.action}
			tone={args.tone}
			pending={args.pending}
			error={args.error}
			{open}
			onOpenChange={(next) => (open = next)}
			onConfirm={() => (open = false)}
		>
			<p class="tabular text-[0.9375rem]">−$263.94 · Retiro</p>
		</ConfirmDialog>
	{/snippet}
</Story>

<Story name="Refused" args={{ error: 'The server refused: try again in a moment.' }}>
	{#snippet template(args)}
		<PillButton onclick={() => (open = true)}>Delete…</PillButton>
		<ConfirmDialog
			title={args.title}
			description={args.description}
			action={args.action}
			tone={args.tone}
			pending={args.pending}
			error={args.error}
			{open}
			onOpenChange={(next) => (open = next)}
			onConfirm={() => {}}
		>
			<p class="tabular text-[0.9375rem]">−$263.94 · Retiro</p>
		</ConfirmDialog>
	{/snippet}
</Story>
