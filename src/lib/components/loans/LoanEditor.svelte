<script lang="ts">
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { animate, stagger } from 'motion';
	import { untrack } from 'svelte';
	import { moneyField } from '$lib/actions';
	import { AnimatedIcon, Avatar, Combobox, PillButton, Segmented } from '$lib/components/ui';
	import {
		currencySymbol,
		formatMoney,
		isDateKey,
		MAX_MONEY_LENGTH,
		parseMoney,
		todayKey,
		toMoneyInput,
		type Currency,
		type DateKey
	} from '$lib/finance';
	import {
		LOAN_DIRECTION_LABEL,
		MAX_LOAN,
		MAX_NOTES,
		MAX_PERSON,
		type Loan,
		type LoanDirection
	} from '$lib/loans';
	import { addLoanMutation, editLoanMutation } from '$lib/queries';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';
	import { DIRECTION_CHIP, DIRECTION_GLYPH } from './tone';

	/**
	 * The panel with a loan's fields open: which way the money went, who with,
	 * how much, the day it was made and the day it falls due, and a note — what
	 * v1's form asks for. The same fields write a new loan and change one.
	 */
	type Props = {
		/** The loan being changed, or nothing to write a new one. */
		loan?: Loan | null;
		/** Everyone a loan was ever made with, most recent first: what the name field suggests. */
		people: string[];
		currency: Currency;
		/** The viewer's zone: the days are read in it. */
		timeZone: string;
		/** Saved — with the loan's id — or given up on. */
		onDone: (id?: string) => void;
		/** Given up on is only offered where there's somewhere to go back to. */
		cancellable?: boolean;
	};

	let { loan = null, people, currency, timeZone, onDone, cancellable = true }: Props = $props();

	const uid = $props.id();
	const queryClient = useQueryClient();
	const add = createMutation(() => addLoanMutation(queryClient));
	const edit = createMutation(() => editLoanMutation(queryClient));
	const save = $derived(loan ? edit : add);

	const today = $derived(todayKey(timeZone));

	// Filled once as the fields open: a refetch while someone is typing
	// shouldn't reach in and rewrite what they wrote.
	const start = untrack(() => loan);
	let direction = $state<LoanDirection>(start?.direction ?? 'lent');
	let person = $state(start?.person ?? '');
	let amount = $state(start ? toMoneyInput(start.amount) : '');
	let issuedOn = $state<string>(start?.issuedOn ?? untrack(() => today));
	let dueOn = $state<string>(start?.dueOn ?? '');
	let notes = $state(start?.notes ?? '');

	/** With payments recorded one way, the direction stays: they were money in, or out. */
	const fixed = $derived((start?.payments.length ?? 0) > 0);
	/** What its recorded payments already come to: the amount can't go under it. */
	const recorded = $derived(start?.payments.reduce((sum, p) => sum + p.amount, 0) ?? 0);

	/** A due day some way on from the day it was made. */
	function inDays(days: number) {
		const base = isDateKey(issuedOn) && issuedOn > today ? issuedOn : today;
		const [y, m, d] = base.split('-').map(Number);
		const next = new Date(Date.UTC(y, m - 1, d + days));
		dueOn = next.toISOString().slice(0, 10);
	}

	let problem = $state<string | null>(null);
	const message = $derived(problem ?? (save.error ? `Couldn't save: ${save.error.message}` : null));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const cents = parseMoney(amount);
		if (person.trim() === '') {
			problem = direction === 'lent' ? 'Who owes it? Give their name.' : 'Who is it owed to?';
		} else if (person.length > MAX_PERSON) {
			problem = `A name runs to ${MAX_PERSON} characters.`;
		} else if (cents === null || cents <= 0) {
			problem = 'Enter how much, like 1,200.';
		} else if (cents > MAX_LOAN) {
			problem = `The most a loan can be is ${formatMoney(MAX_LOAN, currency)}.`;
		} else if (cents < recorded) {
			problem = `Its payments already come to ${formatMoney(recorded, currency)}: it can't be less.`;
		} else if (!isDateKey(issuedOn) || issuedOn > today) {
			problem = 'Pick the day it was made, today at the latest.';
		} else if (dueOn !== '' && (!isDateKey(dueOn) || dueOn < issuedOn)) {
			problem = 'The due day comes after the day it was made.';
		} else if (notes.length > MAX_NOTES) {
			problem = `A note runs to ${MAX_NOTES} characters.`;
		} else {
			problem = null;
			const draft = {
				direction,
				person: person.trim(),
				amount: cents,
				issuedOn: issuedOn as DateKey,
				dueOn: dueOn === '' ? null : (dueOn as DateKey),
				notes: notes.trim() || null
			};
			if (start) edit.mutate({ id: start.id, draft }, { onSuccess: () => onDone(start.id) });
			else add.mutate(draft, { onSuccess: ({ id }) => onDone(id) });
		}
	}

	const field =
		'flex h-11 items-center gap-2 rounded-full border border-hairline px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue';
	const entry =
		'min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-fg-subtle';
	const label = 'mb-1.5 block text-sm text-fg-muted';
	const pick =
		'press rounded-full border border-hairline px-2.5 py-1 text-xs text-fg-muted transition-colors duration-200 hover:bg-sunken hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue';

	/** The fields rise in one after another as the panel turns to them, as the ledger panel's do. */
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
		{#if fixed && start}
			<!-- Payments were recorded one way: money in, or money out. -->
			<p class="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
				<span
					class={cn(
						'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-medium',
						DIRECTION_CHIP[start.direction]
					)}
				>
					<AnimatedIcon {...DIRECTION_GLYPH[start.direction]} size={12} trigger="mount" />
					{LOAN_DIRECTION_LABEL[start.direction]}
				</span>
				It stays this way: its payments are already recorded.
			</p>
		{:else}
			<Segmented
				bind:value={direction}
				label="Which way the money went"
				options={[
					{
						value: 'lent',
						label: 'I lent it',
						icon: DIRECTION_GLYPH.lent,
						chip: DIRECTION_CHIP.lent
					},
					{
						value: 'borrowed',
						label: 'I borrowed it',
						icon: DIRECTION_GLYPH.borrowed,
						chip: DIRECTION_CHIP.borrowed
					}
				]}
				class="w-full"
			/>
		{/if}
	</div>

	<div class="mt-4" data-deal>
		<label class={label} for="{uid}-person"
			>{direction === 'lent' ? 'Who owes it' : 'Owed to'}</label
		>
		<!-- Everyone a loan was made with is suggested, each with their blobatar;
		     a new name heads the list marked new, and its face follows the typing. -->
		<Combobox
			id="{uid}-person"
			options={people}
			bind:value={person}
			maxlength={MAX_PERSON}
			placeholder="Ana"
		>
			{#snippet leading(name)}
				<Avatar seed={name.trim() || '?'} class="size-6" />
			{/snippet}
		</Combobox>
	</div>

	<div class="mt-4" data-deal>
		<label class={label} for="{uid}-amount">How much</label>
		<div class={field}>
			<span class="text-fg-muted" aria-hidden="true">{currencySymbol(currency)}</span>
			<input
				id="{uid}-amount"
				value={amount}
				use:moneyField={(next) => (amount = next)}
				inputmode="decimal"
				autocomplete="off"
				spellcheck="false"
				maxlength={MAX_MONEY_LENGTH}
				placeholder="0"
				aria-describedby={recorded > 0 ? `${uid}-recorded` : undefined}
				class="{entry} tabular font-display text-lg"
			/>
			<span class="text-sm text-fg-subtle">{currency}</span>
		</div>
		{#if recorded > 0}
			<p id="{uid}-recorded" class="mt-1.5 px-4 text-xs text-fg-muted">
				Its payments come to <span class="tabular font-medium text-fg"
					>{formatMoney(recorded, currency)}</span
				> so far.
			</p>
		{/if}
	</div>

	<div class="mt-4 grid grid-cols-2 gap-3" data-deal>
		<div>
			<label class={label} for="{uid}-issued">Made on</label>
			<div class={field}>
				<input
					id="{uid}-issued"
					bind:value={issuedOn}
					type="date"
					max={today}
					class="{entry} tabular"
				/>
			</div>
		</div>
		<div>
			<label class={label} for="{uid}-due">Due</label>
			<div class={field}>
				<input
					id="{uid}-due"
					bind:value={dueOn}
					type="date"
					min={issuedOn}
					class="{entry} tabular"
				/>
			</div>
		</div>
	</div>
	<!-- The due days people give most, a press away. -->
	<div class="mt-2 flex flex-wrap items-center gap-1.5" data-deal>
		<button type="button" class={pick} onclick={() => inDays(7)}>In a week</button>
		<button type="button" class={pick} onclick={() => inDays(14)}>In two weeks</button>
		<button type="button" class={pick} onclick={() => inDays(30)}>In a month</button>
		<button
			type="button"
			class={cn(pick, dueOn === '' && 'bg-sunken text-fg')}
			aria-pressed={dueOn === ''}
			onclick={() => (dueOn = '')}
		>
			No due date
		</button>
	</div>

	<div class="mt-4" data-deal>
		<label class={label} for="{uid}-notes">Note</label>
		<div class={field}>
			<input
				id="{uid}-notes"
				bind:value={notes}
				maxlength={MAX_NOTES}
				autocomplete="off"
				placeholder="What it was for — optional"
				class={entry}
			/>
		</div>
	</div>

	{#if message}
		<p class="mt-4 text-sm text-negative" role="alert">{message}</p>
	{/if}

	<div class="mt-6 flex items-center justify-between gap-3" data-deal>
		{#if cancellable}
			<button
				type="button"
				class="text-sm text-fg-muted underline-offset-2 hover:underline disabled:opacity-50"
				disabled={save.isPending}
				onclick={() => onDone()}
			>
				Cancel
			</button>
		{:else}
			<span></span>
		{/if}
		<PillButton type="submit" size="sm" disabled={save.isPending}>
			{#if save.isPending}
				{start ? 'Saving…' : 'Adding…'}
			{:else}
				{start ? 'Save changes' : 'Add loan'}
			{/if}
		</PillButton>
	</div>
</form>
