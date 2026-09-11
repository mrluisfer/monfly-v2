<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { featuredAccounts } from '$lib/accounts';
	import { assignColors } from '$lib/colors';
	import { Card, IconButton } from '$lib/components/ui';
	import { accountsQuery, colorChoicesQuery, setColorMutation } from '$lib/queries';
	import AccountBlock from './AccountBlock.svelte';
	import AccountsEditor from './AccountsEditor.svelte';

	/**
	 * The dashboard's two featured accounts — main and secondary as the person
	 * set them (the pencil), else the two oldest — as two cards that split the
	 * grid column 50/50. Each block filters by month on its own; each balance
	 * orb recolours its account (User.colors), main starting lime and secondary
	 * blue, as the mockup had them. The page prefetches the accounts during SSR.
	 */
	type Props = {
		/** The viewer's zone: it decides which months have passed. */
		timeZone: string;
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
	};

	let { timeZone, enabled = true }: Props = $props();

	const query = createQuery(() => ({ ...accountsQuery(), enabled: browser && enabled }));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled: browser && enabled }));

	// Read the client during setup: Svelte context is out of reach from the
	// mutation's lazily evaluated options.
	const queryClient = useQueryClient();
	const recolor = createMutation(() => setColorMutation(queryClient));
	const refused = $derived(
		recolor.isError && recolor.variables?.kind === 'account' ? recolor.variables.key : undefined
	);

	const list = $derived(query.data);
	const featured = $derived(list ? featuredAccounts(list.accounts) : []);
	const colors = $derived(
		assignColors(
			featured.map((a) => a.id),
			choices.data?.account,
			['lime', 'blue']
		)
	);
</script>

{#snippet block(i: number)}
	{@const account = featured[i]}
	{#if account && list}
		<AccountBlock
			{account}
			currency={list.currency}
			{timeZone}
			color={colors[i]}
			onColorChange={(color) => recolor.mutate({ kind: 'account', key: account.id, color })}
			colorError={refused === account.id ? "Couldn't save this color. Try again." : undefined}
		/>
	{:else}
		<p class="p-7 text-[0.9375rem] text-fg-muted">
			{list ? (i === 0 ? 'No accounts yet.' : 'A second account shows here once you add one.') : ''}
		</p>
	{/if}
{/snippet}

<!-- flex-1 on a zero basis: the two cards split the column evenly, whatever each holds. -->
<Card class="flex flex-1 basis-0 flex-col">
	<div class="flex items-center justify-between gap-4 px-7 pt-7">
		<h2 class="font-display text-2xl font-medium">Accounts</h2>
		<div class="flex gap-2">
			<AccountsEditor accounts={list?.accounts ?? []} />
			<IconButton size="sm" href="/cards" aria-label="Open accounts"><ExternalLink /></IconButton>
		</div>
	</div>
	{@render block(0)}
</Card>

<Card class="flex flex-1 basis-0 flex-col">
	{@render block(1)}
</Card>
