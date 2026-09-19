<script lang="ts">
	import ColorExternalLink from '@animated-color-icons/lucide-svelte/ExternalLink.svelte';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { accountColors, featuredAccounts } from '$lib/accounts';
	import { AccountsTotal } from '$lib/components/accounts';
	import { AnimatedIcon, Card, IconButton } from '$lib/components/ui';
	import { accountsQuery, colorChoicesQuery, setColorMutation } from '$lib/queries';
	import AccountBlock from './AccountBlock.svelte';
	import AccountsEditor from './AccountsEditor.svelte';

	/**
	 * The accounts column: an overview card — the header, every account's
	 * total, this month's movement and a share bar — then the two featured
	 * accounts, main and secondary as the person set them (the chevrons) or the
	 * two oldest, splitting the rest of the column 50/50. Each account has one
	 * colour everywhere — orb, sparkle, slice — from User.colors, main starting
	 * lime and secondary blue; money that never got an account joins the total
	 * as one neutral line instead. The page prefetches the accounts during SSR.
	 */
	type Props = {
		/** The viewer's zone: it decides which months have passed. */
		timeZone: string;
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
		/** What this browser leaves out of the total, as the server read it from its cookie. */
		leftOut?: string[];
	};

	let { timeZone, enabled = true, leftOut = [] }: Props = $props();

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
	const colorById = $derived(accountColors(list?.accounts ?? [], choices.data?.account));
</script>

{#snippet block(i: number)}
	{@const account = featured[i]}
	{#if account && list}
		<AccountBlock
			{account}
			currency={list.currency}
			{timeZone}
			color={colorById[account.id]}
			onColorChange={(color) => recolor.mutate({ kind: 'account', key: account.id, color })}
			colorError={refused === account.id ? "Couldn't save this color. Try again." : undefined}
		/>
	{:else if list}
		<p class="p-7 text-[0.9375rem] text-fg-muted">
			{i === 0 ? 'Add an account to see it here.' : 'A second account shows here once you add one.'}
		</p>
	{/if}
{/snippet}

<!-- Overview: its own height, on top -->
<Card class="shrink-0 p-7">
	<div class="flex items-center justify-between gap-4">
		<h2 class="font-display text-2xl font-medium">Accounts</h2>
		<div class="flex gap-2">
			<AccountsEditor accounts={list?.accounts ?? []} />
			<IconButton size="sm" href="/cards" aria-label="Open accounts"
				><AnimatedIcon icon={ColorExternalLink} set="color" /></IconButton
			>
		</div>
	</div>
	<!-- Card-less money is reason enough to draw the total: with no accounts at
	     all it is the whole of what there is to show. -->
	{#if list && (list.accounts.length > 0 || list.unassigned)}
		<AccountsTotal
			accounts={list.accounts}
			unassigned={list.unassigned}
			colors={colorById}
			currency={list.currency}
			{leftOut}
			class="mt-5"
		/>
	{:else if list}
		<p class="mt-4 text-[0.9375rem] text-fg-muted">No accounts yet.</p>
	{/if}
</Card>

<!-- flex-1 on a zero basis: the two accounts split what's left evenly, whatever each holds. -->
<Card class="flex flex-1 basis-0 flex-col">
	{@render block(0)}
</Card>

<Card class="flex flex-1 basis-0 flex-col">
	{@render block(1)}
</Card>
