<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { onDestroy } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { SvelteSet } from 'svelte/reactivity';
	import { fly, slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { countUp } from '$lib/actions';
	import { accountColors, featuredAccounts } from '$lib/accounts';
	import { categoryColor } from '$lib/categories';
	import {
		Badge,
		Card,
		IconButton,
		PillButton,
		Select,
		type PaletteColor
	} from '$lib/components/ui';
	import UnassignedList from './UnassignedList.svelte';
	import { DEFAULT_CURRENCY, formatMoney } from '$lib/finance';
	import {
		accountsQuery,
		assignAccountMutation,
		colorChoicesQuery,
		unassignedQuery
	} from '$lib/queries';
	import { pop } from '$lib/transitions';
	import { signedAmount, type UnassignedTransaction } from '$lib/transactions';
	import { prefersReducedMotion } from '$lib/utils';

	/**
	 * Every transaction v1 recorded with no account, and the way to give them
	 * one. A card each, because an account means something different to the
	 * two: those since the first account are counted in the total — the
	 * dashboard's Unknown slice — and move into the account's balance; those
	 * before it are already in the balance that account was opened with, so
	 * they only record where they came from. Two cards rather than two
	 * sections of one, so the gap tells them apart the way it tells every
	 * other card apart. Each card's rows are an `UnassignedList` — the ledger's
	 * columns, ordered by the ledger's control — while the picking lives here,
	 * since a pick spans both lists: the card's box takes its whole card, and
	 * one bar, shared by the two, sticks to the bottom of the view while any
	 * are picked. Assigned rows fold out at once and come back if refused.
	 */
	type Props = {
		/** The viewer's zone: dates are drawn in it. */
		timeZone: string;
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
		/** A line under every row, as the ledger has. Off for a quieter list. */
		dividers?: boolean;
	};

	let { timeZone, enabled = true, dividers = true }: Props = $props();

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
	// A category is placed once, however many rows it has, and they all wear it.
	const tint = $derived.by(() => {
		const out: Record<string, PaletteColor> = {};
		for (const t of rows) out[t.category] ??= categoryColor(t.category, choices.data?.category);
		return out;
	});
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
				title: 'Without an account',
				note: "They moved your total but no account's balance — the Unknown slice on your dashboard. Pick the ones that came from the same account and give it to them: each moves into that account's balance.",
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

	/** The rows a press covered — one, or the stretch shift reached back to. */
	function pick(rows: UnassignedTransaction[], on: boolean) {
		for (const t of rows) {
			if (on) picked.add(t.id);
			else picked.delete(t.id);
		}
	}

	function clear() {
		picked.clear();
	}

	/** How long the last assignment stays said. */
	const NOTICE_MS = 5000;

	/**
	 * The last assignment, said for a few seconds. Another before it goes takes
	 * its place in the same badge and starts the time over; `id` tells the badge
	 * something new arrived, even in the same words.
	 */
	let notice = $state<{ id: number; assigned: number; name: string; moved: number } | null>(null);
	let dismiss: ReturnType<typeof setTimeout> | undefined;

	function announce(assigned: number, name: string, moved: number) {
		notice = { id: (notice?.id ?? 0) + 1, assigned, name, moved };
		clearTimeout(dismiss);
		dismiss = setTimeout(() => (notice = null), NOTICE_MS);
	}

	// Not `$effect`: this component's own `effect` shadows the rune.
	onDestroy(() => clearTimeout(dismiss));

	function submit() {
		if (!account || chosen.length === 0) return;
		const name = account.name;
		assign.mutate(
			{ ids: chosen.map((t) => t.id), accountId: account.id },
			{
				onSuccess: ({ assigned, moved }) => announce(assigned, name, moved),
				// The rows came back: a "gave" still showing would say otherwise.
				onError: () => {
					clearTimeout(dismiss);
					notice = null;
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

	const motion = (ms: number) => (prefersReducedMotion() ? 0 : ms);
</script>

<!-- Said once, in the first card: the answer covers both. -->
{#snippet messages()}
	<!-- Read out in plain words; the badge's figure counts, so it isn't. The
	     region stays put, so each new notice is heard. -->
	<p class="sr-only" aria-live="polite">
		{#if notice}
			Gave {plural(notice.assigned)} to {notice.name}{notice.moved !== 0
				? ` · ${signed(notice.moved)} moved into its balance`
				: ''}.
		{/if}
	</p>
	<!-- Its row opens as the badge pops in, and closes behind it, so the list
	     below glides rather than jumps. -->
	{#if notice}
		<div class="pt-3" transition:slide={{ duration: motion(350), easing: quintOut }}>
			<div
				class="w-fit max-w-full origin-left"
				aria-hidden="true"
				in:pop={{ scale: 0.85, bounce: 0.4, duration: 0.45 }}
				out:pop={{ scale: 0.85, duration: 0.3 }}
			>
				<Badge tone="positive" burst={notice.id}>
					{#snippet icon()}<Check />{/snippet}
					<span class="tabular">{plural(notice.assigned)}</span>
					<span class="font-normal opacity-80">given to</span>
					<span>{notice.name}</span>
					{#if notice.moved !== 0}
						<span class="font-normal opacity-80">·</span>
						<!-- Counts up on arrival, and over from the last figure on an update. -->
						<span class="tabular" use:countUp={{ value: notice.moved, format: signed }}
							>{signed(notice.moved)}</span
						>
						<span class="font-normal opacity-80">into its balance</span>
					{/if}
				</Badge>
			</div>
		</div>
	{/if}
	{#if assign.isError}
		<p class="mt-3 text-sm text-negative" role="alert">
			Couldn't give them the account, so they're back in the list. Try again.
		</p>
	{/if}
{/snippet}

<!-- No wrapper: the cards are the page's own grid children, so the gap between
     them is the gap between every other card, and the bar can stick across the
     whole column rather than inside one card. -->
{#each groups as group, index (group.key)}
	{@const all = group.rows.every((t) => picked.has(t.id))}
	<Card class="p-7">
		<!-- No rule under the header: the columns draw their own, and two lines a
		     few pixels apart read as an empty row. -->
		<header class="flex items-start gap-6">
			<div class="min-w-0 flex-1">
				<h2 class="font-display text-2xl font-medium">
					{group.title}<span class="tabular ml-2 font-normal text-fg-muted"
						>{group.rows.length}</span
					>
				</h2>
				<p class="mt-1.5 max-w-prose text-[0.9375rem] text-fg-muted">{group.note}</p>
			</div>
			<!-- What the card is worth, and the way to take all of it: a control
			     with its own words rather than a box beside the title, which left
			     the heading reading as a checkbox's label. -->
			<div class="flex shrink-0 flex-col items-end gap-3">
				{#if group.key === 'counted'}
					<!-- The same figure as the dashboard's Unknown slice. -->
					<span class="tabular font-display text-lg">
						{signed(group.rows.reduce((sum, t) => sum + signedAmount(t), 0))}
					</span>
				{/if}
				<PillButton size="sm" onclick={() => pick(group.rows, !all)}>
					{all ? 'Clear these' : `Pick all ${group.rows.length}`}
				</PillButton>
			</div>
		</header>

		{#if index === 0}{@render messages()}{/if}

		<UnassignedList
			rows={group.rows}
			{currency}
			{timeZone}
			{tint}
			{picked}
			{dividers}
			onPick={pick}
		/>
	</Card>
{:else}
	<Card class="p-7">
		<h2 class="font-display text-2xl font-medium">Without an account</h2>
		<p class="mt-1.5 max-w-prose text-[0.9375rem] text-fg-muted">
			{#if query.isError}
				Couldn't load them. Refresh to try again.
			{:else if query.data}
				Every transaction has an account.
			{/if}
		</p>
		{@render messages()}
	</Card>
{/each}

{#if chosen.length > 0}
	<div
		in:fly={{ y: 16, duration: motion(320), easing: quintOut }}
		out:fly={{ y: 16, duration: motion(220), easing: quintOut }}
		role="region"
		aria-label="Picked transactions"
		class="sticky bottom-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--radius-chip)] border border-hairline bg-card px-4 py-3"
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
