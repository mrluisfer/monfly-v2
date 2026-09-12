<script lang="ts">
	import Pencil from '@lucide/svelte/icons/pencil';
	import Target from '@lucide/svelte/icons/target';
	import { Popover } from 'bits-ui';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { IconButton, PillButton, Select } from '$lib/components/ui';
	import {
		MAX_GOAL,
		currencySymbol,
		formatMoney,
		isSavingsAmount,
		parseMoney,
		toMoneyInput,
		type Cents,
		type Savings
	} from '$lib/finance';
	import {
		accountsQuery,
		addSavingsMutation,
		setAccountRoleMutation,
		setSavingsGoalMutation
	} from '$lib/queries';
	import { pop } from '$lib/transitions';

	/**
	 * The pencil beside the savings figure: it sets what someone plans to put
	 * away, and — once there is a goal — puts more in. Two forms rather than
	 * one, because they answer different questions: what am I aiming at, and
	 * what did I just save.
	 */
	type Props = { savings: Savings };

	let { savings }: Props = $props();

	const uid = $props.id();
	const queryClient = useQueryClient();
	const goalMutation = createMutation(() => setSavingsGoalMutation(queryClient));
	const addMutation = createMutation(() => addSavingsMutation(queryClient));
	const roleMutation = createMutation(() => setAccountRoleMutation(queryClient));
	const accounts = createQuery(() => ({ ...accountsQuery(), enabled: browser }));

	const all = $derived(accounts.data?.accounts ?? []);
	/** Money has to come from somewhere else: the savings account can't pay itself. */
	const sources = $derived(all.filter((a) => a.id !== savings.account?.id));

	let open = $state(false);
	let goalDraft = $state('');
	let addDraft = $state('');
	let source = $state('');
	let problem = $state<string | null>(null);

	const failed = $derived(goalMutation.error ?? addMutation.error);
	const message = $derived(problem ?? (failed ? `Couldn't save: ${failed.message}` : null));
	const busy = $derived(goalMutation.isPending || addMutation.isPending || roleMutation.isPending);

	function reset() {
		goalDraft = savings.goal === null ? '' : toMoneyInput(savings.goal);
		addDraft = '';
		source = sources[0]?.id ?? '';
		problem = null;
		goalMutation.reset();
		addMutation.reset();
	}

	/** Reads a money field, naming what's wrong with it rather than failing quietly. */
	function read(draft: string, what: string): Cents | null {
		const amount = parseMoney(draft);
		if (amount === null) {
			problem = `Enter an amount, like 7,540.`;
			return null;
		}
		if (amount <= 0) {
			problem = `The ${what} has to be more than zero.`;
			return null;
		}
		if (!isSavingsAmount(amount)) {
			problem = `The most it can be is ${formatMoney(MAX_GOAL, savings.currency)}.`;
			return null;
		}
		problem = null;
		return amount;
	}

	function submitGoal(event: SubmitEvent) {
		event.preventDefault();
		const goal = read(goalDraft, 'goal');
		if (goal !== null) goalMutation.mutate(goal, { onSuccess: () => (open = false) });
	}

	function submitAdd(event: SubmitEvent) {
		event.preventDefault();
		const amount = read(addDraft, 'amount');
		if (amount === null) return;
		// Linked, the money has to leave an account; otherwise it just joins the pot.
		if (savings.account && source === '') {
			problem = 'Choose the account the money comes from.';
			return;
		}
		addMutation.mutate(
			{ amount, from: savings.account ? source : undefined },
			{ onSuccess: () => (open = false) }
		);
	}
</script>

<Popover.Root
	bind:open
	onOpenChange={(next) => {
		if (next) reset();
	}}
>
	<Popover.Trigger>
		{#snippet child({ props })}
			<IconButton
				size="sm"
				{...props}
				aria-label={savings.goal === null ? 'Set savings goal' : 'Edit savings goal'}
			>
				<Pencil />
			</IconButton>
		{/snippet}
	</Popover.Trigger>
	<Popover.Portal>
		<!-- Same entrance and exit as the tooltips: forceMount hands mounting to the {#if}. -->
		<Popover.Content side="bottom" align="end" sideOffset={10} forceMount>
			{#snippet child({ props, wrapperProps, open: shown })}
				{#if shown}
					<div {...wrapperProps}>
						<div
							{...props}
							in:pop
							out:pop
							class="z-50 w-[min(20rem,calc(100vw-2rem))] origin-(--bits-floating-transform-origin) rounded-[var(--radius-chip)] border border-line bg-card p-4 shadow-lg"
						>
							<form class="flex flex-col gap-3" novalidate onsubmit={submitGoal}>
								<div class="flex items-start gap-3">
									<!-- Blue, like the meter it sets. -->
									<span
										class="grid size-7 shrink-0 place-items-center rounded-lg bg-blue/12 text-blue"
									>
										<Target class="size-4 stroke-[1.75]" />
									</span>
									<div class="min-w-0">
										<label for="{uid}-goal" class="block text-sm font-medium">Savings goal</label>
										<p class="text-xs text-fg-muted">
											What you plan to put away, counting every month.
										</p>
									</div>
								</div>
								<div
									class="flex h-11 items-center gap-2 rounded-full border border-hairline px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue"
								>
									<span class="text-fg-muted" aria-hidden="true"
										>{currencySymbol(savings.currency)}</span
									>
									<input
										id="{uid}-goal"
										bind:value={goalDraft}
										inputmode="decimal"
										autocomplete="off"
										placeholder="0"
										aria-invalid={problem !== null}
										aria-describedby={message ? `${uid}-message` : undefined}
										class="tabular min-w-0 flex-1 bg-transparent font-display text-lg outline-none placeholder:text-fg-subtle"
									/>
									<span class="text-sm text-fg-subtle">{savings.currency}</span>
								</div>
								<div class="flex items-center justify-between gap-3">
									{#if savings.goal !== null}
										<button
											type="button"
											class="text-sm text-fg-muted underline-offset-2 hover:underline disabled:opacity-50"
											disabled={busy}
											onclick={() => goalMutation.mutate(null, { onSuccess: () => (open = false) })}
											>Remove goal</button
										>
									{:else}
										<span></span>
									{/if}
									<PillButton type="submit" size="sm" disabled={busy}>
										{goalMutation.isPending ? 'Saving…' : 'Save'}
									</PillButton>
								</div>
							</form>

							{#if all.length > 0}
								<!-- Linking makes the account the truth: what it holds is what's saved. -->
								<div class="mt-4 border-t border-line pt-4">
									<div class="flex items-center justify-between gap-4">
										<div class="min-w-0">
											<p class="text-sm font-medium">Saved in</p>
											<p class="text-xs text-fg-muted">
												{savings.account
													? "Its balance is what's saved."
													: 'Link an account to count what it holds.'}
											</p>
										</div>
										<Select
											label="Savings account"
											options={all.map((a) => ({ value: a.id, label: a.name }))}
											value={savings.account?.id ?? ''}
											onValueChange={(id) => roleMutation.mutate({ id, role: 'savings' })}
										/>
									</div>
									{#if savings.account}
										<button
											type="button"
											class="mt-2 text-sm text-fg-muted underline-offset-2 hover:underline disabled:opacity-50"
											disabled={busy}
											onclick={() =>
												roleMutation.mutate({ id: savings.account?.id ?? '', role: null })}
											>Unlink account</button
										>
									{/if}
								</div>
							{/if}

							{#if savings.goal !== null}
								<!-- Adding only makes sense once there is something to add towards. -->
								<form class="mt-4 border-t border-line pt-4" novalidate onsubmit={submitAdd}>
									<label for="{uid}-add" class="block text-sm font-medium">Add to it</label>
									<p class="mt-0.5 text-xs text-fg-muted">
										{savings.account
											? 'Moves out of the account you choose and into your savings — your total stays put.'
											: `Goes straight onto the ${formatMoney(savings.saved, savings.currency)} already saved.`}
									</p>
									<div
										class="mt-3 flex h-11 items-center gap-2 rounded-full border border-hairline px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue"
									>
										<span class="text-fg-muted" aria-hidden="true"
											>{currencySymbol(savings.currency)}</span
										>
										<input
											id="{uid}-add"
											bind:value={addDraft}
											inputmode="decimal"
											autocomplete="off"
											placeholder="0"
											class="tabular min-w-0 flex-1 bg-transparent font-display text-lg outline-none placeholder:text-fg-subtle"
										/>
										<span class="text-sm text-fg-subtle">{savings.currency}</span>
									</div>
									{#if savings.account}
										<div class="mt-3 flex items-center justify-between gap-4">
											<span class="text-sm text-fg-muted">From</span>
											<Select
												label="Account the money comes from"
												options={sources.map((a) => ({ value: a.id, label: a.name }))}
												bind:value={source}
											/>
										</div>
									{/if}
									<div class="mt-3 flex justify-end">
										<PillButton type="submit" size="sm" disabled={busy}>
											{addMutation.isPending ? 'Adding…' : 'Add'}
										</PillButton>
									</div>
								</form>
							{/if}

							{#if message}
								<p id="{uid}-message" class="mt-3 text-sm text-negative" role="alert">{message}</p>
							{/if}
						</div>
					</div>
				{/if}
			{/snippet}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
