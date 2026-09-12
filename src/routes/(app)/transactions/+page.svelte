<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { untrack } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { reveal } from '$lib/actions';
	import { accountColors } from '$lib/accounts';
	import {
		AccountBalances,
		ActivityBars,
		CategoryBars,
		TransactionDetail,
		TransactionsSummary,
		TransactionsTable,
		UnassignedCard
	} from '$lib/components/transactions';
	import { Card, IconButton, PillButton } from '$lib/components/ui';
	import { DEFAULT_CURRENCY, addMonths, monthName } from '$lib/finance';
	import { accountsQuery, colorChoicesQuery, transactionsQuery } from '$lib/queries';
	import { pop } from '$lib/transitions';
	import type { TransactionRow } from '$lib/transactions';

	let { data } = $props();

	// The page opens on this month; the whole record is a second query, asked
	// for only when someone presses for it.
	let scope = $state<'month' | 'all'>('month');
	// The month in view. The arrows walk it, and stepping past December simply
	// lands in the next year: a month key is an index, not a pair of fields.
	let month = $state(untrack(() => data.month));
	/**
	 * This month is as far forward as there is: the endpoint refuses later ones.
	 * Derived, so a load that runs again — or a clock that rolls over — moves it.
	 */
	const latest = $derived(data.month);

	/** Which way the last move went, so the new label enters from that side. */
	let dir = $state(1);

	function step(delta: number) {
		dir = delta;
		month = addMonths(month, delta);
		// Walking the months is a statement about which month, so it brings the
		// list back from "everything" to that one.
		scope = 'month';
	}

	function today() {
		dir = 1;
		month = latest;
		scope = 'month';
	}

	function loadAll() {
		// Everything spans every month, so the month behind it stops meaning
		// anything: it lands on today, and the arrow onto months that don't
		// exist yet goes away with it.
		dir = 1;
		month = latest;
		scope = 'all';
	}

	/** At the current month there is nothing ahead, and nothing to return to. */
	const atToday = $derived(scope === 'month' && month === latest);
	/** Somewhere ahead of this month there is another one to walk to. */
	const ahead = $derived(month !== latest);

	const enabled = $derived(browser && data.profile !== null);
	// Each month is its own cache entry, so walking to one not yet fetched would
	// otherwise leave `data` empty for a beat — and the figures beside the title,
	// which cover the whole record and never narrow with the list, would fall to
	// zero and count themselves back up over nothing. Holding the last answer
	// keeps them still, as the dashboard's cards do when their period moves.
	const list = createQuery(() => ({
		...transactionsQuery(scope === 'month' ? month : undefined),
		enabled,
		placeholderData: keepPreviousData
	}));
	const accounts = createQuery(() => ({ ...accountsQuery(), enabled }));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled }));

	const rows = $derived(list.data?.transactions ?? []);
	const currency = $derived(list.data?.currency ?? DEFAULT_CURRENCY);
	const totals = $derived(list.data?.totals ?? { received: 0, spent: 0, count: 0 });

	// v1 keeps the total; the accounts hold part of it and the unknown line the
	// rest, so together they are what someone actually has.
	const balance = $derived.by(() => {
		const held = (accounts.data?.accounts ?? []).reduce((sum, a) => sum + a.balance, 0);
		return held + (accounts.data?.unassigned?.balance ?? 0);
	});

	// The same colour each account wears on the dashboard, so an orb means the
	// same thing in both places.
	const colors = $derived(accountColors(accounts.data?.accounts ?? [], choices.data?.account));

	let selected = $state<TransactionRow | null>(null);
	// A row that leaves the list — assigned an account, say — takes the panel with it.
	const open = $derived(selected && rows.some((r) => r.id === selected?.id) ? selected : null);

	const monthLabel = $derived(`${monthName(month)} ${month.slice(0, 4)}`);
</script>

<svelte:head><title>Transactions · Monfly</title></svelte:head>

<div class="flex flex-col gap-4 px-4 pb-6 sm:px-6 lg:px-8">
	<!-- ── Hero band: the title takes only the room it needs, so the figures
	     never run under it ────────────────────────────────────────────── -->
	<section
		class="grid items-center gap-x-12 gap-y-8 py-8 lg:grid-cols-[auto_minmax(0,1fr)]"
		use:reveal
	>
		<h1 class="font-display text-5xl leading-none font-light tracking-tight xl:text-6xl">
			Transactions
		</h1>
		<TransactionsSummary
			{balance}
			received={totals.received}
			spent={totals.spent}
			count={totals.count}
			{currency}
		/>
	</section>

	<!-- ── The ledger on the left, the charts stacked beside it ────────── -->
	<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
		<!-- Each column lands after the one before it, as the dashboard's do:
		     revealing the grid whole made the page arrive as one slab. -->
		<div class="flex flex-col gap-4" use:reveal={{ delay: 0.05 }}>
			<Card class="flex flex-col p-7">
				<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
					<h2 class="font-display text-2xl font-medium">
						{#if scope === 'month'}
							<!-- Keyed on the month, so each one enters from the side it came from.
							     `inline-block` because a transform does nothing to an inline box. -->
							{#key month}
								<span class="inline-block" in:pop={{ x: dir * 12, duration: 0.32 }}>
									{monthName(month)}<span class="ml-2 font-normal text-fg-muted"
										>{month.slice(0, 4)}</span
									>
								</span>
							{/key}
						{:else}
							Everything
						{/if}
					</h2>

					<!-- Today leads the group, then the arrows: the way back is a separate
					     errand from the walk, and it holds its place while the arrows come and
					     go. Each control that comes and goes sits in a wrapper that collapses
					     with it, and the wrapper carries the gap — a flex gap outlives the
					     control and snaps shut on unmount — so its neighbours glide. -->
					<div class="flex items-center">
						{#if list.data?.capped}
							<p class="mr-4 text-sm text-fg-muted">Showing the most recent only.</p>
						{/if}

						<!-- Set well apart from the arrows: a stray press here would undo the
						     walk, so it shouldn't sit under a wandering finger. -->
						{#if !atToday}
							<div
								class="shrink-0 pr-6"
								transition:slide={{ axis: 'x', duration: 350, easing: quintOut }}
							>
								<div
									in:pop={{ scale: 0.85, bounce: 0.4, duration: 0.45 }}
									out:pop={{ scale: 0.85, duration: 0.3 }}
								>
									<PillButton size="sm" onclick={today}>Today</PillButton>
								</div>
							</div>
						{/if}

						<IconButton size="sm" aria-label="Previous month" onclick={() => step(-1)}>
							<ChevronLeft />
						</IconButton>

						<!-- Gone at the last month there is rather than greyed out: there is
						     nothing ahead to reach, so the control shouldn't be there to press. -->
						{#if ahead}
							<div
								class="shrink-0 pl-2"
								transition:slide={{ axis: 'x', duration: 350, easing: quintOut }}
							>
								<div
									in:pop={{ scale: 0.5, bounce: 0.4, duration: 0.45 }}
									out:pop={{ scale: 0.5, duration: 0.3 }}
								>
									<IconButton size="sm" aria-label="Next month" onclick={() => step(1)}>
										<ChevronRight />
									</IconButton>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<TransactionsTable
					transactions={rows}
					{currency}
					timeZone={data.timeZone}
					{colors}
					selectedId={open?.id ?? null}
					onSelect={(row) => (selected = selected?.id === row.id ? null : row)}
					class="mt-6"
				/>

				{#if scope === 'month'}
					<!-- The month is the opening view; the rest is one press away. -->
					<div class="mt-6 flex justify-center border-t border-line pt-6">
						<PillButton size="sm" disabled={list.isFetching} onclick={loadAll}>
							{list.isFetching ? 'Loading…' : `Load all ${totals.count} transactions`}
						</PillButton>
					</div>
				{/if}
			</Card>

			<!-- Right under the ledger, at the same width: these rows need
			     deciding, not just reading. -->
			<UnassignedCard timeZone={data.timeZone} enabled={data.profile !== null} />
		</div>

		<div class="grid content-start gap-4" use:reveal={{ delay: 0.1 }}>
			{#if open}
				<TransactionDetail
					row={open}
					{currency}
					timeZone={data.timeZone}
					{colors}
					onClose={() => (selected = null)}
				/>
			{/if}

			<Card class="p-7">
				<h2 class="font-display text-2xl font-medium">Activity</h2>
				<p class="mt-1.5 text-[0.9375rem] text-fg-muted">What left each month.</p>
				<ActivityBars
					transactions={rows}
					{currency}
					timeZone={data.timeZone}
					months={scope === 'month' ? 6 : 12}
					class="mt-8 h-48"
				/>
			</Card>

			<Card class="p-7">
				<h2 class="font-display text-2xl font-medium">Where it went</h2>
				<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
					{scope === 'month' ? monthLabel : 'Every category'}, largest first.
				</p>
				<CategoryBars transactions={rows} {currency} class="mt-6" />
			</Card>

			<Card class="p-7">
				<h2 class="font-display text-2xl font-medium">Where it sits</h2>
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
