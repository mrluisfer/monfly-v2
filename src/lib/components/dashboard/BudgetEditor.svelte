<script lang="ts">
	import ColorTarget from '@animated-color-icons/lucide-svelte/Target.svelte';
	import MovingPencil from '@jis3r/icons/icons/pencil';
	import { Popover } from 'bits-ui';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { AnimatedIcon, IconButton, PillButton } from '$lib/components/ui';
	import {
		MAX_BUDGET,
		currencySymbol,
		formatMoney,
		isBudget,
		parseMoney,
		toMoneyInput,
		type Cents,
		type Currency
	} from '$lib/finance';
	import { setBudgetMutation } from '$lib/queries';
	import { pop } from '$lib/transitions';

	/** The pencil beside a budget figure, opening a small form that sets or clears it. */
	type Props = {
		/** The saved budget, or null when none is set. */
		budget: Cents | null;
		currency: Currency;
	};

	let { budget, currency }: Props = $props();

	const uid = $props.id();
	const queryClient = useQueryClient();
	const mutation = createMutation(() => setBudgetMutation(queryClient));

	let open = $state(false);
	let draft = $state('');
	let problem = $state<string | null>(null);

	const message = $derived(
		problem ?? (mutation.error ? `Couldn't save: ${mutation.error.message}` : null)
	);

	function reset() {
		draft = budget === null ? '' : toMoneyInput(budget);
		problem = null;
		mutation.reset();
	}

	function save(next: Cents | null) {
		mutation.mutate(next, { onSuccess: () => (open = false) });
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const amount = parseMoney(draft);
		if (amount === null) problem = 'Enter an amount, like 7,540.';
		else if (amount <= 0) problem = 'The budget has to be more than zero.';
		else if (!isBudget(amount))
			problem = `The most it can be is ${formatMoney(MAX_BUDGET, currency)}.`;
		else {
			problem = null;
			save(amount);
		}
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
				aria-label={budget === null ? 'Set monthly budget' : 'Edit monthly budget'}
			>
				<AnimatedIcon icon={MovingPencil} set="moving" />
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
							<form class="flex flex-col gap-3" novalidate onsubmit={submit}>
								<div class="flex items-start gap-3">
									<!-- Lime, like the meter it sets. Too light for a glyph on white, so there it
									     inverts; on dark it's light enough to be the glyph itself. -->
									<span
										class="grid size-7 shrink-0 place-items-center rounded-lg bg-lime/30 text-[color-mix(in_oklab,var(--lime)_40%,var(--ink))] dark:bg-lime/15 dark:text-lime"
									>
										<AnimatedIcon icon={ColorTarget} set="color" trigger="mount" />
									</span>
									<div class="min-w-0">
										<label for="{uid}-amount" class="block text-sm font-medium"
											>Monthly budget</label
										>
										<p class="text-xs text-fg-muted">
											What this month's spending is measured against.
										</p>
									</div>
								</div>
								<div
									class="flex h-11 items-center gap-2 rounded-full border border-hairline px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue"
								>
									<span class="text-fg-muted" aria-hidden="true">{currencySymbol(currency)}</span>
									<input
										id="{uid}-amount"
										bind:value={draft}
										inputmode="decimal"
										autocomplete="off"
										placeholder="0"
										aria-invalid={problem !== null}
										aria-describedby={message ? `${uid}-message` : undefined}
										class="tabular min-w-0 flex-1 bg-transparent font-display text-lg outline-none placeholder:text-fg-subtle"
									/>
									<span class="text-sm text-fg-subtle">{currency}</span>
								</div>
								{#if message}
									<p id="{uid}-message" class="text-sm text-negative" role="alert">{message}</p>
								{/if}
								<div class="flex items-center justify-between gap-3">
									{#if budget !== null}
										<button
											type="button"
											class="text-sm text-fg-muted underline-offset-2 hover:underline disabled:opacity-50"
											disabled={mutation.isPending}
											onclick={() => save(null)}>Remove budget</button
										>
									{:else}
										<span></span>
									{/if}
									<PillButton type="submit" size="sm" disabled={mutation.isPending}>
										{mutation.isPending ? 'Saving…' : 'Save'}
									</PillButton>
								</div>
							</form>
						</div>
					</div>
				{/if}
			{/snippet}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
