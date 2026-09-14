<script lang="ts">
	import ColorTrendingDown from '@animated-color-icons/lucide-svelte/TrendingDown.svelte';
	import ColorTrendingUp from '@animated-color-icons/lucide-svelte/TrendingUp.svelte';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { animate, stagger } from 'motion';
	import { moneyField } from '$lib/actions';
	import { PillButton, Segmented, Select, type PaletteColor } from '$lib/components/ui';
	import {
		currencySymbol,
		formatMoney,
		isDateKey,
		MAX_MONEY_LENGTH,
		parseMoney,
		todayKey,
		type Currency
	} from '$lib/finance';
	import { addTransactionMutation, editTransactionMutation } from '$lib/queries';
	import type { TransactionDraft } from '$lib/transaction-panel';
	import {
		MAX_AMOUNT,
		MAX_CATEGORY,
		MAX_DESCRIPTION,
		type TransactionRow
	} from '$lib/transactions';
	import { EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	/**
	 * The panel with its fields open: what a transaction is worth, which way it
	 * went, what it was for, the day, and the note beside it — the five things
	 * v1 records and the ledger draws. The same fields write a new one and
	 * change an old one, so there is only ever one form to learn.
	 *
	 * The account is asked for only when writing a new one, where it is plain
	 * what its amount does to that balance. An existing row's account is the
	 * unassigned card's to give, since only that endpoint knows the rule about
	 * the balance an account was opened with.
	 */
	type Props = {
		/** The row being changed, or nothing at all to write a new one. */
		row?: TransactionRow | null;
		currency: Currency;
		/** The viewer's zone: the day is read and written in it. */
		timeZone: string;
		/** The user's active accounts — offered on a new transaction only. */
		accounts?: { id: string; name: string }[];
		/** Each account's colour, by id: the dots beside their names. */
		colors?: Record<string, PaletteColor>;
		/**
		 * Every field, held by the page: the panel's figure writes the amount into
		 * it as well, so the two are one value rather than a copy kept in step,
		 * and the page keeps it in this browser while it is half written.
		 */
		draft: TransactionDraft;
		/** Saved, or given up on — either way the panel goes back to reading. */
		onDone: () => void;
	};

	let {
		row = null,
		currency,
		timeZone,
		accounts = [],
		colors = {},
		draft,
		onDone
	}: Props = $props();

	const uid = $props.id();
	const queryClient = useQueryClient();
	const add = createMutation(() => addTransactionMutation(queryClient));
	const edit = createMutation(() => editTransactionMutation(queryClient));
	const save = $derived(row ? edit : add);

	/** No account yet: `Select` holds strings, so the absence needs a name. */
	const NONE = 'none';

	/**
	 * The account chosen, while it is still one of theirs: one kept from before
	 * a reload may have been closed since, and asking for it would only earn a
	 * 404.
	 */
	const account = $derived(accounts.some((a) => a.id === draft.account) ? draft.account : null);

	/** Today as the viewer's zone reads it: nothing can have happened later. */
	const today = $derived(todayKey(timeZone));

	let problem = $state<string | null>(null);
	const message = $derived(problem ?? (save.error ? `Couldn't save: ${save.error.message}` : null));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const cents = parseMoney(draft.amount);
		if (cents === null || cents <= 0) {
			problem = 'Enter an amount, like 7,540.';
		} else if (cents > MAX_AMOUNT) {
			problem = `The most it can be is ${formatMoney(MAX_AMOUNT, currency)}.`;
		} else if (draft.category.trim() === '') {
			problem = 'Give it a category.';
		} else if (draft.category.length > MAX_CATEGORY) {
			problem = `A category runs to ${MAX_CATEGORY} characters.`;
		} else if (!isDateKey(draft.date)) {
			problem = 'Pick the day it happened.';
		} else if (draft.date > today) {
			problem = "A transaction can't be dated after today.";
		} else {
			problem = null;
			const written = {
				amount: cents,
				type: draft.type,
				category: draft.category.trim(),
				description: draft.description.trim() || null,
				date: draft.date
			};
			if (row) edit.mutate({ id: row.id, edit: written }, { onSuccess: onDone });
			else add.mutate({ ...written, accountId: account }, { onSuccess: onDone });
		}
	}

	const field =
		'flex h-11 items-center gap-2 rounded-full border border-hairline px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue';
	const entry =
		'min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-fg-subtle';
	const label = 'mb-1.5 block text-sm text-fg-muted';

	/**
	 * The fields rise in one after another as the panel turns to editing
	 * (Motion). Held at nothing first, in the same breath as the action runs:
	 * Motion's own first keyframe can land a frame late, and that frame shows
	 * the fields at full strength before they drop to nothing to rise again.
	 */
	function deal(node: HTMLElement) {
		if (prefersReducedMotion()) return;
		const parts = [...node.querySelectorAll<HTMLElement>('[data-deal]')];
		for (const part of parts) part.style.opacity = '0';
		animate(
			parts,
			{ opacity: [0, 1], y: [6, 0] },
			{ delay: stagger(0.04), duration: 0.35, ease: EASE_OUT_QUINT }
		).finished.then(() => {
			for (const part of parts) part.style.opacity = '';
		});
	}
</script>

<form class="mt-6 border-t border-line pt-6" novalidate onsubmit={submit} use:deal>
	<div data-deal>
		<span class={label}>Which way</span>
		<!-- The trends the ledger's own filter wears for the same two, in the
		     colours their figures are written in: the rose money out is drawn in,
		     the green money in. -->
		<Segmented
			bind:value={draft.type}
			label="Which way the money went"
			options={[
				{
					value: 'expense',
					label: 'Money out',
					icon: { icon: ColorTrendingDown, set: 'color' },
					chip: 'bg-spent/12 text-spent'
				},
				{
					value: 'income',
					label: 'Money in',
					icon: { icon: ColorTrendingUp, set: 'color' },
					chip: 'bg-positive/12 text-positive'
				}
			]}
			class="w-full"
		/>
	</div>

	<div class="mt-4" data-deal>
		<label class={label} for="{uid}-amount">Amount</label>
		<div class={field}>
			<span class="text-fg-muted" aria-hidden="true">{currencySymbol(currency)}</span>
			<!-- Money only, as it is typed: `moneyField` turns away anything that
			     isn't a digit or a separator, here and on the figure above, so the
			     two can never disagree about what was written. -->
			<input
				id="{uid}-amount"
				value={draft.amount}
				use:moneyField={(next) => (draft.amount = next)}
				inputmode="decimal"
				autocomplete="off"
				spellcheck="false"
				maxlength={MAX_MONEY_LENGTH}
				placeholder="0"
				aria-invalid={problem !== null}
				aria-describedby={message ? `${uid}-message` : undefined}
				class="{entry} tabular font-display text-lg"
			/>
			<span class="text-sm text-fg-subtle">{currency}</span>
		</div>
	</div>

	<div class="mt-4" data-deal>
		<label class={label} for="{uid}-category">Category</label>
		<div class={field}>
			<input
				id="{uid}-category"
				bind:value={draft.category}
				maxlength={MAX_CATEGORY}
				autocomplete="off"
				spellcheck="false"
				placeholder="Groceries"
				class={entry}
			/>
		</div>
	</div>

	{#if !row && accounts.length > 0}
		<div class="mt-4" data-deal>
			<span class={label}>Account</span>
			<Select
				label="Account"
				value={account ?? NONE}
				onValueChange={(next) => (draft.account = next === NONE ? null : next)}
				options={[
					{ value: NONE, label: 'No account yet' },
					...accounts.map((a) => ({ value: a.id, label: a.name, color: colors[a.id] ?? 'blue' }))
				]}
				class="w-full justify-between"
			/>
		</div>
	{/if}

	<div class="mt-4" data-deal>
		<label class={label} for="{uid}-date">Date</label>
		<div class={field}>
			<input
				id="{uid}-date"
				bind:value={draft.date}
				type="date"
				max={today}
				class="{entry} tabular"
			/>
		</div>
	</div>

	<div class="mt-4" data-deal>
		<label class={label} for="{uid}-description">Description</label>
		<div class={field}>
			<input
				id="{uid}-description"
				bind:value={draft.description}
				maxlength={MAX_DESCRIPTION}
				autocomplete="off"
				placeholder="Optional"
				class={entry}
			/>
		</div>
	</div>

	{#if message}
		<p id="{uid}-message" class="mt-4 text-sm text-negative" role="alert">{message}</p>
	{/if}

	<!-- Apart, at the two ends of the row: giving up and saving are opposite
	     answers, and a stray press shouldn't land on the wrong one. -->
	<div class="mt-6 flex items-center justify-between gap-3" data-deal>
		<button
			type="button"
			class="text-sm text-fg-muted underline-offset-2 hover:underline disabled:opacity-50"
			disabled={save.isPending}
			onclick={onDone}
		>
			Cancel
		</button>
		<PillButton type="submit" size="sm" disabled={save.isPending}>
			{#if save.isPending}
				{row ? 'Saving…' : 'Adding…'}
			{:else}
				{row ? 'Save changes' : 'Add transaction'}
			{/if}
		</PillButton>
	</div>
</form>
