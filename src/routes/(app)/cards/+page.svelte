<script lang="ts">
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { animate, stagger } from 'motion';
	import { flip } from 'svelte/animate';
	import { untrack } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { browser } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { reveal } from '$lib/actions';
	import {
		DEFAULT_HISTORY_RANGE,
		HISTORY_RANGE_SPAN,
		accountColors,
		accountPlace,
		featuredAccounts,
		type HistoryRange
	} from '$lib/accounts';
	import {
		AccountActions,
		AccountIconPicker,
		AccountPanel,
		AccountsSummary,
		AccountTile,
		ArchivedAccounts,
		BalanceChart,
		NewAccountTile
	} from '$lib/components/accounts';
	import { CategoryBars } from '$lib/components/transactions';
	import { Card, Sparkle } from '$lib/components/ui';
	import { DEFAULT_CURRENCY, todayKey } from '$lib/finance';
	import {
		accountsQuery,
		archivedAccountsQuery,
		balanceHistoryQuery,
		colorChoicesQuery,
		transactionsQuery
	} from '$lib/queries';
	import { EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	let { data } = $props();

	const enabled = $derived(browser && data.profile !== null);

	/** How far back the chart reaches — and with it the dial's low and high, and "Where it went". */
	let range = $state<HistoryRange>(DEFAULT_HISTORY_RANGE);

	const list = createQuery(() => ({ ...accountsQuery(), enabled }));
	// Each range is its own cache entry: the last one stays up, dimmed, while
	// the next loads, so the lines morph from it rather than from nothing.
	const history = createQuery(() => ({
		...balanceHistoryQuery(range),
		enabled,
		placeholderData: keepPreviousData
	}));
	const archived = createQuery(() => ({ ...archivedAccountsQuery(), enabled }));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled }));
	const record = createQuery(() => ({ ...transactionsQuery(), enabled }));

	const accounts = $derived(list.data?.accounts ?? []);
	const currency = $derived(list.data?.currency ?? DEFAULT_CURRENCY);
	// The same colour each account wears on the dashboard and in the ledger.
	const colors = $derived(accountColors(accounts, choices.data?.account));

	/**
	 * The account the address opens (`?account=`, `accountPageHref`) — read from
	 * `location` in the browser, as the ledger reads its filters (0012): going
	 * back to an address rewritten below, SvelteKit loads the one first arrived at.
	 */
	const asked = () => (browser ? new URL(location.href) : page.url).searchParams.get('account');

	/** The account picked for the panel, by id: a refetch hands back new objects. */
	let selectedId = $state<string | null>(untrack(asked));

	// The address follows the pick, replaced rather than pushed, so a reload
	// opens the same account and Back leaves the page instead of stepping
	// through every card. Shallow, so no load runs.
	$effect(() => {
		const query = selectedId ? `?${new URLSearchParams({ account: selectedId })}` : '';
		if (query === location.search) return;
		replaceState(`${page.url.pathname}${query}`, page.state);
	});

	// A navigation that lands here again with an account named opens that one;
	// arriving, the two already agree.
	afterNavigate(() => {
		const id = asked();
		if (id && id !== selectedId) show(id);
	});

	let editing = $state(false);
	let creating = $state(false);

	/**
	 * The account in the panel: the one picked while it's still active, else
	 * the main one, else the oldest — so archiving or deleting the open one
	 * hands the panel to the next rather than emptying it.
	 */
	const selected = $derived(
		accounts.find((a) => a.id === selectedId) ??
			featuredAccounts(accounts)[0] ??
			accounts[0] ??
			null
	);
	/** With no account at all, adding one is all the panel can do. */
	const adding = $derived(creating || (list.isSuccess && accounts.length === 0));

	const balancesOf = (id: string) => history.data?.series.find((s) => s.id === id)?.balances ?? [];

	function show(id: string) {
		selectedId = id;
		editing = false;
		creating = false;
	}

	function edit(id: string) {
		selectedId = id;
		editing = true;
		creating = false;
	}

	function writeNew() {
		creating = !creating;
		editing = false;
	}

	/** A new account lands in the panel; giving one up goes back to whichever was open. */
	function done(id?: string) {
		creating = false;
		if (id) selectedId = id;
	}

	/** Escape closes the fields — an edit, or a new account — when nothing over them answered it first. */
	function dismiss(event: KeyboardEvent) {
		if (event.key !== 'Escape' || event.defaultPrevented) return;
		if (creating && accounts.length > 0) creating = false;
		else if (editing) editing = false;
	}

	/** Something a card's menu couldn't do, said under the cards. */
	let problem = $state<string | null>(null);

	const span = $derived(HISTORY_RANGE_SPAN[range]);

	/** The open account's rows since the chart's first day, read in the viewer's zone. */
	const spending = $derived.by(() => {
		const first = history.data?.days[0];
		if (!selected || !first) return [];
		return (record.data?.transactions ?? []).filter(
			(t) => t.account?.id === selected.id && todayKey(data.timeZone, new Date(t.date)) >= first
		);
	});

	let wallet = $state<HTMLElement>();

	// The cards are dealt in one after another as the page arrives, behind the title's reveal.
	$effect(() => {
		if (!wallet || prefersReducedMotion()) return;
		animate(
			wallet.children,
			{ opacity: [0, 1], y: [14, 0], scale: [0.97, 1] },
			{ delay: stagger(0.05, { startDelay: 0.1 }), duration: 0.55, ease: EASE_OUT_QUINT }
		);
	});
</script>

<svelte:head><title>Accounts · Monfly</title></svelte:head>

<svelte:window onkeydown={dismiss} />

<div class="flex flex-col gap-4 px-4 pb-6 sm:px-6 lg:px-8">
	<!-- ── Hero band ──────────────────────────────────────────────────── -->
	<section
		class="grid items-center gap-x-12 gap-y-8 py-8 lg:grid-cols-[auto_minmax(0,1fr)]"
		use:reveal
	>
		<h1 class="font-display text-5xl leading-none font-light tracking-tight xl:text-6xl">
			Accounts
		</h1>
		<AccountsSummary {accounts} archived={archived.data?.accounts.length ?? 0} {currency} />
	</section>

	<!-- ── The cards and their chart on the left, the open account beside them ── -->
	<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
		<div class="flex min-w-0 flex-col gap-4" use:reveal={{ delay: 0.05 }}>
			<div bind:this={wallet} class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
				{#each accounts as account (account.id)}
					<!-- The place the dashboard gives it, chosen or by default, so the two agree. -->
					{@const place = accountPlace(account, accounts)}
					<div animate:flip={{ duration: 450, easing: quintOut }}>
						<AccountTile
							{account}
							{place}
							color={colors[account.id]}
							{currency}
							selected={!adding && selected?.id === account.id}
							balances={balancesOf(account.id)}
							onSelect={() => show(account.id)}
							class="h-full"
						>
							{#snippet mark()}
								<AccountIconPicker {account} onProblem={(message) => (problem = message)} />
							{/snippet}
							{#snippet actions()}
								<AccountActions
									{account}
									{place}
									color={colors[account.id]}
									{currency}
									open={!adding && !editing && selected?.id === account.id}
									onView={() => show(account.id)}
									onEdit={() => edit(account.id)}
									onProblem={(message) => (problem = message)}
								/>
							{/snippet}
						</AccountTile>
					</div>
				{/each}
				{#if data.profile}
					<NewAccountTile pressed={adding} onclick={writeNew} />
				{/if}
			</div>

			{#if problem}
				<p class="text-sm text-negative" role="alert">{problem}</p>
			{/if}

			<Card class="p-7">
				<BalanceChart
					history={history.data}
					loading={history.isPlaceholderData}
					{range}
					onRangeChange={(next) => (range = next)}
					{accounts}
					{colors}
					selectedId={adding ? null : (selected?.id ?? null)}
					onSelect={show}
					{currency}
				/>
			</Card>

			{#if archived.data && archived.data.accounts.length > 0}
				<ArchivedAccounts accounts={archived.data.accounts} currency={archived.data.currency} />
			{/if}
		</div>

		<div class="grid content-start gap-4" use:reveal={{ delay: 0.1 }}>
			{#if data.profile}
				<AccountPanel
					account={adding ? null : selected}
					{editing}
					{accounts}
					color={selected ? colors[selected.id] : 'blue'}
					choices={choices.data?.account}
					{currency}
					balances={selected ? balancesOf(selected.id) : []}
					{span}
					onEditingChange={(next) => (editing = next)}
					onDone={done}
				/>
			{/if}

			{#if selected && !adding}
				<Card class="p-7">
					<div class="flex items-center gap-2.5">
						<Sparkle
							color={colors[selected.id]}
							animated
							burst={`${selected.id}:${range}`}
							class="size-5 shrink-0"
						/>
						<h2 class="font-display text-2xl font-medium">Where it went</h2>
					</div>
					<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
						Spent from {selected.name}, {span}, largest first.
					</p>
					<CategoryBars
						transactions={spending}
						{currency}
						categoryChoices={choices.data?.category}
						class="mt-6"
					/>
				</Card>
			{/if}
		</div>
	</div>
</div>
