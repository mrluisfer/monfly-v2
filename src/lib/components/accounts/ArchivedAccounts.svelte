<script lang="ts">
	import ColorArchiveRestore from '@animated-color-icons/lucide-svelte/ArchiveRestore.svelte';
	import MovingTrash from '@jis3r/icons/icons/trash-2';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import type { ArchivedAccount } from '$lib/accounts';
	import { AnimatedIcon, Card, ConfirmDialog, IconButton, PillButton } from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import { deleteAccountMutation, setAccountStatusMutation } from '$lib/queries';
	import { formatAge } from '$lib/utils/time';

	/**
	 * Accounts put away: off the dashboard, the chart and every account list,
	 * and still here to bring back or delete for good. v1 archives the same
	 * way, so an account archived there turns up here too.
	 */
	type Props = {
		accounts: ArchivedAccount[];
		currency: Currency;
		class?: string;
	};

	let { accounts, currency, class: className }: Props = $props();

	const queryClient = useQueryClient();
	const restore = createMutation(() => setAccountStatusMutation(queryClient));
	const remove = createMutation(() => deleteAccountMutation(queryClient));

	/** The account the delete question is about. */
	let asking = $state<ArchivedAccount | null>(null);

	const money = (cents: number) => formatMoney(cents, currency);
</script>

<Card class={className}>
	<div class="flex items-baseline justify-between gap-4 px-7 pt-7">
		<h2 class="font-display text-2xl font-medium">Archived</h2>
		<p class="tabular text-sm text-fg-muted">{accounts.length}</p>
	</div>
	<p class="mt-1.5 px-7 text-[0.9375rem] text-fg-muted">
		Put away, with their balances as they were left. Restore one to bring it back everywhere.
	</p>

	<ul class="mt-4 px-4 pb-4">
		{#each accounts as account (account.id)}
			<li transition:slide={{ duration: 280, easing: quintOut }}>
				<div
					class="flex items-center gap-4 rounded-lg px-3 py-3 transition-colors duration-150 hover:bg-sunken"
				>
					<!-- No colour of its own while it's away: a hatched ring where its orb would be. -->
					<span class="hatch size-7 shrink-0 rounded-full border border-hairline" aria-hidden="true"
					></span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-[0.9375rem]">{account.name}</p>
						<p class="tabular truncate text-xs text-fg-muted">
							{[
								account.provider,
								account.last4 && `•••• ${account.last4}`,
								`archived ${formatAge(account.updatedAt)}`
							]
								.filter(Boolean)
								.join(' · ')}
						</p>
					</div>
					<span class="tabular shrink-0 text-[0.9375rem] text-fg-muted"
						>{money(account.balance)}</span
					>
					<PillButton
						size="sm"
						disabled={restore.isPending && restore.variables?.id === account.id}
						onclick={() => restore.mutate({ id: account.id, status: 'active' })}
					>
						<AnimatedIcon icon={ColorArchiveRestore} set="color" />
						Restore
					</PillButton>
					<IconButton
						size="sm"
						aria-label="Delete {account.name}"
						class="hover:text-negative"
						onclick={() => (asking = account)}
					>
						<AnimatedIcon icon={MovingTrash} set="moving" />
					</IconButton>
				</div>
			</li>
		{/each}
	</ul>

	{#if restore.isError}
		<p class="px-7 pb-6 text-sm text-negative" role="alert">Couldn’t restore it. Try again.</p>
	{/if}
</Card>

<ConfirmDialog
	open={asking !== null}
	onOpenChange={(next) => {
		if (!next) {
			asking = null;
			remove.reset();
		}
	}}
	title="Delete this account?"
	description="It's gone for good. Its transactions stay in the ledger with no account, still counted in your total; a balance set by hand leaves the total with it."
	action="Delete"
	pending={remove.isPending}
	error={remove.isError ? 'Couldn’t delete it. Try again.' : null}
	onConfirm={() => asking && remove.mutate(asking.id, { onSuccess: () => (asking = null) })}
>
	{#if asking}
		<div class="flex items-center justify-between gap-4">
			<span class="min-w-0 truncate text-[0.9375rem]">{asking.name}</span>
			<span class="tabular text-[0.9375rem] whitespace-nowrap">{money(asking.balance)}</span>
		</div>
	{/if}
</ConfirmDialog>
