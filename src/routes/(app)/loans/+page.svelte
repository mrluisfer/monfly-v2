<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { animate, stagger } from 'motion';
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import { browser } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { accountColors } from '$lib/accounts';
	import { reveal } from '$lib/actions';
	import {
		DueTimeline,
		LoanPanel,
		LoansSummary,
		LoanTile,
		NewLoanTile,
		PeopleRing,
		SettledLoans,
		type LoanMode
	} from '$lib/components/loans';
	import { DIRECTION_CHIP, DIRECTION_GLYPH } from '$lib/components/loans/tone';
	import { Card, Segmented, Sparkle } from '$lib/components/ui';
	import { DEFAULT_CURRENCY, todayKey } from '$lib/finance';
	import { loanDue, loanTotals, type Loan, type LoanDirection } from '$lib/loans';
	import { accountsQuery, colorChoicesQuery, loansQuery } from '$lib/queries';
	import { EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	let { data } = $props();

	const enabled = $derived(browser && data.profile !== null);

	const list = createQuery(() => ({ ...loansQuery(), enabled }));
	const accountList = createQuery(() => ({ ...accountsQuery(), enabled }));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled }));

	const loans = $derived(list.data?.loans ?? []);
	const currency = $derived(list.data?.currency ?? DEFAULT_CURRENCY);
	const accounts = $derived(accountList.data?.accounts ?? []);
	const colors = $derived(accountColors(accounts, choices.data?.account));
	const today = $derived(todayKey(data.timeZone));
	const totals = $derived(loanTotals(loans, today));

	/** Late first, then the rest by due day, the undated last. */
	const rank = (loan: Loan) => (loanDue(loan, today).kind === 'overdue' ? 0 : loan.dueOn ? 1 : 2);
	const byUrgency = (a: Loan, b: Loan) =>
		rank(a) - rank(b) ||
		(a.dueOn ?? '').localeCompare(b.dueOn ?? '') ||
		b.issuedOn.localeCompare(a.issuedOn);

	/** Which side the cards show: everyone, or one way. */
	let side = $state<'all' | LoanDirection>('all');

	const open = $derived(loans.filter((l) => l.status !== 'paid').sort(byUrgency));
	const shown = $derived(side === 'all' ? open : open.filter((l) => l.direction === side));
	const settled = $derived(
		loans
			.filter((l) => l.status === 'paid')
			.sort((a, b) => (b.paidOn ?? b.issuedOn).localeCompare(a.paidOn ?? a.issuedOn))
	);
	/** Everyone a loan was made with, most recent first: the name field's suggestions. */
	const people = $derived([...new Set(loans.map((l) => l.person))]);
	const openPeople = $derived(new Set(open.map((l) => l.person.toLocaleLowerCase())).size);

	/** The loan the address opens (`?loan=`), read from `location` in the browser as the accounts page does. */
	const asked = () => (browser ? new URL(location.href) : page.url).searchParams.get('loan');

	let selectedId = $state<string | null>(untrack(asked));
	let mode = $state<LoanMode>('read');
	let creating = $state(false);

	/** The loan in the panel: the one picked, else the most urgent open one, else the latest. */
	const selected = $derived(loans.find((l) => l.id === selectedId) ?? open[0] ?? loans[0] ?? null);
	/** With no loan at all, writing one is all the panel can do. */
	const adding = $derived(creating || (list.isSuccess && loans.length === 0));

	// The address follows the pick, replaced rather than pushed, as the accounts page's does.
	$effect(() => {
		const query = selectedId ? `?${new URLSearchParams({ loan: selectedId })}` : '';
		if (query === location.search) return;
		replaceState(`${page.url.pathname}${query}`, page.state);
	});

	afterNavigate(() => {
		const id = asked();
		if (id && id !== selectedId) show(id);
	});

	function show(id: string) {
		selectedId = id;
		mode = 'read';
		creating = false;
	}

	function writeNew() {
		creating = !creating;
		mode = 'read';
	}

	/** A new loan lands in the panel; giving one up goes back to whichever was open. */
	function done(id?: string) {
		creating = false;
		if (id) show(id);
	}

	/** Escape closes the fields — an edit, a payment or a new loan — when nothing over them answered it first. */
	function dismiss(event: KeyboardEvent) {
		if (event.key !== 'Escape' || event.defaultPrevented) return;
		if (creating && loans.length > 0) creating = false;
		else if (mode !== 'read') mode = 'read';
	}

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

<svelte:head><title>Loans · Monfly</title></svelte:head>

<svelte:window onkeydown={dismiss} />

<div class="flex flex-col gap-4 px-4 pb-6 sm:px-6 lg:px-8">
	<!-- ── Hero band ──────────────────────────────────────────────────── -->
	<section
		class="grid items-center gap-x-12 gap-y-8 py-8 lg:grid-cols-[auto_minmax(0,1fr)]"
		use:reveal
	>
		<h1 class="font-display text-5xl leading-none font-light tracking-tight xl:text-6xl">Loans</h1>
		<LoansSummary {totals} people={openPeople} {currency} />
	</section>

	<!-- ── The open loans and their line on the left, the one open beside them ── -->
	<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
		<div class="flex min-w-0 flex-col gap-4" use:reveal={{ delay: 0.05 }}>
			{#if open.length > 0}
				<!-- Which side the cards show, with how many each holds. -->
				<div class="flex flex-wrap items-center justify-between gap-3">
					<Segmented
						bind:value={side}
						label="Which loans to show"
						options={[
							{ value: 'all', label: `Everyone · ${open.length}` },
							{
								value: 'lent',
								label: `Owed to you · ${open.filter((l) => l.direction === 'lent').length}`,
								icon: DIRECTION_GLYPH.lent,
								chip: DIRECTION_CHIP.lent
							},
							{
								value: 'borrowed',
								label: `You owe · ${open.filter((l) => l.direction === 'borrowed').length}`,
								icon: DIRECTION_GLYPH.borrowed,
								chip: DIRECTION_CHIP.borrowed
							}
						]}
					/>
					<p class="text-sm text-fg-muted">Most urgent first</p>
				</div>
			{/if}

			<div bind:this={wallet} class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
				{#each shown as loan (loan.id)}
					<div animate:flip={{ duration: 450, easing: quintOut }}>
						<LoanTile
							{loan}
							{currency}
							{today}
							selected={!adding && selected?.id === loan.id}
							onSelect={() => show(loan.id)}
							class="h-full"
						/>
					</div>
				{/each}
				{#if data.profile}
					<NewLoanTile pressed={adding} onclick={writeNew} />
				{/if}
			</div>

			<Card class="p-7">
				<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
					<h2 class="font-display text-2xl font-medium">What falls due</h2>
					<p class="text-sm text-fg-muted">Open loans on their due days, around today</p>
				</div>
				<DueTimeline
					{loans}
					{today}
					{currency}
					selectedId={adding ? null : (selected?.id ?? null)}
					onSelect={show}
					class="mt-6"
				/>
			</Card>

			{#if settled.length > 0}
				<SettledLoans
					loans={settled}
					{currency}
					selectedId={adding ? null : (selected?.id ?? null)}
					onSelect={show}
				/>
			{/if}
		</div>

		<div class="grid content-start gap-4" use:reveal={{ delay: 0.1 }}>
			{#if data.profile}
				<LoanPanel
					loan={adding ? null : selected}
					{mode}
					{people}
					{accounts}
					{colors}
					{currency}
					timeZone={data.timeZone}
					{today}
					cancellable={loans.length > 0}
					onModeChange={(next) => (mode = next)}
					onDone={done}
					onDeleted={() => {
						selectedId = null;
						mode = 'read';
					}}
				/>
			{/if}

			{#if open.length > 0}
				<Card class="p-7">
					<div class="flex items-center gap-2.5">
						<Sparkle color="lemon" animated burst={totals.open} class="size-5 shrink-0" />
						<h2 class="font-display text-2xl font-medium">Who it's with</h2>
					</div>
					<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
						What's still open, with each person, largest first.
					</p>
					<PeopleRing {loans} {currency} onSelect={show} class="mt-6" />
				</Card>
			{/if}
		</div>
	</div>
</div>
