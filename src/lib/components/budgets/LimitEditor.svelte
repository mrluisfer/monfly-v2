<script lang="ts">
	import ColorTarget from '@animated-color-icons/lucide-svelte/Target.svelte';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { Popover } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { moneyField } from '$lib/actions';
	import { categoryColor } from '$lib/categories';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import { AnimatedIcon, Combobox, PillButton, type PaletteColor } from '$lib/components/ui';
	import {
		MAX_BUDGET,
		MAX_MONEY_LENGTH,
		currencySymbol,
		formatMoney,
		isBudget,
		parseMoney,
		suggestedLimit,
		toMoneyInput,
		type CategoryLine,
		type Cents,
		type Currency
	} from '$lib/finance';
	import { setCategoryBudgetMutation } from '$lib/queries';
	import { MAX_CATEGORY } from '$lib/transactions';
	import { pop } from '$lib/transitions';

	/**
	 * A small form that sets, changes or takes away one category's monthly
	 * limit, opened by whatever control the caller draws — a card's pencil, the
	 * next limit's slot, a bubble, a chip. Given no category it asks for one
	 * first (`Combobox`: the categories without a limit, or a name of its own).
	 * Under the amount it offers what a usual month and the month before came
	 * to, rounded up, so a first limit is one press. Lime, the colour of what
	 * a budget sets, heads it until it knows the category; then the category's
	 * own chip does.
	 */
	type Props = {
		/** The category it sets, or null to pick one: a new limit. */
		category: string | null;
		/** Every category on the page, for the suggestions and the picker. */
		lines: CategoryLine[];
		currency: Currency;
		categoryChoices?: Record<string, PaletteColor>;
		/** The control that opens it, handed bits-ui's trigger props to spread first. */
		trigger: Snippet<[Record<string, unknown>]>;
		align?: 'start' | 'center' | 'end';
		/** Once the server has it: the category, and its limit or null. */
		onSaved?: (category: string, limit: Cents | null) => void;
	};

	let {
		category,
		lines,
		currency,
		categoryChoices,
		trigger,
		align = 'end',
		onSaved
	}: Props = $props();

	const uid = $props.id();
	const queryClient = useQueryClient();
	const mutation = createMutation(() => setCategoryBudgetMutation(queryClient));

	let open = $state(false);
	let name = $state('');
	let draft = $state('');
	let problem = $state<string | null>(null);

	const picked = $derived(name.trim());
	const line = $derived(lines.find((l) => l.name === picked));
	const limit = $derived(line?.limit ?? null);

	/** Names the picker offers: the categories with no limit yet, most spent first. */
	const unlimited = $derived(lines.filter((l) => l.limit === null).map((l) => l.name));

	const offers = $derived.by(() => {
		if (!line) return [];
		const usual = suggestedLimit(line.usual);
		const last = suggestedLimit(line.last);
		return [
			usual > 0 && { label: 'A usual month', amount: usual },
			last > 0 && last !== usual && { label: 'Last month', amount: last }
		].filter((offer) => offer !== false);
	});

	const message = $derived(
		problem ?? (mutation.error ? `Couldn't save: ${mutation.error.message}` : null)
	);

	function reset() {
		name = category ?? '';
		draft = limit === null ? '' : toMoneyInput(limit);
		problem = null;
		mutation.reset();
	}

	function save(next: Cents | null) {
		const saved = picked;
		mutation.mutate(
			{ category: saved, limit: next },
			{
				onSuccess: () => {
					open = false;
					onSaved?.(saved, next);
				}
			}
		);
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const amount = parseMoney(draft);
		if (!picked) problem = 'Pick a category, or write one.';
		else if (picked.length > MAX_CATEGORY)
			problem = `A category runs to ${MAX_CATEGORY} characters.`;
		else if (amount === null) problem = 'Enter an amount, like 4,000.';
		else if (amount <= 0) problem = 'The limit has to be more than zero.';
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
			{@render trigger(props)}
		{/snippet}
	</Popover.Trigger>
	<Popover.Portal>
		<!-- The floating layers' entrance and exit: forceMount hands mounting to the {#if}. -->
		<Popover.Content side="bottom" {align} sideOffset={10} collisionPadding={16} forceMount>
			{#snippet child({ props, wrapperProps, open: shown })}
				{#if shown}
					<div {...wrapperProps}>
						<div
							{...props}
							in:pop
							out:pop
							class="z-50 w-[min(21rem,calc(100vw-2rem))] origin-(--bits-floating-transform-origin) rounded-[var(--radius-chip)] border border-line bg-card p-4 shadow-lg"
						>
							<form class="flex flex-col gap-3" novalidate onsubmit={submit}>
								<div class="flex items-start gap-3">
									{#if category}
										<CategoryIcon {category} color={categoryColor(category, categoryChoices)} />
									{:else}
										<!-- Lime, like everything a budget sets: too light for a glyph
										     on white, so there it inverts, as the budget's chip does. -->
										<span
											class="grid size-7 shrink-0 place-items-center rounded-lg bg-lime/30 text-[color-mix(in_oklab,var(--lime)_40%,var(--ink))] dark:bg-lime/15 dark:text-lime"
										>
											<AnimatedIcon icon={ColorTarget} set="color" trigger="mount" />
										</span>
									{/if}
									<div class="min-w-0">
										<p class="text-sm font-medium wrap-anywhere">
											{category ? `Limit for ${category}` : 'New limit'}
										</p>
										<p class="text-xs text-fg-muted">
											What a month of it is measured against, every month.
										</p>
									</div>
								</div>

								{#if !category}
									<div class="flex flex-col gap-1.5">
										<label for="{uid}-category" class="text-sm text-fg-muted">Category</label>
										<Combobox
											id="{uid}-category"
											options={unlimited}
											bind:value={name}
											maxlength={MAX_CATEGORY}
											placeholder="Groceries"
										>
											{#snippet leading(value)}
												<CategoryIcon
													category={value}
													color={categoryColor(value, categoryChoices)}
													animated
												/>
											{/snippet}
										</Combobox>
									</div>
								{/if}

								<div class="flex flex-col gap-1.5">
									{#if !category}
										<label for="{uid}-amount" class="text-sm text-fg-muted">Each month</label>
									{:else}
										<label for="{uid}-amount" class="sr-only">Each month</label>
									{/if}
									<div
										class="flex h-11 items-center gap-2 rounded-full border border-hairline px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue"
									>
										<span class="text-fg-muted" aria-hidden="true">{currencySymbol(currency)}</span>
										<input
											id="{uid}-amount"
											value={draft}
											use:moneyField={(next) => (draft = next)}
											inputmode="decimal"
											autocomplete="off"
											spellcheck="false"
											maxlength={MAX_MONEY_LENGTH}
											placeholder="0"
											aria-invalid={problem !== null}
											aria-describedby={message ? `${uid}-message` : undefined}
											class="tabular min-w-0 flex-1 bg-transparent font-display text-lg outline-none placeholder:text-fg-subtle"
										/>
										<span class="text-sm text-fg-subtle">{currency}</span>
									</div>
								</div>

								{#if offers.length > 0}
									<!-- What it has come to, rounded up: pressing one writes it in. -->
									<div class="flex flex-wrap gap-1.5">
										{#each offers as offer (offer.label)}
											<button
												type="button"
												class="press flex h-8 items-center gap-1.5 rounded-full bg-sunken px-3 text-xs hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
												onclick={() => (draft = toMoneyInput(offer.amount))}
											>
												<span class="text-fg-muted">{offer.label}</span>
												<span class="tabular font-medium"
													>{formatMoney(offer.amount, currency)}</span
												>
											</button>
										{/each}
									</div>
								{/if}

								{#if !category && limit !== null}
									<p class="text-xs text-fg-muted">
										{picked} already has {formatMoney(limit, currency)}; saving replaces it.
									</p>
								{/if}

								{#if message}
									<p id="{uid}-message" class="text-sm text-negative" role="alert">{message}</p>
								{/if}

								<div class="flex items-center justify-between gap-3">
									{#if category && limit !== null}
										<button
											type="button"
											class="text-sm text-fg-muted underline-offset-2 hover:underline disabled:opacity-50"
											disabled={mutation.isPending}
											onclick={() => save(null)}>Remove limit</button
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
