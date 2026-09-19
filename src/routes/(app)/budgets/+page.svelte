<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { untrack } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { browser } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { reveal } from '$lib/actions';
	import {
		BudgetHighlights,
		BudgetHistory,
		BudgetPace,
		CategoryLimits,
		MonthGauge,
		SpendingBubbles
	} from '$lib/components/budgets';
	import { Card, IconButton, Loader, Select } from '$lib/components/ui';
	import { addMonths, isMonthKey, monthName, monthProgress, type MonthKey } from '$lib/finance';
	import { budgetMonthQuery, colorChoicesQuery } from '$lib/queries';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';

	let { data } = $props();

	/**
	 * The month the address asks for, or this one. In the browser it's read
	 * from `location`, not `page.url`: this page rewrites its address without
	 * a navigation, and `page.url` keeps the one it arrived at.
	 */
	const asked = (): MonthKey => {
		const value = (browser ? new URL(location.href) : page.url).searchParams.get('month') ?? '';
		return isMonthKey(value) && value <= data.latest ? value : data.latest;
	};

	let month = $state<MonthKey>(untrack(asked));
	/** Which way the last move went, so the month's name enters from that side. */
	let dir = $state(1);

	function show(next: MonthKey) {
		dir = next < month ? -1 : 1;
		month = next;
	}

	/** The address's query for a month: none for this one. */
	const search = (m: MonthKey) => (m === data.latest ? '' : `?month=${m}`);
	/** The query the address last carried, so it's rewritten only when the month moves. */
	let said = untrack(() => search(month));

	// Replaced, not pushed: Back leaves the page rather than stepping back
	// through every month. Shallow, so no load runs.
	$effect(() => {
		const query = search(month);
		if (query === said) return;
		said = query;
		replaceState(`${page.url.pathname}${query}`, page.state);
	});

	// A navigation that lands here again — the Budgets tab, `g b`, Back to an
	// earlier address — opens the month its address asks for. Arriving, the
	// two already agree.
	afterNavigate(() => {
		const next = asked();
		said = search(next);
		if (next !== month) show(next);
	});

	const enabled = $derived(browser && data.profile !== null);
	// Each month is its own cache entry: walking to one not yet fetched holds
	// the last on screen, dimmed, rather than dropping every figure to zero.
	const budgets = createQuery(() => ({
		...budgetMonthQuery(month),
		enabled,
		placeholderData: keepPreviousData
	}));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled }));

	const shown = $derived(budgets.data);
	const progress = $derived(shown ? monthProgress(shown.month, shown.timeZone) : null);

	/** This month back a year, and further back only if the address went there. */
	const options = $derived.by(() => {
		const months = Array.from({ length: 12 }, (_, i) => addMonths(data.latest, -i));
		if (!months.includes(month)) months.push(month);
		return months.map((m) => ({ value: m, label: `${monthName(m)} ${m.slice(0, 4)}` }));
	});
	const oldest = $derived(options.at(-1)?.value ?? data.latest);
	const behind = $derived(month > oldest);
	const ahead = $derived(month < data.latest);
</script>

<svelte:head><title>Budgets · Monfly</title></svelte:head>

<div class="flex flex-col gap-4 px-4 pb-6 sm:px-6 lg:px-8">
	<!-- ── Hero band: the title, and the month on show ─────────────────── -->
	<section
		class="grid items-end gap-x-12 gap-y-6 pt-8 pb-2 lg:grid-cols-[minmax(0,1fr)_auto]"
		use:reveal
	>
		<div class="min-w-0">
			<h1 class="font-display text-5xl leading-none font-light tracking-tight xl:text-6xl">
				Budgets
			</h1>
			<p class="mt-4 max-w-xl text-[0.9375rem] text-balance text-fg-muted">
				What each month is measured against: one budget for everything, and a limit for any category
				worth watching on its own.
			</p>
		</div>

		<!-- The picker holds its place; the arrows walk from the month it picked,
		     and come and go at either end. Each sits in a wrapper that collapses
		     with it and carries the gap, so its neighbours glide. -->
		<div class="flex items-center">
			<Select label="Month" {options} value={month} onValueChange={show} />
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
							onclick={() => show(addMonths(month, -1))}
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
						<IconButton size="sm" aria-label="Next month" onclick={() => show(addMonths(month, 1))}>
							<ChevronRight />
						</IconButton>
					</div>
				</div>
			{/if}
		</div>
	</section>

	{#if shown && progress}
		<!-- A month on its way dims the last one, which animates from there. -->
		<div
			class={cn(
				'flex flex-col gap-4 transition-opacity duration-300',
				budgets.isPlaceholderData && 'opacity-60'
			)}
		>
			<div class="pb-4" use:reveal={{ delay: 0.05 }}>
				<BudgetHighlights month={shown} {progress} categoryChoices={choices.data?.category} />
			</div>

			<!-- ── The month against the budget ─────────────────────────────── -->
			<div class="grid gap-4 xl:grid-cols-3">
				<div use:reveal={{ delay: 0.1 }}>
					<MonthGauge month={shown} {progress} {dir} class="h-full" />
				</div>
				<div class="min-w-0 xl:col-span-2" use:reveal={{ delay: 0.15 }}>
					<BudgetPace month={shown} {progress} class="h-full" />
				</div>
			</div>

			<!-- ── Each category against its limit ──────────────────────────── -->
			<div use:reveal={{ delay: 0.05 }}>
				<CategoryLimits month={shown} {progress} categoryChoices={choices.data?.category} />
			</div>

			<!-- ── Where it went, and the months before ─────────────────────── -->
			<div class="grid gap-4 pt-2 xl:grid-cols-3">
				<div class="min-w-0 xl:col-span-2" use:reveal={{ delay: 0.05 }}>
					<SpendingBubbles month={shown} categoryChoices={choices.data?.category} class="h-full" />
				</div>
				<div class="min-w-0" use:reveal={{ delay: 0.1 }}>
					<BudgetHistory
						month={shown}
						{progress}
						latest={data.latest}
						onPick={show}
						class="h-full"
					/>
				</div>
			</div>
		</div>
	{:else if budgets.isError}
		<Card class="p-8 text-[0.9375rem] text-fg-muted">
			Couldn't load your budgets: {budgets.error.message}
		</Card>
	{:else if data.profile === null}
		<Card class="p-8 text-[0.9375rem] text-fg-muted">
			Your budgets appear here once your account is set up.
		</Card>
	{:else}
		<div class="grid min-h-96 place-items-center">
			<Loader label="Loading your budgets" />
		</div>
	{/if}
</div>
