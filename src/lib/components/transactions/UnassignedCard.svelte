<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { quintOut } from 'svelte/easing';
	import { SvelteSet } from 'svelte/reactivity';
	import { fly, slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { accountColors, featuredAccounts } from '$lib/accounts';
	import { Card, Checkbox, IconButton, PillButton, Select } from '$lib/components/ui';
	import { DEFAULT_CURRENCY, formatMoney } from '$lib/finance';
	import {
		accountsQuery,
		assignAccountMutation,
		colorChoicesQuery,
		unassignedQuery
	} from '$lib/queries';
	import { signedAmount, type UnassignedTransaction } from '$lib/transactions';
	import { cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * Every transaction v1 recorded with no account, and the way to give them
	 * one. Two groups, because an account means something different to each:
	 * those since the first account are counted in the total — the dashboard's
	 * Unknown slice — and move into the account's balance; those before it are
	 * already in the balance that account was opened with, so they only record
	 * where they came from. Checkboxes pick rows (shift takes a range, a
	 * group's box the group), and a bar sticks to the bottom of the view while
	 * any are picked. Assigned rows fold out at once and come back if refused.
	 */
	type Props = {
		/** The viewer's zone: dates are drawn in it. */
		timeZone: string;
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
	};

	let { timeZone, enabled = true }: Props = $props();

	const query = createQuery(() => ({ ...unassignedQuery(), enabled: browser && enabled }));
	const accountList = createQuery(() => ({ ...accountsQuery(), enabled: browser && enabled }));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled: browser && enabled }));

	// Read the client during setup: Svelte context is out of reach from the
	// mutation's lazily evaluated options.
	const queryClient = useQueryClient();
	const assign = createMutation(() => assignAccountMutation(queryClient));

	const currency = $derived(query.data?.currency ?? DEFAULT_CURRENCY);
	const rows = $derived(query.data?.transactions ?? []);
	const accounts = $derived(accountList.data?.accounts ?? []);
	const colors = $derived(accountColors(accounts, choices.data?.account));
	const options = $derived(
		accounts.map((a) => ({ value: a.id, label: a.name, color: colors[a.id] }))
	);

	type Group = {
		key: 'counted' | 'before';
		title: string;
		note: string;
		rows: UnassignedTransaction[];
	};

	// Counted ones first: they're what the dashboard's total can't place.
	const groups = $derived.by(() => {
		const all: Group[] = [
			{
				key: 'counted',
				title: 'Counted in your total',
				note: "They moved your total but no account's balance — the Unknown slice on your dashboard. Giving one an account moves it into that account's balance.",
				rows: rows.filter((t) => !t.beforeAccounts)
			},
			{
				key: 'before',
				title: 'Before your first account',
				note: 'The balance you opened your first account with already holds them. Giving one an account only records where it came from — no balance moves.',
				rows: rows.filter((t) => t.beforeAccounts)
			}
		];
		return all.filter((group) => group.rows.length > 0);
	});

	/** Picked rows, by id. Read through `chosen`, so a row that left the list drops out. */
	const picked = new SvelteSet<string>();
	const chosen = $derived(rows.filter((t) => picked.has(t.id)));
	/** What the picked rows would move into an account's balance: only those counted in the total. */
	const moving = $derived(
		chosen.filter((t) => !t.beforeAccounts).reduce((sum, t) => sum + signedAmount(t), 0)
	);
	const older = $derived(chosen.filter((t) => t.beforeAccounts).length);

	let chosenAccount = $state<string | null>(null);
	// The main account until another is picked.
	const account = $derived(
		accounts.find((a) => a.id === chosenAccount) ?? featuredAccounts(accounts)[0]
	);

	/** Shift was held as the pick began: it takes the range from the last one. */
	let shift = false;
	let anchor: { group: Group['key']; index: number } | null = null;

	function pick(group: Group, index: number, on: boolean) {
		const ranged = shift && anchor?.group === group.key;
		const from = ranged && anchor ? Math.min(anchor.index, index) : index;
		const to = ranged && anchor ? Math.max(anchor.index, index) : index;
		for (const t of group.rows.slice(from, to + 1)) {
			if (on) picked.add(t.id);
			else picked.delete(t.id);
		}
		anchor = { group: group.key, index };
	}

	function pickGroup(group: Group, on: boolean) {
		for (const t of group.rows) {
			if (on) picked.add(t.id);
			else picked.delete(t.id);
		}
		anchor = null;
	}

	function clear() {
		picked.clear();
		anchor = null;
	}

	let status = $state('');

	function submit() {
		if (!account || chosen.length === 0) return;
		const name = account.name;
		status = '';
		assign.mutate(
			{ ids: chosen.map((t) => t.id), accountId: account.id },
			{
				onSuccess: ({ assigned, moved }) => {
					status = `Gave ${plural(assigned)} to ${name}${moved !== 0 ? ` · ${signed(moved)} moved into its balance` : ''}.`;
				}
			}
		);
		clear();
	}

	const signed = (cents: number) =>
		`${cents > 0 ? '+' : cents < 0 ? '−' : ''}${formatMoney(Math.abs(cents), currency)}`;
	const plural = (n: number) => `${n} ${n === 1 ? 'transaction' : 'transactions'}`;

	const effect = $derived.by(() => {
		if (!account) return '';
		const parts: string[] = [];
		if (moving !== 0) parts.push(`${signed(moving)} moves into ${account.name}`);
		if (older > 0)
			parts.push(`${older} older ${older === 1 ? 'one moves' : 'ones move'} no balance`);
		return parts.length > 0 ? parts.join(' · ') : 'No balance moves';
	});

	const dayOf = $derived(
		new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone })
	);
	const yearOf = $derived(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }));
	const thisYear = $derived(yearOf.format(new Date()));
	const day = (iso: string) => {
		const date = new Date(iso);
		const year = yearOf.format(date);
		return year === thisYear ? dayOf.format(date) : `${dayOf.format(date)}, ${year}`;
	};

	const motion = (ms: number) => (prefersReducedMotion() ? 0 : ms);
</script>

<!-- A pick started with shift held takes the range: pointer or keyboard alike. -->
<svelte:window
	onpointerdown={(event) => (shift = event.shiftKey)}
	onkeydown={(event) => (shift = event.shiftKey)}
	onkeyup={(event) => (shift = event.shiftKey)}
/>

<Card class="p-7">
	<h2 class="font-display text-2xl font-medium">Without an account</h2>
	<p class="mt-1.5 max-w-prose text-[0.9375rem] text-fg-muted">
		{#if rows.length > 0}
			{plural(rows.length)} were recorded with no account. Pick the ones that came from the same one and
			give it to them.
		{:else if query.isError}
			Couldn't load them. Refresh to try again.
		{:else if query.data}
			Every transaction has an account.
		{/if}
	</p>
	<p class="mt-2 text-sm text-positive empty:hidden" aria-live="polite">{status}</p>
	{#if assign.isError}
		<p class="mt-2 text-sm text-negative" role="alert">
			Couldn't give them the account, so they're back in the list. Try again.
		</p>
	{/if}

	{#each groups as group (group.key)}
		{@const all = group.rows.every((t) => picked.has(t.id))}
		{@const some = !all && group.rows.some((t) => picked.has(t.id))}
		<section class="mt-8" aria-labelledby="group-{group.key}">
			<header class="flex items-start gap-3 border-b border-line pb-3">
				<Checkbox
					checked={all}
					indeterminate={some}
					onCheckedChange={(on) => pickGroup(group, on)}
					label="Pick every one {group.key === 'counted'
						? 'counted in your total'
						: 'from before your first account'}"
					class="mt-0.5"
				/>
				<div class="min-w-0 flex-1">
					<h3 id="group-{group.key}" class="text-[0.9375rem] font-medium">
						{group.title}<span class="tabular ml-1.5 font-normal text-fg-muted"
							>{group.rows.length}</span
						>
					</h3>
					<p class="mt-0.5 max-w-prose text-sm text-fg-muted">{group.note}</p>
				</div>
				{#if group.key === 'counted'}
					<!-- The same figure as the dashboard's Unknown slice. -->
					<span class="tabular shrink-0 font-display text-lg">
						{signed(group.rows.reduce((sum, t) => sum + signedAmount(t), 0))}
					</span>
				{/if}
			</header>

			<ul class="mt-1">
				{#each group.rows as row, i (row.id)}
					<li out:slide={{ duration: motion(280), easing: quintOut }}>
						<label
							for="pick-{row.id}"
							class={cn(
								'-mx-3 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 select-none',
								picked.has(row.id) ? 'bg-blue/8 hover:bg-blue/12' : 'hover:bg-sunken'
							)}
						>
							<Checkbox
								id="pick-{row.id}"
								checked={picked.has(row.id)}
								onCheckedChange={(on) => pick(group, i, on)}
							/>
							<span class="tabular min-w-14 shrink-0 text-sm text-fg-muted">{day(row.date)}</span>
							<span class="min-w-0 flex-1 truncate text-[0.9375rem]">
								{row.category}<span class="text-fg-muted"
									>{row.description ? ` · ${row.description}` : ''}</span
								>
							</span>
							<span
								class={cn(
									'tabular shrink-0 text-[0.9375rem]',
									row.type === 'income' && 'text-positive'
								)}
							>
								{signed(signedAmount(row))}
							</span>
						</label>
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	{#if chosen.length > 0}
		<div
			in:fly={{ y: 16, duration: motion(320), easing: quintOut }}
			out:fly={{ y: 16, duration: motion(220), easing: quintOut }}
			role="region"
			aria-label="Picked transactions"
			class="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--radius-chip)] border border-hairline bg-card px-4 py-3"
		>
			<div class="min-w-0 flex-1 basis-56">
				<p class="text-[0.9375rem] font-medium">{plural(chosen.length)} picked</p>
				<p class="text-sm text-fg-muted">{effect}</p>
			</div>
			{#if account}
				<Select
					label="Account"
					{options}
					value={account.id}
					onValueChange={(id) => (chosenAccount = id)}
				/>
				<PillButton size="sm" disabled={assign.isPending} onclick={submit}
					>Give them this account</PillButton
				>
			{:else}
				<p class="text-sm text-fg-muted">Add an account first to give them one.</p>
			{/if}
			<IconButton size="sm" aria-label="Clear the picks" onclick={clear}><X /></IconButton>
		</div>
	{/if}
</Card>
