<script lang="ts">
	import ColorTrendingDown from '@animated-color-icons/lucide-svelte/TrendingDown.svelte';
	import ColorTrendingUp from '@animated-color-icons/lucide-svelte/TrendingUp.svelte';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { RadioGroup } from 'bits-ui';
	import { animate, stagger } from 'motion';
	import { untrack } from 'svelte';
	import {
		ACCOUNT_KIND_LABEL,
		ACCOUNT_KINDS,
		MAX_ACCOUNT_NAME,
		MAX_BALANCE,
		MAX_PROVIDER,
		accountColors,
		isAccountKind,
		type Account,
		type AccountKind,
		type AccountRole
	} from '$lib/accounts';
	import { moneyField } from '$lib/actions';
	import {
		Orb,
		PALETTE,
		PALETTE_COLORS,
		PillButton,
		Segmented,
		Select,
		type PaletteColor
	} from '$lib/components/ui';
	import {
		currencySymbol,
		formatMoney,
		MAX_MONEY_LENGTH,
		parseMoney,
		toMoneyInput,
		type Currency
	} from '$lib/finance';
	import { addAccountMutation, editAccountMutation, setColorMutation } from '$lib/queries';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	/**
	 * The panel with its fields open: what v1 keeps about an account — its
	 * name, kind, issuer, last four digits and balance — and what v2 adds, the
	 * place it's featured and, for a new one, its colour. The same fields add
	 * one and rewrite one.
	 *
	 * A new balance on an existing account is a correction: it's recorded on
	 * today (`BalanceAdjustment`), so the chart shows the jump where it happened
	 * rather than rewriting the account's past, and the total moves with it.
	 */
	type Props = {
		/** The account being changed, or nothing to add a new one. */
		account?: Account | null;
		/** Every active account: who holds a role now, and the colour a new one would get. */
		accounts: Account[];
		/** Colours people picked for their accounts (`User.colors.account`). */
		choices?: Record<string, PaletteColor>;
		currency: Currency;
		/** Saved — with the account's id — or given up on. */
		onDone: (id?: string) => void;
		/** Given up on is only offered where there's somewhere to go back to. */
		cancellable?: boolean;
	};

	let { account = null, accounts, choices, currency, onDone, cancellable = true }: Props = $props();

	const uid = $props.id();
	const queryClient = useQueryClient();
	const add = createMutation(() => addAccountMutation(queryClient));
	const edit = createMutation(() => editAccountMutation(queryClient));
	const recolor = createMutation(() => setColorMutation(queryClient));
	const save = $derived(account ? edit : add);

	// Filled once as the fields open, and left alone after: a refetch while
	// someone is typing shouldn't reach in and rewrite what they wrote.
	const start = untrack(() => account);
	let name = $state(start?.name ?? '');
	/** v1 left the kind optional; a field always holds one, and "Other" is the kind of none. */
	let kind = $state<AccountKind>(
		start ? (isAccountKind(start.type) ? start.type : 'other') : 'debit'
	);
	let provider = $state(start?.provider ?? '');
	let last4 = $state(start?.last4 ?? '');
	let owes = $state<'holds' | 'owes'>((start?.balance ?? 0) < 0 ? 'owes' : 'holds');
	let amount = $state(start ? toMoneyInput(Math.abs(start.balance)) : '');
	let role = $state<AccountRole | 'none'>(start?.role ?? 'none');

	/** The colour a new account gets on its own — its rank's — until one is picked. */
	const suggested = $derived(
		accountColors([...accounts, { id: '', role: role === 'none' ? null : role }], choices)['']
	);
	let picked = $state<PaletteColor | null>(null);
	const color = $derived(picked ?? suggested);

	const typed = $derived(amount.trim() === '' ? 0 : parseMoney(amount));
	const balance = $derived(typed === null ? null : owes === 'owes' ? -typed : typed);
	/** What saving would move the balance by, for an account that already has one. */
	const correction = $derived(start && balance !== null ? balance - start.balance : 0);

	/** Whoever holds the chosen place now, if it isn't this account. */
	const holder = $derived(
		role === 'none' ? null : accounts.find((a) => a.role === role && a.id !== start?.id)
	);

	const signed = (cents: number) =>
		`${cents > 0 ? '+' : cents < 0 ? '−' : ''}${formatMoney(Math.abs(cents), currency)}`;

	let problem = $state<string | null>(null);
	const message = $derived(problem ?? (save.error ? `Couldn't save: ${save.error.message}` : null));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (name.trim() === '') {
			problem = 'Give it a name, like “Everyday debit”.';
		} else if (name.length > MAX_ACCOUNT_NAME) {
			problem = `A name runs to ${MAX_ACCOUNT_NAME} characters.`;
		} else if (provider.length > MAX_PROVIDER) {
			problem = `An issuer runs to ${MAX_PROVIDER} characters.`;
		} else if (last4 !== '' && !/^\d{4}$/.test(last4)) {
			problem = 'The last digits are four of them, or none.';
		} else if (balance === null) {
			problem = 'Enter its balance, like 7,540.';
		} else if (Math.abs(balance) > MAX_BALANCE) {
			problem = `The most a balance can be is ${formatMoney(MAX_BALANCE, currency)}.`;
		} else {
			problem = null;
			const draft = {
				name: name.trim(),
				type: kind,
				provider: provider.trim() || null,
				last4: last4 || null,
				balance,
				role: role === 'none' ? null : role
			};
			if (start) {
				edit.mutate({ id: start.id, draft }, { onSuccess: () => onDone(start.id) });
			} else {
				add.mutate(draft, {
					onSuccess: ({ id }) => {
						if (picked) recolor.mutate({ kind: 'account', key: id, color: picked });
						onDone(id);
					}
				});
			}
		}
	}

	const field =
		'flex h-11 items-center gap-2 rounded-full border border-hairline px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue';
	const entry =
		'min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-fg-subtle';
	const label = 'mb-1.5 block text-sm text-fg-muted';

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
		<label class={label} for="{uid}-name">Name</label>
		<div class={field}>
			<input
				id="{uid}-name"
				bind:value={name}
				maxlength={MAX_ACCOUNT_NAME}
				autocomplete="off"
				placeholder="Everyday debit"
				class={entry}
			/>
		</div>
	</div>

	<div class="mt-4" data-deal>
		<span class={label}>Kind</span>
		<Segmented
			bind:value={kind}
			label="Kind of account"
			options={ACCOUNT_KINDS.map((k) => ({ value: k, label: ACCOUNT_KIND_LABEL[k] }))}
			class="w-full"
		/>
	</div>

	<div class="mt-4 grid grid-cols-[minmax(0,1fr)_7rem] gap-3" data-deal>
		<div>
			<label class={label} for="{uid}-provider">Issuer</label>
			<div class={field}>
				<input
					id="{uid}-provider"
					bind:value={provider}
					maxlength={MAX_PROVIDER}
					autocomplete="off"
					placeholder="BBVA, Visa"
					class={entry}
				/>
			</div>
		</div>
		<div>
			<label class={label} for="{uid}-last4">Last 4</label>
			<div class={field}>
				<!-- Digits only, as they're typed: anything else never lands. -->
				<input
					id="{uid}-last4"
					value={last4}
					oninput={(event) => {
						const kept = event.currentTarget.value.replace(/\D/g, '').slice(0, 4);
						event.currentTarget.value = kept;
						last4 = kept;
					}}
					inputmode="numeric"
					maxlength={4}
					autocomplete="off"
					spellcheck="false"
					placeholder="1234"
					class="{entry} tabular tracking-widest"
				/>
			</div>
		</div>
	</div>

	<div class="mt-4" data-deal>
		<label class={label} for="{uid}-balance">Balance today</label>
		<!-- Which way the balance runs, in the trends and colours the ledger's figures wear. -->
		<Segmented
			bind:value={owes}
			label="Whether the account holds money or owes it"
			options={[
				{
					value: 'holds',
					label: 'Holds',
					icon: { icon: ColorTrendingUp, set: 'color' },
					chip: 'bg-positive/12 text-positive'
				},
				{
					value: 'owes',
					label: 'Owes',
					icon: { icon: ColorTrendingDown, set: 'color' },
					chip: 'bg-spent/12 text-spent'
				}
			]}
			class="w-full"
		/>
		<div class={cn(field, 'mt-2')}>
			<span class="text-fg-muted" aria-hidden="true"
				>{owes === 'owes' ? '−' : ''}{currencySymbol(currency)}</span
			>
			<input
				id="{uid}-balance"
				value={amount}
				use:moneyField={(next) => (amount = next)}
				inputmode="decimal"
				autocomplete="off"
				spellcheck="false"
				maxlength={MAX_MONEY_LENGTH}
				placeholder="0"
				aria-describedby="{uid}-balance-note"
				class="{entry} tabular font-display text-lg"
			/>
			<span class="text-sm text-fg-subtle">{currency}</span>
		</div>
		<p id="{uid}-balance-note" class="mt-1.5 min-h-5 text-xs text-fg-muted">
			{#if !start}
				It joins your total as it's added.
			{:else if correction !== 0}
				Saving records a correction of <span class="tabular font-medium text-fg"
					>{signed(correction)}</span
				> today.
			{/if}
		</p>
	</div>

	<div class="mt-2" data-deal>
		<span class={label}>Featured as</span>
		<Select
			label="Featured as"
			value={role}
			onValueChange={(next) => (role = next)}
			options={[
				{ value: 'none', label: 'Not featured' },
				{ value: 'main', label: 'Main, on the dashboard' },
				{ value: 'secondary', label: 'Secondary, on the dashboard' },
				{ value: 'savings', label: 'Savings, for the goal' }
			]}
			class="w-full justify-between"
		/>
		{#if holder}
			<p class="mt-1.5 text-xs text-fg-muted">Takes the place from {holder.name}.</p>
		{/if}
	</div>

	{#if !start}
		<!-- One colour everywhere it's drawn: the card's glow, its line, its orb. -->
		<div class="mt-4" data-deal>
			<span class={label}>Color</span>
			<RadioGroup.Root
				value={color}
				onValueChange={(next) => (picked = next as PaletteColor)}
				orientation="horizontal"
				loop
				aria-label="Color"
				class="grid grid-cols-6 gap-2"
			>
				{#each PALETTE_COLORS as tone (tone)}
					<RadioGroup.Item
						value={tone}
						aria-label={PALETTE[tone].label}
						class={cn(
							'press relative aspect-square cursor-pointer rounded-full ring-offset-2 ring-offset-card outline-none',
							'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue',
							'data-[state=checked]:ring-2 data-[state=checked]:ring-fg'
						)}
					>
						<span
							class="relative block size-full overflow-hidden rounded-full border border-line bg-card"
						>
							<Orb color={tone} blur={2.5} spread={82} class="absolute inset-0 size-full" />
						</span>
					</RadioGroup.Item>
				{/each}
			</RadioGroup.Root>
		</div>
	{/if}

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
				{start ? 'Save changes' : 'Add account'}
			{/if}
		</PillButton>
	</div>
</form>
