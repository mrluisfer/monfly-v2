<script lang="ts">
	import MovingBadgeCheck from '@jis3r/icons/icons/badge-check';
	import MovingChevronDown from '@jis3r/icons/icons/chevron-down';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { AnimatedIcon, Avatar, Card } from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import { LOAN_DIRECTION_LABEL, shortDay, type Loan } from '$lib/loans';
	import { cn } from '$lib/utils';

	/**
	 * Loans already settled, most recently first: quieter than the open ones'
	 * cards, as the accounts page's archived list is — who, which way, how much
	 * and the day it was settled. A row opens the loan in the panel; past the
	 * first few, the rest wait behind _Show all_.
	 */
	type Props = {
		/** The settled loans, most recently settled first. */
		loans: Loan[];
		currency: Currency;
		selectedId: string | null;
		onSelect: (id: string) => void;
		class?: string;
	};

	let { loans, currency, selectedId, onSelect, class: className }: Props = $props();

	const FIRST = 5;
	let all = $state(false);

	const shown = $derived(all ? loans : loans.slice(0, FIRST));
	const settledTotal = $derived(loans.reduce((sum, l) => sum + l.amount, 0));
	const money = (cents: number) => formatMoney(Math.round(cents), currency);
</script>

<Card class={className}>
	<div class="flex items-center justify-between gap-4 px-7 pt-7">
		<div class="flex items-center gap-2.5">
			<span class="grid size-7 place-items-center rounded-lg bg-positive/12 text-positive">
				<AnimatedIcon icon={MovingBadgeCheck} set="moving" trigger="visible" />
			</span>
			<h2 class="font-display text-2xl font-medium">Settled</h2>
		</div>
		<p class="tabular text-sm text-fg-muted">{loans.length}</p>
	</div>
	<p class="mt-1.5 px-7 text-[0.9375rem] text-fg-muted">
		<span class="tabular text-fg">{money(settledTotal)}</span> lent and borrowed, all of it squared away.
	</p>

	<ul class="mt-4 px-4 pb-4">
		{#each shown as loan (loan.id)}
			<li transition:slide={{ duration: 280, easing: quintOut }}>
				<button
					type="button"
					aria-pressed={selectedId === loan.id}
					onclick={() => onSelect(loan.id)}
					class={cn(
						'flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-sunken',
						'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue',
						selectedId === loan.id && 'bg-sunken'
					)}
				>
					<Avatar seed={loan.person} class="size-7 shrink-0" />
					<span class="min-w-0 flex-1">
						<span class="block truncate text-[0.9375rem]">{loan.person}</span>
						<span class="block truncate text-xs text-fg-muted">
							{LOAN_DIRECTION_LABEL[loan.direction]} · settled {loan.paidOn
								? shortDay(loan.paidOn)
								: 'on an unknown day'}
						</span>
					</span>
					<span class="tabular shrink-0 text-[0.9375rem] text-fg-muted">{money(loan.amount)}</span>
				</button>
			</li>
		{/each}
	</ul>

	{#if loans.length > FIRST}
		<div class="px-7 pb-6">
			<button
				type="button"
				class="inline-flex items-center gap-1.5 rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
				aria-expanded={all}
				onclick={() => (all = !all)}
			>
				{all ? 'Show fewer' : `Show all ${loans.length}`}
				<span
					class={cn(
						'flex transition-transform duration-300 ease-[var(--ease-spring)]',
						all && 'rotate-180'
					)}
				>
					<AnimatedIcon icon={MovingChevronDown} set="moving" size={16} />
				</span>
			</button>
		</div>
	{/if}
</Card>
