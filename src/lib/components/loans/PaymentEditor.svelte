<script lang="ts">
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { animate, stagger } from 'motion';
	import { untrack } from 'svelte';
	import { featuredAccounts, type Account } from '$lib/accounts';
	import { countUp, moneyField } from '$lib/actions';
	import { PillButton, Select, ShareBar, type PaletteColor } from '$lib/components/ui';
	import {
		currencySymbol,
		formatMoney,
		isDateKey,
		isTimeKey,
		MAX_MONEY_LENGTH,
		parseMoney,
		timeKey,
		todayKey,
		toMoneyInput,
		type Currency,
		type DateKey,
		type TimeKey
	} from '$lib/finance';
	import { loanLeft, type Loan } from '$lib/loans';
	import { payLoanMutation } from '$lib/queries';
	import { MAX_DESCRIPTION } from '$lib/transactions';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';
	import { DIRECTION_TINT } from './tone';

	/**
	 * Part of a loan settled: how much, through which account, and when. Through
	 * an account it's a transaction on it — money in for a loan they made, out
	 * for one they owe — and the account's balance moves with it; without one,
	 * only the loan does, as v1's quick payment. Before it's saved, the bar shows
	 * what it adds to what's settled, and what it leaves.
	 */
	type Props = {
		loan: Loan;
		/** The active accounts, with their balances now. */
		accounts: Account[];
		/** Each account's colour, by id: the dots beside their names. */
		colors: Record<string, PaletteColor>;
		currency: Currency;
		/** The viewer's zone: the day is read and written in it. */
		timeZone: string;
		/** Recorded, or given up on — either way the panel goes back to reading. */
		onDone: () => void;
	};

	let { loan, accounts, colors, currency, timeZone, onDone }: Props = $props();

	const uid = $props.id();
	const queryClient = useQueryClient();
	const pay = createMutation(() => payLoanMutation(queryClient));

	/** No account: `Select` holds strings, so the absence needs a name. */
	const NONE = 'none';

	const left = $derived(loanLeft(loan));
	const tint = $derived(DIRECTION_TINT[loan.direction]);
	const lent = $derived(loan.direction === 'lent');

	// Filled once as the fields open: all of what's left, on the main account, now.
	let amount = $state(untrack(() => toMoneyInput(left)));
	let account = $state<string>(untrack(() => featuredAccounts(accounts)[0]?.id ?? NONE));
	let date = $state<string>(untrack(() => todayKey(timeZone)));
	let time = $state<string>(untrack(() => timeKey(timeZone)));
	let description = $state('');

	const cents = $derived(parseMoney(amount) ?? 0);
	const chosen = $derived(accounts.find((a) => a.id === account) ?? null);
	/** What the account holds once it's saved: more for money back, less for a debt paid. */
	const after = $derived(chosen ? chosen.balance + (lent ? cents : -cents) : 0);
	const remains = $derived(Math.max(0, left - cents));
	const settles = $derived(cents > 0 && cents === left);

	const money = (value: number) => formatMoney(Math.round(value), currency);
	const share = (value: number) => (loan.amount > 0 ? Math.min(1, value / loan.amount) : 0);

	let problem = $state<string | null>(null);
	const message = $derived(
		problem ?? (pay.error ? `Couldn't record it: ${pay.error.message}` : null)
	);

	/** Still to come, read off the clock as it is when saving. */
	function ahead() {
		const now = new Date();
		const day = todayKey(timeZone, now);
		return date > day || (date === day && time > timeKey(timeZone, now));
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (cents <= 0) {
			problem = 'Enter how much, like 500.';
		} else if (cents > left) {
			problem = `Only ${money(left)} is left to settle.`;
		} else if (!isDateKey(date) || !isTimeKey(time)) {
			problem = 'Pick the day and time it was paid.';
		} else if (ahead()) {
			problem = "A payment can't be dated later than now.";
		} else {
			problem = null;
			pay.mutate(
				{
					id: loan.id,
					entry: {
						amount: cents,
						accountId: chosen?.id ?? null,
						date: date as DateKey,
						time: time as TimeKey,
						description: description.trim() || null
					}
				},
				{ onSuccess: onDone }
			);
		}
	}

	const field =
		'flex h-11 items-center gap-2 rounded-full border border-hairline px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue';
	const entry =
		'min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-fg-subtle';
	const label = 'mb-1.5 block text-sm text-fg-muted';
	const pick =
		'press rounded-full border border-hairline px-2.5 py-1 text-xs text-fg-muted transition-colors duration-200 hover:bg-sunken hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue';

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
	<!-- What's settled, what this adds in lime — what's new — and the room still left. -->
	<div data-deal>
		<div class="flex items-baseline justify-between gap-3 text-sm">
			<span class="text-fg-muted">{lent ? 'Coming back' : 'Paying off'}</span>
			<span class="tabular text-fg-muted">
				{#if settles}
					<span class="font-medium text-positive">Settles it</span>
				{:else}
					<span
						class="font-medium text-fg"
						use:countUp={{ value: remains, format: money, initial: false, duration: 0.45 }}
						>{money(remains)}</span
					> left after this
				{/if}
			</span>
		</div>
		<ShareBar
			track="hatch"
			segments={[
				{ id: 'settled', share: share(loan.paid), color: tint },
				{ id: 'this', share: share(Math.min(cents, left)), color: 'lime' }
			]}
			class="mt-2.5 h-2.5"
		/>
	</div>

	<div class="mt-5" data-deal>
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
				class="{entry} tabular font-display text-lg"
			/>
			<span class="text-sm text-fg-subtle">{currency}</span>
		</div>
		<div class="mt-2 flex flex-wrap gap-1.5">
			<button
				type="button"
				class={cn(pick, cents === left && 'bg-sunken text-fg')}
				onclick={() => (amount = toMoneyInput(left))}>All of it · {money(left)}</button
			>
			{#if left >= 200}
				<button
					type="button"
					class={cn(pick, cents === Math.round(left / 2) && 'bg-sunken text-fg')}
					onclick={() => (amount = toMoneyInput(Math.round(left / 2)))}>Half</button
				>
			{/if}
		</div>
	</div>

	<div class="mt-4" data-deal>
		<span class={label}>{lent ? 'Into' : 'Out of'}</span>
		<Select
			label={lent ? 'Account it came into' : 'Account it left'}
			value={account}
			onValueChange={(next) => (account = next)}
			options={[
				...accounts.map((a) => ({ value: a.id, label: a.name, color: colors[a.id] ?? 'blue' })),
				{ value: NONE, label: 'Not through an account' }
			]}
			class="w-full justify-between"
		/>
		<!-- What the account holds now and, counting over as the amount is typed,
		     what it's left holding — or that no account moves at all. -->
		<p class="mt-1.5 flex min-h-5 flex-wrap items-center gap-1 px-4 text-xs text-fg-muted">
			{#if chosen}
				<span class="truncate">{chosen.name}</span>
				<span class="tabular shrink-0 font-medium text-fg">{money(chosen.balance)}</span>
				{#if cents > 0}
					<span class="shrink-0 text-fg-subtle" aria-hidden="true">→</span>
					<span class="sr-only">after this,</span>
					<span
						class="tabular shrink-0 font-medium text-fg"
						use:countUp={{ value: after, initial: false, duration: 0.45, format: money }}
						>{money(after)}</span
					>
				{/if}
			{:else}
				Only the loan moves: nothing is written on an account.
			{/if}
		</p>
	</div>

	<div class="mt-3 grid grid-cols-2 gap-3" data-deal>
		<div>
			<label class={label} for="{uid}-date">Date</label>
			<div class={field}>
				<input
					id="{uid}-date"
					bind:value={date}
					type="date"
					min={loan.issuedOn}
					max={todayKey(timeZone)}
					class="{entry} tabular"
				/>
			</div>
		</div>
		<div>
			<label class={label} for="{uid}-time">Time</label>
			<div class={field}>
				<input id="{uid}-time" bind:value={time} type="time" class="{entry} tabular" />
			</div>
		</div>
	</div>

	{#if chosen}
		<div class="mt-4" data-deal>
			<label class={label} for="{uid}-description">Description</label>
			<div class={field}>
				<input
					id="{uid}-description"
					bind:value={description}
					maxlength={MAX_DESCRIPTION}
					autocomplete="off"
					placeholder="Optional"
					class={entry}
				/>
			</div>
		</div>
	{/if}

	{#if message}
		<p class="mt-4 text-sm text-negative" role="alert">{message}</p>
	{/if}

	<div class="mt-6 flex items-center justify-between gap-3" data-deal>
		<button
			type="button"
			class="text-sm text-fg-muted underline-offset-2 hover:underline disabled:opacity-50"
			disabled={pay.isPending}
			onclick={onDone}
		>
			Cancel
		</button>
		<PillButton type="submit" size="sm" disabled={pay.isPending}>
			{#if pay.isPending}
				Recording…
			{:else}
				{settles ? 'Settle it' : 'Record payment'}
			{/if}
		</PillButton>
	</div>
</form>
