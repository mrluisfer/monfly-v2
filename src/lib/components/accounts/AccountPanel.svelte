<script lang="ts">
	import MovingArrowRight from '@jis3r/icons/icons/arrow-right';
	import MovingEye from '@jis3r/icons/icons/eye';
	import MovingPencil from '@jis3r/icons/icons/pencil';
	import MovingPlus from '@jis3r/icons/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import gsap from 'gsap';
	import { animate } from 'motion';
	import { accountPlace, kindLabel, type Account } from '$lib/accounts';
	import { countUp } from '$lib/actions';
	import {
		AnimatedIcon,
		Card,
		IconButton,
		Notice,
		Orb,
		type PaletteColor
	} from '$lib/components/ui';
	import { formatMoney, type Cents, type Currency } from '$lib/finance';
	import { accountLedgerHref } from '$lib/ledger-view';
	import { setColorMutation } from '$lib/queries';
	import { pop } from '$lib/transitions';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';
	import AccountEditor from './AccountEditor.svelte';
	import BalanceGauge from './BalanceGauge.svelte';

	/**
	 * The panel beside the cards, where an account is read and written — the
	 * ledger panel's three modes, in the same colours: it reads an account
	 * (the eye, blue), edits it (the pencil, violet) or, with no account at
	 * all, adds one (the plus, lime). Reading, it's the account's dial, this
	 * month's movement and its facts.
	 */
	type Props = {
		/** The account on show, or nothing: then the panel adds a new one. */
		account: Account | null;
		/** Open on the account's fields rather than its facts. */
		editing?: boolean;
		/** Every active account: the editor names who holds a role, and picks a new one's colour. */
		accounts: Account[];
		color: PaletteColor;
		/** Colours people picked for their accounts (`User.colors.account`). */
		choices?: Record<string, PaletteColor>;
		currency: Currency;
		/** Its balances over the chart's range: the dial's low and high. */
		balances?: (Cents | null)[];
		/** What the range covers, as a phrase: "the last 3 months". */
		span: string;
		onEditingChange: (editing: boolean) => void;
		/** A new account was added, or adding one was given up on. */
		onDone: (id?: string) => void;
	};

	let {
		account,
		editing = false,
		accounts,
		color,
		choices,
		currency,
		balances = [],
		span,
		onEditingChange,
		onDone
	}: Props = $props();

	const queryClient = useQueryClient();
	const recolor = createMutation(() => setColorMutation(queryClient));
	const refused = $derived(recolor.isError && recolor.variables?.key === account?.id);

	const writing = $derived(account === null);
	/** What it's showing — an account's facts, its fields, or a new one's — so a change can turn it. */
	const showing = $derived(account ? `${account.id}:${editing}` : 'new');
	const subject = $derived(account?.id ?? 'new');

	const money = (cents: number) => formatMoney(cents, currency);
	const signed = (cents: number) =>
		`${cents > 0 ? '+' : cents < 0 ? '−' : ''}${money(Math.abs(cents))}`;

	/** The dial's ends: the lowest and highest the balance has been over the range, today's included. */
	const bounds = $derived.by(() => {
		const values = balances.filter((b): b is number => b !== null);
		if (account) values.push(account.balance);
		return values.length
			? { low: Math.min(...values), high: Math.max(...values) }
			: { low: 0, high: 0 };
	});

	const ROLE = {
		main: 'Main, on the dashboard',
		secondary: 'Secondary, on the dashboard',
		savings: 'Savings, for the goal'
	} as const;

	/** The role it holds, or the dashboard slot it fills by default: what the card's badge says. */
	const place = $derived(account ? accountPlace(account, accounts) : null);

	const added = $derived(
		account
			? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
					new Date(account.createdAt)
				)
			: ''
	);

	let panel = $state<HTMLElement | null>(null);
	let was = 0;
	let held: string | null = null;
	let easing: ReturnType<typeof animate> | null = null;

	/**
	 * The panel keeps its place while what's in it changes — the fields opening
	 * over the facts, another account taking it over — easing its height
	 * between the two so the cards below glide with it; an account arriving
	 * rises into it. The ledger panel's motion, measured the same way.
	 */
	$effect(() => {
		void showing;
		const node = panel;
		if (!node) return;

		easing?.stop();
		node.style.height = '';
		const to = node.offsetHeight;
		const from = was;
		const arrived = held !== null && held !== subject;
		was = to;
		held = subject;

		if (prefersReducedMotion()) return;

		if (from && from !== to) {
			easing = animate(
				node,
				{ height: [`${from}px`, `${to}px`] },
				{ duration: 0.42, ease: EASE_OUT_QUINT }
			);
			easing.finished
				.then(() => {
					node.style.height = '';
					easing = null;
				})
				.catch(() => {});
		}

		const card = node.firstElementChild;
		if (arrived && card instanceof HTMLElement) {
			card.style.opacity = '0';
			animate(card, { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, ease: EASE_OUT_QUINT })
				.finished.then(() => {
					card.style.opacity = '';
				})
				.catch(() => {});
		}
	});

	let halo = $state<HTMLElement | null>(null);
	let turned = false;

	/** A halo swells out of the mode's chip as the panel turns from one mode to another. */
	$effect(() => {
		void editing;
		void writing;
		if (!turned) {
			turned = true;
			return;
		}
		const ring = halo;
		if (!ring || prefersReducedMotion()) return;
		gsap.fromTo(
			ring,
			{ scale: 0.85, opacity: 0.35 },
			{ scale: 1.8, opacity: 0, duration: 0.55, ease: 'power2.out', overwrite: true }
		);
		return () => gsap.killTweensOf(ring);
	});
</script>

<div bind:this={panel} class="overflow-hidden">
	<Card class="p-7">
		<div class="flex items-start justify-between gap-4">
			<div class="flex min-w-0 items-center gap-2.5 text-[0.9375rem] text-fg-muted">
				<span
					class={cn(
						'relative grid size-7 shrink-0 place-items-center rounded-lg transition-colors duration-300',
						writing
							? 'bg-lime/30 text-[color-mix(in_oklab,var(--lime)_40%,var(--ink))] dark:bg-lime/15 dark:text-lime'
							: editing
								? 'bg-violet/12 text-violet'
								: 'bg-blue/12 text-blue'
					)}
					aria-hidden="true"
				>
					<span
						bind:this={halo}
						class="pointer-events-none absolute inset-0 rounded-lg bg-current opacity-0"
					></span>
					{#key showing}
						<span class="relative flex" in:pop={{ scale: 0.5, bounce: 0.5, duration: 0.45 }}>
							<AnimatedIcon
								icon={writing ? MovingPlus : editing ? MovingPencil : MovingEye}
								set="moving"
								trigger="mount"
							/>
						</span>
					{/key}
				</span>
				<span class="truncate">
					{#if account}
						{editing ? 'Editing' : `${kindLabel(account.type) ?? 'An'} account`}
					{:else}
						New account
					{/if}
				</span>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				{#if account}
					<!-- A toggle, held down in violet while the fields are open, as the ledger panel's is. -->
					<IconButton
						size="sm"
						aria-pressed={editing}
						aria-label={editing ? 'Stop editing' : 'Edit account'}
						onclick={() => onEditingChange(!editing)}
						class={cn(
							'transition-colors duration-300',
							editing && 'border-violet/40 bg-violet/12 text-violet not-disabled:hover:bg-violet/20'
						)}
					>
						<AnimatedIcon icon={MovingPencil} set="moving" play={editing} />
					</IconButton>
				{:else if accounts.length > 0}
					<IconButton size="sm" aria-label="Discard this account" onclick={() => onDone()}>
						<X />
					</IconButton>
				{/if}
			</div>
		</div>

		{#if account}
			<!-- The name beside its colour, which is pressed to change. -->
			<div class="mt-5 flex items-start gap-3">
				<Orb
					{color}
					editable
					label="the {account.name} account"
					onChange={(next) => recolor.mutate({ kind: 'account', key: account.id, color: next })}
					error={refused ? "Couldn't save this color. Try again." : undefined}
					blur={5}
					spread={80}
					class="mt-0.5 size-9 shrink-0 border border-line bg-card"
				/>
				<div class="min-w-0">
					<h2 class="font-display text-2xl leading-tight font-medium text-balance wrap-anywhere">
						{account.name}
					</h2>
					{#if account.provider || account.last4}
						<p class="tabular mt-0.5 text-sm text-fg-muted">
							{[account.provider, account.last4 && `•••• ${account.last4}`]
								.filter(Boolean)
								.join(' · ')}
						</p>
					{/if}
				</div>
			</div>
		{/if}

		{#if account && !editing}
			<BalanceGauge
				balance={account.balance}
				low={bounds.low}
				high={bounds.high}
				change={account.change}
				{color}
				{currency}
				{span}
				updatedAt={account.updatedAt}
				class="mt-8"
			/>

			<!-- This month on the account, one fact per column: in, out, and what it came to. -->
			<dl class="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6">
				{#each [{ label: 'In', value: account.change + account.tracked, tone: 'text-positive' }, { label: 'Out', value: account.tracked, tone: '' }, { label: 'Net', value: account.change, tone: '' }] as fact (fact.label)}
					<div class="min-w-0">
						<dt class="text-sm text-fg-muted">{fact.label} this month</dt>
						<dd class="@container mt-1">
							<p
								class={cn('fit-figure tabular font-display leading-none font-light', fact.tone)}
								style="--fit: 1.25rem; --chars: {signed(fact.value).length}"
								use:countUp={{
									value: fact.value,
									format: fact.label === 'Net' ? signed : money,
									whenVisible: true
								}}
							>
								{fact.label === 'Net' ? signed(fact.value) : money(fact.value)}
							</p>
						</dd>
					</div>
				{/each}
			</dl>

			<dl class="mt-6 grid gap-3 border-t border-line pt-6">
				<div class="flex items-baseline justify-between gap-4">
					<dt class="text-sm text-fg-muted">Featured as</dt>
					<dd class="text-right text-[0.9375rem]">
						{#if place}
							{ROLE[place.role]}
							{#if !place.chosen}
								<span class="block text-xs text-fg-subtle">By default: not chosen yet</span>
							{/if}
						{:else}
							<span class="text-fg-subtle">Not featured</span>
						{/if}
					</dd>
				</div>
				<div class="flex items-baseline justify-between gap-4">
					<dt class="text-sm text-fg-muted">Added</dt>
					<dd class="text-right text-[0.9375rem]">{added}</dd>
				</div>
				<div class="flex items-baseline justify-between gap-4">
					<dt class="text-sm text-fg-muted">To review</dt>
					<dd class="tabular text-right text-[0.9375rem]">
						{account.toReview === 0 ? 'Nothing' : account.toReview}
					</dd>
				</div>
			</dl>

			<a
				href={accountLedgerHref(account.id)}
				class="go mt-6 inline-flex items-center gap-1.5 rounded-md text-[0.9375rem] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
			>
				See its transactions
				<AnimatedIcon icon={MovingArrowRight} set="moving" size={16} class="arrow" />
			</a>
		{:else}
			{#if !account}
				<Notice id="new-account" title="Adding an account" class="mt-6">
					Its name, what kind it is, and what it holds today. That balance joins your total, and
					every transaction you give it moves it from here on.
				</Notice>
			{/if}
			{#key subject}
				<AccountEditor
					{account}
					{accounts}
					{choices}
					{currency}
					cancellable={account !== null || accounts.length > 0}
					onDone={(id) => (account ? onEditingChange(false) : onDone(id))}
				/>
			{/key}
		{/if}
	</Card>
</div>

<style>
	/* The arrow pushes the way it points under the pointer, as every link that goes somewhere does. */
	.go :global(.arrow) {
		transition: translate 0.45s var(--ease-spring);
	}

	.go:hover :global(.arrow),
	.go:focus-visible :global(.arrow) {
		translate: 0.25rem 0;
	}
</style>
