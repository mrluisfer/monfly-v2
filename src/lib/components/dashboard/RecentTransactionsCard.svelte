<script lang="ts">
	import MovingArrowLeftRight from '@jis3r/icons/icons/arrow-left-right';
	import { createQuery } from '@tanstack/svelte-query';
	import { animate, stagger } from 'motion';
	import { browser } from '$app/environment';
	import { countUp } from '$lib/actions';
	import { categoryColor } from '$lib/categories';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import { AnimatedIcon, DateLabel, Loader } from '$lib/components/ui';
	import { DEFAULT_CURRENCY, formatMoney } from '$lib/finance';
	import { colorChoicesQuery, transactionsQuery } from '$lib/queries';
	import { signedAmount } from '$lib/transactions';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * The last five transactions, newest first, in the ledger's own order — the
	 * category's glyph and name, what it cost, the day — with nothing to do to
	 * them. It reads the ledger's cache entry, so a visit here fills the
	 * transactions page's too, and a write there shows here.
	 */
	type Props = {
		/** The viewer's zone: dates are drawn in it. */
		timeZone: string;
		/** Its tab is the one open: rows are read the first time it is, and deal in each time. */
		open: boolean;
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
	};

	let { timeZone, open, enabled = true }: Props = $props();

	const SHOWN = 5;

	// Not prefetched: the tab starts closed, and the whole record isn't worth
	// inlining into every dashboard for a card nobody has opened.
	const query = createQuery(() => ({
		...transactionsQuery(),
		enabled: browser && enabled && open
	}));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled: browser && enabled }));

	const currency = $derived(query.data?.currency ?? DEFAULT_CURRENCY);
	const rows = $derived(query.data?.transactions.slice(0, SHOWN) ?? []);

	const signed = (cents: number) =>
		`${cents > 0 ? '+' : cents < 0 ? '−' : ''}${formatMoney(Math.abs(cents), currency)}`;

	let list = $state<HTMLElement>();
	// A refetch that brings back the same five doesn't deal them again.
	const drawn = $derived(rows.map((t) => t.id).join());

	$effect(() => {
		if (!open || !list || !drawn) return;
		animate(
			list.children,
			prefersReducedMotion() ? { opacity: [0, 1] } : { opacity: [0, 1], y: [8, 0] },
			{ delay: stagger(0.05), duration: 0.42, ease: EASE_OUT_QUINT }
		);
	});
</script>

<!--
	The Transactions tab's card. A card holding less than its cell: a label on
	top and the list anchored to the foot, so spare height pools above the rows
	rather than under them.
-->
<div class="relative flex h-full flex-col p-7">
	<!-- Over the card rather than in its flow, so the rows dealing in as it
	     fades don't push it about. Its own block, so its exit plays. -->
	{#if query.isPending && open}
		<div class="pointer-events-none absolute inset-0 grid place-items-center">
			<Loader />
		</div>
	{/if}

	{#if query.data && rows.length === 0}
		<div
			class="grid size-11 shrink-0 place-items-center rounded-full border border-dashed border-hairline text-fg-subtle"
		>
			<!-- Not a control: it plays once, as the tab opens. -->
			<AnimatedIcon
				icon={MovingArrowLeftRight}
				set="moving"
				size={18}
				strokeWidth={1.5}
				trigger="mount"
			/>
		</div>

		<p class="mt-5 text-[0.9375rem] text-fg-muted">No transactions yet.</p>
		<p class="mt-1.5 text-[0.8125rem] leading-relaxed text-fg-muted">
			The last five you record will show here, newest first.
		</p>
	{:else if query.data}
		<p class="text-[0.9375rem] text-fg-muted">Your last five, newest first</p>

		<!-- The unassigned lists' tracks with the description gone: the category
		     capped, the amount right beside it, and the day taking the rest. The
		     rows hold no action, so they don't highlight, and the date's ground
		     is the card's. -->
		<div
			class="mt-auto grid gap-x-6 pt-5 [--date-ground:var(--color-card)]"
			style="grid-template-columns: auto minmax(0,10rem) auto minmax(max-content,1fr)"
		>
			<!-- The columns named in words: five rows, newest first, have no order to pick. -->
			<div
				class="col-span-full grid grid-cols-subgrid border-b border-line pb-2 text-sm font-medium text-fg-muted"
			>
				<span class="col-start-2">Category</span>
				<span class="text-right">Amount</span>
				<span>Date</span>
			</div>

			<ul bind:this={list} class="col-span-full grid grid-cols-subgrid gap-y-0.5">
				{#each rows as row (row.id)}
					<li
						class="col-span-full grid grid-cols-subgrid items-center border-b border-line py-2.5 last:border-0"
					>
						<CategoryIcon
							category={row.category}
							color={categoryColor(row.category, choices.data?.category)}
						/>
						<span class="truncate text-[0.9375rem]">
							{#if row.category}{row.category}{:else}<span class="text-fg-subtle">—</span>{/if}
						</span>
						<!-- countUp takes the figure over once its row is in view, counting from zero. -->
						<span
							class={cn(
								'tabular text-right text-[0.9375rem]',
								row.type === 'income' ? 'text-positive' : 'text-spent'
							)}
							use:countUp={{
								value: signedAmount(row),
								format: signed,
								whenVisible: true,
								duration: 0.8
							}}
						>
							{signed(signedAmount(row))}
						</span>
						<DateLabel date={row.date} {timeZone} unroll={false} class="text-sm text-fg-muted" />
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
