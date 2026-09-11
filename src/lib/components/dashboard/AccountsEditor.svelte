<script lang="ts">
	import Pencil from '@lucide/svelte/icons/pencil';
	import { Popover } from 'bits-ui';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { featuredAccounts, type Account, type AccountRole } from '$lib/accounts';
	import { IconButton, Select } from '$lib/components/ui';
	import { setAccountRoleMutation } from '$lib/queries';
	import { pop } from '$lib/transitions';

	/** The pencil in the Accounts header: picks which accounts are main and secondary. */
	let { accounts }: { accounts: Account[] } = $props();

	const queryClient = useQueryClient();
	const mutation = createMutation(() => setAccountRoleMutation(queryClient));

	const options = $derived(accounts.map((a) => ({ value: a.id, label: a.name })));
	// What each slot shows right now, chosen or by default.
	const featured = $derived(featuredAccounts(accounts));

	function assign(role: AccountRole, id: string) {
		mutation.mutate({ id, role });
	}
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<IconButton size="sm" {...props} aria-label="Choose the main and secondary accounts">
				<Pencil />
			</IconButton>
		{/snippet}
	</Popover.Trigger>
	<Popover.Portal>
		<!-- Same surface and presence as every floating layer. -->
		<Popover.Content side="bottom" align="end" sideOffset={10} forceMount>
			{#snippet child({ props, wrapperProps, open })}
				{#if open}
					<div {...wrapperProps}>
						<div
							{...props}
							in:pop
							out:pop
							class="z-50 w-[min(19rem,calc(100vw-2rem))] origin-(--bits-floating-transform-origin) rounded-[var(--radius-chip)] border border-line bg-card p-4 shadow-lg outline-none"
						>
							<p class="text-sm font-medium">Featured accounts</p>
							<p class="mt-1 text-xs text-fg-muted">
								Unset, they're your two oldest accounts, in the order you added them.
							</p>

							{#if accounts.length === 0}
								<p class="mt-4 text-sm text-fg-muted">No accounts yet.</p>
							{:else}
								<div class="mt-4 grid gap-3">
									<div class="flex items-center justify-between gap-4">
										<span class="text-sm text-fg-muted">Main</span>
										<Select
											label="Main account"
											{options}
											value={featured[0]?.id ?? ''}
											onValueChange={(id) => assign('main', id)}
										/>
									</div>
									{#if accounts.length > 1}
										<div class="flex items-center justify-between gap-4">
											<span class="text-sm text-fg-muted">Secondary</span>
											<Select
												label="Secondary account"
												{options}
												value={featured[1]?.id ?? ''}
												onValueChange={(id) => assign('secondary', id)}
											/>
										</div>
									{/if}
								</div>
							{/if}

							{#if mutation.error}
								<p class="mt-3 text-xs text-negative" role="alert">
									Couldn't save that: {mutation.error.message}
								</p>
							{/if}
						</div>
					</div>
				{/if}
			{/snippet}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
