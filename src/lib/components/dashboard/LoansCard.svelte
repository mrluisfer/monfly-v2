<script lang="ts">
	import MovingArrowRight from '@jis3r/icons/icons/arrow-right';
	import MovingBadgeCheck from '@jis3r/icons/icons/badge-check';
	import MovingHandCoins from '@jis3r/icons/icons/hand-coins';
	import { createQuery } from '@tanstack/svelte-query';
	import { animate, stagger } from 'motion';
	import { browser } from '$app/environment';
	import { countUp } from '$lib/actions';
	import { DueChip } from '$lib/components/loans';
	import { AnimatedIcon, Avatar, Loader } from '$lib/components/ui';
	import { DEFAULT_CURRENCY, formatMoney, todayKey } from '$lib/finance';
	import { loanDue, loanLeft, loanPageHref, loanTotals, type Loan } from '$lib/loans';
	import { loansQuery } from '$lib/queries';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	/**
	 * The Loans tab's card: the open loans at a glance, most urgent first — who,
	 * where each stands against its due day, and what's left, in the colour of
	 * the side it's on — with what's owed either way under them and _See all_ on
	 * the way to the loans page. A row opens its loan there. Read the first time
	 * the tab opens, not with the page, as the Transactions tab's rows are.
	 */
	type Props = {
		/** The viewer's zone: due days are measured from today in it. */
		timeZone: string;
		/** Its tab is the one open: loans are read the first time it is, and deal in each time. */
		open: boolean;
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
	};

	let { timeZone, open, enabled = true }: Props = $props();

	const SHOWN = 4;

	const query = createQuery(() => ({ ...loansQuery(), enabled: browser && enabled && open }));

	const today = $derived(todayKey(timeZone));
	const currency = $derived(query.data?.currency ?? DEFAULT_CURRENCY);
	const loans = $derived(query.data?.loans ?? []);
	const totals = $derived(loanTotals(loans, today));

	const rank = (loan: Loan) => (loanDue(loan, today).kind === 'overdue' ? 0 : loan.dueOn ? 1 : 2);
	const rows = $derived(
		loans
			.filter((l) => l.status !== 'paid')
			.sort((a, b) => rank(a) - rank(b) || (a.dueOn ?? '').localeCompare(b.dueOn ?? ''))
			.slice(0, SHOWN)
	);

	const money = (cents: number) => formatMoney(Math.round(cents), currency);

	let list = $state<HTMLElement>();
	// A refetch that brings back the same rows doesn't deal them again.
	const drawn = $derived(rows.map((l) => `${l.id}:${l.paid}`).join());

	$effect(() => {
		if (!open || !list || !drawn) return;
		animate(
			list.children,
			prefersReducedMotion() ? { opacity: [0, 1] } : { opacity: [0, 1], y: [8, 0] },
			{ delay: stagger(0.05), duration: 0.42, ease: EASE_OUT_QUINT }
		);
	});

	const go =
		'press flex items-center gap-1 rounded-md text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue';
</script>

<!--
	A card holding less than its cell: a label on top and the rows anchored to
	the foot, as the Transactions tab's are.
-->
<div class="relative flex h-full flex-col p-7">
	{#if query.isPending && open}
		<div class="pointer-events-none absolute inset-0 grid place-items-center">
			<Loader />
		</div>
	{/if}

	{#if query.data && loans.length === 0}
		<div
			class="grid size-11 shrink-0 place-items-center rounded-full border border-dashed border-hairline text-fg-subtle"
		>
			<!-- Not a control: it plays once, as the tab opens. -->
			<AnimatedIcon
				icon={MovingHandCoins}
				set="moving"
				size={18}
				strokeWidth={1.5}
				trigger="mount"
			/>
		</div>
		<p class="mt-5 text-[0.9375rem] text-fg-muted">No loans yet.</p>
		<p class="mt-1.5 text-[0.8125rem] leading-relaxed text-fg-muted">
			Money you lend or borrow will show here, with what's left to settle.
		</p>
		<a href="/loans" class={cn(go, 'mt-4 self-start')}>
			Write one down
			<AnimatedIcon icon={MovingArrowRight} set="moving" size={14} />
		</a>
	{:else if query.data}
		<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
			<p class="text-[0.9375rem] text-fg-muted">
				{rows.length > 0 ? 'Still open, most urgent first' : 'Every loan is settled'}
			</p>
			<a href="/loans" class={go}>
				See all
				<AnimatedIcon icon={MovingArrowRight} set="moving" size={14} />
			</a>
		</div>

		<div class="mt-5 flex min-h-0 flex-1 basis-0 flex-col justify-end">
			{#if rows.length === 0}
				<div class="flex items-center gap-3 text-sm text-fg-muted">
					<span class="grid size-8 place-items-center rounded-full bg-positive/12 text-positive">
						<AnimatedIcon icon={MovingBadgeCheck} set="moving" size={16} trigger="mount" />
					</span>
					Nothing owed either way.
				</div>
			{:else}
				<ul bind:this={list} class="-mx-3 grid min-h-0 gap-0.5 overflow-y-auto">
					{#each rows as loan (loan.id)}
						<li>
							<a
								href={loanPageHref(loan.id)}
								class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue"
							>
								<Avatar seed={loan.person} class="size-8 shrink-0" />
								<span class="min-w-0 flex-1">
									<span class="block truncate text-[0.9375rem]">{loan.person}</span>
									<DueChip
										due={loanDue(loan, today)}
										dueOn={loan.dueOn}
										class="mt-0.5 px-1 py-0 text-[0.6875rem]"
									/>
								</span>
								<span
									class={cn(
										'tabular shrink-0 text-[0.9375rem]',
										loan.direction === 'lent' ? 'text-positive' : 'text-spent'
									)}
									use:countUp={{ value: loanLeft(loan), format: money, whenVisible: true }}
								>
									{money(loanLeft(loan))}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}

			<!-- Both sides under the rows: what's coming back, and what's going out. -->
			<dl class="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
				<div class="min-w-0">
					<dt class="text-fg-muted">Owed to you</dt>
					<dd class="tabular mt-0.5 truncate font-medium text-positive">
						{money(totals.owedToYou)}
					</dd>
				</div>
				<div class="min-w-0">
					<dt class="text-fg-muted">You owe</dt>
					<dd class="tabular mt-0.5 truncate font-medium text-spent">{money(totals.youOwe)}</dd>
				</div>
			</dl>
		</div>
	{/if}
</div>
