<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
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
	import { Card, IconButton, Select, Sparkle } from '$lib/components/ui';
	import {
		DEFAULT_CURRENCY,
		addMonths,
		currentMonth,
		monthName,
		type MonthKey
	} from '$lib/finance';
	import { accountsQuery, colorChoicesQuery, transactionsQuery } from '$lib/queries';
	import { pop } from '$lib/transitions';
	import type { TransactionRow } from '$lib/transactions';

	let { data } = $props();

	// The page opens on the whole record; the filter narrows it to one month, a
	// second query. Stepping past December simply lands in the next year: a
	// month key is an index, not a pair of fields.
	let filter = $state<'all' | MonthKey>('all');
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
					</div>
				</div>

				<TransactionsTable
					transactions={rows}
					{currency}
					timeZone={data.timeZone}
					{colors}
					categoryChoices={choices.data?.category}
					selectedId={open?.id ?? null}
					onSelect={(row) => (selected = selected?.id === row.id ? null : row)}
					class="mt-6"
				/>
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
