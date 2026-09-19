<script lang="ts">
	import MovingPlus from '@jis3r/icons/icons/plus';
	import MovingSendHorizontal from '@jis3r/icons/icons/send-horizontal';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { untrack } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { reveal } from '$lib/actions';
	import { accountColors } from '$lib/accounts';
	import { AccountsTotal } from '$lib/components/accounts';
	import {
		AccountBalances,
		ActivityBars,
		CategoryBars,
		TransactionPanel,
		TransactionsSummary,
		TransactionsTable,
		UnassignedCard
	} from '$lib/components/transactions';
	import {
		AnimatedIcon,
		Card,
		IconButton,
		PALETTE,
		PillButton,
		Select,
		Sparkle
	} from '$lib/components/ui';
	import {
		DEFAULT_CURRENCY,
		addMonths,
		currentMonth,
		monthName,
		type MonthKey
	} from '$lib/finance';
	import { ledgerSearch, readLedgerView } from '$lib/ledger-view';
	import { accountsQuery, colorChoicesQuery, transactionsQuery } from '$lib/queries';
	import {
		blankDraft,
		readPanel,
		rowDraft,
		transferDraft,
		writePanel,
		type PanelState,
		type TransactionDraft
	} from '$lib/transaction-panel';
	import { pop } from '$lib/transitions';
	import type { TransactionRow } from '$lib/transactions';
	import { cn } from '$lib/utils';

	let { data } = $props();

	/**
	 * What the address asks the ledger to narrow by (`$lib/ledger-view`). In the
	 * browser it's read from `location`, not `page.url`: going back to an address
	 * this page rewrote, SvelteKit loads the one it first arrived at, while
	 * `location` holds the last.
	 */
	const asked = () =>
		readLedgerView((browser ? new URL(location.href) : page.url).searchParams, data.month);
	const arrival = untrack(asked);

	// The page opens on the whole record, or the month its address names; the
	// filter narrows it to one month, a second query. Stepping past December
	// simply lands in the next year: a month key is an index, not a pair of fields.
	let filter = $state<'all' | MonthKey>(arrival.month);
	/**
	 * This month is as far forward as there is: the endpoint refuses later ones.
	 * Derived, so a load that runs again — or a clock that rolls over — moves it.
	 */
	const latest = $derived(data.month);

	/** Which way the last move went, so the new label enters from that side. */
	let dir = $state(1);

	function show(next: 'all' | MonthKey) {
		dir = next !== 'all' && filter !== 'all' && next < filter ? -1 : 1;
		filter = next;
	}

	/** The ledger's search, kind and filters, as the table last said them. */
	let ledger = $state({ kind: arrival.kind, search: arrival.search, filter: arrival.filter });
	let table = $state<ReturnType<typeof TransactionsTable>>();
	/** The query the address last carried, so it's rewritten only when something moves. */
	let said = ledgerSearch(arrival);

	// Replaced, not pushed: Back leaves the page rather than stepping back
	// through every filter. Shallow, so no load runs.
	$effect(() => {
		const query = ledgerSearch({ month: filter, ...ledger });
		if (query === said) return;
		said = query;
		replaceState(`${page.url.pathname}${query}`, page.state);
	});

	/**
	 * A navigation that lands here again — the Transactions tab, `g t`, Back to
	 * an earlier address — narrows the ledger to what its address asks, keeping
	 * its sort and columns. Arriving, the two already agree.
	 */
	afterNavigate(() => {
		const next = asked();
		const query = ledgerSearch(next);
		if (query === said) return;
		said = query;
		show(next.month);
		ledger = { kind: next.kind, search: next.search, filter: next.filter };
		table?.show(next);
	});

	const enabled = $derived(browser && data.profile !== null);
	// Each month is its own cache entry, so walking to one not yet fetched would
	// otherwise leave `data` empty for a beat — and the figures beside the title,
	// which cover the whole record and never narrow with the list, would fall to
	// zero and count themselves back up over nothing. Holding the last answer
	// keeps them still, as the dashboard's cards do when their period moves.
	const list = createQuery(() => ({
		...transactionsQuery(filter === 'all' ? undefined : filter),
		enabled,
		placeholderData: keepPreviousData
	}));

	const monthLabel = (m: MonthKey) => `${monthName(m)} ${m.slice(0, 4)}`;

	/** The month the record begins in, as seen from the viewer's zone. */
	const first = $derived(
		list.data?.oldest ? currentMonth(data.timeZone, new Date(list.data.oldest)) : null
	);
	// Everything, then every month from this one back to the first on record.
	const options = $derived.by(() => {
		const out: { value: 'all' | MonthKey; label: string }[] = [{ value: 'all', label: 'All time' }];
		if (first) {
			for (let m = latest; m >= first; m = addMonths(m, -1)) {
				out.push({ value: m, label: monthLabel(m) });
			}
		}
		return out;
	});

	/** There is an earlier month on record to walk back to. */
	const behind = $derived(filter !== 'all' && first !== null && filter > first);
	/** Somewhere ahead of this month there is another one to walk to. */
	const ahead = $derived(filter !== 'all' && filter < latest);

	// Activity reads the whole record even while the list is narrowed, so the
	// months around the picked one keep their figures. The page opens on it, so
	// it is already in the cache.
	const record = createQuery(() => ({ ...transactionsQuery(), enabled }));
	const accounts = createQuery(() => ({ ...accountsQuery(), enabled }));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled }));

	const rows = $derived(list.data?.transactions ?? []);
	const currency = $derived(list.data?.currency ?? DEFAULT_CURRENCY);
	const totals = $derived(list.data?.totals ?? { received: 0, spent: 0, count: 0 });

	// The same colour each account wears on the dashboard, so an orb means the
	// same thing in both places.
	const colors = $derived(accountColors(accounts.data?.accounts ?? [], choices.data?.account));

	/**
	 * Every category the whole record names, most used first — what the panel's
	 * category field offers. The whole record rather than the month on show:
	 * a category is a category whichever month it was last used in, and the
	 * ones reached for most should head the list.
	 */
	const categories = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const t of record.data?.transactions ?? [])
			counts[t.category] = (counts[t.category] ?? 0) + 1;
		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([name]) => name);
	});

	/** The row in the panel, by id: the list holds the row itself, and a browser can keep an id. */
	let selectedId = $state<string | null>(null);
	/** The panel is open on its fields rather than its facts. */
	let editing = $state(false);
	/** The panel is writing a new transaction rather than showing a row. */
	let creating = $state(false);
	/**
	 * What the fields hold while they're open. Filled here as they open — from
	 * the row, from nothing, or from what this browser kept — and left alone
	 * after: a refetch while someone is typing shouldn't reach in and rewrite
	 * what they have half written.
	 */
	let draft = $state<TransactionDraft>(untrack(() => blankDraft(data.timeZone)));
	/**
	 * The panel follows the list rather than the row that opened it: an edit
	 * lands in it as soon as the ledger has it, and a row that leaves — assigned
	 * an account, or deleted — takes the panel with it.
	 */
	const open = $derived(rows.find((r) => r.id === selectedId) ?? null);

	/** Opening another row, or the same one again, always starts on its facts. */
	function openRow(row: TransactionRow, fields = false) {
		const same = selectedId === row.id;
		// Already writing into this one: its fields keep what has been typed.
		if (fields && !(same && editing)) draft = rowDraft(row, data.timeZone);
		selectedId = same && !fields ? null : row.id;
		editing = selectedId !== null && fields;
		creating = false;
	}

	/** The pencil: the fields open on the row as it is recorded. */
	function edit(next: boolean) {
		if (next && open) draft = rowDraft(open, data.timeZone);
		editing = next;
	}

	/** The panel is writing a transfer rather than a transaction. */
	const moving = $derived(creating && draft.type === 'transfer');

	/**
	 * The panel takes a new transaction instead of whichever row it held.
	 * Pressed again, it closes; pressed while a transfer is being written, the
	 * transfer turns into a transaction and keeps what was typed.
	 */
	function writeNew() {
		if (moving) draft.type = 'expense';
		else {
			creating = !creating;
			if (creating) draft = blankDraft(data.timeZone);
		}
		selectedId = null;
		editing = false;
	}

	/** The same for a transfer, from the first account towards the next one. */
	function writeTransfer() {
		const list = accounts.data?.accounts ?? [];
		if (creating && !moving) {
			const ends = transferDraft(data.timeZone, list, draft.account ?? undefined);
			draft = { ...draft, type: 'transfer', account: ends.account, to: ends.to };
		} else {
			creating = !creating;
			if (creating) draft = transferDraft(data.timeZone, list);
		}
		selectedId = null;
		editing = false;
	}

	/** Two accounts at least, or there's nowhere to move money between. */
	const canTransfer = $derived((accounts.data?.accounts.length ?? 0) >= 2);

	/** There is something in the panel's room: a row, or a new one being written. */
	const showing = $derived(creating || open !== null);

	/** The panel closes, whichever of the three it was doing. */
	function closePanel() {
		selectedId = null;
		editing = false;
		creating = false;
	}

	/**
	 * Whose panel this browser keeps. Nobody's for a new Auth0 user with no v1
	 * row yet: theirs lasts only as long as the page.
	 */
	const owner = $derived(data.profile?.id ?? null);
	/** What this browser kept has been read, so the first write can't wipe it. */
	let restored = $state(false);

	/**
	 * The panel comes back as it was left before a reload or a trip to another
	 * page. Read once, after hydration — the server can't see it — and only once
	 * the ledger has loaded, so a kept row that isn't in it any more is let go
	 * rather than held open over nothing. The format: `$lib/transaction-panel`.
	 */
	$effect(() => {
		if (restored || !owner || !list.isSuccess || list.isPlaceholderData) return;
		const kept = readPanel(owner);
		if (kept?.mode === 'new') {
			creating = true;
			draft = kept.draft;
		} else if (kept && rows.some((r) => r.id === kept.id)) {
			selectedId = kept.id;
			editing = kept.mode === 'edit';
			if (kept.mode === 'edit') draft = kept.draft;
		}
		restored = true;
	});

	// Kept on every change, down to a keystroke — the snapshot reads each field,
	// so each one is tracked — and forgotten once the panel closes.
	$effect(() => {
		if (!restored || !owner) return;
		const state: PanelState | null = creating
			? { mode: 'new', draft }
			: selectedId === null
				? null
				: editing
					? { mode: 'edit', id: selectedId, draft }
					: { mode: 'view', id: selectedId };
		writePanel(owner, $state.snapshot(state));
	});

	/**
	 * Escape closes the panel — a row being read, its fields, or a new
	 * transaction half written. Whatever is over it gets the key first and
	 * keeps it: bits-ui answers Escape on its own menus, lists and dialogs and
	 * marks the event answered, as a browser does clearing a search field with
	 * it. Only an unanswered Escape reaches the panel — asking instead whether
	 * a layer is in the document would swallow one while a layer that has
	 * already closed plays out its exit. Not in the hotkeys registry: that is
	 * for sequences of plain keys that go somewhere, not for dismissing what is
	 * in front of you.
	 */
	function dismiss(event: KeyboardEvent) {
		if (event.key !== 'Escape' || event.defaultPrevented || !showing) return;
		closePanel();
	}
</script>

<svelte:head><title>Transactions · Monfly</title></svelte:head>

<svelte:window onkeydown={dismiss} />

<div class="flex flex-col gap-4 px-4 pb-6 sm:px-6 lg:px-8">
	<!-- ── Hero band: one row — the title, what someone has on the dashboard's
	     own 22rem, so the total is drawn the width it was drawn for, then the
	     ledger's figures. When the row runs short they wrap on the right, the
	     title keeping its place: among themselves while two still fit beside
	     the total (2 × 12rem and the gap), under it once they don't ──────── -->
	<section
		class="grid items-center gap-x-12 gap-y-8 py-8 lg:grid-cols-[auto_minmax(0,1fr)]"
		use:reveal
	>
		<h1 class="font-display text-5xl leading-none font-light tracking-tight xl:text-6xl">
			Transactions
		</h1>
		<div class="flex flex-wrap items-start gap-x-10 gap-y-8">
			<!-- The dashboard's total, controls and all: its share bar leaves an
			     account out of the total, and this browser keeps what it left out. -->
			<AccountsTotal
				accounts={accounts.data?.accounts ?? []}
				unassigned={accounts.data?.unassigned ?? null}
				{colors}
				{currency}
				leftOut={data.leftOut}
				class="w-[22rem] max-w-full"
			/>
			<TransactionsSummary
				received={totals.received}
				spent={totals.spent}
				count={totals.count}
				{currency}
				class="grow basis-[26.5rem]"
			/>
		</div>
	</section>

	<!-- ── The ledger on the left, the charts stacked beside it ────────── -->
	<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
		<!-- Each column lands after the one before it, as the dashboard's do:
		     revealing the grid whole made the page arrive as one slab. -->
		<div class="flex flex-col gap-4" use:reveal={{ delay: 0.05 }}>
			<Card class="flex flex-col p-7">
				<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
					<h2 class="font-display text-2xl font-medium">
						<!-- Keyed on the filter, so each month enters from the side it came from.
						     `inline-block` because a transform does nothing to an inline box. -->
						{#key filter}
							<span class="inline-block" in:pop={{ x: dir * 12, duration: 0.32 }}>
								{#if filter === 'all'}
									Everything
								{:else}
									{monthName(filter)}<span class="ml-2 font-normal text-fg-muted"
										>{filter.slice(0, 4)}</span
									>
								{/if}
							</span>
						{/key}
					</h2>

					<!-- The filter leads the group and holds its place; the arrows walk from
					     the month it picked, and come and go with one. Each control that comes
					     and goes sits in a wrapper that collapses with it, and the wrapper
					     carries the gap — a flex gap outlives the control and snaps shut on
					     unmount — so its neighbours glide. -->
					<div class="flex items-center">
						{#if list.data?.capped}
							<p class="mr-4 text-sm text-fg-muted">Showing the most recent only.</p>
						{/if}

						<Select label="Period" {options} value={filter} onValueChange={show} />

						<!-- Gone at either end of the record rather than greyed out: there is
						     nothing there to reach, so the control shouldn't be there to press. -->
						{#if behind}
							<div
								class="shrink-0 pl-4"
								transition:slide={{ axis: 'x', duration: 350, easing: quintOut }}
							>
								<div
									in:pop={{ scale: 0.5, bounce: 0.4, duration: 0.45 }}
									out:pop={{ scale: 0.5, duration: 0.3 }}
								>
									<IconButton
										size="sm"
										aria-label="Previous month"
										onclick={() => filter !== 'all' && show(addMonths(filter, -1))}
									>
										<ChevronLeft />
									</IconButton>
								</div>
							</div>
						{/if}

						{#if ahead}
							<div
								class="shrink-0 pl-2"
								transition:slide={{ axis: 'x', duration: 350, easing: quintOut }}
							>
								<div
									in:pop={{ scale: 0.5, bounce: 0.4, duration: 0.45 }}
									out:pop={{ scale: 0.5, duration: 0.3 }}
								>
									<IconButton
										size="sm"
										aria-label="Next month"
										onclick={() => filter !== 'all' && show(addMonths(filter, 1))}
									>
										<ChevronRight />
									</IconButton>
								</div>
							</div>
						{/if}

						<!-- Money moved between two accounts, beside writing a transaction: held
						     down in the lavender a transfer's rows wear while the panel writes
						     one. It makes room as it arrives, once there are two accounts. -->
						{#if canTransfer}
							<div
								class="shrink-0 pl-2"
								transition:slide={{ axis: 'x', duration: 350, easing: quintOut }}
							>
								<div
									in:pop={{ scale: 0.5, bounce: 0.4, duration: 0.45 }}
									out:pop={{ scale: 0.5, duration: 0.3 }}
								>
									<PillButton
										size="sm"
										aria-pressed={moving}
										aria-label="Move money between your accounts"
										onclick={writeTransfer}
										style="--tint: {PALETTE.lavender.css}"
										class={cn(
											'transition-colors duration-300',
											moving &&
												'border-[oklch(from_var(--tint)_calc(l-0.12)_c_h)] bg-[color-mix(in_oklab,var(--tint)_25%,transparent)] text-[oklch(from_var(--tint)_0.55_calc(c*1.7)_h)] hover:bg-[color-mix(in_oklab,var(--tint)_35%,transparent)] dark:text-(--tint)'
										)}
									>
										<AnimatedIcon icon={MovingSendHorizontal} set="moving" />
										Transfer
									</PillButton>
								</div>
							</div>
						{/if}

						<!-- Last in the group, so it keeps the card's right edge whatever
						     else comes and goes beside it: the month arrows push the filter
						     left, never this. Held down in lime — what's new — while the
						     panel has its fields open, as the panel's own pencil is. -->
						<div class="shrink-0 pl-2">
							<PillButton
								size="sm"
								aria-pressed={creating && !moving}
								aria-label="Write a new transaction"
								onclick={writeNew}
								class={cn(
									'transition-colors duration-300',
									creating &&
										!moving &&
										'border-lime/50 bg-lime/25 text-[color-mix(in_oklab,var(--lime)_40%,var(--ink))] hover:bg-lime/35 dark:bg-lime/15 dark:text-lime'
								)}
							>
								<!-- Drawn in once as it appears, never under the pointer: the plus
								     writes itself from nothing, so a hover took it away at the moment
								     the pointer arrived — the panel's own chip plays it the same way. -->
								<AnimatedIcon icon={MovingPlus} set="moving" trigger="mount" />
								New
							</PillButton>
						</div>
					</div>
				</div>

				<TransactionsTable
					bind:this={table}
					initial={arrival}
					onViewChange={(next) => (ledger = next)}
					transactions={rows}
					{currency}
					timeZone={data.timeZone}
					{colors}
					categoryChoices={choices.data?.category}
					accounts={accounts.data?.accounts ?? []}
					selectedId={open?.id ?? null}
					onSelect={(row) => openRow(row)}
					onEdit={(row) => openRow(row, true)}
					class="mt-6"
				/>
			</Card>

			<!-- Right under the ledger, at the same width: these rows need
			     deciding, not just reading. -->
			<UnassignedCard timeZone={data.timeZone} enabled={data.profile !== null} />
		</div>

		<div class="grid content-start" use:reveal={{ delay: 0.1 }}>
			<!-- The room the panel takes, so the cards below it glide down as it
			     opens rather than being dropped a card's worth in one frame. The
			     room carries the gap as well — a grid gap outlives the panel and
			     would snap shut on its own. -->
			<div class="room grid" class:open={showing}>
				<div class="min-h-0 overflow-hidden">
					{#if showing}
						<div
							class="pb-4"
							in:pop={{ scale: 0.96, bounce: 0.35, duration: 0.45 }}
							out:pop={{ scale: 0.98, duration: 0.4 }}
						>
							<TransactionPanel
								row={open}
								{currency}
								timeZone={data.timeZone}
								{colors}
								accounts={accounts.data?.accounts ?? []}
								{categories}
								categoryChoices={choices.data?.category}
								{editing}
								{draft}
								onEditingChange={edit}
								onClose={closePanel}
							/>
						</div>
					{/if}
				</div>
			</div>

			<div class="grid content-start gap-4">
				<Card class="p-7">
					<!-- Each card wears one of the brand three, the colour its own bars
				     lead with, so the column reads as three things rather than one.
				     A new filter flashes the two that follow it. -->
					<div class="flex items-center gap-2.5">
						<Sparkle color="violet" animated burst={filter} class="size-5 shrink-0" />
						<h2 class="font-display text-2xl font-medium">Activity</h2>
					</div>
					<p class="mt-1.5 text-[0.9375rem] text-fg-muted">What left each month.</p>
					<ActivityBars
						transactions={record.data?.transactions ?? []}
						{currency}
						timeZone={data.timeZone}
						month={filter === 'all' ? undefined : filter}
						class="mt-8 h-48"
					/>
				</Card>

				<Card class="p-7">
					<div class="flex items-center gap-2.5">
						<Sparkle color="lime" animated burst={filter} class="size-5 shrink-0" />
						<h2 class="font-display text-2xl font-medium">Where it went</h2>
					</div>
					<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
						{filter === 'all' ? 'Every category' : monthLabel(filter)}, largest first.
					</p>
					<CategoryBars
						transactions={rows}
						{currency}
						categoryChoices={choices.data?.category}
						class="mt-6"
					/>
				</Card>

				<Card class="p-7">
					<div class="flex items-center gap-2.5">
						<Sparkle color="blue" animated class="size-5 shrink-0" />
						<h2 class="font-display text-2xl font-medium">Where it sits</h2>
					</div>
					<p class="mt-1.5 text-[0.9375rem] text-fg-muted">What each account holds now.</p>
					<AccountBalances
						accounts={accounts.data?.accounts ?? []}
						unassigned={accounts.data?.unassigned?.balance ?? null}
						{colors}
						{currency}
						class="mt-5"
					/>
				</Card>
			</div>
		</div>
	</div>
</div>

<style>
	/*
	 * The panel's room, eased as a grid track from nothing to its contents —
	 * the way the accounts total's change chip opens out of its dot. Opening
	 * takes 0.45 s, closing the quicker 0.34 s, as every exit does. The panel
	 * pops in and out inside it, so the room and the card arrive together.
	 * `app.css` flattens the transition under reduced motion.
	 */
	.room {
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.34s var(--ease-out-quint);
	}

	.room.open {
		grid-template-rows: 1fr;
		transition-duration: 0.45s;
	}
</style>
